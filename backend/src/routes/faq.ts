import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { resolveOrgId } from "../utils/orgScope";
import { readOrgFaq, toPublicFaq } from "../utils/faq";

const router = Router();
router.use(requireRole("patient"));

// GET /api/faq — the caller's brand's published Help & FAQ.
// Deliberately not behind a feature flag: a brand with no FAQ content gets an
// empty list and the app shows nothing, so turning FAQ on for a brand is just
// a matter of adding its content in the admin portal.
router.get("/", async (req: SessionRequest, res: Response) => {
  try {
    const orgId = await resolveOrgId(req);
    const { categories, entries } = await readOrgFaq(orgId);
    res.json({ categories: toPublicFaq(categories, entries) });
  } catch (err) {
    console.error("[faq] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
