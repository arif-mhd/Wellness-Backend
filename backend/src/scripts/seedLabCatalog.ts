/**
 * Seeds the lab test catalog (labTestCatalog) with common diagnostic tests so
 * admins don't have to type them in by hand.
 *
 *   npx ts-node src/scripts/seedLabCatalog.ts
 *
 * Safe to re-run: ids are derived from the test name, and a test that already
 * exists is skipped (never overwritten), so edits made in the admin portal
 * survive. Add more tests there, or append to the list below and re-run.
 *
 * Defaults: only genetic tests require doctor approval (editable per test in
 * the admin portal). Fasting isn't part of the catalog — each lab sets it for
 * its own offering.
 */

import "dotenv/config";
import { initCosmosContainers, labTestCatalogContainer } from "../config/cosmos";

type Row = [name: string, category: string, description: string];

const BLOOD = "Blood Test";
const VIT = "Vitamin Panel";
const HORM = "Hormone Panel";
const IMG = "Imaging";
const BODY = "Body Checkup";
const SCREEN = "Screening Package";
const ALLERGY = "Allergy Test";
const GENETIC = "Genetic Test";

const TESTS: Row[] = [
  // ── Blood tests ──────────────────────────────────────────────────────────────
  ["Complete Blood Count (CBC)", BLOOD, "Measures red cells, white cells, haemoglobin and platelets. Screens for anaemia, infection and blood disorders."],
  ["Hemoglobin (Hb)", BLOOD, "Measures the oxygen-carrying protein in red blood cells."],
  ["ESR (Erythrocyte Sedimentation Rate)", BLOOD, "A general marker of inflammation in the body."],
  ["Blood Group & Rh Typing", BLOOD, "Determines your ABO blood group and Rh factor."],
  ["Peripheral Blood Smear", BLOOD, "Microscopic examination of blood cells for abnormalities."],
  ["Reticulocyte Count", BLOOD, "Counts young red blood cells to assess bone marrow response."],
  ["Fasting Blood Sugar (FBS)", BLOOD, "Measures blood glucose after an overnight fast. Screens for diabetes."],
  ["Random Blood Sugar (RBS)", BLOOD, "Measures blood glucose at any time of day."],
  ["Post-Prandial Blood Sugar (PPBS)", BLOOD, "Measures blood glucose two hours after a meal."],
  ["HbA1c (Glycated Hemoglobin)", BLOOD, "Average blood sugar over the last 2-3 months. Used to monitor diabetes."],
  ["Oral Glucose Tolerance Test (OGTT)", BLOOD, "Measures how the body handles a sugar load. Used for diabetes and gestational diabetes."],
  ["Lipid Profile", BLOOD, "Total cholesterol, LDL, HDL and triglycerides. Assesses heart disease risk."],
  ["Total Cholesterol", BLOOD, "Measures total cholesterol in the blood."],
  ["Triglycerides", BLOOD, "Measures triglyceride fat levels in the blood."],
  ["Liver Function Test (LFT)", BLOOD, "Enzymes and proteins that show how well the liver is working."],
  ["Kidney Function Test (KFT)", BLOOD, "Urea, creatinine and electrolytes. Shows how well the kidneys are working."],
  ["Serum Creatinine", BLOOD, "A waste product used to assess kidney function."],
  ["Blood Urea Nitrogen (BUN)", BLOOD, "Waste product measured to assess kidney function."],
  ["Uric Acid", BLOOD, "High levels are linked to gout and kidney stones."],
  ["Electrolytes (Na, K, Cl)", BLOOD, "Sodium, potassium and chloride balance."],
  ["Serum Calcium", BLOOD, "Measures calcium for bone, nerve and muscle health."],
  ["Serum Phosphorus", BLOOD, "Measures phosphate, related to bone and kidney health."],
  ["Serum Magnesium", BLOOD, "Measures magnesium, important for nerve and muscle function."],
  ["Serum Iron", BLOOD, "Measures the amount of iron in the blood."],
  ["Ferritin", BLOOD, "Shows the body's stored iron."],
  ["Iron Studies (Iron, TIBC, Ferritin)", BLOOD, "A full panel to diagnose iron deficiency or overload."],
  ["C-Reactive Protein (CRP)", BLOOD, "A marker of inflammation and infection."],
  ["hs-CRP (High Sensitivity CRP)", BLOOD, "A sensitive marker used to assess heart disease risk."],
  ["Prothrombin Time (PT/INR)", BLOOD, "Measures how long blood takes to clot. Used to monitor blood thinners."],
  ["D-Dimer", BLOOD, "Helps rule out abnormal blood clots."],
  ["Homocysteine", BLOOD, "Elevated levels are linked to heart disease risk."],
  ["Cardiac Troponin", BLOOD, "A marker of heart muscle damage."],
  ["Amylase & Lipase", BLOOD, "Pancreas enzymes, used to check for pancreatitis."],
  ["Blood Culture", BLOOD, "Detects bacteria or fungi in the blood."],
  ["Widal Test", BLOOD, "Screens for typhoid fever."],
  ["Dengue NS1 / IgM / IgG", BLOOD, "Detects dengue infection."],
  ["Malaria Parasite Test", BLOOD, "Detects malaria parasites in the blood."],
  ["HIV 1 & 2 Antibodies", BLOOD, "Screens for HIV infection."],
  ["Hepatitis B Surface Antigen (HBsAg)", BLOOD, "Screens for hepatitis B infection."],
  ["Hepatitis C Antibody (Anti-HCV)", BLOOD, "Screens for hepatitis C infection."],
  ["VDRL / RPR (Syphilis)", BLOOD, "Screens for syphilis."],
  ["COVID-19 PCR", BLOOD, "Detects active SARS-CoV-2 infection."],
  ["Rheumatoid Factor (RF)", BLOOD, "Helps diagnose rheumatoid arthritis."],
  ["ANA (Antinuclear Antibody)", BLOOD, "Screens for autoimmune conditions such as lupus."],
  ["PSA (Prostate Specific Antigen)", BLOOD, "Screens for prostate problems."],
  ["CA-125", BLOOD, "A tumour marker used in monitoring ovarian conditions."],
  ["Urine Routine & Microscopy", BLOOD, "Checks urine for infection, kidney disease and diabetes."],
  ["Urine Culture & Sensitivity", BLOOD, "Identifies bacteria causing urinary tract infection."],
  ["Stool Routine & Microscopy", BLOOD, "Checks stool for parasites, blood and infection."],
  ["Stool Occult Blood", BLOOD, "Detects hidden blood in stool."],

  // ── Vitamins & minerals ──────────────────────────────────────────────────────
  ["Vitamin D (25-OH)", VIT, "Measures vitamin D for bone and immune health."],
  ["Vitamin B12", VIT, "Measures B12, important for nerves and blood cells."],
  ["Folate (Vitamin B9)", VIT, "Measures folate, important for cell growth and pregnancy."],
  ["Vitamin A", VIT, "Measures vitamin A, important for vision and immunity."],
  ["Vitamin C", VIT, "Measures vitamin C levels."],
  ["Vitamin E", VIT, "Measures vitamin E, an antioxidant."],
  ["Zinc", VIT, "Measures zinc, important for immunity and healing."],
  ["Comprehensive Vitamin Panel", VIT, "Vitamin D, B12, folate and key minerals in one test."],

  // ── Hormones ─────────────────────────────────────────────────────────────────
  ["Thyroid Profile (T3, T4, TSH)", HORM, "Checks thyroid function."],
  ["TSH", HORM, "Thyroid stimulating hormone. First-line test for thyroid disorders."],
  ["Free T3 & Free T4", HORM, "Active thyroid hormones."],
  ["Anti-TPO Antibodies", HORM, "Detects autoimmune thyroid disease."],
  ["Testosterone (Total)", HORM, "Measures testosterone levels."],
  ["Estradiol (E2)", HORM, "Measures the main form of oestrogen."],
  ["Progesterone", HORM, "Measures progesterone, used in fertility and pregnancy assessment."],
  ["FSH & LH", HORM, "Reproductive hormones used in fertility assessment."],
  ["Prolactin", HORM, "Measures prolactin, which can affect fertility and periods."],
  ["AMH (Anti-Mullerian Hormone)", HORM, "Estimates ovarian reserve."],
  ["Cortisol", HORM, "Measures the stress hormone cortisol."],
  ["Insulin (Fasting)", HORM, "Measures insulin to assess insulin resistance."],
  ["PCOS Hormone Panel", HORM, "A hormone panel used to evaluate polycystic ovary syndrome."],
  ["Beta hCG (Pregnancy Test)", HORM, "Confirms pregnancy through a blood test."],
  ["Parathyroid Hormone (PTH)", HORM, "Regulates calcium. Used to investigate bone and kidney conditions."],

  // ── Imaging ──────────────────────────────────────────────────────────────────
  ["Chest X-Ray", IMG, "An X-ray image of the lungs and heart."],
  ["X-Ray (Spine / Limbs)", IMG, "An X-ray of bones and joints."],
  ["Ultrasound Abdomen", IMG, "Imaging of the liver, gallbladder, kidneys and other abdominal organs."],
  ["Ultrasound Pelvis", IMG, "Imaging of the pelvic organs."],
  ["Ultrasound Thyroid", IMG, "Imaging of the thyroid gland."],
  ["Obstetric Ultrasound", IMG, "Pregnancy scan to check the baby's growth and wellbeing."],
  ["ECG (Electrocardiogram)", IMG, "Records the heart's electrical activity."],
  ["Echocardiogram (2D Echo)", IMG, "An ultrasound of the heart."],
  ["Treadmill Test (TMT)", IMG, "Heart stress test performed while exercising."],
  ["Mammogram", IMG, "An X-ray of the breast to screen for breast cancer."],
  ["Bone Density Scan (DEXA)", IMG, "Measures bone density to assess osteoporosis."],
  ["CT Scan", IMG, "Detailed cross-sectional imaging."],
  ["MRI Scan", IMG, "Detailed imaging of soft tissue, brain and joints."],
  ["Pulmonary Function Test (PFT)", IMG, "Measures lung capacity and function."],

  // ── Body checkups & screening packages ───────────────────────────────────────
  ["Basic Health Checkup", BODY, "CBC, blood sugar, lipid profile, liver and kidney function."],
  ["Full Body Checkup", BODY, "A comprehensive screening across blood, organs, vitamins and thyroid."],
  ["Senior Citizen Health Checkup", BODY, "A package tailored to older adults."],
  ["Executive Health Checkup", BODY, "An extended package including cardiac and cancer markers."],
  ["Pre-Employment Medical Checkup", BODY, "Standard fitness-to-work screening."],
  ["Heart Health Package", SCREEN, "Lipids, hs-CRP, homocysteine and ECG for cardiac risk."],
  ["Diabetes Screening Package", SCREEN, "Fasting sugar, HbA1c, lipid profile and kidney function."],
  ["Thyroid Screening Package", SCREEN, "TSH, T3, T4 and thyroid antibodies."],
  ["Women's Health Package", SCREEN, "Hormones, vitamins, thyroid and anaemia screening."],
  ["Men's Health Package", SCREEN, "Testosterone, PSA, vitamins and metabolic screening."],
  ["Fever Panel", SCREEN, "CBC, malaria, dengue and typhoid tests for fever."],
  ["Anemia Screening Package", SCREEN, "CBC, iron studies, B12 and folate."],
  ["Liver Health Package", SCREEN, "Liver function with hepatitis screening."],
  ["Kidney Health Package", SCREEN, "Kidney function, electrolytes and urine analysis."],
  ["Pre-Marital Screening Package", SCREEN, "Blood group, infection screening and genetic carrier checks."],
  ["Antenatal Package", SCREEN, "Core tests recommended during pregnancy."],

  // ── Allergy ──────────────────────────────────────────────────────────────────
  ["Total IgE", ALLERGY, "Measures overall allergic activity."],
  ["Food Allergy Panel", ALLERGY, "Tests for common food allergens."],
  ["Inhalant Allergy Panel", ALLERGY, "Tests for dust, pollen and mould allergies."],
  ["Gluten / Celiac Screening", ALLERGY, "Screens for celiac disease."],
  ["Lactose Intolerance Test", ALLERGY, "Checks how well you digest lactose."],

  // ── Genetic ──────────────────────────────────────────────────────────────────
  ["BRCA1 / BRCA2 Gene Test", GENETIC, "Checks for inherited breast and ovarian cancer risk."],
  ["Genetic Carrier Screening", GENETIC, "Checks whether you carry genes for inherited conditions."],
  ["Non-Invasive Prenatal Test (NIPT)", GENETIC, "A blood test screening a baby for chromosomal conditions."],
  ["Pharmacogenomic Test", GENETIC, "Shows how your genes affect response to medicines."],
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  await initCosmosContainers();

  let created = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const [name, category, description] of TESTS) {
    const id = `catalog-${slug(name)}`;
    const { resource: existing } = await labTestCatalogContainer.item(id, id).read();
    if (existing) { skipped++; continue; }

    await labTestCatalogContainer.items.create({
      id,
      name,
      category,
      description,
      requires_doctor_approval: category === GENETIC,
      recommendedFor: "",
      howItsDone: "",
      patientInstructions: "",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  console.log(`Lab catalog seed done: ${created} created, ${skipped} already existed (${TESTS.length} total).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Lab catalog seed failed:", err);
  process.exit(1);
});
