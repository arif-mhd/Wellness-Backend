import type { IdentityFieldDef } from "@/components/BrandingContext";

// A flat { fieldKey: value } map is what the forms hold. The backend wants it
// split in two: "legacy" fields are named columns that already exist on the
// patient doc (emiratesId, exrNumber), while "generic" ones go into the
// identityDocuments bag. Anything sent at the top level that isn't a known
// column is silently dropped by the API, so this split is what makes an
// India-only field like panNumber actually persist.
export function splitIdentityValues(
  fields: IdentityFieldDef[],
  values: Record<string, string>
): { legacy: Record<string, string>; identityDocuments: Record<string, string> } {
  const legacy: Record<string, string> = {};
  const identityDocuments: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined) continue;
    if (field.storage === 'legacy') legacy[field.key] = value;
    else identityDocuments[field.key] = value;
  }
  return { legacy, identityDocuments };
}

// Rebuilds the flat form map from a stored record, reading each field from
// wherever its storage mode says it lives.
export function readIdentityValues(
  fields: IdentityFieldDef[],
  record: Record<string, any> | null | undefined
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const raw = field.storage === 'legacy'
      ? record?.[field.key]
      : record?.identityDocuments?.[field.key];
    values[field.key] = raw == null ? '' : String(raw);
  }
  return values;
}

// First non-empty identity value, for screens that show a single "ID" line
// under someone's name rather than every document.
export function primaryIdentityValue(
  fields: IdentityFieldDef[],
  record: Record<string, any> | null | undefined
): string {
  const values = readIdentityValues(fields, record);
  for (const field of fields) {
    if (values[field.key]) return values[field.key];
  }
  return '';
}

// Returns the label of the first required field left blank, or null when the
// form is satisfied. Which fields are required is per-country, so no screen
// should hardcode "Emirates ID is required".
export function missingRequiredIdentityField(
  fields: IdentityFieldDef[],
  values: Record<string, string>
): string | null {
  for (const field of fields) {
    if (field.required && !values[field.key]?.trim()) return field.label;
  }
  return null;
}

// Format check for a supplied value, mirroring the backend's
// validateIdentityFieldPatterns so the user sees the error before submitting.
// Empty values pass — required-ness is checked separately above.
export function invalidIdentityField(
  fields: IdentityFieldDef[],
  values: Record<string, string>
): string | null {
  for (const field of fields) {
    const value = values[field.key]?.trim();
    if (!value || !field.pattern) continue;
    if (!new RegExp(field.pattern).test(value)) return `${field.label} is not in a valid format.`;
  }
  return null;
}
