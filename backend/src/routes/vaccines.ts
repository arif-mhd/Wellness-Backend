import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { requireFeature } from "../middleware/requireFeature";
import { vaccinesContainer, vaccineCatalogContainer, vaccinationBookingsContainer, clinicsContainer, doctorsContainer, patientsContainer, labServicesContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";
import { resolveOrgId, resolveOrgIdFromHeader, getLabIdsForOrg } from "../utils/orgScope";
import { buildInClause, VACCINATION_DOCTOR_QUERY } from "../utils/clinicScope";
import { resolveCurrencyForOrgId, formatCurrencyText } from "../utils/currency";

const router = Router();

// ─── GET /api/vaccines ────────────────────────────────────────────────────────
// Public: per-provider vaccine offerings. Mirrors GET /api/lab/tests exactly,
// including the org scoping — without it a brand's patients could see another
// brand's providers' vaccines.
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, labId, catalogVaccineId, unlinked } = req.query as {
      category?: string; labId?: string; catalogVaccineId?: string; unlinked?: string;
    };
    // Lab-added vaccines carry a status and must be approved before patients
    // can see them. Admin-catalogue docs predate that field entirely, so an
    // undefined status counts as approved (same idiom as labTests).
    let query = "SELECT * FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')";
    const parameters: any[] = [];

    // Scope to this brand's own providers. A brand with no approved provider
    // sees nothing rather than the whole platform's catalogue. The labId
    // filter below narrows within that set — it never widens past it.
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const orgId = await resolveOrgIdFromHeader(orgSlug);
    const orgLabIds = await getLabIdsForOrg(orgId);

    // Admin-catalogue vaccines (no labId) predate per-provider offerings and
    // belong to no lab, so they stay visible to every org — dropping them
    // would empty the catalogue for brands that haven't onboarded a provider.
    const { clause: orgClause, parameters: orgParams } = orgLabIds.length
      ? buildInClause("c.labId", orgLabIds)
      : { clause: "false", parameters: [] as any[] };
    query += ` AND (NOT IS_DEFINED(c.labId) OR ${orgClause})`;
    parameters.push(...orgParams);

    if (labId) {
      if (!orgLabIds.includes(labId)) { res.json([]); return; }
      query += " AND c.labId = @labId";
      parameters.push({ name: "@labId", value: labId });
    }
    if (category) {
      query += " AND (LOWER(c.category) = LOWER(@cat) OR LOWER(c.vaccineType) = LOWER(@cat) OR LOWER(c.age_group) = LOWER(@cat))";
      parameters.push({ name: "@cat", value: category });
    }
    // ?catalogVaccineId= — every provider offering one catalogue vaccine (the
    // patient app's "pick a provider" step). ?unlinked=true — only standalone
    // custom vaccines that aren't part of any catalogue group.
    if (catalogVaccineId) {
      query += " AND c.catalogVaccineId = @catalogVaccineId";
      parameters.push({ name: "@catalogVaccineId", value: catalogVaccineId });
    } else if (unlinked === "true") {
      query += " AND (NOT IS_DEFINED(c.catalogVaccineId) OR c.catalogVaccineId = null)";
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await vaccinesContainer.items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get vaccines error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/vaccines/catalog ────────────────────────────────────────────────
// The browse list: one row per catalogue vaccine this org actually offers,
// with the cheapest price and how many providers offer it. Mirrors
// GET /api/lab/catalog, and is scoped the same way as GET / above so the two
// always agree.
router.get("/catalog", async (req: Request, res: Response) => {
  try {
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const orgId = await resolveOrgIdFromHeader(orgSlug);
    const orgLabIds = await getLabIdsForOrg(orgId);
    if (orgLabIds.length === 0) { res.json([]); return; }

    const { clause, parameters } = buildInClause("c.labId", orgLabIds);
    const { resources: offerings } = await vaccinesContainer.items.query({
      query: `SELECT c.catalogVaccineId, c.price, c.labId FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved') AND IS_DEFINED(c.catalogVaccineId) AND c.catalogVaccineId != null AND ${clause}`,
      parameters,
    }).fetchAll();

    const stats = new Map<string, { minPrice: number; labs: Set<string> }>();
    offerings.forEach((o: any) => {
      const s = stats.get(o.catalogVaccineId) ?? { minPrice: Infinity, labs: new Set<string>() };
      s.minPrice = Math.min(s.minPrice, o.price);
      s.labs.add(o.labId);
      stats.set(o.catalogVaccineId, s);
    });
    if (stats.size === 0) { res.json([]); return; }

    const { resources: catalog } = await vaccineCatalogContainer.items
      .query({ query: "SELECT * FROM c WHERE c.is_active = true ORDER BY c.name ASC" })
      .fetchAll();

    res.json(
      catalog
        .filter((c: any) => stats.has(c.id))
        .map((c: any) => ({ ...c, minPrice: stats.get(c.id)!.minPrice, labCount: stats.get(c.id)!.labs.size }))
    );
  } catch (err) {
    console.error("Get vaccine catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/vaccines/providers ──────────────────────────────────────────────
// Public — approved providers carrying at least one orderable vaccine, for the
// patient app's "browse by provider" screen. Mirrors GET /api/lab/labs.
router.get("/providers", async (req: Request, res: Response) => {
  try {
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const orgId = await resolveOrgIdFromHeader(orgSlug);
    const orgLabIds = await getLabIdsForOrg(orgId);
    if (orgLabIds.length === 0) { res.json([]); return; }

    const { clause, parameters } = buildInClause("c.labId", orgLabIds);
    const { resources: offerings } = await vaccinesContainer.items.query({
      query: `SELECT DISTINCT VALUE c.labId FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved') AND ${clause}`,
      parameters,
    }).fetchAll();
    if (offerings.length === 0) { res.json([]); return; }

    const { clause: labClause, parameters: labParams } = buildInClause("c.id", offerings as string[]);
    const { resources: labs } = await labServicesContainer.items.query({
      query: `SELECT c.id, c.name, c.location FROM c WHERE c.status = 'approved' AND ${labClause}`,
      parameters: labParams,
    }).fetchAll();

    res.json(labs);
  } catch (err) {
    console.error("Get vaccine providers error:", err);
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
        // Carried onto the item so the provider's fulfilment queue can scope
        // by it — the same EXISTS(... i.labId) pattern lab bookings use.
        // Null for an admin-catalogue vaccine that no provider has adopted.
        labId: vaccine.labId ?? null,
        labName: vaccine.labName ?? null,
        catalogVaccineId: vaccine.catalogVaccineId ?? null,
        doses_required: vaccine.doses_required ?? 1,
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
// Once the vaccine has been given there's nothing left to cancel.
const VACCINATION_UNCANCELLABLE_STATUSES: Record<string, string> = {
  cancelled: "Booking already cancelled",
  rejected: "Booking was rejected by the lab",
  administered: "The vaccine has already been administered",
  completed: "This booking has already been completed",
};

class VaccinationNotCancellableError extends Error {
  constructor(message: string) { super(message); this.name = "VaccinationNotCancellableError"; }
}

router.patch("/bookings/:bookingId/cancel", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    // Reading by (id, patientId) scopes the booking to this patient; the etag
    // check stops a cancel from overwriting a concurrent "administered" update.
    const updated = await updateVaccinationBookingWithRetry(bookingId, patientId, (booking) => {
      const blocked = VACCINATION_UNCANCELLABLE_STATUSES[booking.status];
      if (blocked) throw new VaccinationNotCancellableError(blocked);
      return { ...booking, status: "cancelled", updatedAt: new Date().toISOString() };
    });
    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    if (err instanceof VaccinationNotCancellableError) { res.status(400).json({ error: err.message }); return; }
    if (err.code === 404) { res.status(404).json({ error: "Booking not found" }); return; }
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
    query: VACCINATION_DOCTOR_QUERY,
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

// ─── Provider fulfilment ──────────────────────────────────────────────────────
// Once a doctor has approved a booking, the provider that offers the vaccine
// carries it through to completion. Mirrors lab.ts's GET /my-bookings +
// PATCH /bookings/:id/status.

// confirmed is where doctor approval leaves a booking; the provider moves it
// on from there. Kept deliberately parallel to lab.ts's
// ["awaiting","confirmed","analyzing","results","cancelled"].
const VACCINATION_FULFILMENT_STATUSES = ["confirmed", "scheduled", "administered", "completed", "cancelled"];

// Fulfilment only moves forward, and can't be cancelled once the vaccine has
// been given. completed and cancelled are terminal.
const VACCINATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["scheduled", "administered", "cancelled"],
  scheduled: ["administered", "cancelled"],
  administered: ["completed"],
};

class VaccinationInvalidTransitionError extends Error {
  constructor(message: string) { super(message); this.name = "VaccinationInvalidTransitionError"; }
}

// ─── GET /api/vaccines/my-bookings ────────────────────────────────────────────
// Every booking containing at least one vaccine this provider offers.
// vaccinationBookings is partitioned by /patientId so this is cross-partition.
router.get("/my-bookings", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { resources } = await vaccinationBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.labId = @lid) ORDER BY c.createdAt DESC",
      parameters: [{ name: "@lid", value: labId }],
    }, { maxItemCount: 100 }).fetchAll();

    // Best-effort join so the provider sees a real patient name, not a raw id.
    const patientIds = Array.from(new Set(resources.map((b: any) => b.patientId)));
    const names = new Map<string, string>();
    await Promise.all(patientIds.map(async (id) => {
      try {
        const { resource: patient } = await patientsContainer.item(id, id).read();
        if (patient?.fullName) names.set(id, patient.fullName);
      } catch { /* lookup failed — fall back to a generic label */ }
    }));

    res.json({ bookings: resources.map((b: any) => ({ ...b, patientName: names.get(b.patientId) ?? "Patient" })) });
  } catch (err) {
    console.error("Provider vaccination bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/vaccines/bookings/:bookingId/status ───────────────────────────
// The provider moves an approved booking through its fulfilment stages.
router.patch("/bookings/:bookingId/status", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!VACCINATION_FULFILMENT_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VACCINATION_FULFILMENT_STATUSES.join(", ")}` });
      return;
    }

    const { resources } = await vaccinationBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.labId = @lid)",
      parameters: [{ name: "@id", value: bookingId }, { name: "@lid", value: labId }],
    }, { maxItemCount: 1 }).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }

    const booking = resources[0];
    // A booking still awaiting sign-off isn't the provider's to move, and one
    // the doctor declined shouldn't be revivable.
    if (booking.status === "pending_doctor_approval") {
      res.status(409).json({ error: "This booking is still awaiting doctor approval." });
      return;
    }
    if (booking.status === "rejected") {
      res.status(409).json({ error: "This booking was declined by a doctor." });
      return;
    }

    const now = new Date().toISOString();
    // Checked against the latest read so a patient cancelling concurrently
    // can't be overwritten by a stale transition.
    const updated = await updateVaccinationBookingWithRetry(bookingId, booking.patientId, (latest) => {
      if (!(VACCINATION_STATUS_TRANSITIONS[latest.status] ?? []).includes(status)) {
        throw new VaccinationInvalidTransitionError(`Cannot change a ${latest.status} booking to ${status}.`);
      }
      return {
        ...latest,
        status,
        ...(status === "completed" ? { completedAt: now } : {}),
        updatedAt: now,
      };
    });
    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }

    res.json(updated);
  } catch (err: any) {
    if (err instanceof VaccinationInvalidTransitionError) { res.status(409).json({ error: err.message }); return; }
    console.error("Update vaccination booking status error:", err);
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
