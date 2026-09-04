import { Router, Request, Response } from "express";
import { SUPPORTED_LANGUAGES } from "../utils/languages";
import { pool } from "../config/database";
import { DEFAULT_ORG_SLUG } from "../config/features";

const router = Router();

// GET /api/meta/languages
// Public — the shared vocabulary every client (mobile app, doctor-portal)
// should pick spoken languages from, so a doctor's `languages` and a
// patient's `language` can be compared with a plain string match instead of
// fuzzy free-text.
router.get("/languages", (_req: Request, res: Response) => {
  res.json({ languages: SUPPORTED_LANGUAGES.map((l) => l.name) });
});

// GET /api/meta/branding?org=acme
// Public — every frontend (admin/doctor/pharmacy portals, patient app) calls
// this on boot to pick up this org's colors/logo and enabled feature list.
// Falls back to DEFAULT_ORG_SLUG since no caller can pass ?org= yet (no
// subdomain/build-time org resolution wired up on any frontend so far) —
// once that lands, this stays the single place branding is resolved from.
router.get("/branding", async (req: Request, res: Response) => {
  const slug = typeof req.query.org === "string" ? req.query.org : DEFAULT_ORG_SLUG;

  try {
    const { rows } = await pool.query(`SELECT * FROM organizations WHERE slug = $1`, [slug]);
    if (!rows[0]) {
      res.status(404).json({ error: `Unknown organization: ${slug}` });
      return;
    }
    const org = rows[0];

    const { rows: featureRows } = await pool.query(
      `SELECT feature_key FROM org_features WHERE org_id = $1 AND enabled = true`,
      [org.id]
    );

    res.json({
      branding: {
        slug: org.slug,
        name: org.name,
        logoUrl: org.logo_url,
        faviconUrl: org.favicon_url,
        primaryColor: org.primary_color,
        secondaryColor: org.secondary_color,
        supportEmail: org.support_email,
        supportPhone: org.support_phone,
      },
      enabledFeatures: featureRows.map((r) => r.feature_key),
    });
  } catch (err) {
    console.error("Get branding error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
