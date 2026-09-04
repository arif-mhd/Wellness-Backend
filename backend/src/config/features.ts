// Canonical list of white-label feature flags. Add a new key here whenever a
// module becomes optional per organization — every org row in org_features
// is expected to cover exactly this set (see initDb's seed step and
// adminFeatureFlags.ts's GET, which both read from this array).
export interface FeatureDef {
  key: string;
  label: string;
  group: "clinical" | "commerce" | "wellness";
}

export const FEATURE_DEFS: FeatureDef[] = [
  { key: "appointments",  label: "Appointments & video consults", group: "clinical" },
  { key: "prescriptions", label: "Prescriptions",                  group: "clinical" },
  { key: "pharmacy",      label: "Pharmacy & medicine orders",     group: "commerce" },
  { key: "lab_booking",   label: "Lab booking",                    group: "commerce" },
  { key: "insurance",     label: "Insurance verification",         group: "commerce" },
  { key: "vaccination",   label: "Vaccination booking",            group: "wellness" },
  { key: "fitness",       label: "Fitness tracking",                group: "wellness" },
  { key: "menstrual",     label: "Menstrual tracking",              group: "wellness" },
  { key: "pregnancy",     label: "Pregnancy tracking",               group: "wellness" },
  { key: "nutrition_ai",  label: "AI food/nutrition analysis",      group: "wellness" },
  { key: "ai_chat",       label: "AI symptom-checker chat",         group: "wellness" },
  { key: "articles",      label: "Articles & content",              group: "wellness" },
  { key: "sos",           label: "SOS emergency alert",             group: "wellness" },
];

export const FEATURE_KEYS: string[] = FEATURE_DEFS.map((f) => f.key);

export const DEFAULT_ORG_SLUG = "wellness";
