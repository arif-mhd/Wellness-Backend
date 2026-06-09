import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { labTestsContainer, labBookingsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";

const router = Router();

// ─── GET /api/lab/tests ───────────────────────────────────────────────────────
// Public: returns all active lab tests
router.get("/tests", async (_req: Request, res: Response) => {
  try {
    const { category } = _req.query as { category?: string };
    let query = "SELECT * FROM c WHERE c.is_active = true";
    const parameters: any[] = [];
    if (category) {
      query += " AND LOWER(c.category) = LOWER(@cat)";
      parameters.push({ name: "@cat", value: category });
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await labTestsContainer.items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get lab tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/tests/:testId ───────────────────────────────────────────────
router.get("/tests/:testId", async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { resources } = await labTestsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true",
      parameters: [{ name: "@id", value: testId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Test not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get lab test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/bookings ───────────────────────────────────────────────────
// Patient creates a lab booking. Payment is mocked.
router.post("/bookings", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const {
      items,              // [{ testId, patientId (family), visitMode, scheduledAt }]
      consultationDate,   // optional — only when requires_doctor_approval tests in cart
      consultationSlot,
      notes,
    } = req.body;

    if (!items?.length) {
      res.status(400).json({ error: "items is required" });
      return;
    }

    const now = new Date().toISOString();
    const bookingId = uuidv4();

    // Validate all test IDs exist and compute total
    let total_amount = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const { resources } = await labTestsContainer.items.query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true",
        parameters: [{ name: "@id", value: item.testId }],
      }).fetchAll();

      if (!resources.length) {
        res.status(400).json({ error: `Test ${item.testId} not found or inactive` });
        return;
      }

      const test = resources[0];
      validatedItems.push({
        testId:        test.id,
        testName:      test.name,
        category:      test.category,
        labId:         test.labId,
        labName:       test.labName,
        price:         test.price,
        forPatientId:  item.forPatientId ?? patientId,
        visitMode:     item.visitMode ?? "Laboratory",
        scheduledAt:   item.scheduledAt ?? null,
        requires_doctor_approval: test.requires_doctor_approval,
      });
      total_amount += test.price;
    }

    const booking = {
      id:                bookingId,
      patientId,
      items:             validatedItems,
      consultationDate:  consultationDate ?? null,
      consultationSlot:  consultationSlot ?? null,
      notes:             notes ?? null,
      status:            "confirmed",
      payment_status:    "paid",
      payment_amount:    total_amount,
      createdAt:         now,
      updatedAt:         now,
    };

    await labBookingsContainer.items.upsert(booking);
    res.status(201).json({ status: "OK", booking });
  } catch (err) {
    console.error("Create lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/bookings ────────────────────────────────────────────────────
router.get("/bookings", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { resources } = await labBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
      parameters: [{ name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get lab bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/bookings/:bookingId ─────────────────────────────────────────
router.get("/bookings/:bookingId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { resources } = await labBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: bookingId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/lab/bookings/:bookingId/cancel ────────────────────────────────
router.patch("/bookings/:bookingId/cancel", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { resources } = await labBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: bookingId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }
    const booking = resources[0];
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" }); return;
    }
    const updated = { ...booking, status: "cancelled", updatedAt: new Date().toISOString() };
    await labBookingsContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Cancel lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
