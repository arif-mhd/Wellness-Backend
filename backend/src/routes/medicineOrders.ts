import { Router, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { requireFeature } from "../middleware/requireFeature";
import { medicineOrdersContainer, prescriptionsContainer } from "../config/cosmos";
import { uploadBlob, generateSasUrl } from "../config/blob";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";
import { validateOrderItems, decrementStockForItems } from "../utils/pharmacyOrders";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── POST /api/pharmacy/orders ────────────────────────────────────────────────
// Patient places a medicine order. Items are validated against real product stock.
router.post("/orders", requireRole("patient"), requireFeature("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { items, delivery_address, prescription_id, notes, profileId } = req.body;

    if (!items?.length || !delivery_address) {
      res.status(400).json({ error: "items and delivery_address are required" });
      return;
    }

    // If a prescription is attached, confirm it actually belongs to this patient
    // rather than trusting a client-supplied id outright.
    if (prescription_id) {
      const { resources: rxMatches } = await prescriptionsContainer.items.query({
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.id = @id AND c.patientId = @pid",
        parameters: [{ name: "@id", value: prescription_id }, { name: "@pid", value: patientId }],
      }, { partitionKey: patientId }).fetchAll();
      if (!rxMatches[0]) {
        res.status(400).json({ error: "Invalid prescription_id" });
        return;
      }
    }

    // Validate each item and calculate total
    const validation = await validateOrderItems(items);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
    const { items: validatedItems, total_amount } = validation;

    const now = new Date().toISOString();
    const order = {
      id:               uuidv4(),
      patientId,
      patient_id:       patientId,
      profileId:        profileId ?? patientId,
      items:            validatedItems,
      delivery_address,
      prescription_id:  prescription_id ?? null,
      notes:            notes ?? null,
      status:           "confirmed",
      total_amount,
      payment_status:   "paid",   // payment is mocked
      payment_method:   "mock",
      source:           "shop" as const,
      appointmentId:    null,
      clinicId:         null,
      createdAt:        now,
      updatedAt:        now,
    };

    await medicineOrdersContainer.items.upsert(order);
    await decrementStockForItems(validatedItems);

    const itemNames = validatedItems.map(i => i.name).join(", ");
    logActivity({
      source: "patient",
      action: "Medicine Order Placed",
      details: `Order AED ${total_amount.toFixed(2)} — ${itemNames}`,
      performedBy: "Patient",
      performedById: patientId,
      entityType: "medicineOrder",
      entityId: order.id,
    });

    res.status(201).json({ status: "OK", order });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/my-orders ──────────────────────────────────────────────
// Named "my-orders" rather than "orders" — pharmacy.ts's staff-only "/orders"
// route (requireRole("pharmacy")) is mounted before this router at the same
// /api/pharmacy base, so a patient-scoped "/orders" here would be permanently
// shadowed and unreachable. See index.ts's mount order for both routers.
router.get("/my-orders", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT * FROM c WHERE c.patientId = @pid";
    const parameters = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.createdAt DESC";

    const { resources } = await medicineOrdersContainer.items.query({
      query, parameters,
    }, { partitionKey: patientId }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/orders/:orderId ───────────────────────────────────────
router.get("/orders/:orderId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { orderId } = req.params;
    const { resources } = await medicineOrdersContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: orderId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/pharmacy/orders/:orderId/cancel ───────────────────────────────
router.patch("/orders/:orderId/cancel", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { orderId } = req.params;
    const { resources } = await medicineOrdersContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: orderId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Order not found" }); return; }
    const order = resources[0];
    if (order.status !== "confirmed") {
      res.status(400).json({ error: "Only confirmed orders can be cancelled" });
      return;
    }
    const updated = { ...order, status: "cancelled", updatedAt: new Date().toISOString() };
    await medicineOrdersContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/pharmacy/prescriptions/upload ─────────────────────────────────
// Patient uploads a prescription image (JPG/PNG). Stores it in blob storage
// and returns the URL — a separate step from creating the prescription record
// below, mirroring the pharmacy product-image upload pattern.
router.post(
  "/prescriptions/upload",
  requireRole("patient"),
  upload.single("file"),
  async (req: SessionRequest, res: Response) => {
    try {
      const patientId = req.session!.getUserId();
      if (!req.file) {
        res.status(400).json({ error: "file is required" });
        return;
      }

      const ext = req.file.mimetype.split("/")[1] ?? "jpg";
      const blobPath = `patients/${patientId}/prescriptions/${Date.now()}.${ext}`;
      await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);
      const url = generateSasUrl(blobPath, 365);

      res.status(201).json({ url });
    } catch (err) {
      console.error("Upload prescription file error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/pharmacy/prescriptions ────────────────────────────────────────
router.post("/prescriptions", requireRole("patient"), requireFeature("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { image_url, pdf_url, source, profileId } = req.body;

    if (!source) { res.status(400).json({ error: "source is required" }); return; }

    const now = new Date().toISOString();
    const prescription = {
      id:                  uuidv4(),
      patientId,
      patient_id:          patientId,
      profileId:           profileId ?? patientId,
      image_url:           image_url ?? null,
      pdf_url:             pdf_url ?? null,
      source:              source as "uploaded" | "doctor_issued",
      verification_status: "pending" as const,
      expiry_date:         null,
      createdAt:           now,
    };

    await prescriptionsContainer.items.upsert(prescription);
    res.status(201).json(prescription);
  } catch (err) {
    console.error("Create prescription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/prescriptions ─────────────────────────────────────────
router.get("/prescriptions", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT * FROM c WHERE c.patientId = @pid";
    const parameters = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.createdAt DESC";

    const { resources } = await prescriptionsContainer.items.query({
      query, parameters,
    }, { partitionKey: patientId }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get prescriptions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/pharmacy/orders/:orderId/status ───────────────────────────────
router.patch("/orders/:orderId/status", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { orderId } = req.params;
    const { status } = req.body;

    const allowed = ["confirmed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
      return;
    }

    const { resources } = await medicineOrdersContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: orderId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Order not found" }); return; }
    
    const order = resources[0];
    const updated = { ...order, status, updatedAt: new Date().toISOString() };
    await medicineOrdersContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
