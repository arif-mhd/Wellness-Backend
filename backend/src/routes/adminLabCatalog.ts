import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { labTestCatalogContainer, labTestsContainer } from "../config/cosmos";

const router = Router();
router.use(requireRole("admin"));

// The fields a catalog test owns. A lab test linked to a catalog test takes
// these from the catalog (never from the lab), so every lab offering the same
// test shows the same name/category and — importantly — the same
// requires_doctor_approval decision, which only an admin gets to make.
export function catalogOwnedFields(catalog: any) {
  return {
    name: catalog.name,
    category: catalog.category,
    description: catalog.description ?? "",
    requires_fasting: !!catalog.requires_fasting,
    requires_doctor_approval: !!catalog.requires_doctor_approval,
    recommendedFor: catalog.recommendedFor ?? "",
    howItsDone: catalog.howItsDone ?? "",
    patientInstructions: catalog.patientInstructions ?? "",
  };
}

// ─── POST /api/admin/lab-catalog ──────────────────────────────────────────────
router.post("/", async (req: SessionRequest, res: Response) => {
  try {
    const { name, category, description, requires_fasting, requires_doctor_approval, recommendedFor, howItsDone, patientInstructions } = req.body;
    if (!name || !category) {
      res.status(400).json({ error: "name and category are required" });
      return;
    }
    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      name: String(name).trim(),
      category: String(category).trim(),
      description: description ?? "",
      requires_fasting: !!requires_fasting,
      requires_doctor_approval: !!requires_doctor_approval,
      recommendedFor: recommendedFor ?? "",
      howItsDone: howItsDone ?? "",
      patientInstructions: patientInstructions ?? "",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };
    await labTestCatalogContainer.items.upsert(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error("Create lab catalog test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab-catalog ───────────────────────────────────────────────
// Each entry also carries labCount: how many lab tests are linked to it.
router.get("/", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await labTestCatalogContainer.items
      .query({ query: "SELECT * FROM c ORDER BY c.name ASC" })
      .fetchAll();
    const { resources: linked } = await labTestsContainer.items
      .query({ query: "SELECT c.catalogTestId FROM c WHERE IS_DEFINED(c.catalogTestId) AND c.catalogTestId != null" })
      .fetchAll();
    const counts = new Map<string, number>();
    linked.forEach((t: any) => counts.set(t.catalogTestId, (counts.get(t.catalogTestId) ?? 0) + 1));
    res.json(resources.map((c: any) => ({ ...c, labCount: counts.get(c.id) ?? 0 })));
  } catch (err) {
    console.error("Get lab catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab-catalog/unlinked-tests ────────────────────────────────
// Lab tests not tied to any catalog test (custom, or created before the
// catalog existed) — candidates to link so they group with the others.
router.get("/unlinked-tests", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await labTestsContainer.items
      .query({ query: "SELECT c.id, c.labId, c.labName, c.name, c.category, c.price FROM c WHERE NOT IS_DEFINED(c.catalogTestId) OR c.catalogTestId = null ORDER BY c.name ASC" })
      .fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get unlinked lab tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/lab-catalog/tests/:labId/:testId/link ───────────────────
// Body { catalogTestId: string | null }. Linking copies the catalog-owned
// fields onto the lab test; unlinking just clears the link (the lab test keeps
// whatever values it has and goes back to being a standalone custom test).
router.patch("/tests/:labId/:testId/link", async (req: SessionRequest, res: Response) => {
  try {
    const { labId, testId } = req.params;
    const { catalogTestId } = req.body;

    const { resource: test } = await labTestsContainer.item(testId, labId).read();
    if (!test) { res.status(404).json({ error: "Lab test not found" }); return; }

    let updated;
    if (catalogTestId) {
      const { resource: catalog } = await labTestCatalogContainer.item(catalogTestId, catalogTestId).read();
      if (!catalog) { res.status(404).json({ error: "Catalog test not found" }); return; }

      const { resources: dupes } = await labTestsContainer.items.query({
        query: "SELECT c.id FROM c WHERE c.labId = @labId AND c.catalogTestId = @cid AND c.id != @id",
        parameters: [{ name: "@labId", value: labId }, { name: "@cid", value: catalogTestId }, { name: "@id", value: testId }],
      }, { partitionKey: labId }).fetchAll();
      if (dupes.length) { res.status(409).json({ error: "This lab already offers that catalog test." }); return; }

      updated = { ...test, ...catalogOwnedFields(catalog), catalogTestId, updatedAt: new Date().toISOString() };
    } else {
      updated = { ...test, catalogTestId: null, updatedAt: new Date().toISOString() };
    }
    await labTestsContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Link lab test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/lab-catalog/:id/toggle ──────────────────────────────────
router.patch("/:id/toggle", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await labTestCatalogContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Catalog test not found" }); return; }
    const updated = { ...resource, is_active: !resource.is_active, updatedAt: new Date().toISOString() };
    await labTestCatalogContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Toggle lab catalog test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/lab-catalog/:id ─────────────────────────────────────────
// Edits a catalog test and pushes the catalog-owned fields down to every lab
// test linked to it, so the approval flag and wording stay consistent.
router.patch("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await labTestCatalogContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Catalog test not found" }); return; }

    const allowed = ["name", "category", "description", "requires_fasting", "requires_doctor_approval", "recommendedFor", "howItsDone", "patientInstructions"];
    const patch: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const updated = { ...resource, ...patch, updatedAt: new Date().toISOString() };
    await labTestCatalogContainer.items.upsert(updated);

    const { resources: linked } = await labTestsContainer.items
      .query({ query: "SELECT * FROM c WHERE c.catalogTestId = @cid", parameters: [{ name: "@cid", value: id }] })
      .fetchAll();
    await Promise.all(linked.map((t: any) =>
      labTestsContainer.items.upsert({ ...t, ...catalogOwnedFields(updated), updatedAt: updated.updatedAt })
    ));

    res.json(updated);
  } catch (err) {
    console.error("Update lab catalog test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
