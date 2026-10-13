import { pharmaciesContainer, pharmacyProductsContainer } from "../config/cosmos";
import { getPharmacyIdsForOrg } from "./orgScope";
import { buildInClause } from "./clinicScope";

// Patient-facing Medicine shape, shared by GET /pharmacy/catalogue(/:id) and
// the AI chat's medicine-suggestion resolver — kept in one place so the two
// call sites can't drift apart on field names/fallbacks.
export interface CatalogueMedicine {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  manufacturer: string | null;
  description: string | null;
  price: number;
  in_stock: boolean;
  requires_prescription: boolean;
  image_url: string | null;
  is_active: boolean;
  numberOfTablets: string | null;
  productSummary: string | null;
  recommendedFor: string | null;
  benefits: string | null;
  sideEffects: string | null;
  howToUse: string | null;
  pharmacyId: string | null;
  pharmacyName: string | null;
  source: "pharmacy";
}

export function mapProductToMedicine(p: any, pharmacyNameMap: Record<string, string>): CatalogueMedicine {
  return {
    id: p.id,
    name: p.name,
    generic_name: p.description ?? null,
    category: p.category,
    form: p.category,
    strength: p.strength ?? null,
    manufacturer: p.manufacturer ?? pharmacyNameMap[p.pharmacyId] ?? null,
    description: p.description ?? null,
    price: p.price,
    in_stock: p.inStock !== false,
    requires_prescription: p.requiresPrescription ?? (p.category === "Prescription"),
    image_url: p.imageUrl ?? null,
    is_active: p.inStock !== false,
    numberOfTablets: p.numberOfTablets ?? null,
    productSummary: p.productSummary ?? null,
    recommendedFor: p.recommendedFor ?? null,
    benefits: p.benefits ?? null,
    sideEffects: p.sideEffects ?? null,
    howToUse: p.howToUse ?? null,
    pharmacyId: p.pharmacyId ?? null,
    pharmacyName: pharmacyNameMap[p.pharmacyId] ?? null,
    source: "pharmacy",
  };
}

// Bulk pharmacyId -> pharmacyName lookup — products only store pharmacyId,
// the display name lives on the pharmacy doc itself.
export async function fetchPharmacyNameMap(pharmacyIds: string[]): Promise<Record<string, string>> {
  if (!pharmacyIds.length) return {};
  const { resources } = await pharmaciesContainer.items.query({
    query: "SELECT c.id, c.pharmacyName FROM c WHERE ARRAY_CONTAINS(@ids, c.id)",
    parameters: [{ name: "@ids", value: pharmacyIds }],
  }).fetchAll();
  const map: Record<string, string> = {};
  resources.forEach((d: any) => { map[d.id] = d.pharmacyName; });
  return map;
}

export interface MedicineSuggestionInput {
  drugName: string;
  dosageInstructions: string;
  reason: string;
}

export interface ResolvedMedicineSuggestion extends CatalogueMedicine {
  dosageInstructions?: string;
  reason?: string;
}

const MAX_SUGGESTIONS = 4;
const MAX_MATCHES_PER_NAME = 2;

// Resolves AI-suggested drug names against the org's real, approved pharmacy
// catalogue — only real, in-stock, orderable products are ever returned, so
// chat can never offer to "buy" something the pharmacy doesn't actually
// carry. An org with no approved pharmacy of its own naturally resolves to
// an empty list, same scoping as GET /pharmacy/catalogue.
export async function resolveMedicineSuggestions(
  orgId: string,
  suggestions: MedicineSuggestionInput[]
): Promise<ResolvedMedicineSuggestion[]> {
  const cleaned = suggestions.filter((s) => s?.drugName?.trim()).slice(0, MAX_SUGGESTIONS);
  if (!cleaned.length) return [];

  const orgPharmacyIds = await getPharmacyIdsForOrg(orgId);
  if (!orgPharmacyIds.length) return [];

  const { clause: orgClause, parameters: orgParams } = buildInClause("c.pharmacyId", orgPharmacyIds);

  const seenIds = new Set<string>();
  const matched: { product: any; suggestion: MedicineSuggestionInput }[] = [];

  for (const suggestion of cleaned) {
    const query =
      `SELECT TOP ${MAX_MATCHES_PER_NAME} * FROM c WHERE c.status = 'approved' ` +
      `AND (NOT IS_DEFINED(c.flagged) OR c.flagged = false) AND ${orgClause} ` +
      `AND CONTAINS(LOWER(c.name), @term)`;
    const { resources } = await pharmacyProductsContainer.items.query({
      query,
      parameters: [...orgParams, { name: "@term", value: suggestion.drugName.trim().toLowerCase() }],
    } as any).fetchAll();

    for (const p of resources as any[]) {
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      matched.push({ product: p, suggestion });
    }
  }

  if (!matched.length) return [];

  const pharmacyIds = [...new Set(matched.map((m) => m.product.pharmacyId).filter(Boolean))];
  const pharmacyNameMap = await fetchPharmacyNameMap(pharmacyIds);

  return matched.map(({ product, suggestion }) => ({
    ...mapProductToMedicine(product, pharmacyNameMap),
    dosageInstructions: suggestion.dosageInstructions,
    reason: suggestion.reason,
  }));
}
