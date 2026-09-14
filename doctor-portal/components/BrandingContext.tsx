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

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  // Every feature enabled until the branding fetch resolves (or if it never
  // does) — an org with nothing configured, or a fetch failure, must never
  // hide sidebar items that were already visible before this existed. See
  // hasFeature() below.
  enabledFeatures: FeatureKey[];
}

const ALL_FEATURES: FeatureKey[] = [
  "appointments", "prescriptions", "pharmacy", "lab_booking", "insurance",
  "vaccination", "fitness", "menstrual", "pregnancy", "nutrition_ai",
  "ai_chat", "articles", "sos",
];

const DEFAULT_BRANDING: Branding = { name: "Wellness Central", logoUrl: null, primaryColor: null, secondaryColor: null, enabledFeatures: ALL_FEATURES };

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
        const resolved: Branding = {
          name: b.name || DEFAULT_BRANDING.name,
          logoUrl: b.logoUrl || null,
          primaryColor: b.primaryColor || null,
          secondaryColor: b.secondaryColor || null,
          enabledFeatures: Array.isArray(data.enabledFeatures) ? data.enabledFeatures : ALL_FEATURES,
        };
        setBranding(resolved);
        if (b.name) document.title = `${b.name} – Clinic Portal`;
        document.documentElement.style.setProperty("--brand-primary", resolved.primaryColor || FALLBACK_PRIMARY);
        document.documentElement.style.setProperty("--brand-secondary", resolved.secondaryColor || FALLBACK_SECONDARY);
      })
      .catch(() => {
        // Keep the default — a branding fetch failure shouldn't break the app.
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
