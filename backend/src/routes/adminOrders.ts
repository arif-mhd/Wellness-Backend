import { Router, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { medicineOrdersContainer, patientsContainer, pharmaciesContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";

const router = Router();
router.use(requireRole("admin"));

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
// Returns all medicine orders with enriched patient + pharmacy info.
router.get("/", async (_req: SessionRequest, res: Response) => {
  try {
    // medicineOrders is partitioned by /patientId — no partition key = cross-partition scan
    const { resources: orders } = await medicineOrdersContainer.items.query(
      "SELECT * FROM c ORDER BY c.createdAt DESC",
      { maxItemCount: 200 }
    ).fetchAll();

    if (!orders.length) { res.json({ orders: [] }); return; }

    // Collect unique patient IDs and pharmacy IDs to batch-fetch names
    const patientIds = [...new Set(orders.map((o: any) => o.patientId).filter(Boolean))];
    const pharmacyIds = [...new Set(
      orders.flatMap((o: any) => (o.items ?? []).map((i: any) => i.pharmacyId)).filter(Boolean)
    )];

    // Batch-fetch patients
    const patientMap: Record<string, any> = {};
    if (patientIds.length) {
      const placeholders = patientIds.map((_: any, i: number) => `@p${i}`).join(", ");
      const { resources: patients } = await patientsContainer.items.query({
        query: `SELECT c.id, c.fullName, c.email, c.phone FROM c WHERE c.id IN (${placeholders})`,
        parameters: patientIds.map((id: string, i: number) => ({ name: `@p${i}`, value: id })),
      }).fetchAll();
      patients.forEach((p: any) => { patientMap[p.id] = p; });
    }

    // Batch-fetch pharmacies
    const pharmacyMap: Record<string, any> = {};
    if (pharmacyIds.length) {
      const placeholders = pharmacyIds.map((_: any, i: number) => `@ph${i}`).join(", ");
      const { resources: pharmacies } = await pharmaciesContainer.items.query({
        query: `SELECT c.id, c.pharmacyName, c.email FROM c WHERE c.id IN (${placeholders})`,
        parameters: pharmacyIds.map((id: string, i: number) => ({ name: `@ph${i}`, value: id })),
      }).fetchAll();
      pharmacies.forEach((p: any) => { pharmacyMap[p.id] = p; });
    }

    // Enrich orders
    const enriched = orders.map((order: any) => {
      const patient = patientMap[order.patientId] ?? null;
      const firstPharmacyId = order.items?.[0]?.pharmacyId ?? null;
      const pharmacy = firstPharmacyId ? (pharmacyMap[firstPharmacyId] ?? null) : null;
      return {
        ...order,
        patientName:    patient?.fullName ?? "Unknown Patient",
        patientEmail:   patient?.email   ?? "",
        pharmacyName:   pharmacy?.pharmacyName ?? "Unknown Pharmacy",
        pharmacyEmail:  pharmacy?.email         ?? "",
      };
    });

    res.json({ orders: enriched });
  } catch (err) {
    console.error("Admin orders fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/orders/:orderId ──────────────────────────────────────────
router.get("/:orderId", async (req: SessionRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { resources } = await medicineOrdersContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: orderId }],
    }, { maxItemCount: 10 }).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Order not found" }); return; }
    const order = resources[0] as any;

    const [patientRes, pharmacyRes] = await Promise.all([
      order.patientId
        ? patientsContainer.items.query({
            query: "SELECT c.id, c.fullName, c.email, c.phone FROM c WHERE c.id = @id",
            parameters: [{ name: "@id", value: order.patientId }],
          }).fetchAll()
        : Promise.resolve({ resources: [] }),
      order.items?.[0]?.pharmacyId
        ? pharmaciesContainer.items.query({
            query: "SELECT c.id, c.pharmacyName, c.email FROM c WHERE c.id = @id",
            parameters: [{ name: "@id", value: order.items[0].pharmacyId }],
          }).fetchAll()
        : Promise.resolve({ resources: [] }),
    ]);

    const patient  = patientRes.resources[0]  ?? null;
    const pharmacy = pharmacyRes.resources[0] ?? null;

    res.json({
      order: {
        ...order,
        patientName:   patient?.fullName        ?? "Unknown Patient",
        patientEmail:  patient?.email           ?? "",
        pharmacyName:  pharmacy?.pharmacyName   ?? "Unknown Pharmacy",
        pharmacyEmail: pharmacy?.email          ?? "",
      }
    });
  } catch (err) {
    console.error("Admin order fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/orders/:orderId/status ──────────────────────────────────
router.patch("/:orderId/status", async (req: SessionRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const allowed = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
      return;
    }

    const { resources } = await medicineOrdersContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: orderId }],
    }, { maxItemCount: 10 }).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Order not found" }); return; }
    const order = resources[0] as any;

    const updated = { ...order, status, updatedAt: new Date().toISOString() };
    await medicineOrdersContainer.items.upsert(updated);
    res.json({ status: "OK", order: updated });
  } catch (err) {
    console.error("Admin update order status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
