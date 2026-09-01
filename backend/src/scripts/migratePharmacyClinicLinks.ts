/**
 * One-time fix-up for pharmacy docs created before the clinic-affiliation
 * schema settled on its final shape. Across development, pharmacy docs went
 * through three shapes:
 *   1. { orgId, orgName, linkRequest: { fromOrgId, fromOrgName, requestedAt } }
 *   2. { clinicId, clinicName, linkRequest: { fromClinicId, fromClinicName, requestedAt } }
 *   3. { clinicIds: [...], linkRequests: [{ fromClinicId, fromClinicName, requestedAt }] }
 * Only shape 3 is read by the current code, so any pharmacy created under
 * shape 1 or 2 now looks unaffiliated even though the link still exists in
 * the old fields. This script finds those docs and rewrites them into shape
 * 3, then removes the old fields.
 *
 * Defaults to a DRY RUN — prints what it would change without writing.
 *   npx ts-node src/scripts/migratePharmacyClinicLinks.ts
 * Pass --apply to actually perform the writes:
 *   npx ts-node src/scripts/migratePharmacyClinicLinks.ts --apply
 */

import "dotenv/config";
import { pharmaciesContainer } from "../config/cosmos";

const APPLY = process.argv.includes("--apply");

async function main() {
  const { resources: pharmacies } = await pharmaciesContainer.items
    .query("SELECT * FROM c")
    .fetchAll();

  console.log(`Scanning ${pharmacies.length} pharmacy doc(s)...\n`);

  let migratedCount = 0;

  for (const doc of pharmacies as any[]) {
    const alreadyCurrent = Array.isArray(doc.clinicIds) || Array.isArray(doc.linkRequests);
    if (alreadyCurrent) continue;

    const legacyClinicId: string | null = doc.clinicId ?? doc.orgId ?? null;
    const legacyLinkRequest = doc.linkRequest ?? null;

    if (!legacyClinicId && !legacyLinkRequest) continue; // never had any affiliation

    const clinicIds = legacyClinicId ? [legacyClinicId] : [];
    const linkRequests = legacyLinkRequest
      ? [{
          fromClinicId: legacyLinkRequest.fromClinicId ?? legacyLinkRequest.fromOrgId,
          fromClinicName: legacyLinkRequest.fromClinicName ?? legacyLinkRequest.fromOrgName,
          requestedAt: legacyLinkRequest.requestedAt,
        }]
      : [];

    console.log(`- ${doc.pharmacyName ?? doc.id} (${doc.email ?? doc.id})`);
    if (clinicIds.length) console.log(`    clinicIds: ${JSON.stringify(clinicIds)}  (was ${doc.clinicId ? "clinicId" : "orgId"}: ${legacyClinicId})`);
    if (linkRequests.length) console.log(`    linkRequests: ${JSON.stringify(linkRequests)}`);

    migratedCount++;

    if (APPLY) {
      const updated = { ...doc, clinicIds, linkRequests };
      delete updated.orgId;
      delete updated.orgName;
      delete updated.clinicId;
      delete updated.clinicName;
      delete updated.linkRequest;
      await pharmaciesContainer.items.upsert(updated);
      console.log(`    -> written`);
    }
  }

  console.log(`\n${migratedCount} doc(s) ${APPLY ? "migrated" : "would be migrated"}.`);
  if (!APPLY && migratedCount > 0) {
    console.log(`Re-run with --apply to write these changes.`);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
