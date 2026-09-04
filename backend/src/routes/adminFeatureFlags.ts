import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { pool } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { FEATURE_DEFS, FEATURE_KEYS } from "../config/features";

const router = Router();

router.use(requireRole("admin"));

// ─── GET /api/admin/organizations/:orgId/features ────────────────────────────
// Returns every known feature key for this org, merging in FEATURE_DEFS so a
// feature added to the catalog after an org was created still shows up
// (defaulted to disabled) instead of silently missing from the toggle grid.
router.get("/:orgId/features", async (req: SessionRequest, res: Response) => {
  const { orgId } = req.params;
  try {
    const { rows: orgRows } = await pool.query(`SELECT id FROM organizations WHERE id = $1`, [orgId]);
    if (!orgRows[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    const { rows } = await pool.query(
      `SELECT feature_key, enabled, config FROM org_features WHERE org_id = $1`,
      [orgId]
    );
    const byKey = new Map(rows.map((r) => [r.feature_key, r]));

    const features = FEATURE_DEFS.map((def) => ({
      ...def,
      enabled: byKey.get(def.key)?.enabled ?? false,
      config: byKey.get(def.key)?.config ?? null,
    }));

    res.json({ features });
  } catch (err) {
    console.error("Get org features error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/admin/organizations/:orgId/features/:featureKey ────────────────
// Toggles a single feature. One flag per request keeps the audit log
// readable (one entry per actual change) rather than one opaque "settings
// updated" entry per grid save.
router.put("/:orgId/features/:featureKey", async (req: SessionRequest, res: Response) => {
  const { orgId, featureKey } = req.params;
  const { enabled, config } = req.body;

  if (!FEATURE_KEYS.includes(featureKey)) {
    res.status(400).json({ error: `Unknown feature key: ${featureKey}` });
    return;
  }
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean." });
    return;
  }
  const adminId = req.session!.getUserId();

  try {
    const { rows: orgRows } = await pool.query(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
    if (!orgRows[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO org_features (org_id, feature_key, enabled, config, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (org_id, feature_key)
       DO UPDATE SET enabled = $3, config = COALESCE($4, org_features.config), updated_at = NOW()
       RETURNING *`,
      [orgId, featureKey, enabled, config ?? null]
    );

    logActivity({
      source: "admin",
      action: enabled ? "Feature Enabled" : "Feature Disabled",
      details: `"${featureKey}" ${enabled ? "enabled" : "disabled"} for organization "${orgRows[0].name}"`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "organization",
      entityId: orgId,
    });

    res.json({ feature: rows[0] });
  } catch (err) {
    console.error("Update org feature error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/admin/organizations/:orgId/features/preset/:tier ───────────────
// Bulk-apply a plan-tier preset (e.g. an admin picks "Starter" then
// hand-adjusts). Presets live in code, not the DB, since they're a small,
// rarely-changing product decision rather than tenant data.
const PRESETS: Record<string, string[]> = {
  starter:    ["appointments", "prescriptions", "articles"],
  pro:        ["appointments", "prescriptions", "pharmacy", "lab_booking", "vaccination", "articles", "sos"],
  enterprise: FEATURE_KEYS,
};

router.put("/:orgId/features/preset/:tier", async (req: SessionRequest, res: Response) => {
  const { orgId, tier } = req.params;
  const preset = PRESETS[tier];
  if (!preset) {
    res.status(400).json({ error: `Unknown preset: ${tier}` });
    return;
  }
  const adminId = req.session!.getUserId();

  try {
    const { rows: orgRows } = await pool.query(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
    if (!orgRows[0]) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    for (const key of FEATURE_KEYS) {
      const enabled = preset.includes(key);
      await pool.query(
        `INSERT INTO org_features (org_id, feature_key, enabled, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (org_id, feature_key) DO UPDATE SET enabled = $3, updated_at = NOW()`,
        [orgId, key, enabled]
      );
    }
    await pool.query(`UPDATE organizations SET plan_tier = $2, updated_at = NOW() WHERE id = $1`, [orgId, tier]);

    logActivity({
      source: "admin",
      action: "Feature Preset Applied",
      details: `"${tier}" preset applied to organization "${orgRows[0].name}"`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "organization",
      entityId: orgId,
    });

    res.json({ status: "OK", tier, enabledFeatures: preset });
  } catch (err) {
    console.error("Apply feature preset error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
