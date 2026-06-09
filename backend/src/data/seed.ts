/**
 * Seed script — inserts default vaccines and lab services + tests into Cosmos DB.
 * Run once:  npx ts-node src/data/seed.ts
 * Safe to re-run — uses upsert so duplicate IDs are simply overwritten.
 */

import "dotenv/config";
import { v4 as uuid } from "uuid";
import { vaccinesContainer, labServicesContainer, labTestsContainer } from "../config/cosmos";

const now = new Date().toISOString();

// ─── Vaccines ────────────────────────────────────────────────────────────────

const VACCINES = [
  {
    id: uuid(),
    name: "Influenza (Flu) Vaccine",
    manufacturer: "Sanofi Pasteur",
    vaccineType: "Inactivated",
    category: "Routine",
    description:
      "The influenza vaccine protects against the most common strains of seasonal flu. It is updated annually to match circulating viruses and is recommended for everyone aged 6 months and older.",
    recommendedFor:
      "Recommended for all individuals 6 months and older, especially the elderly, pregnant women, healthcare workers, and those with chronic conditions.",
    ageRange: "6 months and above",
    targetGroups: ["Adults", "Elderly", "Children", "Pregnant Women"],
    doseSchedule:
      "1 dose annually. Children aged 6 months–8 years receiving flu vaccine for the first time need 2 doses given 4 weeks apart.",
    howAdministered:
      "Intramuscular (IM) injection, typically in the upper arm (deltoid) for adults or the outer thigh for young children.",
    sideEffects:
      "Soreness, redness, or swelling at injection site. Low-grade fever, headache, or muscle aches for 1–2 days. Serious reactions are rare.",
    patientInstructions:
      "Stay at the clinic for 15 minutes post-vaccination. Avoid rubbing the injection site. Get vaccinated every year before flu season begins (October–November).",
    price: 80,
    originalPrice: 100,
    doses_required: 1,
    age_group: "All ages",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "Hepatitis B Vaccine",
    manufacturer: "GlaxoSmithKline (Engerix-B)",
    vaccineType: "Recombinant Subunit",
    category: "Routine",
    description:
      "The Hepatitis B vaccine stimulates the immune system to produce antibodies against the Hepatitis B virus (HBV), preventing liver infection, cirrhosis, and liver cancer caused by chronic HBV.",
    recommendedFor:
      "All newborns, unvaccinated children and adolescents, adults at risk including healthcare workers, travellers, and those with multiple partners.",
    ageRange: "Birth and above",
    targetGroups: ["Newborns", "Children", "Adults", "Healthcare Workers", "Travellers"],
    doseSchedule:
      "3-dose series: initial dose, then at 1 month, then at 6 months. An accelerated 4-dose schedule is available for rapid protection.",
    howAdministered:
      "Intramuscular (IM) injection in the deltoid muscle for adults and children over 3 years. Anterolateral thigh for infants.",
    sideEffects:
      "Soreness at injection site, mild fatigue, headache, and low-grade fever. Serious allergic reactions are extremely rare.",
    patientInstructions:
      "Complete all 3 doses for full protection. Inform your doctor if you are immunocompromised. Post-vaccination antibody testing may be recommended for healthcare workers.",
    price: 120,
    originalPrice: 150,
    doses_required: 3,
    age_group: "All ages",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "COVID-19 Vaccine (mRNA Booster)",
    manufacturer: "Pfizer-BioNTech (Comirnaty)",
    vaccineType: "mRNA",
    category: "COVID-19",
    description:
      "The updated mRNA booster vaccine provides enhanced protection against current circulating COVID-19 variants. It instructs cells to produce a harmless spike protein, triggering an immune response without using the live virus.",
    recommendedFor:
      "Adults and adolescents aged 12 and older who have completed primary COVID-19 vaccination. Particularly important for the elderly, immunocompromised, and those with chronic conditions.",
    ageRange: "12 years and above",
    targetGroups: ["Adults", "Elderly", "Immunocompromised", "Adolescents"],
    doseSchedule:
      "Single booster dose. May be repeated every 6–12 months depending on health authority guidelines and individual risk factors.",
    howAdministered:
      "Intramuscular (IM) injection in the upper arm (deltoid muscle).",
    sideEffects:
      "Pain, redness, or swelling at injection site. Fatigue, headache, muscle pain, chills, and low-grade fever — usually resolving within 1–3 days. Myocarditis is a rare but monitored event especially in young males.",
    patientInstructions:
      "Remain under observation for 15–30 minutes post-injection. Avoid strenuous physical activity for 48 hours. Contact your doctor if chest pain, shortness of breath, or unusual heartbeat occurs after vaccination.",
    price: 150,
    originalPrice: null,
    doses_required: 1,
    age_group: "12+ years",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "MMR Vaccine (Measles, Mumps, Rubella)",
    manufacturer: "Merck (M-M-R II)",
    vaccineType: "Live Attenuated",
    category: "Routine",
    description:
      "The MMR vaccine is a combined live-attenuated vaccine that protects against three serious viral infections: measles, mumps, and rubella. All three diseases can cause severe complications including encephalitis, deafness, and birth defects.",
    recommendedFor:
      "Children aged 12–15 months for first dose and 4–6 years for second dose. Unvaccinated adults born after 1957, healthcare workers, college students, and international travellers.",
    ageRange: "12 months and above",
    targetGroups: ["Children", "Adults", "Travellers", "Healthcare Workers"],
    doseSchedule:
      "2-dose series: first dose at 12–15 months, second dose at 4–6 years. Adults who need vaccination receive 2 doses given 28 days apart.",
    howAdministered:
      "Subcutaneous (SC) injection in the outer aspect of the upper arm or anterolateral thigh in young children.",
    sideEffects:
      "Mild rash, low-grade fever, and temporary joint pain 7–12 days after vaccination. Temporary thrombocytopenia is rare. Serious reactions are very uncommon.",
    patientInstructions:
      "Not for use in pregnant women — avoid pregnancy for 4 weeks post-vaccination. Inform your doctor if you are immunocompromised or on immunosuppressive therapy. Aspirin should be avoided in children for 6 weeks after vaccination.",
    price: 110,
    originalPrice: 130,
    doses_required: 2,
    age_group: "12 months+",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "Typhoid Vaccine",
    manufacturer: "Sanofi Pasteur (Typhim Vi)",
    vaccineType: "Polysaccharide",
    category: "Travel",
    description:
      "The typhoid vaccine protects against Salmonella Typhi infection, a bacterial illness transmitted through contaminated food and water. It is essential for travellers to regions with poor sanitation.",
    recommendedFor:
      "Travellers to South Asia, Southeast Asia, Africa, and Latin America. People in close contact with typhoid carriers. Laboratory workers handling Salmonella Typhi.",
    ageRange: "2 years and above",
    targetGroups: ["Travellers", "Adults", "Children"],
    doseSchedule:
      "Single dose at least 2 weeks before travel. Booster every 2–3 years for continued exposure. An oral 4-dose series (Vivotif) is an alternative for those aged 6 years and older.",
    howAdministered:
      "Intramuscular (IM) or subcutaneous (SC) injection, typically in the upper arm.",
    sideEffects:
      "Soreness and redness at injection site, mild fever, and headache in some recipients. Serious reactions are rare.",
    patientInstructions:
      "Receive the vaccine at least 2 weeks before potential exposure to allow full immune response. The vaccine does not protect against Salmonella Paratyphi — practise safe food and water hygiene during travel.",
    price: 95,
    originalPrice: 115,
    doses_required: 1,
    age_group: "2+ years",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "Rabies Pre-Exposure Vaccine",
    manufacturer: "Sanofi Pasteur (Imovax Rabies)",
    vaccineType: "Inactivated",
    category: "Travel",
    description:
      "The pre-exposure rabies vaccine is recommended for travellers to regions where rabies is common in animals and where access to post-exposure treatment may be limited. It simplifies but does not eliminate the need for post-exposure prophylaxis.",
    recommendedFor:
      "Travellers to rabies-endemic regions (Asia, Africa, Latin America), veterinarians, wildlife handlers, laboratory workers, and those involved in outdoor activities in high-risk areas.",
    ageRange: "All ages",
    targetGroups: ["Travellers", "Adults", "Children", "Healthcare Workers"],
    doseSchedule:
      "3-dose series: Day 0, Day 7, Day 21 or 28. Booster doses every 2 years for continued high-risk exposure.",
    howAdministered:
      "Intramuscular (IM) injection in the deltoid muscle. Never administered in the gluteal area as it results in lower antibody response.",
    sideEffects:
      "Pain, swelling, itching at injection site. Mild nausea, headache, dizziness, and abdominal pain in some cases. Immune complex reactions possible after booster doses.",
    patientInstructions:
      "Begin the series well in advance of travel — ideally 4 weeks before departure. Even after pre-exposure vaccination, seek immediate medical attention and additional doses after any potential rabies exposure (animal bite or scratch).",
    price: 200,
    originalPrice: 240,
    doses_required: 3,
    age_group: "All ages",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "HPV Vaccine (Gardasil 9)",
    manufacturer: "Merck",
    vaccineType: "Recombinant Subunit",
    category: "Adult",
    description:
      "Gardasil 9 protects against 9 strains of Human Papillomavirus (HPV) responsible for cervical cancer, other HPV-related cancers (vaginal, vulvar, anal, oropharyngeal, penile), and genital warts.",
    recommendedFor:
      "Girls and boys aged 9–14 years as a 2-dose series. Females aged 15–45 and males aged 15–26 as a 3-dose series. Most effective when given before sexual debut.",
    ageRange: "9–45 years",
    targetGroups: ["Children", "Adolescents", "Adults"],
    doseSchedule:
      "Ages 9–14: 2 doses at 0 and 6–12 months. Ages 15–45: 3 doses at 0, 2 months, and 6 months.",
    howAdministered:
      "Intramuscular (IM) injection in the deltoid muscle of the upper arm or anterolateral thigh.",
    sideEffects:
      "Pain, swelling, and redness at injection site (very common). Headache, fever, dizziness, and nausea. Syncope (fainting) may occur shortly after injection — remain seated for 15 minutes post-vaccination.",
    patientInstructions:
      "Sit or lie down for 15 minutes after vaccination to prevent injury from fainting. HPV vaccine does not replace routine cervical cancer screening (Pap smears/HPV tests). It does not treat existing HPV infections.",
    price: 350,
    originalPrice: 400,
    doses_required: 3,
    age_group: "9–45 years",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuid(),
    name: "Meningococcal Vaccine (MenACWY)",
    manufacturer: "GlaxoSmithKline (Menveo)",
    vaccineType: "Conjugate",
    category: "Routine",
    description:
      "The meningococcal conjugate vaccine protects against four serogroups (A, C, W, Y) of Neisseria meningitidis bacteria, which can cause bacterial meningitis and septicaemia — potentially fatal within 24 hours.",
    recommendedFor:
      "Adolescents aged 11–12 years with a booster at 16. College freshmen living in dormitories. Hajj/Umrah pilgrims (mandatory). Travellers to the meningitis belt in sub-Saharan Africa.",
    ageRange: "2 months and above",
    targetGroups: ["Children", "Adolescents", "Travellers", "Adults"],
    doseSchedule:
      "Children 2–23 months: 2 doses. Adolescents 11–12 years: 1 dose, booster at 16. Adults at risk: 1 dose; revaccinate every 5 years if risk continues.",
    howAdministered:
      "Intramuscular (IM) injection in the upper arm (deltoid).",
    sideEffects:
      "Soreness and redness at injection site, headache, fatigue, and low-grade fever. Serious reactions are rare.",
    patientInstructions:
      "Hajj/Umrah pilgrims must receive the vaccine within 3 years and at least 10 days before departure as per Saudi Arabia health authority requirements. Carry your vaccination certificate.",
    price: 130,
    originalPrice: 160,
    doses_required: 1,
    age_group: "All ages",
    is_active: true,
    createdAt: now,
    updatedAt: now,
  },
];

// ─── Lab Services & Tests ────────────────────────────────────────────────────

const LAB_ID_1 = uuid();
const LAB_ID_2 = uuid();

const LABS = [
  {
    id: LAB_ID_1,
    name: "Wellness Diagnostics Centre",
    email: "info@wellnessdiagnostics.ae",
    contactNumber: "+971-4-234-5678",
    location: "Dubai Healthcare City, Dubai, UAE",
    director: "Dr. Sarah Al-Mansouri",
    manager: "Mr. Khalid Hassan",
    labLicense: "DHA-LAB-2021-0042",
    healthAuthorityLicense: "MOH-HL-2021-3381",
    accreditationNumber: "CAP-AE-2021-1142",
    operatingHours: "Mon–Fri: 7:00 AM – 9:00 PM | Sat–Sun: 8:00 AM – 6:00 PM",
    website: "https://wellnessdiagnostics.ae",
    description:
      "Wellness Diagnostics Centre is a CAP-accredited full-service laboratory offering over 500 diagnostic tests. We specialise in routine pathology, advanced molecular diagnostics, and preventive health screening packages.",
    specializations: ["Haematology", "Biochemistry", "Microbiology", "Molecular Diagnostics", "Hormonal Assays"],
    status: "approved",
    createdAt: now,
    approvedAt: now,
    approvedBy: "system-seed",
    totalTests: 0,
    rating: 4.8,
  },
  {
    id: LAB_ID_2,
    name: "AlShifa Medical Laboratory",
    email: "lab@alshifa.ae",
    contactNumber: "+971-2-567-8901",
    location: "Al Khalidiyah, Abu Dhabi, UAE",
    director: "Dr. Omar Yousuf",
    manager: "Ms. Fatima Al-Rashidi",
    labLicense: "DOH-LAB-2020-0117",
    healthAuthorityLicense: "MOH-HL-2020-2290",
    accreditationNumber: "ISO-15189-AE-2020-88",
    operatingHours: "Mon–Sat: 6:30 AM – 10:00 PM | Sun: 8:00 AM – 5:00 PM",
    website: "https://alshifalab.ae",
    description:
      "AlShifa Medical Laboratory provides ISO 15189-accredited testing services across Abu Dhabi. Our state-of-the-art facility processes thousands of samples daily with rapid turnaround times and home sample collection.",
    specializations: ["Clinical Chemistry", "Immunology", "Virology", "Genetics", "Toxicology"],
    status: "approved",
    createdAt: now,
    approvedAt: now,
    approvedBy: "system-seed",
    totalTests: 0,
    rating: 4.6,
  },
];

const TESTS = [
  // ── Wellness Diagnostics tests ───────────────────────────────────────────────
  {
    id: uuid(),
    labId: LAB_ID_1,
    labName: "Wellness Diagnostics Centre",
    name: "Complete Blood Count (CBC)",
    category: "Haematology",
    price: 45,
    turnaround_hours: 4,
    requires_fasting: false,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "A complete blood count measures the cellular components of blood including red blood cells, white blood cells, haemoglobin, haematocrit, and platelets. It is one of the most commonly ordered tests for screening, diagnosis, and monitoring of many conditions.",
    recommendedFor:
      "Routine annual check-up, suspected anaemia or infection, monitoring chemotherapy patients, pre-surgical assessment.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Children", "Elderly"],
    normalValues: [
      "RBC: 4.5–5.5 million/µL (men), 4.0–5.0 million/µL (women)",
      "WBC: 4,500–11,000/µL",
      "Haemoglobin: 13.5–17.5 g/dL (men), 12.0–15.5 g/dL (women)",
      "Platelets: 150,000–400,000/µL",
    ],
    howItsDone:
      "A small blood sample is drawn from a vein in your arm using a needle. The sample is collected in a tube with anticoagulant and analysed by an automated haematology analyser.",
    recommendedFrequency: "Annually for routine screening; more frequently if a condition is being monitored.",
    patientInstructions:
      "No fasting required. Inform your healthcare provider of any medications, as some can affect CBC results. Stay hydrated before the test.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_1,
    labName: "Wellness Diagnostics Centre",
    name: "Lipid Panel (Cholesterol Profile)",
    category: "Biochemistry",
    price: 70,
    turnaround_hours: 6,
    requires_fasting: true,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "A lipid panel measures the levels of fats and fatty substances used as a source of energy in the blood. It includes total cholesterol, LDL (bad cholesterol), HDL (good cholesterol), and triglycerides — key indicators of cardiovascular risk.",
    recommendedFor:
      "Adults over 20 as part of routine cardiovascular risk assessment. People with diabetes, hypertension, family history of heart disease, or obesity.",
    ageRange: "20 years and above",
    targetGroups: ["Adults", "Elderly"],
    normalValues: [
      "Total Cholesterol: < 200 mg/dL (desirable)",
      "LDL: < 100 mg/dL (optimal)",
      "HDL: > 60 mg/dL (protective)",
      "Triglycerides: < 150 mg/dL",
    ],
    howItsDone:
      "Blood is drawn from a vein after a 9–12 hour fast. The serum is separated and analysed on an automated biochemistry analyser.",
    recommendedFrequency: "Every 4–6 years for healthy adults; annually for those with known risk factors or on lipid-lowering therapy.",
    patientInstructions:
      "Fast for 9–12 hours before the test (water is permitted). Avoid alcohol for 24 hours prior. Continue your regular medications unless your doctor advises otherwise.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_1,
    labName: "Wellness Diagnostics Centre",
    name: "HbA1c (Glycated Haemoglobin)",
    category: "Biochemistry",
    price: 85,
    turnaround_hours: 6,
    requires_fasting: false,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "HbA1c measures the percentage of haemoglobin coated with sugar (glycated) over the past 2–3 months, providing a long-term picture of blood sugar control. It is the gold standard test for diagnosing and monitoring diabetes.",
    recommendedFor:
      "Diagnosis of pre-diabetes and type 2 diabetes. Monitoring glycaemic control in patients with known diabetes. Screening for people with risk factors such as obesity, family history, or gestational diabetes.",
    ageRange: "All ages (most relevant for adults)",
    targetGroups: ["Adults", "Elderly", "Diabetics"],
    normalValues: [
      "Normal: < 5.7%",
      "Pre-diabetes: 5.7–6.4%",
      "Diabetes: ≥ 6.5%",
      "Target for treated diabetics: < 7% (individualised by physician)",
    ],
    howItsDone:
      "A small blood sample is drawn from a vein. No special preparation is required. The sample is analysed using HPLC or immunoassay methods.",
    recommendedFrequency:
      "Every 3 months for diabetics with uncontrolled blood sugar; every 6 months once stable. Annually for pre-diabetics.",
    patientInstructions:
      "No fasting required. Certain conditions such as haemoglobin variants, anaemia, or recent blood transfusion may affect results — inform your doctor.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_1,
    labName: "Wellness Diagnostics Centre",
    name: "Thyroid Function Test (TSH, T3, T4)",
    category: "Hormonal Assays",
    price: 120,
    turnaround_hours: 8,
    requires_fasting: false,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "A thyroid function panel measures TSH (thyroid-stimulating hormone), free T3 (triiodothyronine), and free T4 (thyroxine) to assess how well the thyroid gland is working. It detects hypothyroidism, hyperthyroidism, and monitors thyroid replacement therapy.",
    recommendedFor:
      "Symptoms of fatigue, unexplained weight change, cold/heat intolerance, hair loss, palpitations, or mood changes. Screening for newborns, pregnant women, and patients on thyroid medication.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Elderly", "Pregnant Women", "Newborns"],
    normalValues: [
      "TSH: 0.4–4.0 mIU/L",
      "Free T4: 12–22 pmol/L",
      "Free T3: 3.1–6.8 pmol/L",
    ],
    howItsDone:
      "Blood is drawn from a vein in the arm. No fasting or special preparation is needed. The sample is analysed using immunoassay on an automated platform.",
    recommendedFrequency:
      "Annually for those on thyroid medication. Every 6–12 months for patients with known thyroid disease.",
    patientInstructions:
      "Collect blood in the morning if possible (TSH has diurnal variation). If on thyroid medication (levothyroxine), take it AFTER the blood draw for consistent results. Inform your doctor of any biotin supplements as they can interfere with assay results.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_1,
    labName: "Wellness Diagnostics Centre",
    name: "Vitamin D (25-OH) Test",
    category: "Biochemistry",
    price: 95,
    turnaround_hours: 12,
    requires_fasting: false,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "Measures the level of 25-hydroxyvitamin D in the blood, the best indicator of overall vitamin D status. Vitamin D is essential for calcium absorption, bone health, immune function, and has been linked to mood regulation.",
    recommendedFor:
      "Individuals with limited sun exposure, darker skin tones, obesity, chronic kidney or liver disease, malabsorption syndromes, or those taking medications that affect vitamin D metabolism.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Elderly", "Children"],
    normalValues: [
      "Deficient: < 20 ng/mL (50 nmol/L)",
      "Insufficient: 20–29 ng/mL",
      "Sufficient: 30–100 ng/mL",
      "Toxic: > 100 ng/mL",
    ],
    howItsDone:
      "A blood sample is collected from a vein. The serum is analysed using chemiluminescent immunoassay (CLIA) or LC-MS/MS for high accuracy.",
    recommendedFrequency:
      "Annually as part of routine wellness check. Every 3 months while on vitamin D supplementation therapy until levels normalise.",
    patientInstructions:
      "No special preparation needed. Results should be interpreted alongside calcium, phosphate, and PTH levels for a complete picture. Your doctor will advise on supplementation based on results and clinical context.",
    createdAt: now,
    addedBy: "system-seed",
  },

  // ── AlShifa Medical Laboratory tests ─────────────────────────────────────────
  {
    id: uuid(),
    labId: LAB_ID_2,
    labName: "AlShifa Medical Laboratory",
    name: "COVID-19 PCR Test",
    category: "Virology",
    price: 150,
    turnaround_hours: 12,
    requires_fasting: false,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "The RT-PCR test detects genetic material (RNA) of the SARS-CoV-2 virus with high sensitivity and specificity. It is the gold standard for diagnosing active COVID-19 infection and is accepted for international travel requirements.",
    recommendedFor:
      "Symptomatic individuals, close contacts of confirmed COVID-19 cases, pre-travel testing, pre-surgical screening, and healthcare worker surveillance.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Children", "Elderly", "Travellers"],
    normalValues: [
      "Negative (Not Detected): No SARS-CoV-2 RNA detected",
      "Positive (Detected): SARS-CoV-2 RNA detected",
    ],
    howItsDone:
      "A healthcare professional collects a nasopharyngeal swab (inserted gently into each nostril). In some protocols, an oropharyngeal (throat) swab or saliva sample may be used. The sample is processed using real-time PCR amplification.",
    recommendedFrequency: "As required based on symptoms, exposure, or travel requirements.",
    patientInstructions:
      "Do not eat, drink, or use nasal sprays for 30 minutes before sample collection. The swab may cause brief discomfort. Results are typically available within 12 hours.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_2,
    labName: "AlShifa Medical Laboratory",
    name: "Liver Function Test (LFT)",
    category: "Clinical Chemistry",
    price: 90,
    turnaround_hours: 6,
    requires_fasting: true,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "A liver function panel measures enzymes and proteins produced by the liver to evaluate liver health. It includes ALT, AST, ALP, GGT, bilirubin, albumin, and total protein — providing insight into inflammation, damage, and liver synthetic function.",
    recommendedFor:
      "Routine liver health monitoring, suspected hepatitis, jaundice, alcohol use disorder, patients on hepatotoxic medications, non-alcoholic fatty liver disease (NAFLD) surveillance.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Elderly"],
    normalValues: [
      "ALT: 7–56 U/L",
      "AST: 10–40 U/L",
      "ALP: 44–147 U/L",
      "GGT: 8–61 U/L",
      "Total Bilirubin: 0.1–1.2 mg/dL",
      "Albumin: 3.4–5.4 g/dL",
    ],
    howItsDone:
      "Blood is drawn from a vein in the arm. The sample is centrifuged to obtain serum, which is analysed on an automated biochemistry analyser.",
    recommendedFrequency:
      "Annually for routine screening. Every 3–6 months for patients with known liver disease or on hepatotoxic medications.",
    patientInstructions:
      "Fast for 8 hours before the test (water is permitted). Avoid alcohol for 24–48 hours. Inform your doctor of all medications including over-the-counter drugs and supplements, as many are metabolised by the liver.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_2,
    labName: "AlShifa Medical Laboratory",
    name: "Kidney Function Test (KFT / RFT)",
    category: "Clinical Chemistry",
    price: 80,
    turnaround_hours: 6,
    requires_fasting: true,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "The kidney function test (also called renal function test) measures creatinine, blood urea nitrogen (BUN), uric acid, and electrolytes (sodium, potassium, chloride) to assess how well the kidneys are filtering waste from the blood.",
    recommendedFor:
      "Diabetics, hypertensive patients, people on NSAIDs or nephrotoxic medications, those with a family history of kidney disease, and pre-surgical screening.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Elderly", "Diabetics"],
    normalValues: [
      "Creatinine: 0.6–1.2 mg/dL (men), 0.5–1.1 mg/dL (women)",
      "BUN: 7–20 mg/dL",
      "eGFR: > 60 mL/min/1.73m² (normal)",
      "Uric Acid: 3.5–7.2 mg/dL",
      "Sodium: 135–145 mEq/L",
      "Potassium: 3.5–5.0 mEq/L",
    ],
    howItsDone:
      "A blood sample is drawn from a vein after an 8-hour fast. A urine sample (random or 24-hour collection) may be requested alongside the blood test.",
    recommendedFrequency:
      "Annually for adults with risk factors. Every 3–6 months for patients with chronic kidney disease (CKD) or those on renally-cleared medications.",
    patientInstructions:
      "Fast for 8 hours. Stay well hydrated. Avoid heavy exercise for 24 hours as it can temporarily raise creatinine. Inform your doctor about protein supplements and any medications.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_2,
    labName: "AlShifa Medical Laboratory",
    name: "Allergy Panel (IgE Specific — Common Allergens)",
    category: "Immunology",
    price: 280,
    turnaround_hours: 24,
    requires_fasting: false,
    requires_doctor_approval: true,
    is_active: true,
    description:
      "A specific IgE allergy panel identifies immune system sensitivity to a range of common allergens including house dust mites, pet dander, mould spores, common foods (milk, egg, peanut, wheat, soy, tree nuts), and pollen — helping diagnose allergic conditions.",
    recommendedFor:
      "Patients with suspected allergic rhinitis, asthma, eczema, urticaria, food allergy, or anaphylaxis history. Useful when skin prick testing is not feasible.",
    ageRange: "All ages",
    targetGroups: ["Adults", "Children", "Elderly"],
    normalValues: [
      "Class 0 (< 0.35 kU/L): No sensitisation",
      "Class 1 (0.35–0.7 kU/L): Low sensitisation",
      "Class 2 (0.7–3.5 kU/L): Moderate",
      "Class 3 (3.5–17.5 kU/L): High",
      "Class 4+ (> 17.5 kU/L): Very High/Extremely High",
    ],
    howItsDone:
      "A single blood draw is used to measure IgE antibodies against a panel of specific allergens simultaneously using fluorescence enzyme immunoassay (FEIA) technology.",
    recommendedFrequency:
      "Once to establish diagnosis. Repeat after 2–3 years of allergen immunotherapy to monitor response, or if new allergic symptoms develop.",
    patientInstructions:
      "No fasting required. Do not take antihistamines for 3–5 days before testing as they may suppress IgE levels. This is a blood test — not a skin test — so it is safe for patients on anticoagulants.",
    createdAt: now,
    addedBy: "system-seed",
  },
  {
    id: uuid(),
    labId: LAB_ID_2,
    labName: "AlShifa Medical Laboratory",
    name: "Full Body Health Screening Package",
    category: "Biochemistry",
    price: 450,
    turnaround_hours: 24,
    requires_fasting: true,
    requires_doctor_approval: false,
    is_active: true,
    description:
      "A comprehensive preventive health screening package covering 60+ parameters across multiple organ systems. Includes CBC, lipid panel, liver function, kidney function, thyroid, HbA1c, iron studies, vitamin B12, vitamin D, urine analysis, and tumour markers.",
    recommendedFor:
      "Adults aged 30 and above for annual preventive check-up. Individuals with multiple risk factors. Pre-employment or insurance medical screenings.",
    ageRange: "30 years and above",
    targetGroups: ["Adults", "Elderly"],
    normalValues: [
      "Results interpreted by report — covers 60+ parameters across all major organ systems",
    ],
    howItsDone:
      "A fasting blood draw and mid-stream urine sample are collected. All samples are processed in-house with results available within 24 hours. A digital report with flagged abnormal values is provided.",
    recommendedFrequency:
      "Annually, or as recommended by your physician based on your personal and family health history.",
    patientInstructions:
      "Fast for 10–12 hours (water permitted). Avoid alcohol for 48 hours. Collect a mid-stream urine sample in the provided sterile container. Wear comfortable clothing for easy blood draw access. Bring a list of your current medications.",
    createdAt: now,
    addedBy: "system-seed",
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱  Starting seed...\n");

  // Vaccines
  console.log(`💉  Seeding ${VACCINES.length} vaccines...`);
  for (const v of VACCINES) {
    await vaccinesContainer.items.upsert(v);
    console.log(`   ✅  ${v.name}`);
  }

  // Labs
  console.log(`\n🏥  Seeding ${LABS.length} labs...`);
  for (const l of LABS) {
    await labServicesContainer.items.upsert(l);
    console.log(`   ✅  ${l.name}`);
  }

  // Tests — also update totalTests count on each lab
  console.log(`\n🧪  Seeding ${TESTS.length} lab tests...`);
  const testCountByLab: Record<string, number> = {};
  for (const t of TESTS) {
    await labTestsContainer.items.upsert(t);
    testCountByLab[t.labId] = (testCountByLab[t.labId] ?? 0) + 1;
    console.log(`   ✅  [${t.labName}] ${t.name}`);
  }

  // Update totalTests on each lab
  for (const lab of LABS) {
    const count = testCountByLab[lab.id] ?? 0;
    await labServicesContainer.items.upsert({ ...lab, totalTests: count });
  }

  console.log("\n✅  Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
