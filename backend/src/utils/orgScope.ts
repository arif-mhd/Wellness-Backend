import { SessionRequest } from "supertokens-node/framework/express";
import { pool } from "../config/database";
import { DEFAULT_ORG_SLUG } from "../config/features";

let defaultOrgIdCache: string | null = null;

async function getDefaultOrgId(): Promise<string> {
  if (defaultOrgIdCache) return defaultOrgIdCache;
  const { rows } = await pool.query(`SELECT id FROM organizations WHERE slug = $1`, [DEFAULT_ORG_SLUG]);
  if (!rows[0]) throw new Error(`Default organization '${DEFAULT_ORG_SLUG}' is not seeded — check initDb().`);
  defaultOrgIdCache = rows[0].id;
  return defaultOrgIdCache!;
}

// Resolves which organization a request belongs to. Clinics/doctors/patients
// don't carry an org_id yet (that migration is a later step — see the
// white-label plan's §2), so every caller resolves to the single seeded
// default org for now. Centralizing the lookup here means that migration
// only has to change this one function, not every route that calls it.
export async function resolveOrgId(_req: SessionRequest): Promise<string> {
  return getDefaultOrgId();
}
