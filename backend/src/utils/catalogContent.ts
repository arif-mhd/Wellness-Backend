// ── Catalog content merging ──────────────────────────────────────────────────
// A lab test / vaccine that is linked to an admin catalog entry shows the
// admin's wording. The rule, field by field:
//   • the admin filled the field in  → the admin's value is used and locked;
//     the lab can't change it
//   • the admin left it empty        → the lab may write its own value, and it
//     is never blanked out by a later catalog edit
// `catalogLockedFields` records which fields the admin owns, so the lab portal
// can show them read-only and offer an input for the rest.

/** Content fields of a lab test the admin may fill in (the rest are the lab's own: price, turnaround…). */
export const TEST_CONTENT_FIELDS = [
  "description", "recommendedFor", "ageRange", "targetGroups", "normalValues",
  "howItsDone", "recommendedFrequency", "patientInstructions",
] as const;

/** Content fields of a lab vaccine the admin may fill in. */
export const VACCINE_CONTENT_FIELDS = [
  "description", "ageRange", "recommendedFor", "howAdministered", "sideEffects", "patientInstructions",
] as const;

const ARRAY_FIELDS = new Set(["targetGroups", "normalValues"]);

export function hasContent(v: unknown): boolean {
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return v != null;
}

/**
 * The content fields for a linked lab doc: the catalog's value where it has
 * one, otherwise the lab doc's own value (or an empty default).
 * `existing` is the lab doc, or the values a lab just submitted.
 */
export function mergeCatalogContent(catalog: any, existing: any, keys: readonly string[]) {
  const out: Record<string, any> = {};
  const locked: string[] = [];
  for (const k of keys) {
    if (hasContent(catalog?.[k])) {
      out[k] = catalog[k];
      locked.push(k);
    } else {
      const own = existing?.[k];
      out[k] = hasContent(own) ? (typeof own === "string" ? own.trim() : own) : (ARRAY_FIELDS.has(k) ? [] : "");
    }
  }
  out.catalogLockedFields = locked;
  return out;
}

/** Just the locked part, for edits: which fields the catalog pins, and their values. */
export function catalogLocks(catalog: any, keys: readonly string[]) {
  const values: Record<string, any> = {};
  const locked: string[] = [];
  for (const k of keys) {
    if (hasContent(catalog?.[k])) { values[k] = catalog[k]; locked.push(k); }
  }
  return { values, locked };
}
