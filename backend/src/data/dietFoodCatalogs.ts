// Per-brand diet food catalogues — the food names a doctor picks from when
// building a diet plan on the consult screen. An org opts in via
// organizations.diet_food_catalog (NULL = no catalogue, free-text entry only,
// which is the default/Wellness behaviour). Doctors can always type a custom
// food that isn't in the list.
//
// Only the catalogue metadata lives here. The foods themselves are documents
// in the Cosmos `dietFoods` container (partition key /catalogId), seeded by
// src/scripts/seedDietFoods.ts and served by GET /api/meta/diet-foods.

export type DietMealType = "Breakfast" | "Lunch" | "Snacks" | "Dinner";

export interface DietCatalogFood {
  name: string;
  // Which of the catalogue's diets this food appears in (e.g. "Kapha").
  diets: string[];
  // Which meals the source sheets serve it at — used to rank suggestions.
  meals: DietMealType[];
}

// A diet type the doctor picks for the whole plan. Most are a single diet;
// a sequence (e.g. Snehapanam followed by Purgation) has one phase per diet,
// in order, each with its own meals and duration.
export interface DietPlanType {
  id: string;
  label: string;
  phases: string[];
}

export interface DietFoodCatalogMeta {
  id: string;
  label: string;
  diets: string[];
  planTypes: DietPlanType[];
}

const AYURVEDA_DIETS = ["Kapha", "Pitha", "Vatha", "Weight Loss", "Snehapanam", "Purgation"];

export const DIET_FOOD_CATALOGS: Record<string, DietFoodCatalogMeta> = {
  // Anandalakshmi hospital's diet sheets — see src/scripts/data/ayurvedaDietFoods.json.
  ayurveda: {
    id: "ayurveda",
    label: "Ayurveda (Anandalakshmi diet sheets)",
    diets: AYURVEDA_DIETS,
    planTypes: [
      ...AYURVEDA_DIETS.map((d) => ({ id: d.toLowerCase().replace(/\s+/g, "-"), label: d, phases: [d] })),
      // Snehapanam is usually followed by a Purgation diet.
      { id: "snehapanam-purgation", label: "Snehapanam → Purgation", phases: ["Snehapanam", "Purgation"] },
    ],
  },
};

export const DIET_FOOD_CATALOG_IDS = Object.keys(DIET_FOOD_CATALOGS);
