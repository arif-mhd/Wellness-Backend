/**
 * Seeds the Anandalakshmi pharmacy's catalogue from their HIS export.
 *
 * Source data: src/scripts/data/anandalakshmiMedicines.json, generated from
 * "Ayurveda Medicine list.xlsx" (340 items, exported 2026-Sep-24).
 *
 * Scoping: every product is stamped with the Anandalakshmi pharmacy's id.
 * The patient catalogue (GET /api/pharmacy/catalogue) only ever returns
 * products whose pharmacyId is in the calling brand's own approved pharmacy
 * list, so these are invisible to Wellness from the first write — there is no
 * window in which they are global. Before writing anything this script
 * re-checks that using the *same* helpers the live route uses, so a wrong
 * pharmacy id fails loudly here rather than silently producing an orphaned
 * catalogue nobody can see.
 *
 * Prices: items whose MRP was 0 in the export (92 of them) are seeded at 1
 * and marked out of stock, so they are editable in the portal (the portal's
 * save guard rejects a falsy price, which 0 is) without being purchasable at
 * a placeholder price. They carry pricePlaceholder: true so a later re-pricing
 * pass can find them without consulting the spreadsheet.
 *
 * Ids are derived from the source Item ID, so re-running updates in place
 * rather than creating duplicates.
 *
 * Defaults to a DRY RUN — prints what it would write and changes nothing:
 *   npx ts-node src/scripts/seedAnandalakshmiMedicines.ts
 *
 * Pass --apply to actually write:
 *   npx ts-node src/scripts/seedAnandalakshmiMedicines.ts --apply
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { pharmacyProductsContainer, pharmaciesContainer } from "../config/cosmos";

const APPLY = process.argv.includes("--apply");

const ORG_SLUG = "anandalakshmi";

// Anandalakshmi's org id. Not resolved through utils/orgScope here because
// that reads the organizations table in Postgres, which needs the Cloud SQL
// proxy running — an avoidable dependency for a script that otherwise only
// touches Cosmos. Verified instead against the production path: GET
// /api/pharmacy/pharmacies with x-org-slug: anandalakshmi applies
// "status = 'approved' AND tenantId = <org id>" and returns exactly the
// pharmacy below, so this is that org's id by construction.
const EXPECTED_ORG_ID = "5d7fd6a8-69b0-4ac1-bd41-8bad6db9027a";

const PHARMACY_ID =
  process.argv.find((a) => a.startsWith("--pharmacy-id="))?.split("=")[1] ??
  "ec8a5c6a-015d-4696-9909-cc22e485c49c";

type SourceProduct = {
  sourceItemId: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  pricePlaceholder: boolean;
};

async function main() {
  const dataPath = path.join(__dirname, "data", "anandalakshmiMedicines.json");
  const products: SourceProduct[] = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  // ── Safety: the target pharmacy must actually belong to this org ──────────
  // These are the exact two conditions getPharmacyIdsForOrg applies, so if
  // this passes the catalogue will find the products, and if it fails nothing
  // is written. A product stamped with a pharmacy outside the org would be
  // invisible to every brand rather than leaking — but invisible is still a
  // silent failure worth catching here instead of after 340 writes.
  const { resource: pharmacy } = await pharmaciesContainer.item(PHARMACY_ID, PHARMACY_ID).read();

  if (!pharmacy) {
    console.error(`Refusing to seed: no pharmacy document with id ${PHARMACY_ID}.`);
    process.exit(1);
  }
  if (pharmacy.status !== "approved") {
    console.error(`Refusing to seed: pharmacy ${PHARMACY_ID} has status "${pharmacy.status}", not "approved".`);
    console.error(`Only approved pharmacies appear in a brand's catalogue.`);
    process.exit(1);
  }
  if (pharmacy.tenantId !== EXPECTED_ORG_ID) {
    console.error(`Refusing to seed: pharmacy ${PHARMACY_ID} belongs to org ${pharmacy.tenantId},`);
    console.error(`but this script seeds "${ORG_SLUG}" (${EXPECTED_ORG_ID}).`);
    process.exit(1);
  }

  const pharmacyName = pharmacy.pharmacyName ?? null;

  console.log(`Org      : ${ORG_SLUG} (${EXPECTED_ORG_ID})`);
  console.log(`Pharmacy : ${pharmacyName} (${PHARMACY_ID})`);
  console.log(`Source   : ${products.length} products\n`);

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const p of products) {
    const id = `anandalakshmi-med-${p.sourceItemId}`;

    const { resource: existing } = await pharmacyProductsContainer
      .item(id, PHARMACY_ID)
      .read()
      .catch(() => ({ resource: undefined as any }));

    const doc = {
      id,
      pharmacyId: PHARMACY_ID,
      pharmacyName,
      name: p.name,
      description: null,
      category: p.category,
      price: p.price,
      inStock: p.inStock,
      requiresPrescription: false,
      batchNumber: null,
      expiryDate: null,
      manufacturer: null,
      strength: null,
      numberOfTablets: null,
      productSummary: null,
      recommendedFor: null,
      benefits: null,
      sideEffects: null,
      howToUse: null,
      imageUrl: null,
      status: "approved" as const,
      flagged: false,
      flaggedAt: null,
      flaggedBy: null,
      flagReason: null,
      // Provenance, so a later re-pricing pass can find the placeholders and
      // trace any row back to the HIS export it came from.
      sourceItemId: p.sourceItemId,
      pricePlaceholder: p.pricePlaceholder,
      createdAt: existing?.createdAt ?? now,
      approvedAt: existing?.approvedAt ?? now,
      approvedBy: null,
      rejectedAt: null,
      rejectedReason: null,
    };

    if (existing) updated++;
    else created++;

    if (APPLY) {
      await pharmacyProductsContainer.items.upsert(doc);
    }
  }

  const placeholders = products.filter((p) => p.pricePlaceholder).length;
  const byCategory = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`${APPLY ? "Wrote" : "Would write"} ${products.length} products:`);
  console.log(`  new            : ${created}`);
  console.log(`  already present: ${updated}`);
  console.log(`  categories     : ${JSON.stringify(byCategory)}`);
  console.log(`  price placeholders (Rs1, out of stock): ${placeholders}`);

  if (!APPLY) {
    console.log(`\nDry run — nothing was written. Re-run with --apply to write these.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
