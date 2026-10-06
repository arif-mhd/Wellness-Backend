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
 * Defaults: only genetic tests require doctor approval, and fasting is set
 * per standard lab practice. Both are editable per test in the admin portal.
 */

import "dotenv/config";
import { initCosmosContainers, labTestCatalogContainer } from "../config/cosmos";

type Row = [name: string, category: string, fasting: boolean, description: string];

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
  ["Complete Blood Count (CBC)", BLOOD, false, "Measures red cells, white cells, haemoglobin and platelets. Screens for anaemia, infection and blood disorders."],
  ["Hemoglobin (Hb)", BLOOD, false, "Measures the oxygen-carrying protein in red blood cells."],
  ["ESR (Erythrocyte Sedimentation Rate)", BLOOD, false, "A general marker of inflammation in the body."],
  ["Blood Group & Rh Typing", BLOOD, false, "Determines your ABO blood group and Rh factor."],
  ["Peripheral Blood Smear", BLOOD, false, "Microscopic examination of blood cells for abnormalities."],
  ["Reticulocyte Count", BLOOD, false, "Counts young red blood cells to assess bone marrow response."],
  ["Fasting Blood Sugar (FBS)", BLOOD, true, "Measures blood glucose after an overnight fast. Screens for diabetes."],
  ["Random Blood Sugar (RBS)", BLOOD, false, "Measures blood glucose at any time of day."],
  ["Post-Prandial Blood Sugar (PPBS)", BLOOD, false, "Measures blood glucose two hours after a meal."],
  ["HbA1c (Glycated Hemoglobin)", BLOOD, false, "Average blood sugar over the last 2-3 months. Used to monitor diabetes."],
  ["Oral Glucose Tolerance Test (OGTT)", BLOOD, true, "Measures how the body handles a sugar load. Used for diabetes and gestational diabetes."],
  ["Lipid Profile", BLOOD, true, "Total cholesterol, LDL, HDL and triglycerides. Assesses heart disease risk."],
  ["Total Cholesterol", BLOOD, true, "Measures total cholesterol in the blood."],
  ["Triglycerides", BLOOD, true, "Measures triglyceride fat levels in the blood."],
  ["Liver Function Test (LFT)", BLOOD, false, "Enzymes and proteins that show how well the liver is working."],
  ["Kidney Function Test (KFT)", BLOOD, false, "Urea, creatinine and electrolytes. Shows how well the kidneys are working."],
  ["Serum Creatinine", BLOOD, false, "A waste product used to assess kidney function."],
  ["Blood Urea Nitrogen (BUN)", BLOOD, false, "Waste product measured to assess kidney function."],
  ["Uric Acid", BLOOD, false, "High levels are linked to gout and kidney stones."],
  ["Electrolytes (Na, K, Cl)", BLOOD, false, "Sodium, potassium and chloride balance."],
  ["Serum Calcium", BLOOD, false, "Measures calcium for bone, nerve and muscle health."],
  ["Serum Phosphorus", BLOOD, false, "Measures phosphate, related to bone and kidney health."],
  ["Serum Magnesium", BLOOD, false, "Measures magnesium, important for nerve and muscle function."],
  ["Serum Iron", BLOOD, true, "Measures the amount of iron in the blood."],
  ["Ferritin", BLOOD, false, "Shows the body's stored iron."],
  ["Iron Studies (Iron, TIBC, Ferritin)", BLOOD, true, "A full panel to diagnose iron deficiency or overload."],
  ["C-Reactive Protein (CRP)", BLOOD, false, "A marker of inflammation and infection."],
  ["hs-CRP (High Sensitivity CRP)", BLOOD, false, "A sensitive marker used to assess heart disease risk."],
  ["Prothrombin Time (PT/INR)", BLOOD, false, "Measures how long blood takes to clot. Used to monitor blood thinners."],
  ["D-Dimer", BLOOD, false, "Helps rule out abnormal blood clots."],
  ["Homocysteine", BLOOD, true, "Elevated levels are linked to heart disease risk."],
  ["Cardiac Troponin", BLOOD, false, "A marker of heart muscle damage."],
  ["Amylase & Lipase", BLOOD, false, "Pancreas enzymes, used to check for pancreatitis."],
  ["Blood Culture", BLOOD, false, "Detects bacteria or fungi in the blood."],
  ["Widal Test", BLOOD, false, "Screens for typhoid fever."],
  ["Dengue NS1 / IgM / IgG", BLOOD, false, "Detects dengue infection."],
  ["Malaria Parasite Test", BLOOD, false, "Detects malaria parasites in the blood."],
  ["HIV 1 & 2 Antibodies", BLOOD, false, "Screens for HIV infection."],
  ["Hepatitis B Surface Antigen (HBsAg)", BLOOD, false, "Screens for hepatitis B infection."],
  ["Hepatitis C Antibody (Anti-HCV)", BLOOD, false, "Screens for hepatitis C infection."],
  ["VDRL / RPR (Syphilis)", BLOOD, false, "Screens for syphilis."],
  ["COVID-19 PCR", BLOOD, false, "Detects active SARS-CoV-2 infection."],
  ["Rheumatoid Factor (RF)", BLOOD, false, "Helps diagnose rheumatoid arthritis."],
  ["ANA (Antinuclear Antibody)", BLOOD, false, "Screens for autoimmune conditions such as lupus."],
  ["PSA (Prostate Specific Antigen)", BLOOD, false, "Screens for prostate problems."],
  ["CA-125", BLOOD, false, "A tumour marker used in monitoring ovarian conditions."],
  ["Urine Routine & Microscopy", BLOOD, false, "Checks urine for infection, kidney disease and diabetes."],
  ["Urine Culture & Sensitivity", BLOOD, false, "Identifies bacteria causing urinary tract infection."],
  ["Stool Routine & Microscopy", BLOOD, false, "Checks stool for parasites, blood and infection."],
  ["Stool Occult Blood", BLOOD, false, "Detects hidden blood in stool."],

  // ── Vitamins & minerals ──────────────────────────────────────────────────────
  ["Vitamin D (25-OH)", VIT, false, "Measures vitamin D for bone and immune health."],
  ["Vitamin B12", VIT, false, "Measures B12, important for nerves and blood cells."],
  ["Folate (Vitamin B9)", VIT, false, "Measures folate, important for cell growth and pregnancy."],
  ["Vitamin A", VIT, true, "Measures vitamin A, important for vision and immunity."],
  ["Vitamin C", VIT, false, "Measures vitamin C levels."],
  ["Vitamin E", VIT, true, "Measures vitamin E, an antioxidant."],
  ["Zinc", VIT, false, "Measures zinc, important for immunity and healing."],
  ["Comprehensive Vitamin Panel", VIT, true, "Vitamin D, B12, folate and key minerals in one test."],

  // ── Hormones ─────────────────────────────────────────────────────────────────
  ["Thyroid Profile (T3, T4, TSH)", HORM, false, "Checks thyroid function."],
  ["TSH", HORM, false, "Thyroid stimulating hormone. First-line test for thyroid disorders."],
  ["Free T3 & Free T4", HORM, false, "Active thyroid hormones."],
  ["Anti-TPO Antibodies", HORM, false, "Detects autoimmune thyroid disease."],
  ["Testosterone (Total)", HORM, false, "Measures testosterone levels."],
  ["Estradiol (E2)", HORM, false, "Measures the main form of oestrogen."],
  ["Progesterone", HORM, false, "Measures progesterone, used in fertility and pregnancy assessment."],
  ["FSH & LH", HORM, false, "Reproductive hormones used in fertility assessment."],
  ["Prolactin", HORM, false, "Measures prolactin, which can affect fertility and periods."],
  ["AMH (Anti-Mullerian Hormone)", HORM, false, "Estimates ovarian reserve."],
  ["Cortisol", HORM, false, "Measures the stress hormone cortisol."],
  ["Insulin (Fasting)", HORM, true, "Measures insulin to assess insulin resistance."],
  ["PCOS Hormone Panel", HORM, false, "A hormone panel used to evaluate polycystic ovary syndrome."],
  ["Beta hCG (Pregnancy Test)", HORM, false, "Confirms pregnancy through a blood test."],
  ["Parathyroid Hormone (PTH)", HORM, false, "Regulates calcium. Used to investigate bone and kidney conditions."],

  // ── Imaging ──────────────────────────────────────────────────────────────────
  ["Chest X-Ray", IMG, false, "An X-ray image of the lungs and heart."],
  ["X-Ray (Spine / Limbs)", IMG, false, "An X-ray of bones and joints."],
  ["Ultrasound Abdomen", IMG, true, "Imaging of the liver, gallbladder, kidneys and other abdominal organs."],
  ["Ultrasound Pelvis", IMG, false, "Imaging of the pelvic organs."],
  ["Ultrasound Thyroid", IMG, false, "Imaging of the thyroid gland."],
  ["Obstetric Ultrasound", IMG, false, "Pregnancy scan to check the baby's growth and wellbeing."],
  ["ECG (Electrocardiogram)", IMG, false, "Records the heart's electrical activity."],
  ["Echocardiogram (2D Echo)", IMG, false, "An ultrasound of the heart."],
  ["Treadmill Test (TMT)", IMG, false, "Heart stress test performed while exercising."],
  ["Mammogram", IMG, false, "An X-ray of the breast to screen for breast cancer."],
  ["Bone Density Scan (DEXA)", IMG, false, "Measures bone density to assess osteoporosis."],
  ["CT Scan", IMG, false, "Detailed cross-sectional imaging."],
  ["MRI Scan", IMG, false, "Detailed imaging of soft tissue, brain and joints."],
  ["Pulmonary Function Test (PFT)", IMG, false, "Measures lung capacity and function."],

  // ── Body checkups & screening packages ───────────────────────────────────────
  ["Basic Health Checkup", BODY, true, "CBC, blood sugar, lipid profile, liver and kidney function."],
  ["Full Body Checkup", BODY, true, "A comprehensive screening across blood, organs, vitamins and thyroid."],
  ["Senior Citizen Health Checkup", BODY, true, "A package tailored to older adults."],
  ["Executive Health Checkup", BODY, true, "An extended package including cardiac and cancer markers."],
  ["Pre-Employment Medical Checkup", BODY, false, "Standard fitness-to-work screening."],
  ["Heart Health Package", SCREEN, true, "Lipids, hs-CRP, homocysteine and ECG for cardiac risk."],
  ["Diabetes Screening Package", SCREEN, true, "Fasting sugar, HbA1c, lipid profile and kidney function."],
  ["Thyroid Screening Package", SCREEN, false, "TSH, T3, T4 and thyroid antibodies."],
  ["Women's Health Package", SCREEN, true, "Hormones, vitamins, thyroid and anaemia screening."],
  ["Men's Health Package", SCREEN, true, "Testosterone, PSA, vitamins and metabolic screening."],
  ["Fever Panel", SCREEN, false, "CBC, malaria, dengue and typhoid tests for fever."],
  ["Anemia Screening Package", SCREEN, false, "CBC, iron studies, B12 and folate."],
  ["Liver Health Package", SCREEN, false, "Liver function with hepatitis screening."],
  ["Kidney Health Package", SCREEN, false, "Kidney function, electrolytes and urine analysis."],
  ["Pre-Marital Screening Package", SCREEN, false, "Blood group, infection screening and genetic carrier checks."],
  ["Antenatal Package", SCREEN, false, "Core tests recommended during pregnancy."],

  // ── Allergy ──────────────────────────────────────────────────────────────────
  ["Total IgE", ALLERGY, false, "Measures overall allergic activity."],
  ["Food Allergy Panel", ALLERGY, false, "Tests for common food allergens."],
  ["Inhalant Allergy Panel", ALLERGY, false, "Tests for dust, pollen and mould allergies."],
  ["Gluten / Celiac Screening", ALLERGY, false, "Screens for celiac disease."],
  ["Lactose Intolerance Test", ALLERGY, true, "Checks how well you digest lactose."],

  // ── Genetic ──────────────────────────────────────────────────────────────────
  ["BRCA1 / BRCA2 Gene Test", GENETIC, false, "Checks for inherited breast and ovarian cancer risk."],
  ["Genetic Carrier Screening", GENETIC, false, "Checks whether you carry genes for inherited conditions."],
  ["Non-Invasive Prenatal Test (NIPT)", GENETIC, false, "A blood test screening a baby for chromosomal conditions."],
  ["Pharmacogenomic Test", GENETIC, false, "Shows how your genes affect response to medicines."],
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  await initCosmosContainers();

  let created = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const [name, category, fasting, description] of TESTS) {
    const id = `catalog-${slug(name)}`;
    const { resource: existing } = await labTestCatalogContainer.item(id, id).read();
    if (existing) { skipped++; continue; }

    await labTestCatalogContainer.items.create({
      id,
      name,
      category,
      description,
      requires_fasting: fasting,
      requires_doctor_approval: category === GENETIC,
      recommendedFor: "",
      howItsDone: "",
      patientInstructions: fasting ? "Fast for 8-12 hours before the test. Water is allowed." : "",
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
