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

// Keep in sync with COUNTRY_CONFIGS in backend/src/config/countries.ts if a
// country is ever added there.
const CURRENCY_BY_COUNTRY: Record<string, CurrencyConfig> = {
  AE: { code: "AED", symbol: "AED", position: "prefix" },
  IN: { code: "INR", symbol: "₹", position: "prefix" },
};

const FALLBACK_CURRENCY: CurrencyConfig = CURRENCY_BY_COUNTRY.AE;

interface OrgCurrencyState {
  // Unlike the other portals, admin-portal is NOT scoped to a single org — it
  // administers all of them at once. So currency is resolved per record, from
  // whichever organization that record belongs to (its `tenantId`).
  currencyForOrg: (orgId?: string | null) => CurrencyConfig;
  // Used for screens/forms with no specific record in hand (e.g. a "Price
  // (AED)" field label before an org has been picked).
  defaultCurrency: CurrencyConfig;
  loaded: boolean;
}

const DEFAULT_STATE: OrgCurrencyState = {
  currencyForOrg: () => FALLBACK_CURRENCY,
  defaultCurrency: FALLBACK_CURRENCY,
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/organizations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, CurrencyConfig> = {};
        for (const org of data.organizations ?? []) {
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
    loaded,
  };

  return <OrgCurrencyContext.Provider value={value}>{children}</OrgCurrencyContext.Provider>;
}

export function useOrgCurrency(): OrgCurrencyState {
  return useContext(OrgCurrencyContext);
}
