import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { medicineOrdersContainer, prescriptionsContainer, pharmacyProductsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// ─── POST /api/pharmacy/orders ────────────────────────────────────────────────
// Patient places a medicine order. Items are validated against real product stock.
router.post("/orders", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { items, delivery_address, prescription_id, notes } = req.body;

    if (!items?.length || !delivery_address) {
      res.status(400).json({ error: "items and delivery_address are required" });
      return;
    }

    // Validate each item and calculate total
    let total_amount = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const { resources } = await pharmacyProductsContainer.items.query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.status = 'approved' AND (NOT IS_DEFINED(c.flagged) OR c.flagged = false)",
        parameters: [{ name: "@id", value: item.medicine_id }],
      }).fetchAll();

      if (!resources.length) {
        res.status(400).json({ error: `Product ${item.medicine_id} not found or unavailable` });
        return;
      }

      const product = resources[0];
      if (product.stock < item.quantity) {
        res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        return;
      }

      validatedItems.push({
        medicine_id:  product.id,
        name:         product.name,
        quantity:     item.quantity,
        unit_price:   product.price,
        pharmacyId:   product.pharmacyId,
        image_url:    product.imageUrl ?? null,
        numberOfTablets: product.numberOfTablets ?? null,
      });
      total_amount += product.price * item.quantity;
    }

    const now = new Date().toISOString();
    const order = {
      id:               uuidv4(),
      patientId,
      patient_id:       patientId,
      items:            validatedItems,
      delivery_address,
      prescription_id:  prescription_id ?? null,
      notes:            notes ?? null,
      status:           "confirmed",
      total_amount,
      payment_status:   "paid",   // payment is mocked
      payment_method:   "mock",
      createdAt:        now,
      updatedAt:        now,
    };

    await medicineOrdersContainer.items.upsert(order);

    // Decrement stock for each ordered product
    for (const item of validatedItems) {
      try {
        const { resource: prod } = await pharmacyProductsContainer.item(item.medicine_id, item.pharmacyId).read();
        if (prod) {
          const newStock = Math.max(0, (prod.stock ?? 0) - item.quantity);
          let newNumberOfTablets = prod.numberOfTablets;
          
          if (newNumberOfTablets) {
             const num = parseInt(newNumberOfTablets.toString(), 10);
             if (!isNaN(num)) {
                 newNumberOfTablets = Math.max(0, num - item.quantity).toString();
             }
          }

          await pharmacyProductsContainer.item(item.medicine_id, item.pharmacyId).replace({ 
            ...prod, 
            stock: newStock, 
            numberOfTablets: newNumberOfTablets,
            updatedAt: new Date().toISOString() 
          });
        }
      } catch (stockErr) {
        console.warn(`Stock decrement failed for ${item.medicine_id}:`, stockErr);
      }
    }

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

// ─── GET /api/pharmacy/orders ─────────────────────────────────────────────────
router.get("/orders", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { resources } = await medicineOrdersContainer.items.query({
      query: "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
      parameters: [{ name: "@pid", value: patientId }],
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

// ─── POST /api/pharmacy/prescriptions ────────────────────────────────────────
router.post("/prescriptions", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { image_url, pdf_url, source } = req.body;

    if (!source) { res.status(400).json({ error: "source is required" }); return; }

    const now = new Date().toISOString();
    const prescription = {
      id:                  uuidv4(),
      patientId,
      patient_id:          patientId,
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
    const { resources } = await prescriptionsContainer.items.query({
      query: "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
      parameters: [{ name: "@pid", value: patientId }],
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
