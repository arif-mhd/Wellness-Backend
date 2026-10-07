import "dotenv/config";
import { vaccineCatalogContainer, vaccinesContainer, labServicesContainer } from "../config/cosmos";

/**
 * Links legacy vaccines to the vaccine catalogue and assigns them a provider.
 *
 *   npm run migrate:vaccine-catalog-links            (dry run)
 *   npm run migrate:vaccine-catalog-links -- --apply
 *
 * Legacy vaccines predate the two-tier catalogue: they carry no `labId` (so no
 * provider fulfils them) and no `catalogVaccineId` (so they never appear in the
 * "from AED X · N providers" browse list). This gives them both.
 *
 * The name mapping below is DELIBERATELY EXPLICIT rather than fuzzy-matched.
 * A containment match picked "Influenza (Pregnancy)" for the generic flu shot,
 * "Hepatitis B (Adult)" for the childhood one and "MMR (Adult Catch-up)" for
 * the childhood MMR — all wrong, and wrong in a way nobody would notice until a
 * patient booked the wrong vaccine. Clinical data doesn't get guessed at.
 *
 * Unmapped legacy vaccines are left exactly as they are: they stay visible and
 * bookable (GET /api/vaccines keeps rows with no labId), just not part of the
 * catalogue browse. Nothing is deleted and nothing breaks.
 */

const APPLY = process.argv.includes("--apply");

// legacy vaccine name → catalogue vaccine name (both exact, as stored)
const NAME_MAP: Record<string, string> = {
  "Influenza (Flu) Vaccine": "Influenza (Quadrivalent)",
  "Hepatitis B Vaccine": "Hepatitis B",
  "COVID-19 Vaccine (mRNA Booster)": "COVID-19 Booster",
  "MMR Vaccine (Measles, Mumps, Rubella)": "MMR (Measles, Mumps, Rubella)",
  "Typhoid Vaccine": "Typhoid",
  "Rabies Pre-Exposure Vaccine": "Rabies (Pre-exposure)",
  "HPV Vaccine (Gardasil 9)": "HPV (Human Papillomavirus)",
  "Meningococcal Vaccine (MenACWY)": "Meningococcal ACWY",
};

async function main() {
  console.log(APPLY ? "Running migration (WRITING)...\n" : "Dry run — pass --apply to write.\n");

  const { resources: catalog } = await vaccineCatalogContainer.items
    .query({ query: "SELECT c.id, c.name FROM c WHERE c.is_active = true" }).fetchAll();
  const catalogByName = new Map<string, any>(catalog.map((c: any) => [c.name, c]));

  // Every mapped target must exist, or the mapping has drifted from the seed.
  const missing = Object.values(NAME_MAP).filter((n) => !catalogByName.has(n));
  if (missing.length) {
    console.error("Catalogue is missing these mapped entries — run `npm run seed:vaccine-catalog` first:");
    missing.forEach((n) => console.error(`  - ${n}`));
    process.exit(1);
  }

  const { resources: legacy } = await vaccinesContainer.items
    .query({ query: "SELECT * FROM c WHERE NOT IS_DEFINED(c.labId) OR c.labId = null" }).fetchAll();

  if (legacy.length === 0) {
    console.log("No legacy vaccines to migrate.");
    return;
  }

  // Each legacy vaccine needs an owning provider. Without a defensible way to
  // pick one per vaccine, they all go to a single provider the operator names
  // via VACCINE_MIGRATION_LAB_ID; otherwise we only report what WOULD happen.
  const targetLabId = process.env.VACCINE_MIGRATION_LAB_ID ?? "";
  let targetLab: any = null;
  if (targetLabId) {
    const { resource } = await labServicesContainer.item(targetLabId, targetLabId).read();
    if (!resource || resource.status !== "approved") {
      console.error(`VACCINE_MIGRATION_LAB_ID "${targetLabId}" is not an approved provider.`);
      process.exit(1);
    }
    targetLab = resource;
  }

  console.log(`Legacy vaccines found: ${legacy.length}`);
  console.log(targetLab
    ? `Assigning provider: ${targetLab.name} (${targetLab.id})\n`
    : "No VACCINE_MIGRATION_LAB_ID set — will link to the catalogue only, leaving the provider unset.\n");

  let linked = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of legacy) {
    const catalogName = NAME_MAP[v.name];
    if (!catalogName) {
      skipped++;
      console.log(`  SKIP  "${v.name}" — no mapping, left unchanged`);
      continue;
    }
    const entry = catalogByName.get(catalogName)!;
    console.log(`  LINK  "${v.name}" → "${entry.name}"${targetLab ? ` @ ${targetLab.name}` : ""}`);

    if (!APPLY) { linked++; continue; }

    const updated = {
      ...v,
      catalogVaccineId: entry.id,
      ...(targetLab ? { labId: targetLab.id, labName: targetLab.name } : {}),
      // An offering owned by an approved provider is live; without a provider
      // it keeps whatever status it already had.
      ...(targetLab ? { status: "approved", approvedAt: v.approvedAt ?? new Date().toISOString() } : {}),
      updatedAt: new Date().toISOString(),
    };

    try {
      await vaccinesContainer.item(v.id, v.id).replace(updated, {
        accessCondition: { type: "IfMatch", condition: v._etag },
      });
      linked++;
    } catch (err: any) {
      failed++;
      console.error(`    ! failed (${err.code ?? "unknown"}): ${err.message ?? err}`);
    }
  }

  console.log("");
  if (APPLY) {
    console.log(`Linked ${linked}, skipped ${skipped}${failed ? `, ${failed} failed — re-run to retry.` : ""}.`);
  } else {
    console.log(`Dry run: ${linked} would be linked, ${skipped} left unchanged.`);
    if (!targetLabId) {
      console.log("\nTo also assign a provider, set VACCINE_MIGRATION_LAB_ID to an approved provider id.");
    }
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
