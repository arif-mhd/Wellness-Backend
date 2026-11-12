import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { previsitTemplatesContainer } from "../config/cosmos";
import { listTemplates, matchTemplate, sanitizeTemplateInput, PrevisitTemplate } from "../utils/previsitTemplates";

const router = Router();
router.use(requireRole("admin"));

// ─── GET /api/admin/previsit-templates ───────────────────────────────────────
router.get("/", async (_req: SessionRequest, res: Response) => {
  try {
    res.json(await listTemplates());
  } catch (err) {
    console.error("List pre-visit templates error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/previsit-templates/preview ──────────────────────────────
// Which template a given visit reason would get (no AI call) — lets an admin
// test their keywords before a patient hits them. Body: { reason }.
router.post("/preview", async (req: SessionRequest, res: Response) => {
  try {
    const reason = String(req.body?.reason ?? "").slice(0, 300);
    const templates = await listTemplates();
    const matched = matchTemplate(reason, templates);
    res.json({
      matched: matched ? { id: matched.id, name: matched.name } : null,
      note: matched ? null : "No template matches — patients would get AI-generated questions (or the General form if AI is unavailable).",
    });
  } catch (err) {
    console.error("Preview pre-visit template error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/previsit-templates ──────────────────────────────────────
router.post("/", async (req: SessionRequest, res: Response) => {
  try {
    const parsed = sanitizeTemplateInput(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const now = new Date().toISOString();
    const doc: PrevisitTemplate = {
      id: uuidv4(),
      ...parsed.value,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };
    await previsitTemplatesContainer.items.upsert(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error("Create pre-visit template error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/previsit-templates/:id/toggle ──────────────────────────
router.patch("/:id/toggle", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await previsitTemplatesContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Template not found" }); return; }
    if (resource.isDefault) { res.status(400).json({ error: "The General form is the fallback and can't be switched off." }); return; }
    const updated = { ...resource, is_active: !resource.is_active, updatedAt: new Date().toISOString() };
    await previsitTemplatesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Toggle pre-visit template error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/previsit-templates/:id ─────────────────────────────────
router.patch("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await previsitTemplatesContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Template not found" }); return; }

    const parsed = sanitizeTemplateInput(req.body, { isDefault: !!resource.isDefault });
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }

    const updated = {
      ...resource,
      ...parsed.value,
      // The fallback form never matches by keyword.
      keywords: resource.isDefault ? [] : parsed.value.keywords,
      updatedAt: new Date().toISOString(),
    };
    await previsitTemplatesContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Update pre-visit template error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/admin/previsit-templates/:id ────────────────────────────────
router.delete("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await previsitTemplatesContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Template not found" }); return; }
    if (resource.isDefault) { res.status(400).json({ error: "The General form is the fallback and can't be deleted." }); return; }
    await previsitTemplatesContainer.item(id, id).delete();
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete pre-visit template error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
