import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";
import { pool } from "../config/database";
import { uploadBlob } from "../config/blob";
import { logActivity } from "../utils/activityLogger";
import { FEATURE_KEYS, DEFAULT_ORG_SLUG } from "../config/features";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireRole("admin"));

// ─── GET /api/admin/organizations ────────────────────────────────────────────
router.get("/", async (_req: SessionRequest, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM organizations ORDER BY created_at ASC`);
    res.json({ organizations: rows });
  } catch (err) {
    console.error("List organizations error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/organizations/:id ────────────────────────────────────────
router.get("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM organizations WHERE id = $1`, [req.params.id]);
    if (!rows[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }
    res.json({ organization: rows[0] });
  } catch (err) {
    console.error("Get organization error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/organizations ───────────────────────────────────────────
// Creates a new tenant. New orgs start with every feature disabled — a
// super-admin opts them in explicitly via the entitlements endpoints below,
// rather than inheriting whatever the default org happens to have enabled.
router.post("/", async (req: SessionRequest, res: Response) => {
  const { slug, name, supportEmail, supportPhone, planTier } = req.body;
  if (!slug || !name) {
    res.status(400).json({ error: "slug and name are required." });
    return;
  }
  const adminId = req.session!.getUserId();

  try {
    const { rows } = await pool.query(
      `INSERT INTO organizations (slug, name, support_email, support_phone, plan_tier)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'starter'))
       RETURNING *`,
      [slug, name, supportEmail ?? null, supportPhone ?? null, planTier ?? null]
    );
    const org = rows[0];

    for (const key of FEATURE_KEYS) {
      await pool.query(
        `INSERT INTO org_features (org_id, feature_key, enabled) VALUES ($1, $2, false)`,
        [org.id, key]
      );
    }

    logActivity({
      source: "admin",
      action: "Organization Created",
      details: `Organization "${name}" (${slug}) created`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "organization",
      entityId: org.id,
    });

    res.status(201).json({ organization: org });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "An organization with this slug already exists." });
      return;
    }
    console.error("Create organization error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/admin/organizations/:id ────────────────────────────────────────
// Branding + contact fields only. Slug is intentionally immutable once
// created — it's baked into subdomains/deep-link schemes downstream.
router.put("/:id", async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const {
    name, primaryColor, secondaryColor, supportEmail, supportPhone,
    appBundleId, playStoreUrl, appStoreUrl, planTier,
  } = req.body;
  const adminId = req.session!.getUserId();

  try {
    const { rows } = await pool.query(
      `UPDATE organizations SET
         name            = COALESCE($2, name),
         primary_color   = COALESCE($3, primary_color),
         secondary_color = COALESCE($4, secondary_color),
         support_email   = COALESCE($5, support_email),
         support_phone   = COALESCE($6, support_phone),
         app_bundle_id   = COALESCE($7, app_bundle_id),
         play_store_url  = COALESCE($8, play_store_url),
         app_store_url   = COALESCE($9, app_store_url),
         plan_tier       = COALESCE($10, plan_tier),
         updated_at      = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, primaryColor, secondaryColor, supportEmail, supportPhone, appBundleId, playStoreUrl, appStoreUrl, planTier]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    logActivity({
      source: "admin",
      action: "Organization Updated",
      details: `Organization "${rows[0].name}" branding/settings updated`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "organization",
      entityId: id,
    });

    res.json({ organization: rows[0] });
  } catch (err) {
    console.error("Update organization error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/organizations/:id/logo ──────────────────────────────────
router.post("/:id/logo", upload.single("logo"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }
  const adminId = req.session!.getUserId();

  try {
    const blobPath = `organizations/${id}/logo-${uuidv4()}.${req.file.mimetype.split("/")[1] || "png"}`;
    const url = await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);

    const { rows } = await pool.query(
      `UPDATE organizations SET logo_url = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, url]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    logActivity({
      source: "admin",
      action: "Organization Logo Updated",
      details: `Logo updated for organization "${rows[0].name}"`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "organization",
      entityId: id,
    });

    res.json({ organization: rows[0] });
  } catch (err) {
    console.error("Upload organization logo error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/admin/organizations/:id ─────────────────────────────────────
// Blocked for the seeded default org — deleting it would strand every
// existing clinic/patient, which today all implicitly resolve to it
// (see orgScope.ts) since no org_id migration has run yet.
router.delete("/:id", async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { rows: existing } = await pool.query(`SELECT slug, name FROM organizations WHERE id = $1`, [id]);
    if (!existing[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }
    if (existing[0].slug === DEFAULT_ORG_SLUG) {
      res.status(400).json({ error: "The default organization cannot be deleted." });
      return;
    }

    await pool.query(`DELETE FROM organizations WHERE id = $1`, [id]);

    logActivity({
      source: "admin",
      action: "Organization Deleted",
      details: `Organization "${existing[0].name}" deleted`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "organization",
      entityId: id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete organization error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
