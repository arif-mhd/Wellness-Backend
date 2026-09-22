"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors the backend's FEATURE_DEFS keys (see backend/src/config/features.ts).
export type FeatureKey =
  | "appointments"
  | "prescriptions"
  | "pharmacy"
  | "lab_booking"
  | "insurance"
  | "vaccination"
  | "fitness"
  | "menstrual"
  | "pregnancy"
  | "nutrition_ai"
  | "ai_chat"
  | "articles"
  | "sos";

// Mirrors backend/src/config/countries.ts's CurrencyConfig shape — duplicated
// here (no shared package between this portal and the backend) rather than
// imported, same convention pharmacy-portal already uses for its own copy of
// CountryConfig. Keep in sync by hand if the backend shape changes.
export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: "prefix" | "suffix";
}

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  // Every feature enabled until the branding fetch resolves (or if it never
  // does) — an org with nothing configured, or a fetch failure, must never
  // hide sidebar items that were already visible before this existed. See
  // hasFeature() below.
  enabledFeatures: FeatureKey[];
  // Same UAE-shaped default the portal has always assumed — used until the
  // branding fetch resolves or on failure, so a network blip degrades to
  // "today's behavior" instead of showing an unlabeled/wrong currency.
  currency: CurrencyConfig;
  // IANA zone every appointment time in this portal is displayed in. The
  // clinic's own zone is canonical — never the viewing browser's — so a
  // doctor logging in from abroad still sees their clinic's schedule.
  timezone: string;
  // False until the branding fetch settles. Anything showing a logo should
  // render a placeholder while this is false rather than the bundled default,
  // otherwise a white-label portal flashes the platform's own logo before
  // swapping to the client's — which looks like the wrong site loaded.
  loaded: boolean;
}

const ALL_FEATURES: FeatureKey[] = [
  "appointments", "prescriptions", "pharmacy", "lab_booking", "insurance",
  "vaccination", "fitness", "menstrual", "pregnancy", "nutrition_ai",
  "ai_chat", "articles", "sos",
];

const FALLBACK_CURRENCY: CurrencyConfig = { code: "AED", symbol: "AED", position: "prefix" };
const FALLBACK_TIMEZONE = "Asia/Dubai";

const DEFAULT_BRANDING: Branding = { name: "Wellness Central", logoUrl: null, primaryColor: null, secondaryColor: null, supportEmail: null, supportPhone: null, enabledFeatures: ALL_FEATURES, currency: FALLBACK_CURRENCY, timezone: FALLBACK_TIMEZONE, loaded: false };

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

// Falls back to these when an org has no colors configured yet — the same
// blue this portal always used, so an org with unset colors looks exactly
// like it did before this feature existed.
const FALLBACK_PRIMARY = "#5476FC";
const FALLBACK_SECONDARY = "#8AA0FF";

/**
 * Fetches this deployment's org branding once on mount from the public
 * /api/meta/branding endpoint (no auth needed — it has to resolve before a
 * session may even exist, e.g. on the login screen) and makes it available
 * to every page via useBranding(). Falls back to the current hardcoded
 * "Wellness Central" name/logo on any failure, so a branding-endpoint outage
 * never blanks out the sidebar or breaks the page title.
 *
 * Also writes the resolved colors onto :root as CSS custom properties
 * (--brand-primary / --brand-secondary) so shared chrome (Sidebar,
 * DashboardLayout) can reference them via Tailwind's bg-[var(--brand-primary)]
 * arbitrary-value syntax instead of a hardcoded hex class.
 */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    let cancelled = false;
    const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG;
    const url = orgSlug ? `${API_URL}/api/meta/branding?org=${encodeURIComponent(orgSlug)}` : `${API_URL}/api/meta/branding`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const b = data.branding ?? {};
        const defaultCurrency: CurrencyConfig | undefined = data.countryConfig?.defaultCurrency;
        const resolved: Branding = {
          name: b.name || DEFAULT_BRANDING.name,
          logoUrl: b.logoUrl || null,
          primaryColor: b.primaryColor || null,
          secondaryColor: b.secondaryColor || null,
          supportEmail: b.supportEmail || null,
          supportPhone: b.supportPhone || null,
          enabledFeatures: Array.isArray(data.enabledFeatures) ? data.enabledFeatures : ALL_FEATURES,
          currency: defaultCurrency
            ? { code: b.currencyCode || defaultCurrency.code, symbol: defaultCurrency.symbol, position: defaultCurrency.position }
            : FALLBACK_CURRENCY,
          timezone: data.countryConfig?.timezone || FALLBACK_TIMEZONE,
          loaded: true,
        };
        setBranding(resolved);
        if (b.name) document.title = `${b.name} – Clinic Portal`;
        document.documentElement.style.setProperty("--brand-primary", resolved.primaryColor || FALLBACK_PRIMARY);
        document.documentElement.style.setProperty("--brand-secondary", resolved.secondaryColor || FALLBACK_SECONDARY);
      })
      .catch(() => {
        // Keep the default — a branding fetch failure shouldn't break the app.
        // Still mark it loaded, or a logo placeholder would hang forever.
        if (!cancelled) setBranding((b) => ({ ...b, loaded: true }));
        document.documentElement.style.setProperty("--brand-primary", FALLBACK_PRIMARY);
        document.documentElement.style.setProperty("--brand-secondary", FALLBACK_SECONDARY);
      });
    return () => { cancelled = true; };
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}

// Convenience hook for sidebar/nav gating — e.g.
// {hasFeature("lab_booking") && <NavItem .../>}
export function useFeatures(): { enabledFeatures: FeatureKey[]; hasFeature: (key: FeatureKey) => boolean } {
  const { enabledFeatures } = useContext(BrandingContext);
  return { enabledFeatures, hasFeature: (key: FeatureKey) => enabledFeatures.includes(key) };
}

// Convenience hook for anywhere an amount is displayed — see lib/currency.ts
// for the formatCurrency() helper this is meant to be paired with.
export function useCurrency(): CurrencyConfig {
  return useContext(BrandingContext).currency;
}

// Convenience hook for anywhere an appointment time is displayed — see
// lib/appointmentTime.ts for the formatters this is meant to be paired with.
export function useClinicTimezone(): string {
  return useContext(BrandingContext).timezone;
}
