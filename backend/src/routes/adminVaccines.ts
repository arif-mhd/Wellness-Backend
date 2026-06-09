import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { vaccinesContainer } from "../config/cosmos";

const router = Router();

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

    const updated = { ...resources[0], ...req.body, id: vaccineId, updatedAt: new Date().toISOString() };
    await vaccinesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Update vaccine error:", err);
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
