import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import UserRoles from "supertokens-node/recipe/userroles";
import { pharmaciesContainer, pharmacyProductsContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";

const router = Router();
router.use(requireRole("admin"));

// ─── POST /api/admin/pharmacy ─────────────────────────────────────────────────
// Admin manually creates (and auto-approves) a pharmacy without requiring the
// pharmacy to go through the self-registration flow.
router.post("/", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const {
      pharmacyName, email, phone, ownerName, manager,
      location, tradeLicense, healthAuthorityLicense,
      pharmacistLicense, description, operatingHours, website,
      // status defaults to "approved" since admin is adding it directly
      status = "approved",
    } = req.body;

    if (!pharmacyName || !email || !phone || !ownerName) {
      res.status(400).json({ error: "pharmacyName, email, phone, and ownerName are required" });
      return;
    }

    const now = new Date().toISOString();
    const pharmacyId = uuidv4();

    const pharmacyDoc = {
      id:                    pharmacyId,
      supertokens_id:        null,          // no ST account — admin-created
      status,
      email,
      ownerName,
      pharmacyName,
      phone,
      manager:               manager || null,
      location:              location || null,
      tradeLicense:          tradeLicense || null,
      healthAuthorityLicense: healthAuthorityLicense || null,
      pharmacistLicense:     pharmacistLicense || null,
      description:           description || null,
      operatingHours:        operatingHours || null,
      website:               website || null,
      registeredAt:          now,
      approvedAt:            status === "approved" ? now : null,
      approvedBy:            status === "approved" ? adminId : null,
      rejectedAt:            null,
      rejectedReason:        null,
    };

    await pharmaciesContainer.items.upsert(pharmacyDoc);
    res.status(201).json({ status: "OK", pharmacy: pharmacyDoc });
  } catch (err) {
    console.error("Admin create pharmacy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/pharmacy/:pharmacyId/products ────────────────────────────
// Admin adds a product directly to any pharmacy. Product is auto-approved since
// admin is adding it — it goes live on the catalogue immediately.
router.post("/:pharmacyId/products", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { pharmacyId } = req.params;
    const {
      name, description, category, price, stock,
      requiresPrescription, batchNumber, expiryDate,
      reorderLevel, manufacturer, strength,
    } = req.body;

    if (!name || !category || !price) {
      res.status(400).json({ error: "name, category, and price are required" });
      return;
    }

    // Verify pharmacy exists
    const { resources: pharmacies } = await pharmaciesContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: pharmacyId }],
    }).fetchAll();

    if (!pharmacies.length) {
      res.status(404).json({ error: "Pharmacy not found" });
      return;
    }

    const pharmacy = pharmacies[0];
    const now = new Date().toISOString();
    const productId = `${pharmacyId}_${Date.now()}`;

    const product = {
      id:                  productId,
      pharmacyId,
      pharmacyName:        pharmacy.pharmacyName || null,
      name,
      description:         description || null,
      category,
      price:               parseFloat(price),
      stock:               parseInt(stock ?? "0", 10),
      requiresPrescription: requiresPrescription === true || requiresPrescription === "true",
      batchNumber:         batchNumber || null,
      expiryDate:          expiryDate || null,
      reorderLevel:        reorderLevel ? parseInt(reorderLevel, 10) : null,
      manufacturer:        manufacturer || null,
      strength:            strength || null,
      imageUrl:            null,
      status:              "approved" as const,    // admin-added products are live immediately
      flagged:             false,
      flaggedAt:           null,
      flaggedBy:           null,
      flagReason:          null,
      createdAt:           now,
      approvedAt:          now,
      approvedBy:          adminId,
      rejectedAt:          null,
      rejectedReason:      null,
    };

    await pharmacyProductsContainer.items.upsert(product);
    res.status(201).json({ status: "OK", product });
  } catch (err) {
    console.error("Admin add product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/pharmacy/pending ─────────────────────────────────────────
router.get("/pending", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await pharmaciesContainer.items.query(
      { query: "SELECT * FROM c WHERE c.status = 'pending_approval' ORDER BY c.registeredAt DESC" }
    ).fetchAll();
    res.json({ pharmacies: resources });
  } catch (err) {
    console.error("Admin pharmacy pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/pharmacy/approved ────────────────────────────────────────
router.get("/approved", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await pharmaciesContainer.items.query(
      { query: "SELECT * FROM c WHERE c.status = 'approved' ORDER BY c.approvedAt DESC" }
    ).fetchAll();
    res.json({ pharmacies: resources });
  } catch (err) {
    console.error("Admin pharmacy approved error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/pharmacy/:pharmacyId/approve ─────────────────────────────
router.post("/:pharmacyId/approve", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { pharmacyId } = req.params;

    const { resource: pharmacy } = await pharmaciesContainer.item(pharmacyId, pharmacyId).read();
    if (!pharmacy) { res.status(404).json({ error: "Pharmacy not found" }); return; }

    // Upgrade role: remove pending, add approved role
    await UserRoles.removeUserRole("public", pharmacyId, "pharmacy_pending");
    await UserRoles.addRoleToUser("public", pharmacyId, "pharmacy");

    const updated = {
      ...pharmacy,
      status:     "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };
    await pharmaciesContainer.items.upsert(updated);

    logActivity({
      source: "admin",
      action: "Pharmacy Approved",
      details: `${pharmacy.pharmacyName ?? pharmacyId} approved`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "pharmacy",
      entityId: pharmacyId,
    });

    res.json({ status: "OK", pharmacy: updated });
  } catch (err) {
    console.error("Pharmacy approve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/pharmacy/:pharmacyId/reject ──────────────────────────────
router.post("/:pharmacyId/reject", async (req: SessionRequest, res: Response) => {
  try {
    const { pharmacyId } = req.params;
    const { reason } = req.body;

    const { resource: pharmacy } = await pharmaciesContainer.item(pharmacyId, pharmacyId).read();
    if (!pharmacy) { res.status(404).json({ error: "Pharmacy not found" }); return; }

    const updated = {
      ...pharmacy,
      status:         "rejected",
      rejectedAt:     new Date().toISOString(),
      rejectedReason: reason || null,
    };
    await pharmaciesContainer.items.upsert(updated);
    res.json({ status: "OK", pharmacy: updated });
  } catch (err) {
    console.error("Pharmacy reject error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/pharmacy/products/pending ─────────────────────────────────
// All products awaiting approval across all pharmacies
router.get("/products/pending", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await pharmacyProductsContainer.items.query(
      { query: "SELECT * FROM c WHERE c.status = 'pending_approval' ORDER BY c.createdAt DESC" }
    ).fetchAll();
    res.json({ products: resources });
  } catch (err) {
    console.error("Admin products pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/pharmacy/products/approved ────────────────────────────────
router.get("/products/approved", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await pharmacyProductsContainer.items.query(
      { query: "SELECT * FROM c WHERE c.status = 'approved' ORDER BY c.approvedAt DESC" }
    ).fetchAll();
    res.json({ products: resources });
  } catch (err) {
    console.error("Admin products approved error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/pharmacy/products/:productId/approve ─────────────────────
router.post("/products/:productId/approve", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { productId } = req.params;

    // Find the product (need pharmacyId for partition key)
    const { resources } = await pharmacyProductsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: productId }],
      }
    ).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Product not found" }); return; }
    const product = resources[0];

    const updated = {
      ...product,
      status:     "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };
    await pharmacyProductsContainer.items.upsert(updated);
    res.json({ status: "OK", product: updated });
  } catch (err) {
    console.error("Product approve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/pharmacy/products/:productId/reject ──────────────────────
router.post("/products/:productId/reject", async (req: SessionRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;

    const { resources } = await pharmacyProductsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: productId }],
      }
    ).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Product not found" }); return; }
    const product = resources[0];

    const updated = {
      ...product,
      status:         "rejected",
      rejectedAt:     new Date().toISOString(),
      rejectedReason: reason || null,
    };
    await pharmacyProductsContainer.items.upsert(updated);
    res.json({ status: "OK", product: updated });
  } catch (err) {
    console.error("Product reject error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/pharmacy/products/:productId/prescription ───────────────
// Toggle requiresPrescription on any product (approved or pending)
router.patch("/products/:productId/prescription", async (req: SessionRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { requiresPrescription } = req.body;

    const { resources } = await pharmacyProductsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: productId }],
    }).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Product not found" }); return; }
    const product = resources[0];

    const updated = {
      ...product,
      requiresPrescription: Boolean(requiresPrescription),
      updatedAt: new Date().toISOString(),
    };
    await pharmacyProductsContainer.items.upsert(updated);
    res.json({ status: "OK", product: updated });
  } catch (err) {
    console.error("Prescription toggle error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/pharmacy/products/:productId/flag ──────────────────────
// Toggle flagged status on any product. Flagged products are hidden from the
// public catalogue but remain visible to the pharmacy owner.
router.patch("/products/:productId/flag", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { productId } = req.params;
    const { flagged, reason } = req.body;

    const { resources } = await pharmacyProductsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: productId }],
    }).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Product not found" }); return; }
    const product = resources[0];

    const isFlagged = Boolean(flagged);
    const updated = {
      ...product,
      flagged:    isFlagged,
      flaggedAt:  isFlagged ? new Date().toISOString() : null,
      flaggedBy:  isFlagged ? adminId : null,
      flagReason: isFlagged ? (reason ?? null) : null,
    };
    await pharmacyProductsContainer.items.upsert(updated);
    res.json({ status: "OK", product: updated });
  } catch (err) {
    console.error("Flag product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/pharmacy/:pharmacyId ─────────────────────────────────────
// Must be after all /products/* routes to avoid /:pharmacyId matching "products"
router.get("/:pharmacyId", async (req: SessionRequest, res: Response) => {
  try {
    const { pharmacyId } = req.params;
    const { resources } = await pharmaciesContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: pharmacyId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Pharmacy not found" }); return; }
    res.json({ pharmacy: resources[0] });
  } catch (err) {
    console.error("Admin pharmacy get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/pharmacy/:pharmacyId/products ─────────────────────────────
router.get("/:pharmacyId/products", async (req: SessionRequest, res: Response) => {
  try {
    const { pharmacyId } = req.params;
    const { resources } = await pharmacyProductsContainer.items.query({
      query: "SELECT * FROM c WHERE c.pharmacyId = @pharmacyId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@pharmacyId", value: pharmacyId }],
    }).fetchAll();
    res.json({ products: resources });
  } catch (err) {
    console.error("Admin pharmacy products error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
