import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { vaccineCatalogContainer, vaccinesContainer } from "../config/cosmos";

// Mirrors adminLabCatalog.ts: admins keep one unpriced entry per vaccine, and
// each lab picks from it and sets only its own price (POST /api/lab/vaccines
// with catalogVaccineId).
const router = Router();
router.use(requireRole("admin"));

// The fields a catalog vaccine owns. A lab vaccine linked to a catalog vaccine
// takes these from the catalog (never from the lab), so every lab offering the
// same vaccine shows the same name and clinical details. Manufacturer and
// price are deliberately not here — each lab sets those for its own offering.
export function catalogOwnedVaccineFields(catalog: any) {
  return {
    name: catalog.name,
    category: catalog.category,
    description: catalog.description ?? "",
    ageRange: catalog.ageRange ?? "",
    doses_required: Number(catalog.doses_required ?? 1),
    recommendedFor: catalog.recommendedFor ?? "",
    howAdministered: catalog.howAdministered ?? "",
    sideEffects: catalog.sideEffects ?? "",
    patientInstructions: catalog.patientInstructions ?? "",
  };
}

const EDITABLE_FIELDS = ["name", "category", "description", "ageRange", "doses_required", "recommendedFor", "howAdministered", "sideEffects", "patientInstructions"];

function validDoses(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1;
}

// ─── POST /api/admin/vaccine-catalog ──────────────────────────────────────────
router.post("/", async (req: SessionRequest, res: Response) => {
  try {
    const { name, category, description, ageRange, doses_required, recommendedFor, howAdministered, sideEffects, patientInstructions } = req.body;
    if (!name || !category) {
      res.status(400).json({ error: "name and category are required" });
      return;
    }
    if (doses_required !== undefined && doses_required !== "" && !validDoses(doses_required)) {
      res.status(400).json({ error: "doses_required must be a whole number of at least 1" });
      return;
    }
    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      name: String(name).trim(),
      category: String(category).trim(),
      description: description ?? "",
      ageRange: ageRange ?? "",
      doses_required: doses_required ? Number(doses_required) : 1,
      recommendedFor: recommendedFor ?? "",
      howAdministered: howAdministered ?? "",
      sideEffects: sideEffects ?? "",
      patientInstructions: patientInstructions ?? "",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };
    await vaccineCatalogContainer.items.upsert(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error("Create vaccine catalog entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/vaccine-catalog ───────────────────────────────────────────
// Each entry also carries labCount: how many lab vaccines are linked to it.
router.get("/", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await vaccineCatalogContainer.items
      .query({ query: "SELECT * FROM c ORDER BY c.name ASC" })
      .fetchAll();
    const { resources: linked } = await vaccinesContainer.items
      .query({ query: "SELECT c.catalogVaccineId FROM c WHERE IS_DEFINED(c.labId) AND c.labId != null AND IS_DEFINED(c.catalogVaccineId) AND c.catalogVaccineId != null" })
      .fetchAll();
    const counts = new Map<string, number>();
    linked.forEach((v: any) => counts.set(v.catalogVaccineId, (counts.get(v.catalogVaccineId) ?? 0) + 1));
    res.json(resources.map((c: any) => ({ ...c, labCount: counts.get(c.id) ?? 0 })));
  } catch (err) {
    console.error("Get vaccine catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/vaccine-catalog/unlinked-vaccines ─────────────────────────
// Custom vaccines added by labs (not tied to any catalog vaccine) — candidates
// to link so they group with the others.
router.get("/unlinked-vaccines", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await vaccinesContainer.items
      .query({ query: "SELECT c.id, c.labId, c.labName, c.name, c.category, c.price FROM c WHERE IS_DEFINED(c.labId) AND c.labId != null AND (NOT IS_DEFINED(c.catalogVaccineId) OR c.catalogVaccineId = null) ORDER BY c.name ASC" })
      .fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get unlinked lab vaccines error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/vaccine-catalog/vaccines/:vaccineId/link ────────────────
// Body { catalogVaccineId: string | null }. Linking copies the catalog-owned
// fields onto the lab vaccine; unlinking just clears the link (the lab vaccine
// keeps whatever values it has and goes back to being a custom vaccine).
// vaccines is partitioned on /id.
router.patch("/vaccines/:vaccineId/link", async (req: SessionRequest, res: Response) => {
  try {
    const { vaccineId } = req.params;
    const { catalogVaccineId } = req.body;

    const { resource: vaccine } = await vaccinesContainer.item(vaccineId, vaccineId).read();
    if (!vaccine || !vaccine.labId) { res.status(404).json({ error: "Lab vaccine not found" }); return; }

    let updated;
    if (catalogVaccineId) {
      const { resource: catalog } = await vaccineCatalogContainer.item(catalogVaccineId, catalogVaccineId).read();
      if (!catalog) { res.status(404).json({ error: "Catalog vaccine not found" }); return; }

      const { resources: dupes } = await vaccinesContainer.items.query({
        query: "SELECT c.id FROM c WHERE c.labId = @labId AND c.catalogVaccineId = @cid AND c.id != @id",
        parameters: [{ name: "@labId", value: vaccine.labId }, { name: "@cid", value: catalogVaccineId }, { name: "@id", value: vaccineId }],
      }).fetchAll();
      if (dupes.length) { res.status(409).json({ error: "This lab already offers that catalog vaccine." }); return; }

      updated = { ...vaccine, ...catalogOwnedVaccineFields(catalog), catalogVaccineId, updatedAt: new Date().toISOString() };
    } else {
      updated = { ...vaccine, catalogVaccineId: null, updatedAt: new Date().toISOString() };
    }
    await vaccinesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Link lab vaccine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/vaccine-catalog/:id/toggle ──────────────────────────────
router.patch("/:id/toggle", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await vaccineCatalogContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Catalog vaccine not found" }); return; }
    const updated = { ...resource, is_active: !resource.is_active, updatedAt: new Date().toISOString() };
    await vaccineCatalogContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Toggle vaccine catalog entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/vaccine-catalog/:id ─────────────────────────────────────
// Edits a catalog vaccine and pushes the catalog-owned fields down to every
// lab vaccine linked to it, so the wording stays consistent.
router.patch("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await vaccineCatalogContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Catalog vaccine not found" }); return; }

    if (req.body.doses_required !== undefined && !validDoses(req.body.doses_required)) {
      res.status(400).json({ error: "doses_required must be a whole number of at least 1" });
      return;
    }
    const patch: any = {};
    for (const k of EDITABLE_FIELDS) if (req.body[k] !== undefined) patch[k] = req.body[k];
    if (patch.doses_required !== undefined) patch.doses_required = Number(patch.doses_required);
    const updated = { ...resource, ...patch, updatedAt: new Date().toISOString() };
    await vaccineCatalogContainer.items.upsert(updated);

    const { resources: linked } = await vaccinesContainer.items
      .query({ query: "SELECT * FROM c WHERE c.catalogVaccineId = @cid", parameters: [{ name: "@cid", value: id }] })
      .fetchAll();
    await Promise.all(linked.map((v: any) =>
      vaccinesContainer.items.upsert({ ...v, ...catalogOwnedVaccineFields(updated), updatedAt: updated.updatedAt })
    ));

    res.json(updated);
  } catch (err) {
    console.error("Update vaccine catalog entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
