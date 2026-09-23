"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

// Mirrors backend/src/config/countries.ts's CurrencyConfig — duplicated by
// hand (no shared package between the portals and the backend), same
// convention pharmacy-portal and doctor-portal already use.
export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: "prefix" | "suffix";
}

export interface IdentityFieldDef {
  key: string;
  label: string;
  required: boolean;
  appliesTo: "clinic" | "doctor" | "patient" | "pharmacy";
  storage: "legacy" | "generic";
  pattern?: string;
}

// Keep in sync with COUNTRY_CONFIGS in backend/src/config/countries.ts if a
// country is ever added there.
const CURRENCY_BY_COUNTRY: Record<string, CurrencyConfig> = {
  AE: { code: "AED", symbol: "AED", position: "prefix" },
  IN: { code: "INR", symbol: "₹", position: "prefix" },
};

const FALLBACK_CURRENCY: CurrencyConfig = CURRENCY_BY_COUNTRY.AE;

// Labels for the identity documents each country expects, so an admin viewing
// an Indian clinic sees "PAN Number" where a UAE one says "Emirates ID".
// Mirrors backend/src/config/countries.ts — keep in sync.
const IDENTITY_FIELDS_BY_COUNTRY: Record<string, IdentityFieldDef[]> = {
  AE: [
    { key: "emiratesIdOrPassport", label: "Emirates ID / Passport No.", required: true, appliesTo: "clinic", storage: "legacy" },
    { key: "dohLicense", label: "DOH/DHA License No.", required: true, appliesTo: "clinic", storage: "legacy" },
    { key: "emiratesId", label: "Emirates ID", required: true, appliesTo: "doctor", storage: "legacy" },
    { key: "license", label: "Medical License No.", required: true, appliesTo: "doctor", storage: "legacy" },
    { key: "emiratesId", label: "Emirates ID", required: false, appliesTo: "patient", storage: "legacy" },
    { key: "exrNumber", label: "EXR Number", required: false, appliesTo: "patient", storage: "legacy" },
    { key: "emiratesId", label: "Emirates ID", required: false, appliesTo: "pharmacy", storage: "legacy" },
  ],
  IN: [
    { key: "panNumber", label: "PAN Number", required: true, appliesTo: "clinic", storage: "generic" },
    { key: "clinicalEstablishmentLicense", label: "Clinical Establishment License No.", required: true, appliesTo: "clinic", storage: "generic" },
    { key: "medicalCouncilRegistration", label: "Medical Council Registration No.", required: true, appliesTo: "doctor", storage: "generic" },
    { key: "aadhaarNumber", label: "Aadhaar Number", required: false, appliesTo: "patient", storage: "generic" },
    { key: "panNumber", label: "PAN Number", required: false, appliesTo: "patient", storage: "generic" },
    { key: "drugLicenseNumber", label: "Drug License Number", required: true, appliesTo: "pharmacy", storage: "generic" },
  ],
};

interface OrgCurrencyState {
  // Unlike the other portals, admin-portal is NOT scoped to a single org — it
  // administers all of them at once. So currency is resolved per record, from
  // whichever organization that record belongs to (its `tenantId`).
  currencyForOrg: (orgId?: string | null) => CurrencyConfig;
  // Used for screens/forms with no specific record in hand (e.g. a "Price
  // (AED)" field label before an org has been picked).
  defaultCurrency: CurrencyConfig;
  // Identity documents for one org and role — for detail views that label a
  // stored value, and for the onboarding forms once an org has been picked.
  identityFieldsForOrg: (orgId: string | null | undefined, appliesTo: IdentityFieldDef["appliesTo"]) => IdentityFieldDef[];
  // Same, keyed by slug — the create-clinic form picks an org by slug before
  // any record exists to carry a tenantId.
  identityFieldsForOrgSlug: (slug: string | null | undefined, appliesTo: IdentityFieldDef["appliesTo"]) => IdentityFieldDef[];
  loaded: boolean;
}

const DEFAULT_STATE: OrgCurrencyState = {
  currencyForOrg: () => FALLBACK_CURRENCY,
  defaultCurrency: FALLBACK_CURRENCY,
  identityFieldsForOrg: (_orgId, appliesTo) =>
    IDENTITY_FIELDS_BY_COUNTRY.AE.filter((f) => f.appliesTo === appliesTo),
  identityFieldsForOrgSlug: (_slug, appliesTo) =>
    IDENTITY_FIELDS_BY_COUNTRY.AE.filter((f) => f.appliesTo === appliesTo),
  loaded: false,
};

const OrgCurrencyContext = createContext<OrgCurrencyState>(DEFAULT_STATE);

/**
 * Loads every organization once and builds an id -> currency map from each
 * org's country_code, so a record belonging to an India-scoped org renders in
 * INR while a UAE one renders in AED on the very same screen.
 *
 * Records whose endpoint doesn't carry a tenantId (a global catalogue item,
 * say) fall back to the platform default — same as the behaviour before this
 * existed, never worse.
 */
export function OrgCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [byOrgId, setByOrgId] = useState<Record<string, CurrencyConfig>>({});
  const [countryByOrgId, setCountryByOrgId] = useState<Record<string, string>>({});
  const [countryBySlug, setCountryBySlug] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/organizations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, CurrencyConfig> = {};
        const countries: Record<string, string> = {};
        const bySlug: Record<string, string> = {};
        for (const org of data.organizations ?? []) {
          countries[org.id] = (org.country_code as string) || "AE";
          if (org.slug) bySlug[org.slug] = (org.country_code as string) || "AE";
          const fromCountry = CURRENCY_BY_COUNTRY[org.country_code as string];
          const resolved = fromCountry ?? FALLBACK_CURRENCY;
          // An explicit currency_code override on the org wins over its
          // country's default — same precedence the backend applies in
          // resolveCountryConfigForOrgRow.
          map[org.id] = org.currency_code
            ? { ...resolved, code: org.currency_code }
            : resolved;
        }
        setByOrgId(map);
        setCountryByOrgId(countries);
        setCountryBySlug(bySlug);
        setLoaded(true);
      })
      .catch(() => {
        // A failed lookup must not blank out prices — keep the fallback.
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const value: OrgCurrencyState = {
    currencyForOrg: (orgId) => (orgId ? byOrgId[orgId] ?? FALLBACK_CURRENCY : FALLBACK_CURRENCY),
    defaultCurrency: FALLBACK_CURRENCY,
    identityFieldsForOrg: (orgId, appliesTo) => {
      const country = (orgId && countryByOrgId[orgId]) || "AE";
      const fields = IDENTITY_FIELDS_BY_COUNTRY[country] ?? IDENTITY_FIELDS_BY_COUNTRY.AE;
      return fields.filter((f) => f.appliesTo === appliesTo);
    },
    identityFieldsForOrgSlug: (slug, appliesTo) => {
      const country = (slug && countryBySlug[slug]) || "AE";
      const fields = IDENTITY_FIELDS_BY_COUNTRY[country] ?? IDENTITY_FIELDS_BY_COUNTRY.AE;
      return fields.filter((f) => f.appliesTo === appliesTo);
    },
    loaded,
  };

  return <OrgCurrencyContext.Provider value={value}>{children}</OrgCurrencyContext.Provider>;
}

export function useOrgCurrency(): OrgCurrencyState {
  return useContext(OrgCurrencyContext);
}
