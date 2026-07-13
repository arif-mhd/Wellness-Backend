/**
 * Seeds the pharmacyProductsContainer with medicines across all 8 categories.
 * Run once against the live Cosmos DB:
 *   npx ts-node src/scripts/seedMedicines.ts
 */

import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { pharmacyProductsContainer, pharmaciesContainer } from "../config/cosmos";

const SEED_PHARMACY_ID   = "seed-pharmacy-wellness-001";
const SEED_PHARMACY_NAME = "Wellness Central Pharmacy";

const medicines = [
  // ── Cold & Flu ───────────────────────────────────────────────────────────────
  { name: "Paracetamol", strength: "500mg", numberOfTablets: 10, price: 8.50,  category: "Cold & Flu",       description: "Relieves mild to moderate pain and fever.",          requiresPrescription: false },
  { name: "Ibuprofen",   strength: "400mg", numberOfTablets: 10, price: 12.00, category: "Cold & Flu",       description: "Anti-inflammatory for fever, pain and cold symptoms.", requiresPrescription: false },
  { name: "Cetirizine",  strength: "10mg",  numberOfTablets: 7,  price: 15.00, category: "Cold & Flu",       description: "Antihistamine for runny nose and sneezing.",          requiresPrescription: false },
  { name: "Pseudoephedrine Nasal Spray", strength: "0.1%", numberOfTablets: null, price: 25.00, category: "Cold & Flu", description: "Nasal decongestant for blocked nose.", requiresPrescription: false },
  { name: "Vicks VapoRub", strength: null, numberOfTablets: null, price: 18.00, category: "Cold & Flu",      description: "Topical relief for nasal congestion and cough.",      requiresPrescription: false },

  // ── Heart & Pressure ─────────────────────────────────────────────────────────
  { name: "Amlodipine",  strength: "5mg",   numberOfTablets: 30, price: 45.00, category: "Heart & Pressure", description: "Calcium channel blocker for high blood pressure.",    requiresPrescription: true  },
  { name: "Atenolol",    strength: "50mg",  numberOfTablets: 28, price: 38.00, category: "Heart & Pressure", description: "Beta-blocker for hypertension and angina.",           requiresPrescription: true  },
  { name: "Aspirin",     strength: "75mg",  numberOfTablets: 28, price: 15.00, category: "Heart & Pressure", description: "Low-dose aspirin for heart health.",                  requiresPrescription: false },
  { name: "Lisinopril",  strength: "10mg",  numberOfTablets: 28, price: 55.00, category: "Heart & Pressure", description: "ACE inhibitor for blood pressure management.",        requiresPrescription: true  },
  { name: "Rosuvastatin",strength: "10mg",  numberOfTablets: 28, price: 65.00, category: "Heart & Pressure", description: "Statin to reduce cholesterol and heart risk.",        requiresPrescription: true  },

  // ── Allergy Relief ───────────────────────────────────────────────────────────
  { name: "Loratadine",     strength: "10mg",  numberOfTablets: 7,  price: 20.00, category: "Allergy Relief", description: "Non-drowsy antihistamine for allergies.",            requiresPrescription: false },
  { name: "Fexofenadine",   strength: "120mg", numberOfTablets: 7,  price: 28.00, category: "Allergy Relief", description: "Fast-acting relief for hay fever and urticaria.",   requiresPrescription: false },
  { name: "Fluticasone Nasal Spray", strength: "50mcg", numberOfTablets: null, price: 65.00, category: "Allergy Relief", description: "Corticosteroid spray for allergic rhinitis.", requiresPrescription: false },
  { name: "Montelukast",    strength: "10mg",  numberOfTablets: 14, price: 48.00, category: "Allergy Relief", description: "Leukotriene antagonist for allergies and asthma.",  requiresPrescription: true  },

  // ── Digestive Health ─────────────────────────────────────────────────────────
  { name: "Omeprazole",      strength: "20mg", numberOfTablets: 14, price: 22.00, category: "Digestive Health", description: "Proton pump inhibitor for acid reflux and ulcers.", requiresPrescription: false },
  { name: "Metoclopramide",  strength: "10mg", numberOfTablets: 10, price: 18.00, category: "Digestive Health", description: "Relieves nausea and aids stomach motility.",         requiresPrescription: false },
  { name: "Loperamide",      strength: "2mg",  numberOfTablets: 6,  price: 15.00, category: "Digestive Health", description: "Controls acute diarrhoea.",                         requiresPrescription: false },
  { name: "Lactulose Syrup", strength: null,   numberOfTablets: null, price: 35.00, category: "Digestive Health", description: "Osmotic laxative for constipation relief.",      requiresPrescription: false },
  { name: "Ranitidine",      strength: "150mg",numberOfTablets: 12, price: 20.00, category: "Digestive Health", description: "H2 blocker that reduces stomach acid production.", requiresPrescription: false },

  // ── Diabetes Care ────────────────────────────────────────────────────────────
  { name: "Metformin",         strength: "500mg", numberOfTablets: 30, price: 25.00, category: "Diabetes Care", description: "First-line medication for type 2 diabetes.",        requiresPrescription: true  },
  { name: "Glibenclamide",     strength: "5mg",   numberOfTablets: 30, price: 30.00, category: "Diabetes Care", description: "Sulfonylurea to stimulate insulin secretion.",      requiresPrescription: true  },
  { name: "Glucometer Test Strips", strength: null, numberOfTablets: null, price: 85.00, category: "Diabetes Care", description: "Blood glucose test strips for home monitoring.", requiresPrescription: false },
  { name: "Insulin Syringes",  strength: "1ml",   numberOfTablets: null, price: 20.00, category: "Diabetes Care", description: "Sterile syringes for insulin injection.",         requiresPrescription: false },
  { name: "Sitagliptin",       strength: "100mg", numberOfTablets: 28, price: 120.00, category: "Diabetes Care", description: "DPP-4 inhibitor for blood sugar control.",         requiresPrescription: true  },

  // ── Supplements ──────────────────────────────────────────────────────────────
  { name: "Vitamin C",          strength: "1000mg", numberOfTablets: 30, price: 35.00, category: "Supplements", description: "Antioxidant vitamin for immunity and skin health.", requiresPrescription: false },
  { name: "Vitamin D3",         strength: "2000IU", numberOfTablets: 30, price: 45.00, category: "Supplements", description: "Essential for bone health and immune function.",    requiresPrescription: false },
  { name: "Omega-3 Fish Oil",   strength: "1000mg", numberOfTablets: 30, price: 55.00, category: "Supplements", description: "Supports heart, brain and joint health.",           requiresPrescription: false },
  { name: "Multivitamin Daily", strength: null,     numberOfTablets: 30, price: 40.00, category: "Supplements", description: "Complete daily vitamin and mineral supplement.",   requiresPrescription: false },
  { name: "Calcium + D3",       strength: "500mg",  numberOfTablets: 30, price: 38.00, category: "Supplements", description: "Supports bone strength and density.",               requiresPrescription: false },
  { name: "Zinc",               strength: "10mg",   numberOfTablets: 30, price: 28.00, category: "Supplements", description: "Essential mineral for immunity and wound healing.", requiresPrescription: false },

  // ── Skin & Topical ───────────────────────────────────────────────────────────
  { name: "Hydrocortisone Cream", strength: "1%",  numberOfTablets: null, price: 28.00, category: "Skin & Topical", description: "Mild corticosteroid for itching and inflammation.", requiresPrescription: false },
  { name: "Clotrimazole Cream",   strength: "1%",  numberOfTablets: null, price: 22.00, category: "Skin & Topical", description: "Antifungal cream for ringworm and athlete's foot.", requiresPrescription: false },
  { name: "Betamethasone Cream",  strength: "0.1%",numberOfTablets: null, price: 35.00, category: "Skin & Topical", description: "Potent steroid cream for severe skin conditions.",   requiresPrescription: true  },
  { name: "Calamine Lotion",      strength: null,   numberOfTablets: null, price: 15.00, category: "Skin & Topical", description: "Soothes itchy and irritated skin.",               requiresPrescription: false },
  { name: "Mupirocin Ointment",   strength: "2%",  numberOfTablets: null, price: 42.00, category: "Skin & Topical", description: "Antibiotic ointment for skin infections.",          requiresPrescription: true  },

  // ── Pain Relief ──────────────────────────────────────────────────────────────
  { name: "Paracetamol",       strength: "500mg", numberOfTablets: 16, price: 10.00, category: "Pain Relief", description: "Effective relief for headache and mild pain.",          requiresPrescription: false },
  { name: "Ibuprofen",         strength: "400mg", numberOfTablets: 24, price: 18.00, category: "Pain Relief", description: "Anti-inflammatory for muscle and joint pain.",          requiresPrescription: false },
  { name: "Diclofenac Sodium Gel", strength: "1%", numberOfTablets: null, price: 25.00, category: "Pain Relief", description: "Topical NSAID gel for localised pain relief.",     requiresPrescription: false },
  { name: "Naproxen",          strength: "250mg", numberOfTablets: 12, price: 22.00, category: "Pain Relief", description: "Long-acting NSAID for pain and inflammation.",          requiresPrescription: false },
  { name: "Tramadol",          strength: "50mg",  numberOfTablets: 10, price: 45.00, category: "Pain Relief", description: "Opioid analgesic for moderate to severe pain.",         requiresPrescription: true  },
];

async function main() {
  console.log("Seeding pharmacy products...");

  // Ensure seed pharmacy exists
  const now = new Date().toISOString();
  await pharmaciesContainer.items.upsert({
    id:           SEED_PHARMACY_ID,
    pharmacyName: SEED_PHARMACY_NAME,
    email:        "pharmacy@wellnesscentral.ae",
    status:       "approved",
    createdAt:    now,
  });
  console.log(`✅ Seed pharmacy: ${SEED_PHARMACY_NAME}`);

  let inserted = 0;
  for (const med of medicines) {
    await pharmacyProductsContainer.items.create({
      id:                  uuidv4(),
      pharmacyId:          SEED_PHARMACY_ID,
      pharmacyName:        SEED_PHARMACY_NAME,
      name:                med.name,
      strength:            med.strength ?? null,
      numberOfTablets:     med.numberOfTablets ?? null,
      description:         med.description,
      category:            med.category,
      price:               med.price,
      stock:               100,
      requiresPrescription: med.requiresPrescription,
      imageUrl:            null,
      status:              "approved",
      approvedAt:          now,
      createdAt:           now,
    });
    inserted++;
    console.log(`  [${inserted}/${medicines.length}] ${med.name} ${med.strength ?? ''} — ${med.category}`);
  }

  console.log(`\n✅ Done — seeded ${inserted} medicines across 8 categories.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
