import { labTestsContainer } from "../config/cosmos";
import { getLabIdsForOrg } from "./orgScope";
import { buildInClause } from "./clinicScope";

export interface LabTestSuggestionInput {
  testName: string;
  reason: string;
}

// GET /api/lab/tests returns labTestsContainer docs as-is (no pharmacy-style
// name join needed — labName is already denormalized onto the test doc), so
// a resolved suggestion is just that same raw shape plus the model's reason.
export type ResolvedLabTestSuggestion = Record<string, any> & { reason?: string };

const MAX_SUGGESTIONS = 4;
const MAX_MATCHES_PER_NAME = 2;

// Resolves AI-suggested test/exam names against the org's real, approved lab
// catalogue — only real, bookable tests are ever returned, so chat can never
// offer to "book" something no lab here actually performs. An org with no
// approved lab of its own naturally resolves to an empty list, same scoping
// as GET /lab/tests.
export async function resolveLabTestSuggestions(
  orgId: string,
  suggestions: LabTestSuggestionInput[]
): Promise<ResolvedLabTestSuggestion[]> {
  const cleaned = suggestions.filter((s) => s?.testName?.trim()).slice(0, MAX_SUGGESTIONS);
  if (!cleaned.length) return [];

  const orgLabIds = await getLabIdsForOrg(orgId);
  if (!orgLabIds.length) return [];

  const { clause: orgClause, parameters: orgParams } = buildInClause("c.labId", orgLabIds);

  const seenIds = new Set<string>();
  const matched: ResolvedLabTestSuggestion[] = [];

  for (const suggestion of cleaned) {
    const query =
      `SELECT TOP ${MAX_MATCHES_PER_NAME} * FROM c WHERE c.is_active = true ` +
      `AND (NOT IS_DEFINED(c.status) OR c.status = 'approved') AND ${orgClause} ` +
      `AND CONTAINS(LOWER(c.name), @term)`;
    const { resources } = await labTestsContainer.items.query({
      query,
      parameters: [...orgParams, { name: "@term", value: suggestion.testName.trim().toLowerCase() }],
    } as any).fetchAll();

    for (const test of resources as any[]) {
      if (seenIds.has(test.id)) continue;
      seenIds.add(test.id);
      matched.push({ ...test, reason: suggestion.reason });
    }
  }

  return matched;
}
