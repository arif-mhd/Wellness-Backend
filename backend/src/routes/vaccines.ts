import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { requireFeature } from "../middleware/requireFeature";
import { vaccinesContainer, vaccinationBookingsContainer, clinicsContainer, doctorsContainer, patientsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";
import { resolveOrgId } from "../utils/orgScope";
import { resolveCurrencyForOrgId, formatCurrencyText } from "../utils/currency";

const router = Router();

// ─── GET /api/vaccines ────────────────────────────────────────────────────────
// Public: returns all active vaccines
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category } = req.query as { category?: string };
    // Lab-added vaccines carry a status and must be approved before patients
    // can see them. Admin-catalogue docs predate that field entirely, so an
    // undefined status counts as approved (same idiom as labTests).
    let query ="SELECT * FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')";
    const parameters: any[] = [];
    if (category) {
      query += " AND (LOWER(c.category) = LOWER(@cat) OR LOWER(c.vaccineType) = LOWER(@cat) OR LOWER(c.age_group) = LOWER(@cat))";
      parameters.push({ name: "@cat", value: category });
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await vaccinesContainer.items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get vaccines error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ─── POST /api/vaccines/bookings ──────────────────────────────────────────────
// Patient creates a vaccination booking
router.post("/bookings", requireRole("patient"), requireFeature("vaccination"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { items, profileId } = req.body as {
      items: { vaccineId: string; forPatientId?: string; visitMode?: "Laboratory" | "Home"; scheduledAt?: string | null }[];
      profileId?: string; // fallback owner when an item doesn't set its own forPatientId
    };

    if (!items?.length) {
      res.status(400).json({ error: "items is required" });
      return;
    }

    const now = new Date().toISOString();
    const bookingId = uuidv4();

    let total_amount = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const { resources } = await vaccinesContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')",
          parameters: [{ name: "@id", value: item.vaccineId }],
        })
        .fetchAll();

      if (!resources.length) {
        res.status(400).json({ error: `Vaccine ${item.vaccineId} not found or inactive` });
        return;
      }

      const vaccine = resources[0];
      validatedItems.push({
        vaccineId: vaccine.id,
        vaccineName: vaccine.name,
        manufacturer: vaccine.manufacturer ?? null,
        price: vaccine.price,
        forPatientId: item.forPatientId ?? profileId ?? patientId,
        visitMode: item.visitMode ?? "Laboratory",
        scheduledAt: item.scheduledAt ?? null,
      });
      total_amount += vaccine.price;
    }

    // Starts pending — a clinic-assigned doctor must sign off before the
    // vaccination is confirmed. Mirrors how lab.ts handles a lab test flagged
    // requires_doctor_approval (see POST /bookings/:id/approve below).
    const booking = {
      id: bookingId,
      patientId,
      items: validatedItems,
      status: "pending_doctor_approval",
      payment_status: "paid",
      payment_amount: total_amount,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectedReason: null,
      createdAt: now,
      updatedAt: now,
    };

    await vaccinationBookingsContainer.items.upsert(booking);

    const vaccineNames = validatedItems.map((i: any) => i.vaccineName).join(", ");
    const vaccineCurrency = await resolveCurrencyForOrgId(await resolveOrgId(req));
    logActivity({
      source: "patient",
      action: "Vaccination Booked",
      details: `Vaccination ${formatCurrencyText(total_amount, vaccineCurrency)} — ${vaccineNames}`,
      performedBy: "Patient",
      performedById: patientId,
      entityType: "vaccinationBooking",
      entityId: bookingId,
    });

    res.status(201).json({ status: "OK", booking });
  } catch (err) {
    console.error("Create vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/vaccines/bookings ───────────────────────────────────────────────
// Optional ?profileId= filters to bookings that include at least one item for
// that specific profile (account owner or a family member) — matches the same
// active-profile scoping used for appointments.
router.get("/bookings", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;
    let query = "SELECT * FROM c WHERE c.patientId = @pid";
    const parameters: any[] = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.forPatientId = @profileId)";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await vaccinationBookingsContainer.items
      .query(
        { query, parameters },
        { partitionKey: patientId }
      )
      .fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get vaccination bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/vaccines/bookings/pending-approval ──────────────────────────────
// The shared claim queue for a vaccination-assigned doctor. Registered BEFORE
// GET /bookings/:bookingId — Express matches in registration order and
// "pending-approval" matches :bookingId just fine syntactically, so the
// patient route would otherwise swallow this literal path and 404 the doctor.
// vaccinationBookings is partitioned by /patientId so this is cross-partition.
router.get("/bookings/pending-approval", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    if (!(await isVaccinationDoctor(doctorId))) { res.json([]); return; }

    const { resources } = await vaccinationBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.status = 'pending_doctor_approval' ORDER BY c.createdAt ASC",
    }, { maxItemCount: 100 }).fetchAll();

    // Best-effort join so the doctor sees a real patient name, not a raw id.
    const patientIds = Array.from(new Set(resources.map((b: any) => b.patientId)));
    const names = new Map<string, string>();
    await Promise.all(patientIds.map(async (id) => {
      try {
        const { resource: patient } = await patientsContainer.item(id, id).read();
        if (patient?.fullName) names.set(id, patient.fullName);
      } catch { /* lookup failed — fall back to a generic label */ }
    }));

    res.json(resources.map((b: any) => ({ ...b, patientName: names.get(b.patientId) ?? "Patient" })));
  } catch (err) {
    console.error("Get pending vaccination approvals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/vaccines/bookings/:bookingId ────────────────────────────────────
router.get("/bookings/:bookingId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { resources } = await vaccinationBookingsContainer.items
      .query(
        {
          query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
          parameters: [{ name: "@id", value: bookingId }, { name: "@pid", value: patientId }],
        },
        { partitionKey: patientId }
      )
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/vaccines/bookings/:bookingId/cancel ───────────────────────────
router.patch("/bookings/:bookingId/cancel", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { resources } = await vaccinationBookingsContainer.items
      .query(
        {
          query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
          parameters: [{ name: "@id", value: bookingId }, { name: "@pid", value: patientId }],
        },
        { partitionKey: patientId }
      )
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }
    const booking = resources[0];
    if (booking.status === "cancelled") { res.status(400).json({ error: "Booking already cancelled" }); return; }
    if (booking.status === "rejected") { res.status(400).json({ error: "Booking was rejected by the lab" }); return; }
    const updated = { ...booking, status: "cancelled", updatedAt: new Date().toISOString() };
    await vaccinationBookingsContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Cancel vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Doctor approval ──────────────────────────────────────────────────────────
// A vaccination booking needs a clinic-assigned doctor to sign off before it's
// confirmed, mirroring how lab.ts handles a test flagged
// requires_doctor_approval. Vaccines are a global catalogue with no owning lab,
// so unlike lab tests (scoped by item.labId) the assignment lives on the CLINIC
// — see PUT /api/clinics/vaccination-doctors.

class VaccinationNotAuthorizedError extends Error {
  constructor(message = "Not authorized.") { super(message); this.name = "VaccinationNotAuthorizedError"; }
}
class VaccinationAlreadyHandledError extends Error {
  constructor(message = "This booking has already been reviewed.") { super(message); this.name = "VaccinationAlreadyHandledError"; }
}

// True when this doctor's clinic has nominated them to review vaccinations.
async function isVaccinationDoctor(doctorId: string): Promise<boolean> {
  const { resources } = await clinicsContainer.items.query({
    query: "SELECT VALUE c.id FROM c WHERE ARRAY_CONTAINS(c.assignedVaccinationDoctorIds, @doctorId)",
    parameters: [{ name: "@doctorId", value: doctorId }],
  }).fetchAll();
  return resources.length > 0;
}

// Read -> recompute -> conditional replace, retrying on a 412, so two doctors
// racing on the same booking can't silently overwrite each other.
// vaccinationBookings is partitioned on /patientId.
async function updateVaccinationBookingWithRetry(
  id: string,
  patientId: string,
  computeUpdate: (booking: any) => any
): Promise<any | null> {
  for (let attempt = 0; ; attempt++) {
    const { resource: booking } = await vaccinationBookingsContainer.item(id, patientId).read();
    if (!booking) return null;
    const updated = computeUpdate(booking);
    try {
      await vaccinationBookingsContainer.item(id, patientId).replace(updated, {
        accessCondition: { type: "IfMatch", condition: booking._etag },
      });
      return updated;
    } catch (err: any) {
      if (err.code === 412 && attempt < 5) continue;
      throw err;
    }
  }
}

async function reviewVaccinationBooking(
  doctorId: string,
  bookingId: string,
  computeUpdate: (booking: any) => any
): Promise<any> {
  if (!(await isVaccinationDoctor(doctorId))) {
    throw new VaccinationNotAuthorizedError("You aren't assigned to review vaccinations.");
  }

  const { resources } = await vaccinationBookingsContainer.items.query({
    query: "SELECT c.patientId FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: bookingId }],
  }, { maxItemCount: 1 }).fetchAll();
  if (!resources.length) return null;

  return updateVaccinationBookingWithRetry(bookingId, resources[0].patientId, (booking) => {
    if (booking.status !== "pending_doctor_approval") throw new VaccinationAlreadyHandledError();
    return computeUpdate(booking);
  });
}

// ─── POST /api/vaccines/bookings/:bookingId/approve ───────────────────────────
router.post("/bookings/:bookingId/approve", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    const { bookingId } = req.params;
    const now = new Date().toISOString();

    const updated = await reviewVaccinationBooking(doctorId, bookingId, (booking) => ({
      ...booking,
      status: "confirmed",
      approvedBy: doctorId,
      approvedAt: now,
      updatedAt: now,
    }));

    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }

    logActivity({
      source: "doctor",
      action: "Vaccination Approved",
      details: `Vaccination booking ${bookingId.slice(0, 8)} approved`,
      performedBy: "Doctor",
      performedById: doctorId,
      entityType: "vaccinationBooking",
      entityId: bookingId,
    });

    res.json(updated);
  } catch (err: any) {
    if (err instanceof VaccinationNotAuthorizedError) { res.status(403).json({ error: err.message }); return; }
    if (err instanceof VaccinationAlreadyHandledError) { res.status(409).json({ error: err.message }); return; }
    console.error("Approve vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/vaccines/bookings/:bookingId/reject ────────────────────────────
router.post("/bookings/:bookingId/reject", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { reason } = req.body;
    const now = new Date().toISOString();

    const updated = await reviewVaccinationBooking(doctorId, bookingId, (booking) => ({
      ...booking,
      status: "rejected",
      rejectedBy: doctorId,
      rejectedReason: typeof reason === "string" ? reason.slice(0, 500) : "",
      rejectedAt: now,
      updatedAt: now,
    }));

    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }

    logActivity({
      source: "doctor",
      action: "Vaccination Rejected",
      details: `Vaccination booking ${bookingId.slice(0, 8)} rejected`,
      performedBy: "Doctor",
      performedById: doctorId,
      entityType: "vaccinationBooking",
      entityId: bookingId,
    });

    res.json(updated);
  } catch (err: any) {
    if (err instanceof VaccinationNotAuthorizedError) { res.status(403).json({ error: err.message }); return; }
    if (err instanceof VaccinationAlreadyHandledError) { res.status(409).json({ error: err.message }); return; }
    console.error("Reject vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/vaccines/:vaccineId ─────────────────────────────────────────────
router.get("/:vaccineId", async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { resources } = await vaccinesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')",
        parameters: [{ name: "@id", value: vaccineId }],
      })
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Vaccine not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
