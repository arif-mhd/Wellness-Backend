"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors backend/src/config/countries.ts's CountryConfig shape — duplicated
// here (no shared package between this portal and the backend) rather than
// imported. Keep this in sync by hand if the backend shape changes.
export type IdentityFieldStorage = "legacy" | "generic";

export interface IdentityFieldDef {
  key: string;
  label: string;
  required: boolean;
  appliesTo: "clinic" | "doctor" | "patient" | "pharmacy";
  storage: IdentityFieldStorage;
  pattern?: string;
}

export interface FeeRegionDef {
  key: string;
  label: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  defaultCurrency: { code: string; symbol: string; position: "prefix" | "suffix" };
  phone: { callingCode: string; digitLength: number };
  addressFields: { key: string; label: string; required: boolean }[];
  identityFields: IdentityFieldDef[];
  licenseAuthorities: string[];
  consultationFeeMode: "flat" | "per-region";
  feeRegions: FeeRegionDef[];
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: "prefix" | "suffix";
}

// Same UAE shape the app has always rendered — used whenever the fetch
// hasn't resolved yet or fails outright, so a network blip degrades to
// "today's behavior" rather than a broken/blank form.
const FALLBACK_COUNTRY_CONFIG: CountryConfig = {
  code: "AE",
  name: "United Arab Emirates",
  defaultCurrency: { code: "AED", symbol: "AED", position: "prefix" },
  phone: { callingCode: "+971", digitLength: 9 },
  addressFields: [
    { key: "emirate", label: "Emirate", required: true },
    { key: "city", label: "City", required: true },
    { key: "postalCode", label: "P.O. Box", required: false },
  ],
  identityFields: [
    { key: "emiratesId", label: "Emirates ID", required: true, appliesTo: "clinic", storage: "legacy" },
    { key: "dohLicense", label: "DOH/DHA License No.", required: true, appliesTo: "clinic", storage: "legacy" },
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
};

interface CountryConfigState {
  countryConfig: CountryConfig;
  currency: CurrencyConfig;
  loaded: boolean;
}

const DEFAULT_STATE: CountryConfigState = {
  countryConfig: FALLBACK_COUNTRY_CONFIG,
  currency: { code: FALLBACK_COUNTRY_CONFIG.defaultCurrency.code, symbol: FALLBACK_COUNTRY_CONFIG.defaultCurrency.symbol, position: FALLBACK_COUNTRY_CONFIG.defaultCurrency.position },
  loaded: false,
};

const CountryConfigContext = createContext<CountryConfigState>(DEFAULT_STATE);

/**
 * Fetches this deployment's org country-config once on mount, from the same
 * /api/meta/branding endpoint BrandingProvider already calls (the backend
 * folds countryConfig into that response — no extra network round-trip).
 * Falls back to the UAE-shaped default on any failure, exactly like
 * BrandingProvider does for colors/logo.
 */
export function CountryConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CountryConfigState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;
    const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG;
    const url = orgSlug ? `${API_URL}/api/meta/branding?org=${encodeURIComponent(orgSlug)}` : `${API_URL}/api/meta/branding`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const countryConfig: CountryConfig = data.countryConfig ?? FALLBACK_COUNTRY_CONFIG;
        const currencyCode: string | undefined = data.branding?.currencyCode;
        setState({
          countryConfig,
          currency: {
            code: currencyCode || countryConfig.defaultCurrency.code,
            symbol: countryConfig.defaultCurrency.symbol,
            position: countryConfig.defaultCurrency.position,
          },
          loaded: true,
        });
      })
      .catch(() => {
        // Keep the UAE-shaped default — a fetch failure shouldn't break onboarding.
        setState({ ...DEFAULT_STATE, loaded: true });
      });
    return () => { cancelled = true; };
  }, []);

  return <CountryConfigContext.Provider value={state}>{children}</CountryConfigContext.Provider>;
}

export function useCountryConfig(): CountryConfigState {
  return useContext(CountryConfigContext);
}
