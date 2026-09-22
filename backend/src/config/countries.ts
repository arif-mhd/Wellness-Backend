// Per-country field-set/currency configuration for clinic/organization
// onboarding. Country is scoped per organization (white-label brand), not
// per-clinic — see organizations.country_code in database.ts. Adding a new
// country should mean adding an entry here, never new branching code in any
// of the frontends or routes that consume this.

export type IdentityFieldStorage = "legacy" | "generic";

export interface IdentityFieldDef {
  key: string; // "emiratesId" | "panNumber" | "gstNumber" | "doctorLicense" | ...
  label: string;
  required: boolean;
  appliesTo: "clinic" | "doctor" | "patient" | "pharmacy";
  // "legacy" = read/write the existing named field (emiratesId, exrNumber,
  // dohLicense) that already exists on clinic/doctor records — never
  // renamed, never migrated. "generic" = read/write a new identityDocuments
  // bag keyed by this field's `key`, for fields that have no existing
  // named column (e.g. panNumber, gstNumber).
  storage: IdentityFieldStorage;
  // Optional regex (as a string) for format-only validation of a SUPPLIED
  // value — see the register/profile routes. Fields stay optional; only a
  // malformed supplied value is rejected.
  pattern?: string;
}

export interface FeeRegionDef {
  key: string; // e.g. "dubai", "abuDhabi", or "flat" for a single-fee country
  label: string;
}

// One fixed currency per country — see src/utils/currency.ts for where this
// is resolved per-appointment for notification/activity-log text.
export interface CurrencyConfig {
  code: string; // ISO 4217, e.g. "AED" | "INR"
  symbol: string;
  position: "prefix" | "suffix";
}

export interface CountryConfig {
  code: string; // ISO 3166-1 alpha-2, e.g. "AE" | "IN"
  name: string;
  // Single IANA zone per country — every clinic in a country shares it. If a
  // future country needs multiple zones (e.g. a hypothetical US), promote
  // this to a clinic-level field with country-level fallback; do not
  // pre-add an unused override now — see src/utils/timezone.ts for where
  // this is actually consumed.
  timezone: string;
  defaultCurrency: CurrencyConfig;
  phone: { callingCode: string; digitLength: number };
  // Sub-national address field — "emirate" for AE, "state" for IN — plus
  // postal code, generically labeled per country rather than a hardcoded
  // "emirate"/"PO box" pair.
  addressFields: { key: string; label: string; required: boolean }[];
  identityFields: IdentityFieldDef[]; // both clinic- and doctor-scoped fields
  licenseAuthorities: string[];
  consultationFeeMode: "flat" | "per-region";
  feeRegions: FeeRegionDef[];
}

export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: "AE",
    name: "United Arab Emirates",
    timezone: "Asia/Dubai",
    defaultCurrency: { code: "AED", symbol: "AED", position: "prefix" },
    phone: { callingCode: "+971", digitLength: 9 },
    addressFields: [
      { key: "emirate", label: "Emirate", required: true },
      { key: "city", label: "City", required: true },
      { key: "postalCode", label: "P.O. Box", required: false },
    ],
    identityFields: [
      // Clinic doc's own field is named emiratesIdOrPassport (clinics.ts/
      // adminClinics.ts) — distinct from the patient doc's emiratesId below,
      // both kept exactly as-is (never renamed) since they're separate
      // existing columns on separate record types.
      { key: "emiratesIdOrPassport", label: "Emirates ID / Passport No.", required: true, appliesTo: "clinic", storage: "legacy" },
      { key: "dohLicense", label: "DOH/DHA License No.", required: true, appliesTo: "clinic", storage: "legacy" },
      { key: "emiratesId", label: "Emirates ID", required: true, appliesTo: "doctor", storage: "legacy" },
      { key: "license", label: "Medical License No.", required: true, appliesTo: "doctor", storage: "legacy" },
      { key: "emiratesId", label: "Emirates ID", required: false, appliesTo: "patient", storage: "legacy" },
      { key: "exrNumber", label: "EXR Number", required: false, appliesTo: "patient", storage: "legacy" },
      // Pharmacy/lab owner registration — pharmacy.ts's own field, distinct
      // from every other role's emiratesId column above.
      { key: "emiratesId", label: "Emirates ID", required: false, appliesTo: "pharmacy", storage: "legacy" },
    ],
    licenseAuthorities: ["DOH", "DHA", "MOH"],
    consultationFeeMode: "per-region",
    feeRegions: [
      { key: "abuDhabi", label: "Abu Dhabi" },
      { key: "dubai", label: "Dubai" },
      { key: "sharjah", label: "Sharjah" },
      { key: "ajman", label: "Ajman" },
      { key: "ummAlQuwain", label: "Umm Al-Quwain" },
      { key: "rasAlKhaimah", label: "Ras Al Khaimah" },
      { key: "fujairah", label: "Fujairah" },
    ],
  },
  {
    code: "IN",
    name: "India",
    timezone: "Asia/Kolkata",
    defaultCurrency: { code: "INR", symbol: "₹", position: "prefix" },
    phone: { callingCode: "+91", digitLength: 10 },
    addressFields: [
      { key: "state", label: "State", required: true },
      { key: "city", label: "City", required: true },
      { key: "postalCode", label: "PIN Code", required: true },
    ],
    identityFields: [
      { key: "panNumber", label: "PAN Number", required: true, appliesTo: "clinic", storage: "generic", pattern: "^[A-Z]{5}\\d{4}[A-Z]$" },
      { key: "gstNumber", label: "GST Registration No.", required: false, appliesTo: "clinic", storage: "generic", pattern: "^\\d{2}[A-Z]{5}\\d{4}[A-Z]\\d[A-Z]\\d$" },
      { key: "clinicalEstablishmentLicense", label: "Clinical Establishment License No.", required: true, appliesTo: "clinic", storage: "generic" },
      { key: "medicalCouncilRegistration", label: "Medical Council Registration No.", required: true, appliesTo: "doctor", storage: "generic" },
      // Same key as the clinic-scoped PAN field above is fine — these are
      // stored in separate identityDocuments bags on separate record types
      // (patient vs clinic), and every consumer filters by appliesTo before
      // reading/writing a field, never a bare key lookup across roles.
      { key: "aadhaarNumber", label: "Aadhaar Number", required: false, appliesTo: "patient", storage: "generic", pattern: "^\\d{12}$" },
      { key: "panNumber", label: "PAN Number", required: false, appliesTo: "patient", storage: "generic", pattern: "^[A-Z]{5}\\d{4}[A-Z]$" },
      // Pharmacy/lab registration — replaces Emirates ID with the actual
      // regulatory identifier a pharmacy/lab needs to operate in India.
      { key: "drugLicenseNumber", label: "Drug License Number", required: true, appliesTo: "pharmacy", storage: "generic" },
    ],
    licenseAuthorities: ["State Medical Council"],
    consultationFeeMode: "flat",
    feeRegions: [{ key: "flat", label: "Consultation Fee" }],
  },
];

export const COUNTRY_CODES: string[] = COUNTRY_CONFIGS.map((c) => c.code);

export function getCountryConfig(code: string | null | undefined): CountryConfig {
  return COUNTRY_CONFIGS.find((c) => c.code === code) ?? COUNTRY_CONFIGS.find((c) => c.code === "AE")!;
}

// Format-only check for a SUPPLIED value against the matching identity
// field's pattern (if any) in the given country/role. Fields stay optional —
// this only rejects a value that IS present and malformed, never a missing
// one. `legacyValues` holds named fields already on the request body (e.g.
// emiratesIdOrPassport); `genericValues` is the identityDocuments bag.
// Returns an error message for the first mismatch found, or null if clean.
export function validateIdentityFieldPatterns(
  countryConfig: CountryConfig,
  role: "clinic" | "doctor" | "patient" | "pharmacy",
  legacyValues: Record<string, unknown>,
  genericValues: Record<string, unknown> | null | undefined
): string | null {
  for (const field of countryConfig.identityFields) {
    if (field.appliesTo !== role || !field.pattern) continue;
    const value = field.storage === "legacy" ? legacyValues[field.key] : genericValues?.[field.key];
    if (value === undefined || value === null || value === "") continue;
    if (!new RegExp(field.pattern).test(String(value))) {
      return `${field.label} is not in a valid format.`;
    }
  }
  return null;
}
