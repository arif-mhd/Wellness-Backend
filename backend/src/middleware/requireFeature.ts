import { Response, NextFunction } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { pool } from "../config/database";
import { resolveOrgId } from "../utils/orgScope";

// Blocks a route unless the caller's organization has this feature enabled.
// Mount after requireRole so req.session is guaranteed to exist.
//   router.post("/book", requireRole("patient"), requireFeature("vaccination"), handler)
export function requireFeature(featureKey: string) {
  return async (req: SessionRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = await resolveOrgId(req);
      const { rows } = await pool.query(
        `SELECT enabled FROM org_features WHERE org_id = $1 AND feature_key = $2`,
        [orgId, featureKey]
      );
      // No row means the feature was never configured for this org — treat
      // as disabled rather than silently allowing an un-provisioned feature.
      if (!rows[0]?.enabled) {
        res.status(403).json({ error: `This feature is not enabled for your organization.` });
        return;
      }
      next();
    } catch (err) {
      console.error(`[requireFeature:${featureKey}] lookup failed:`, err);
      res.status(500).json({ error: "Internal server error." });
    }
  };
}
