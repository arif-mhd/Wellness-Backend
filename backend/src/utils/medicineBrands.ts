// Brand-name → generic (active ingredient) aliases.
//
// Pharmacy catalogues here are stocked under the generic name ("Paracetamol",
// "Amlodipine"), but patients usually ask for — and search by — the brand on
// the box ("Panadol", "Norvasc"). This table lets a brand-name search or chat
// request land on the generic product. Pharmacies can also list extra brand
// names per product (product.brandNames), which is checked alongside this.
//
// Keys and values are lowercase. A brand maps to every generic it contains,
// so a combination product ("Augmentin") finds each ingredient's listing.
// Brands common in the UAE, India and international markets.
const BRAND_TO_GENERIC: Record<string, string[]> = {
  // Pain / fever
  panadol: ["paracetamol"], tylenol: ["paracetamol"], calpol: ["paracetamol"], adol: ["paracetamol"],
  crocin: ["paracetamol"], dolo: ["paracetamol"], "dolo 650": ["paracetamol"], fevadol: ["paracetamol"],
  tempra: ["paracetamol"], acetaminophen: ["paracetamol"],
  advil: ["ibuprofen"], brufen: ["ibuprofen"], nurofen: ["ibuprofen"], motrin: ["ibuprofen"], combiflam: ["ibuprofen", "paracetamol"],
  voltaren: ["diclofenac"], voltarol: ["diclofenac"], cataflam: ["diclofenac"], voveran: ["diclofenac"],
  aleve: ["naproxen"], naprosyn: ["naproxen"],
  disprin: ["aspirin"], ecosprin: ["aspirin"], "aspirin protect": ["aspirin"], jusprin: ["aspirin"],
  celebrex: ["celecoxib"], arcoxia: ["etoricoxib"], ultram: ["tramadol"], tramal: ["tramadol"],
  // Allergy / cold
  claritin: ["loratadine"], clarityne: ["loratadine"], lorinase: ["loratadine"],
  zyrtec: ["cetirizine"], cetzine: ["cetirizine"], alerid: ["cetirizine"], okacet: ["cetirizine"],
  telfast: ["fexofenadine"], allegra: ["fexofenadine"],
  xyzal: ["levocetirizine"], aerius: ["desloratadine"], clarinex: ["desloratadine"],
  singulair: ["montelukast"], montair: ["montelukast"],
  flonase: ["fluticasone"], flixonase: ["fluticasone"], avamys: ["fluticasone"],
  nasonex: ["mometasone"], otrivin: ["xylometazoline"], sudafed: ["pseudoephedrine"],
  piriton: ["chlorphenamine"], benadryl: ["diphenhydramine"],
  // Stomach / digestion
  losec: ["omeprazole"], prilosec: ["omeprazole"], omez: ["omeprazole"],
  nexium: ["esomeprazole"], pantoloc: ["pantoprazole"], protonix: ["pantoprazole"], "pan 40": ["pantoprazole"],
  controloc: ["pantoprazole"], pariet: ["rabeprazole"], rablet: ["rabeprazole"],
  zantac: ["ranitidine"], pepcid: ["famotidine"], gaviscon: ["sodium alginate"],
  imodium: ["loperamide"], motilium: ["domperidone"], buscopan: ["hyoscine butylbromide"],
  zofran: ["ondansetron"], emeset: ["ondansetron"], duphalac: ["lactulose"], dulcolax: ["bisacodyl"],
  // Heart / blood pressure / cholesterol
  norvasc: ["amlodipine"], amlong: ["amlodipine"], amlopress: ["amlodipine"], stamlo: ["amlodipine"],
  tenormin: ["atenolol"], concor: ["bisoprolol"], lopressor: ["metoprolol"], betaloc: ["metoprolol"],
  zestril: ["lisinopril"], prinivil: ["lisinopril"], tritace: ["ramipril"], cardace: ["ramipril"],
  cozaar: ["losartan"], losar: ["losartan"], diovan: ["valsartan"], micardis: ["telmisartan"], telma: ["telmisartan"],
  lipitor: ["atorvastatin"], atorva: ["atorvastatin"], crestor: ["rosuvastatin"], rosuvas: ["rosuvastatin"], zocor: ["simvastatin"],
  plavix: ["clopidogrel"], clopilet: ["clopidogrel"], xarelto: ["rivaroxaban"], eliquis: ["apixaban"], coumadin: ["warfarin"],
  lasix: ["furosemide"], aldactone: ["spironolactone"],
  // Diabetes
  glucophage: ["metformin"], glycomet: ["metformin"], janumet: ["sitagliptin", "metformin"], januvia: ["sitagliptin"],
  galvus: ["vildagliptin"], amaryl: ["glimepiride"], diamicron: ["gliclazide"], jardiance: ["empagliflozin"],
  forxiga: ["dapagliflozin"], ozempic: ["semaglutide"], lantus: ["insulin glargine"], novorapid: ["insulin aspart"],
  // Antibiotics / anti-infectives
  augmentin: ["amoxicillin", "clavulanic acid"], amoxil: ["amoxicillin"],
  zithromax: ["azithromycin"], azithral: ["azithromycin"], azee: ["azithromycin"],
  klacid: ["clarithromycin"], cipro: ["ciprofloxacin"], ciprobay: ["ciprofloxacin"], ciplox: ["ciprofloxacin"],
  levaquin: ["levofloxacin"], tavanic: ["levofloxacin"], flagyl: ["metronidazole"], keflex: ["cephalexin"],
  zinnat: ["cefuroxime"], ceftin: ["cefuroxime"], suprax: ["cefixime"], taxim: ["cefixime"], "taxim-o": ["cefixime"],
  bactrim: ["sulfamethoxazole", "trimethoprim"], septrin: ["sulfamethoxazole", "trimethoprim"], vibramycin: ["doxycycline"],
  diflucan: ["fluconazole"], zovirax: ["acyclovir"], valtrex: ["valacyclovir"], tamiflu: ["oseltamivir"],
  // Respiratory
  ventolin: ["salbutamol"], asthalin: ["salbutamol"], albuterol: ["salbutamol"], seretide: ["fluticasone", "salmeterol"],
  symbicort: ["budesonide", "formoterol"], pulmicort: ["budesonide"], foracort: ["budesonide", "formoterol"],
  // Mental health / neuro / sleep
  prozac: ["fluoxetine"], zoloft: ["sertraline"], lustral: ["sertraline"], cipralex: ["escitalopram"], lexapro: ["escitalopram"],
  paxil: ["paroxetine"], seroxat: ["paroxetine"], cymbalta: ["duloxetine"], effexor: ["venlafaxine"], wellbutrin: ["bupropion"],
  xanax: ["alprazolam"], valium: ["diazepam"], ativan: ["lorazepam"], rivotril: ["clonazepam"], klonopin: ["clonazepam"],
  lyrica: ["pregabalin"], neurontin: ["gabapentin"], tegretol: ["carbamazepine"], depakine: ["valproate"], keppra: ["levetiracetam"],
  stilnox: ["zolpidem"], ambien: ["zolpidem"], seroquel: ["quetiapine"], risperdal: ["risperidone"],
  // Thyroid / hormones / other
  eltroxin: ["levothyroxine"], euthyrox: ["levothyroxine"], synthroid: ["levothyroxine"], thyronorm: ["levothyroxine"],
  viagra: ["sildenafil"], cialis: ["tadalafil"], duphaston: ["dydrogesterone"],
  deltacortril: ["prednisolone"], medrol: ["methylprednisolone"],
  // Vitamins / supplements
  "d-vit": ["vitamin d"], uprise: ["vitamin d"], calcirol: ["vitamin d"], "shelcal": ["calcium", "vitamin d"],
  caltrate: ["calcium", "vitamin d"], ferrograd: ["iron"], feroglobin: ["iron"], neurobion: ["vitamin b"], becosules: ["vitamin b"],
  // Skin
  fucidin: ["fusidic acid"], bactroban: ["mupirocin"], canesten: ["clotrimazole"],
  betnovate: ["betamethasone"], dermovate: ["clobetasol"], elocon: ["mometasone"],
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Generic names a brand maps to, or [] when the term isn't a known brand. */
export function genericsForBrand(term: string): string[] {
  const t = normalize(term);
  if (!t) return [];
  if (BRAND_TO_GENERIC[t]) return BRAND_TO_GENERIC[t];
  // "Panadol Extra", "Augmentin 625", "Nexium 40mg" → match on the leading
  // brand word(s) so strength/variant suffixes don't break the lookup.
  const words = t.split(" ");
  for (let n = words.length - 1; n >= 1; n--) {
    const prefix = words.slice(0, n).join(" ");
    if (BRAND_TO_GENERIC[prefix]) return BRAND_TO_GENERIC[prefix];
  }
  return [];
}

/**
 * Expands a search term into every term worth matching against the
 * catalogue: the term itself plus any generic names it's a brand of.
 * Deduplicated, lowercase, and capped so a query never grows unbounded.
 */
export function expandMedicineSearchTerms(...terms: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const raw of terms) {
    if (!raw) continue;
    const t = normalize(raw);
    if (t.length < 2) continue;
    out.add(t);
    for (const g of genericsForBrand(t)) out.add(g);
  }
  return [...out].slice(0, 6);
}

/**
 * Cosmos SQL fragment matching any of `terms` against a product's name, its
 * generic name and the brand names its pharmacy listed. Returns the clause
 * (wrapped in parentheses) and its parameters, named with `prefix` so it can
 * be combined with other parameterised clauses in one query.
 */
export function buildMedicineTermClause(terms: string[], prefix = "@term"): { clause: string; parameters: { name: string; value: string }[] } {
  const parts: string[] = [];
  const parameters: { name: string; value: string }[] = [];
  terms.forEach((term, i) => {
    const p = `${prefix}${i}`;
    parameters.push({ name: p, value: term });
    parts.push(
      `CONTAINS(LOWER(c.name), ${p})` +
      ` OR (IS_DEFINED(c.genericName) AND IS_STRING(c.genericName) AND CONTAINS(LOWER(c.genericName), ${p}))` +
      ` OR (IS_ARRAY(c.brandNames) AND EXISTS(SELECT VALUE b FROM b IN c.brandNames WHERE CONTAINS(LOWER(b), ${p})))`
    );
  });
  return { clause: parts.length ? `(${parts.join(" OR ")})` : "(true)", parameters };
}

/** Parses a pharmacy-entered brand list ("Panadol, Adol" or an array) into a clean array. */
export function parseBrandNames(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? (() => { try { const j = JSON.parse(input); return Array.isArray(j) ? j : input.split(","); } catch { return input.split(","); } })()
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== "string") continue;
    const s = v.trim().slice(0, 60);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= 15) break;
  }
  return out;
}
