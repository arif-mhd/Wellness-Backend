"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Branding {
  name: string;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: Branding = { name: "Wellness Central", logoUrl: null };

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

/**
 * Fetches this deployment's org branding once on mount from the public
 * /api/meta/branding endpoint (no auth needed — it has to resolve before a
 * session may even exist, e.g. on the login screen) and makes it available
 * to every page via useBranding(). Falls back to the current hardcoded
 * "Wellness Central" name/logo on any failure, so a branding-endpoint outage
 * never blanks out the sidebar or breaks the page title.
 */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/meta/branding`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const b = data.branding ?? {};
        setBranding({
          name: b.name || DEFAULT_BRANDING.name,
          logoUrl: b.logoUrl || null,
        });
        if (b.name) document.title = `${b.name} – Clinic Portal`;
      })
      .catch(() => {
        // Keep the default — a branding fetch failure shouldn't break the app.
      });
    return () => { cancelled = true; };
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
