import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { vaccinesContainer, vaccinationBookingsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// ─── GET /api/vaccines ────────────────────────────────────────────────────────
// Public: returns all active vaccines
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category } = req.query as { category?: string };
    let query = "SELECT * FROM c WHERE c.is_active = true";
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

// ─── GET /api/vaccines/:vaccineId ─────────────────────────────────────────────
router.get("/:vaccineId", async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { resources } = await vaccinesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true",
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

// ─── POST /api/vaccines/bookings ──────────────────────────────────────────────
// Patient creates a vaccination booking
router.post("/bookings", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { items } = req.body as {
      items: { vaccineId: string; forPatientId?: string; visitMode?: "Laboratory" | "Home"; scheduledAt?: string | null }[];
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
          query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true",
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
        forPatientId: item.forPatientId ?? patientId,
        visitMode: item.visitMode ?? "Laboratory",
        scheduledAt: item.scheduledAt ?? null,
      });
      total_amount += vaccine.price;
    }

    const booking = {
      id: bookingId,
      patientId,
      items: validatedItems,
      status: "confirmed",
      payment_status: "paid",
      payment_amount: total_amount,
      createdAt: now,
      updatedAt: now,
    };

    await vaccinationBookingsContainer.items.upsert(booking);

    const vaccineNames = validatedItems.map((i: any) => i.vaccineName).join(", ");
    logActivity({
      source: "patient",
      action: "Vaccination Booked",
      details: `Vaccination AED ${total_amount.toFixed(2)} — ${vaccineNames}`,
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
router.get("/bookings", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { resources } = await vaccinationBookingsContainer.items
      .query(
        {
          query: "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
          parameters: [{ name: "@pid", value: patientId }],
        },
        { partitionKey: patientId }
      )
      .fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get vaccination bookings error:", err);
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
    const updated = { ...booking, status: "cancelled", updatedAt: new Date().toISOString() };
    await vaccinationBookingsContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Cancel vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
