/**
 * One-time backfill for the white-label `tenantId` field. `tenantId` is only
 * ever stamped at registration time (see patients.ts/clinics.ts/pharmacy.ts
 * POST /register and orgScope.ts's resolveOrgIdForRegistration) — every
 * clinic/patient/pharmacy doc created before that field existed has no
 * tenantId at all. Org-scoped reads (GET /api/doctors, GET /api/clinics —
 * see orgScope.ts's getClinicIdsForOrg) filter strictly by tenantId, so
 * without this backfill every pre-existing doc, including the default
 * "wellness" org's own current data, would silently vanish from every
 * brand's app once that filter shipped.
 *
 * This sets tenantId = the default org's id (DEFAULT_ORG_SLUG, "wellness")
 * on every clinic/patient/pharmacy doc that doesn't already have one. Docs
 * that already carry a tenantId (registered after white-labeling shipped)
 * are left untouched.
 *
 * Defaults to a DRY RUN — prints what it would change without writing.
 *   npx ts-node src/scripts/backfillDefaultTenantId.ts
 * Pass --apply to actually perform the writes:
 *   npx ts-node src/scripts/backfillDefaultTenantId.ts --apply
 */

import "dotenv/config";
import { pool } from "../config/database";
import { DEFAULT_ORG_SLUG } from "../config/features";
import { clinicsContainer, patientsContainer, pharmaciesContainer } from "../config/cosmos";

const APPLY = process.argv.includes("--apply");

async function getDefaultOrgId(): Promise<string> {
  const { rows } = await pool.query(`SELECT id FROM organizations WHERE slug = $1`, [DEFAULT_ORG_SLUG]);
  if (!rows[0]) throw new Error(`Default organization '${DEFAULT_ORG_SLUG}' is not seeded — check initDb().`);
  return rows[0].id;
}

async function backfillContainer(label: string, container: any, defaultOrgId: string) {
  const { resources: docs } = await container.items.query("SELECT * FROM c").fetchAll();

  let migratedCount = 0;
  for (const doc of docs as any[]) {
    if (doc.tenantId) continue;

    console.log(`- [${label}] ${doc.fullName ?? doc.clinicName ?? doc.pharmacyName ?? doc.id} (${doc.email ?? doc.id})`);
    migratedCount++;

    if (APPLY) {
      await container.items.upsert({ ...doc, tenantId: defaultOrgId });
    }
  }

  console.log(`${migratedCount} ${label} doc(s) ${APPLY ? "backfilled" : "would be backfilled"}.\n`);
}

async function main() {
  const defaultOrgId = await getDefaultOrgId();
  console.log(`Default org ("${DEFAULT_ORG_SLUG}") id: ${defaultOrgId}\n`);

  await backfillContainer("clinic", clinicsContainer, defaultOrgId);
  await backfillContainer("patient", patientsContainer, defaultOrgId);
  await backfillContainer("pharmacy", pharmaciesContainer, defaultOrgId);

  if (!APPLY) {
    console.log(`Re-run with --apply to write these changes.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
