import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { faqsContainer } from "../config/cosmos";
import { pool } from "../config/database";
import {
  FAQ_DEEP_LINKS,
  FaqCategoryDoc,
  FaqEntryDoc,
  getEnabledFeatureKeys,
  invalidateFaqCache,
  isKnownDeepLink,
  readOrgFaq,
} from "../utils/faq";
import { DEFAULT_FAQ } from "../data/faqDefaults";

const router = Router();
router.use(requireRole("admin"));

const MAX_TITLE = 80;
const MAX_QUESTION = 200;
const MAX_ANSWER = 2000;

// orgId is the partition key, so a typo would silently create a new, empty
// FAQ that no patient ever sees. Reject anything that isn't a real brand.
async function requireOrg(orgId: unknown, res: Response): Promise<string | null> {
  if (typeof orgId !== "string" || !orgId.trim()) {
    res.status(400).json({ error: "orgId is required." });
    return null;
  }
  const { rows } = await pool.query(`SELECT id FROM organizations WHERE id::text = $1`, [orgId]);
  if (!rows.length) {
    res.status(404).json({ error: "Organization not found." });
    return null;
  }
  return orgId;
}

const cleanText = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
};

const nextOrder = (docs: { order: number }[]) => (docs.length ? Math.max(...docs.map((d) => d.order)) + 1 : 0);

// GET /api/admin/faq?orgId= — everything for one brand, hidden entries
// included, plus the "Open this screen" targets an answer may use.
router.get("/", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.query.orgId, res);
    if (!orgId) return;
    const { categories, entries } = await readOrgFaq(orgId);
    res.json({
      categories,
      entries,
      deepLinks: Object.entries(FAQ_DEEP_LINKS).map(([key, v]) => ({ key, label: v.label, feature: v.feature ?? null })),
    });
  } catch (err) {
    console.error("[admin faq] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Categories ───────────────────────────────────────────────────────────────

router.post("/categories", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.body?.orgId, res);
    if (!orgId) return;
    const title = cleanText(req.body?.title, MAX_TITLE);
    if (!title) { res.status(400).json({ error: `Title is required (max ${MAX_TITLE} characters).` }); return; }

    const { categories } = await readOrgFaq(orgId);
    const now = new Date().toISOString();
    const doc: FaqCategoryDoc = {
      id: `cat-${uuidv4()}`, orgId, docType: "category", title,
      order: nextOrder(categories), isActive: true, createdAt: now, updatedAt: now,
    };
    await faqsContainer.items.create(doc);
    invalidateFaqCache(orgId);
    res.status(201).json({ category: doc });
  } catch (err) {
    console.error("[admin faq] create category error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/categories/:id", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.body?.orgId, res);
    if (!orgId) return;
    const { resource } = await faqsContainer.item(req.params.id, orgId).read<FaqCategoryDoc>().catch(() => ({ resource: undefined }));
    if (!resource || resource.docType !== "category") { res.status(404).json({ error: "Category not found." }); return; }

    const updated: FaqCategoryDoc = { ...resource, updatedAt: new Date().toISOString() };
    if (req.body.title !== undefined) {
      const title = cleanText(req.body.title, MAX_TITLE);
      if (!title) { res.status(400).json({ error: `Title is required (max ${MAX_TITLE} characters).` }); return; }
      updated.title = title;
    }
    if (typeof req.body.isActive === "boolean") updated.isActive = req.body.isActive;
    if (Number.isInteger(req.body.order)) updated.order = req.body.order;

    await faqsContainer.items.upsert(updated);
    invalidateFaqCache(orgId);
    res.json({ category: updated });
  } catch (err) {
    console.error("[admin faq] update category error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.query.orgId, res);
    if (!orgId) return;
    const { entries } = await readOrgFaq(orgId);
    // Refused rather than cascading: deleting a category should never take a
    // dozen written answers with it by surprise. Move or delete them first.
    if (entries.some((e) => e.categoryId === req.params.id)) {
      res.status(409).json({ error: "This category still has questions. Move or delete them first." });
      return;
    }
    await faqsContainer.item(req.params.id, orgId).delete().catch((e: any) => { if (e.code !== 404) throw e; });
    invalidateFaqCache(orgId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin faq] delete category error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Entries ──────────────────────────────────────────────────────────────────

// Shared validation for create and update. Returns the fields to apply, or
// sends a 400 and returns null.
function readEntryFields(
  body: any,
  res: Response,
  existingIds: Set<string>,
  categoryIds: Set<string>,
  selfId: string | null,
  partial: boolean
): Partial<FaqEntryDoc> | null {
  const out: Partial<FaqEntryDoc> = {};

  if (!partial || body.categoryId !== undefined) {
    if (typeof body.categoryId !== "string" || !categoryIds.has(body.categoryId)) {
      res.status(400).json({ error: "Choose a valid category." }); return null;
    }
    out.categoryId = body.categoryId;
  }
  if (!partial || body.question !== undefined) {
    const q = cleanText(body.question, MAX_QUESTION);
    if (!q) { res.status(400).json({ error: `Question is required (max ${MAX_QUESTION} characters).` }); return null; }
    out.question = q;
  }
  if (!partial || body.answer !== undefined) {
    const a = cleanText(body.answer, MAX_ANSWER);
    if (!a) { res.status(400).json({ error: `Answer is required (max ${MAX_ANSWER} characters).` }); return null; }
    out.answer = a;
  }
  if (body.relatedIds !== undefined) {
    if (!Array.isArray(body.relatedIds)) { res.status(400).json({ error: "relatedIds must be a list." }); return null; }
    out.relatedIds = [...new Set(body.relatedIds as unknown[])]
      .filter((id): id is string => typeof id === "string" && id !== selfId && existingIds.has(id))
      .slice(0, 6);
  } else if (!partial) {
    out.relatedIds = [];
  }
  if (body.deepLink !== undefined) {
    if (body.deepLink !== null && body.deepLink !== "" && !isKnownDeepLink(body.deepLink)) {
      res.status(400).json({ error: "Unknown screen for “Open this screen”." }); return null;
    }
    out.deepLink = body.deepLink || null;
  } else if (!partial) {
    out.deepLink = null;
  }
  if (typeof body.isActive === "boolean") out.isActive = body.isActive;
  else if (!partial) out.isActive = true;
  // Admins clear a review note by marking the entry reviewed; they never set one.
  if (body.reviewNote === null) out.reviewNote = null;
  if (Number.isInteger(body.order)) out.order = body.order;
  return out;
}

router.post("/entries", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.body?.orgId, res);
    if (!orgId) return;
    const { categories, entries } = await readOrgFaq(orgId);
    const fields = readEntryFields(
      req.body, res, new Set(entries.map((e) => e.id)), new Set(categories.map((c) => c.id)), null, false
    );
    if (!fields) return;

    const now = new Date().toISOString();
    const doc: FaqEntryDoc = {
      id: `faq-${uuidv4()}`, orgId, docType: "entry",
      categoryId: fields.categoryId!, question: fields.question!, answer: fields.answer!,
      relatedIds: fields.relatedIds ?? [], deepLink: fields.deepLink ?? null,
      order: nextOrder(entries.filter((e) => e.categoryId === fields.categoryId)),
      isActive: fields.isActive ?? true, reviewNote: null, createdAt: now, updatedAt: now,
    };
    await faqsContainer.items.create(doc);
    invalidateFaqCache(orgId);
    res.status(201).json({ entry: doc });
  } catch (err) {
    console.error("[admin faq] create entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/entries/:id", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.body?.orgId, res);
    if (!orgId) return;
    const { categories, entries } = await readOrgFaq(orgId);
    const existing = entries.find((e) => e.id === req.params.id);
    if (!existing) { res.status(404).json({ error: "Question not found." }); return; }

    const fields = readEntryFields(
      req.body, res, new Set(entries.map((e) => e.id)), new Set(categories.map((c) => c.id)), existing.id, true
    );
    if (!fields) return;

    const updated: FaqEntryDoc = { ...existing, ...fields, updatedAt: new Date().toISOString() };
    // A draft flagged for review states policy nobody has confirmed yet. It
    // can't be published until someone has read it and marked it reviewed.
    if (updated.isActive && updated.reviewNote) {
      res.status(400).json({ error: "Mark this answer as reviewed before making it visible to patients." });
      return;
    }
    await faqsContainer.items.upsert(updated);
    invalidateFaqCache(orgId);
    res.json({ entry: updated });
  } catch (err) {
    console.error("[admin faq] update entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/entries/:id", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.query.orgId, res);
    if (!orgId) return;
    const { entries } = await readOrgFaq(orgId);
    const id = req.params.id;
    await faqsContainer.item(id, orgId).delete().catch((e: any) => { if (e.code !== 404) throw e; });
    // Drop it from every "View related issues" list that pointed at it.
    for (const e of entries) {
      if (e.id !== id && e.relatedIds?.includes(id)) {
        await faqsContainer.items.upsert({ ...e, relatedIds: e.relatedIds.filter((r) => r !== id), updatedAt: new Date().toISOString() });
      }
    }
    invalidateFaqCache(orgId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin faq] delete entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Defaults ─────────────────────────────────────────────────────────────────

// POST /api/admin/faq/seed { orgId } — loads the default FAQ for a brand.
// Only content for the brand's enabled features is loaded. Safe to repeat:
// ids are fixed per default entry, and anything that already exists is left
// exactly as the admin last edited it. Entries carrying a review note go in
// hidden, so a policy nobody has confirmed is never shown to patients.
router.post("/seed", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await requireOrg(req.body?.orgId, res);
    if (!orgId) return;
    const features = await getEnabledFeatureKeys(orgId);
    const allowed = (feature?: string) => !feature || features.has(feature);

    const { categories, entries } = await readOrgFaq(orgId);
    const haveIds = new Set([...categories.map((c) => c.id), ...entries.map((e) => e.id)]);

    const wanted = DEFAULT_FAQ.filter((c) => allowed(c.feature))
      .map((c) => ({ ...c, entries: c.entries.filter((e) => allowed(e.feature)) }))
      .filter((c) => c.entries.length > 0);
    const seededEntryIds = new Set(wanted.flatMap((c) => c.entries.map((e) => `faq-${e.key}`)));

    const now = new Date().toISOString();
    let createdCategories = 0, createdEntries = 0, hidden = 0;
    let catOrder = nextOrder(categories);

    for (const c of wanted) {
      const categoryId = `cat-${c.key}`;
      if (!haveIds.has(categoryId)) {
        const doc: FaqCategoryDoc = {
          id: categoryId, orgId, docType: "category", title: c.title,
          order: catOrder++, isActive: true, createdAt: now, updatedAt: now,
        };
        await faqsContainer.items.create(doc);
        createdCategories++;
      }
      let entryOrder = nextOrder(entries.filter((e) => e.categoryId === categoryId));
      for (const e of c.entries) {
        const id = `faq-${e.key}`;
        if (haveIds.has(id)) continue;
        const doc: FaqEntryDoc = {
          id, orgId, docType: "entry", categoryId,
          question: e.question, answer: e.answer,
          // Only link to defaults that were actually loaded for this brand.
          relatedIds: (e.related ?? []).map((k) => `faq-${k}`).filter((rid) => seededEntryIds.has(rid) || haveIds.has(rid)),
          deepLink: e.deepLink && isKnownDeepLink(e.deepLink) && allowed(FAQ_DEEP_LINKS[e.deepLink].feature) ? e.deepLink : null,
          order: entryOrder++,
          isActive: !e.reviewNote,
          reviewNote: e.reviewNote ?? null,
          createdAt: now, updatedAt: now,
        };
        await faqsContainer.items.create(doc);
        createdEntries++;
        if (e.reviewNote) hidden++;
      }
    }

    invalidateFaqCache(orgId);
    res.json({ createdCategories, createdEntries, hiddenForReview: hidden });
  } catch (err) {
    console.error("[admin faq] seed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
