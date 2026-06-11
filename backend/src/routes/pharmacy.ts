import { Router, Request, Response } from "express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { pharmaciesContainer, pharmacyProductsContainer, medicineOrdersContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import multer from "multer";
import { uploadBlob, generateSasUrl } from "../config/blob";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET /api/pharmacy/catalogue ─────────────────────────────────────────────
// Public — returns all approved products for the patient app medicine screen.
// Supports ?search=, ?category=, ?limit=, ?skip= query params.
router.get("/catalogue", async (req: Request, res: Response) => {
  try {
    const { search, category, limit = "50", skip = "0" } = req.query as Record<string, string>;

    let query = "SELECT * FROM c WHERE c.status = 'approved' AND (NOT IS_DEFINED(c.flagged) OR c.flagged = false)";
    const params: { name: string; value: unknown }[] = [];

    if (category) {
      query += " AND c.category = @category";
      params.push({ name: "@category", value: category });
    }
    if (search) {
      query += " AND CONTAINS(LOWER(c.name), @search)";
      params.push({ name: "@search", value: search.toLowerCase() });
    }
    query += " ORDER BY c.approvedAt DESC";

    const { resources } = await pharmacyProductsContainer.items.query(
      { query, parameters: params }
    ).fetchAll();

    // Adapt to the Medicine shape the patient app expects
    const medicines = resources
      .slice(parseInt(skip), parseInt(skip) + parseInt(limit))
      .map((p: any) => ({
        id:                   p.id,
        name:                 p.name,
        generic_name:         p.description ?? null,
        category:             p.category,
        form:                 p.category,
        strength:             p.strength ?? null,
        manufacturer:         p.manufacturer ?? p.pharmacyName ?? null,
        description:          p.description ?? null,
        price:                p.price,
        stock_quantity:       p.stock ?? 0,
        requires_prescription: p.requiresPrescription ?? (p.category === "Prescription"),
        image_url:            p.imageUrl ?? null,
        is_active:            (p.stock ?? 0) > 0,
      }));

    res.json(medicines);
  } catch (err) {
    console.error("Catalogue fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/catalogue/:productId ──────────────────────────────────
// Public — single approved product by id.
router.get("/catalogue/:productId", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { resources } = await pharmacyProductsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.status = 'approved' AND (NOT IS_DEFINED(c.flagged) OR c.flagged = false)",
      parameters: [{ name: "@id", value: productId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Product not found" }); return; }
    const p = resources[0] as any;
    res.json({
      id: p.id, name: p.name, generic_name: p.description ?? null,
      category: p.category, form: p.category, strength: p.strength ?? null,
      manufacturer: p.manufacturer ?? p.pharmacyName ?? null, description: p.description ?? null,
      price: p.price, stock_quantity: p.stock ?? 0,
      requires_prescription: p.requiresPrescription ?? (p.category === "Prescription"),
      image_url: p.imageUrl ?? null, is_active: (p.stock ?? 0) > 0,
    });
  } catch (err) {
    console.error("Catalogue single fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/pharmacy/register ─────────────────────────────────────────────
// Public — called by pharmacy portal signup.
// Creates a SuperTokens account with "pharmacy_pending" role and saves profile to Cosmos.
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, ownerName, pharmacyName, licenseNumber, location, emiratesId, phone } = req.body;

  if (!email || !password || !ownerName || !pharmacyName || !licenseNumber || !phone) {
    res.status(400).json({ error: "email, password, ownerName, pharmacyName, licenseNumber and phone are required." });
    return;
  }

  try {
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: "Registration failed. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;

    // Assign pending role — blocks dashboard until admin approves
    await UserRoles.addRoleToUser("public", supertokensId, "pharmacy_pending");

    const now = new Date().toISOString();
    const pharmacyDoc = {
      id:             supertokensId,
      supertokens_id: supertokensId,
      status:         "pending_approval" as const,
      email,
      ownerName,
      pharmacyName,
      licenseNumber,
      location:       location  || null,
      emiratesId:     emiratesId || null,
      phone,
      registeredAt:   now,
      approvedAt:     null,
      approvedBy:     null,
      rejectedAt:     null,
      rejectedReason: null,
    };

    await pharmaciesContainer.items.upsert(pharmacyDoc);

    res.status(201).json({ status: "OK", message: "Registration submitted. Awaiting admin approval." });
  } catch (err) {
    console.error("Pharmacy register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/me ─────────────────────────────────────────────────────
// Returns the authenticated pharmacy's own profile
router.get("/me", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resource } = await pharmaciesContainer.item(pharmacyId, pharmacyId).read();
    if (!resource) { res.status(404).json({ error: "Pharmacy not found" }); return; }
    res.json({ pharmacy: resource });
  } catch (err) {
    console.error("Pharmacy me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/products ───────────────────────────────────────────────
// Returns all products for the authenticated pharmacy
router.get("/products", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resources } = await pharmacyProductsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.pharmacyId = @pid ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pid", value: pharmacyId }],
      },
      { partitionKey: pharmacyId }
    ).fetchAll();
    res.json({ products: resources });
  } catch (err) {
    console.error("Pharmacy products error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/products/:productId ────────────────────────────────────
// Returns a single product belonging to the authenticated pharmacy
router.get("/products/:productId", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { productId } = req.params;
    const { resource } = await pharmacyProductsContainer.item(productId, pharmacyId).read();
    if (!resource || resource.pharmacyId !== pharmacyId) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ product: resource });
  } catch (err) {
    console.error("Pharmacy product fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/pharmacy/products ─────────────────────────────────────────────
// Add a new product. If the pharmacy is approved (onboarded), product goes live
// immediately. Otherwise it enters the pending_approval queue.
router.post(
  "/products",
  requireRole("pharmacy"),
  upload.single("image"),
  async (req: SessionRequest, res: Response) => {
    try {
      const pharmacyId = req.session!.getUserId();
      const {
        name, description, category, price, stock, requiresPrescription,
        batchNumber, expiryDate, reorderLevel, manufacturer, strength,
      } = req.body;

      if (!name || !category || !price) {
        res.status(400).json({ error: "name, category and price are required." });
        return;
      }

      // Check pharmacy approval status
      const { resource: pharmacyDoc } = await pharmaciesContainer.item(pharmacyId, pharmacyId).read();
      const isOnboarded = pharmacyDoc?.status === "approved";

      let imageUrl: string | null = null;
      if (req.file) {
        const ext = req.file.mimetype.split("/")[1] ?? "jpg";
        const blobPath = `pharmacies/${pharmacyId}/products/${Date.now()}.${ext}`;
        await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);
        imageUrl = generateSasUrl(blobPath, 365);
      }

      const now = new Date().toISOString();
      const productId = `${pharmacyId}_${Date.now()}`;
      const product = {
        id:                   productId,
        pharmacyId,
        name,
        description:          description || null,
        category,
        price:                parseFloat(price),
        stock:                parseInt(stock ?? "0", 10),
        requiresPrescription: requiresPrescription === "true" || requiresPrescription === true,
        batchNumber:          batchNumber || null,
        expiryDate:           expiryDate || null,
        reorderLevel:         reorderLevel ? parseInt(reorderLevel, 10) : null,
        manufacturer:         manufacturer || null,
        strength:             strength || null,
        imageUrl,
        status:               isOnboarded ? "approved" as const : "pending_approval" as const,
        flagged:              false,
        flaggedAt:            null,
        flaggedBy:            null,
        flagReason:           null,
        createdAt:            now,
        approvedAt:           isOnboarded ? now : null,
        approvedBy:           null,
        rejectedAt:           null,
        rejectedReason:       null,
      };

      await pharmacyProductsContainer.items.upsert(product);
      res.status(201).json({ status: "OK", product });
    } catch (err) {
      console.error("Add product error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PUT /api/pharmacy/products/:productId ────────────────────────────────────
// Edit an existing product. Approved pharmacies keep the product live; others
// reset to pending_approval for re-review.
router.put(
  "/products/:productId",
  requireRole("pharmacy"),
  upload.single("image"),
  async (req: SessionRequest, res: Response) => {
    try {
      const pharmacyId = req.session!.getUserId();
      const { productId } = req.params;
      const {
        name, description, category, price, stock, requiresPrescription,
        batchNumber, expiryDate, reorderLevel, manufacturer, strength,
      } = req.body;

      const { resource: existing } = await pharmacyProductsContainer.item(productId, pharmacyId).read();
      if (!existing || existing.pharmacyId !== pharmacyId) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      // Check pharmacy approval status so edits from onboarded pharmacies stay live
      const { resource: pharmacyDoc } = await pharmaciesContainer.item(pharmacyId, pharmacyId).read();
      const isOnboarded = pharmacyDoc?.status === "approved";

      let imageUrl = existing.imageUrl;
      if (req.file) {
        const ext = req.file.mimetype.split("/")[1] ?? "jpg";
        const blobPath = `pharmacies/${pharmacyId}/products/${Date.now()}.${ext}`;
        await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);
        imageUrl = generateSasUrl(blobPath, 365);
      }

      const now = new Date().toISOString();
      const updated = {
        ...existing,
        ...(name        && { name }),
        ...(description !== undefined && { description }),
        ...(category    && { category }),
        ...(price       && { price: parseFloat(price) }),
        ...(stock       !== undefined && { stock: parseInt(stock, 10) }),
        ...(requiresPrescription !== undefined && {
          requiresPrescription: requiresPrescription === "true" || requiresPrescription === true,
        }),
        ...(batchNumber  !== undefined && { batchNumber: batchNumber || null }),
        ...(expiryDate   !== undefined && { expiryDate: expiryDate || null }),
        ...(reorderLevel !== undefined && { reorderLevel: reorderLevel ? parseInt(reorderLevel, 10) : null }),
        ...(manufacturer !== undefined && { manufacturer: manufacturer || null }),
        ...(strength     !== undefined && { strength: strength || null }),
        imageUrl,
        status:        isOnboarded ? "approved" as const : "pending_approval" as const,
        updatedAt:     now,
        approvedAt:    isOnboarded ? (existing.approvedAt ?? now) : null,
        rejectedAt:    null,
        rejectedReason: null,
      };

      await pharmacyProductsContainer.items.upsert(updated);
      res.json({ status: "OK", product: updated });
    } catch (err) {
      console.error("Update product error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── DELETE /api/pharmacy/products/:productId ─────────────────────────────────
router.delete("/products/:productId", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { productId } = req.params;
    await pharmacyProductsContainer.item(productId, pharmacyId).delete();
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pharmacy/orders ─────────────────────────────────────────────────
// Returns all orders that contain at least one item belonging to this pharmacy
router.get("/orders", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resources } = await medicineOrdersContainer.items.query(
      {
        query: "SELECT * FROM c WHERE EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.pharmacyId = @pid) ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pid", value: pharmacyId }],
      }
    ).fetchAll();

    res.json({ orders: resources });
  } catch (err) {
    console.error("Pharmacy orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
