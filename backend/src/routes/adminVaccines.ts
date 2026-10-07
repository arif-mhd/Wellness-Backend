import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { vaccinesContainer } from "../config/cosmos";

const router = Router();

// Same rule lab.ts applies to provider-priced vaccines. Returns an error
// message, or null when the price fields are absent or valid.
function validateVaccinePrices(price: unknown, originalPrice: unknown): string | null {
  if (price !== undefined) {
    const p = Number(price);
    if (price === null || price === "" || !Number.isFinite(p) || p < 0) {
      return "price must be a non-negative number";
    }
  }
  if (originalPrice !== undefined && originalPrice !== null && originalPrice !== "") {
    const op = Number(originalPrice);
    if (!Number.isFinite(op) || op < 0) return "originalPrice must be a non-negative number";
  }
  return null;
}

// ─── POST /api/admin/vaccines ─────────────────────────────────────────────────
// Admin creates a new vaccine
router.post("/", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const {
      name,
      manufacturer,
      vaccineType,
      category,
      description,
      recommendedFor,
      ageRange,
      targetGroups,
      doseSchedule,
      howAdministered,
      sideEffects,
      patientInstructions,
      price,
      originalPrice,
      doses_required,
      age_group,
    } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({ error: "name and price are required" });
      return;
    }
    const priceError = validateVaccinePrices(price, originalPrice);
    if (priceError) { res.status(400).json({ error: priceError }); return; }

    const now = new Date().toISOString();
    const vaccine = {
      id: uuidv4(),
      name,
      manufacturer: manufacturer ?? null,
      vaccineType: vaccineType ?? null,
      category: category ?? null,
      description: description ?? null,
      recommendedFor: recommendedFor ?? null,
      ageRange: ageRange ?? null,
      targetGroups: targetGroups ?? [],
      doseSchedule: doseSchedule ?? null,
      howAdministered: howAdministered ?? null,
      sideEffects: sideEffects ?? null,
      patientInstructions: patientInstructions ?? null,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      doses_required: doses_required ?? 1,
      age_group: age_group ?? null,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };

    await vaccinesContainer.items.upsert(vaccine);
    res.status(201).json(vaccine);
  } catch (err) {
    console.error("Create vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/vaccines ──────────────────────────────────────────────────
router.get("/", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c ORDER BY c.createdAt DESC", parameters: [] })
      .fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get vaccines error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/vaccines/:vaccineId ───────────────────────────────────────
router.get("/:vaccineId", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: vaccineId }] })
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Vaccine not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/vaccines/:vaccineId ─────────────────────────────────────
router.patch("/:vaccineId", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: vaccineId }] })
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Vaccine not found" }); return; }

    const { price, originalPrice } = req.body;
    const priceError = validateVaccinePrices(price, originalPrice);
    if (priceError) { res.status(400).json({ error: priceError }); return; }

    const updated = {
      ...resources[0],
      ...req.body,
      ...(price !== undefined && { price: Number(price) }),
      ...(originalPrice !== undefined && { originalPrice: originalPrice ? Number(originalPrice) : null }),
      id: vaccineId,
      updatedAt: new Date().toISOString(),
    };
    await vaccinesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Update vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/vaccines/:vaccineId/approve ──────────────────────────────
// Clears a lab-added vaccine for patients to book. Mirrors adminLab.ts's
// test/lab approval. Admin-created vaccines never need this — they have no
// status field and are treated as approved everywhere.
router.post("/:vaccineId/approve", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: vaccineId }] })
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Vaccine not found" }); return; }

    const now = new Date().toISOString();
    const updated = {
      ...resources[0],
      status: "approved",
      approvedAt: now,
      rejectedAt: null,
      rejectedReason: null,
      updatedAt: now,
    };
    await vaccinesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Approve vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/vaccines/:vaccineId/reject ───────────────────────────────
router.post("/:vaccineId/reject", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) { res.status(400).json({ error: "A rejection reason is required." }); return; }

    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: vaccineId }] })
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Vaccine not found" }); return; }

    const now = new Date().toISOString();
    const updated = {
      ...resources[0],
      status: "rejected",
      rejectedAt: now,
      rejectedReason: reason,
      approvedAt: null,
      updatedAt: now,
    };
    await vaccinesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Reject vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/vaccines/:vaccineId/toggle ──────────────────────────────
router.patch("/:vaccineId/toggle", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: vaccineId }] })
      .fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Vaccine not found" }); return; }

    const vaccine = resources[0];
    const updated = { ...vaccine, is_active: !vaccine.is_active, updatedAt: new Date().toISOString() };
    await vaccinesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Toggle vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
