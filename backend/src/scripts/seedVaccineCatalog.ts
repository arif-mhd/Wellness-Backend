/**
 * Seeds the vaccine catalog (vaccineCatalog) with common vaccines so admins
 * don't have to type them in by hand.
 *
 *   npx ts-node src/scripts/seedVaccineCatalog.ts
 *
 * Safe to re-run: ids are derived from the vaccine name, and a vaccine that
 * already exists is skipped (never overwritten), so edits made in the admin
 * portal survive. Add more there, or append to the list below and re-run.
 *
 * Mirrors seedLabCatalog.ts. Price is deliberately NOT part of the catalog —
 * each lab sets its own price on its own offering, which is what makes the
 * "from AED X · N providers" aggregation possible.
 */

import "dotenv/config";
import { initCosmosContainers, vaccineCatalogContainer } from "../config/cosmos";

type Row = [name: string, category: string, ageRange: string, doses: number, description: string];

const CHILD = "Childhood";
const ADULT = "Adult";
const TRAVEL = "Travel";
const SEASONAL = "Seasonal";
const PREGNANCY = "Pregnancy";

const VACCINES: Row[] = [
  // ── Childhood ────────────────────────────────────────────────────────────────
  ["BCG (Tuberculosis)", CHILD, "At birth", 1, "Protects against severe forms of tuberculosis. Usually given at birth."],
  ["Hepatitis B", CHILD, "Birth – 18 years", 3, "Protects against hepatitis B, a liver infection spread through blood and body fluids."],
  ["Polio (IPV)", CHILD, "6 weeks – 6 years", 4, "Protects against poliomyelitis, which can cause permanent paralysis."],
  ["DTaP (Diphtheria, Tetanus, Pertussis)", CHILD, "6 weeks – 6 years", 5, "Combined protection against diphtheria, tetanus and whooping cough."],
  ["Hib (Haemophilus influenzae type b)", CHILD, "6 weeks – 5 years", 4, "Protects against a bacterium that causes meningitis and pneumonia in young children."],
  ["Pneumococcal Conjugate (PCV)", CHILD, "6 weeks – 5 years", 4, "Protects against pneumococcal infections including pneumonia and meningitis."],
  ["Rotavirus", CHILD, "6 weeks – 8 months", 3, "Oral vaccine protecting against rotavirus, a common cause of severe diarrhoea in infants."],
  ["MMR (Measles, Mumps, Rubella)", CHILD, "9 months – 12 years", 2, "Combined protection against measles, mumps and rubella."],
  ["Varicella (Chickenpox)", CHILD, "12 months+", 2, "Protects against chickenpox and reduces the risk of shingles later in life."],
  ["Hepatitis A", CHILD, "12 months+", 2, "Protects against hepatitis A, usually spread through contaminated food or water."],
  ["Meningococcal ACWY", CHILD, "9 months+", 2, "Protects against four common groups of meningococcal bacteria."],

  // ── Adult ────────────────────────────────────────────────────────────────────
  ["Tdap Booster", ADULT, "11 years+", 1, "Booster protection against tetanus, diphtheria and whooping cough. Recommended every 10 years."],
  ["HPV (Human Papillomavirus)", ADULT, "9 – 45 years", 3, "Protects against the virus types that cause most cervical and other HPV-related cancers."],
  ["Shingles (Herpes Zoster)", ADULT, "50 years+", 2, "Reduces the risk of shingles and the nerve pain that can follow it."],
  ["Pneumococcal Polysaccharide (PPSV23)", ADULT, "65 years+", 1, "Protects older adults against pneumococcal pneumonia and related infections."],
  ["Hepatitis B (Adult)", ADULT, "18 years+", 3, "Protects adults at risk of hepatitis B through work, travel or medical treatment."],
  ["MMR (Adult Catch-up)", ADULT, "18 years+", 2, "For adults without documented childhood immunity to measles, mumps and rubella."],

  // ── Seasonal ─────────────────────────────────────────────────────────────────
  ["Influenza (Quadrivalent)", SEASONAL, "6 months+", 1, "Seasonal flu protection against four influenza strains. Recommended annually."],
  ["COVID-19 (mRNA)", SEASONAL, "6 months+", 2, "Protects against COVID-19 and reduces the risk of severe illness."],
  ["COVID-19 Booster", SEASONAL, "12 years+", 1, "Additional dose to restore protection as immunity wanes."],
  ["RSV (Respiratory Syncytial Virus)", SEASONAL, "60 years+", 1, "Protects older adults against RSV, a common cause of winter respiratory illness."],

  // ── Travel ───────────────────────────────────────────────────────────────────
  ["Yellow Fever", TRAVEL, "9 months+", 1, "Required for entry to some countries. Protects against yellow fever for life."],
  ["Typhoid", TRAVEL, "2 years+", 1, "Protects against typhoid fever, spread through contaminated food and water."],
  ["Rabies (Pre-exposure)", TRAVEL, "Any age", 3, "Pre-travel protection for areas where rabies is common or medical care is limited."],
  ["Japanese Encephalitis", TRAVEL, "2 months+", 2, "For travel to rural parts of Asia where the virus is spread by mosquitoes."],
  ["Meningococcal ACWY (Travel)", TRAVEL, "9 months+", 1, "Required for Hajj and Umrah pilgrims, and recommended for parts of Africa."],
  ["Cholera (Oral)", TRAVEL, "2 years+", 2, "Oral protection against cholera for travel to affected regions."],
  ["Tick-borne Encephalitis", TRAVEL, "1 year+", 3, "For travel to forested parts of Europe and Asia during tick season."],

  // ── Pregnancy ────────────────────────────────────────────────────────────────
  ["Tdap (Pregnancy)", PREGNANCY, "27 – 36 weeks", 1, "Given in each pregnancy to pass whooping cough protection to the newborn."],
  ["Influenza (Pregnancy)", PREGNANCY, "Any trimester", 1, "Protects both mother and baby through the flu season."],
  ["RSV (Pregnancy)", PREGNANCY, "32 – 36 weeks", 1, "Passes RSV protection to the baby for the first months of life."],
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  await initCosmosContainers();

  let created = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const [name, category, ageRange, doses_required, description] of VACCINES) {
    const id = `vcatalog-${slug(name)}`;
    const { resource: existing } = await vaccineCatalogContainer.item(id, id).read();
    if (existing) { skipped++; continue; }

    await vaccineCatalogContainer.items.create({
      id,
      name,
      category,
      description,
      ageRange,
      doses_required,
      recommendedFor: "",
      howAdministered: "",
      sideEffects: "",
      patientInstructions: "",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  console.log(`Vaccine catalog seed done: ${created} created, ${skipped} already existed (${VACCINES.length} total).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Vaccine catalog seed failed:", err);
  process.exit(1);
});
