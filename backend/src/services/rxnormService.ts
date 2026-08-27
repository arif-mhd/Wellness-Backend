const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST";

export interface RxNormCandidate {
  rxcui: string;
  name: string;
  score: number;
}

/**
 * Fuzzy-matches free text against RxNorm (NLM's standardized US allopathic drug
 * nomenclature) so medicine search can surface real drug names beyond whatever
 * a pharmacy happens to have listed. Fails soft — RxNorm being slow or down
 * must never break local catalogue search.
 */
export async function searchRxnorm(term: string, maxEntries = 10): Promise<RxNormCandidate[]> {
  try {
    const url = new URL(`${RXNORM_BASE_URL}/approximateTerm.json`);
    url.searchParams.set("term", term);
    url.searchParams.set("maxEntries", String(maxEntries));

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const body: any = await res.json();
    const raw = body?.approximateGroup?.candidate ?? [];
    const candidates: any[] = Array.isArray(raw) ? raw : [raw];

    const seen = new Set<string>();
    const results: RxNormCandidate[] = [];
    for (const c of candidates) {
      if (!c?.name || c.source !== "RXNORM" || seen.has(c.rxcui)) continue;
      seen.add(c.rxcui);
      results.push({ rxcui: c.rxcui, name: c.name, score: parseFloat(c.score) || 0 });
    }
    return results;
  } catch (err) {
    console.error("RxNorm search error:", err);
    return [];
  }
}
