"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type AccountRole = "pharmacy" | "lab" | null;

export interface AccountRoleState {
  role: AccountRole;
  pending: boolean;
  loading: boolean;
}

const DEFAULT_STATE: AccountRoleState = { role: null, pending: false, loading: true };

const AccountRoleContext = createContext<AccountRoleState | undefined>(undefined);

async function getAccessToken(): Promise<string> {
  try { return (await Session.getAccessToken()) ?? ""; } catch { return ""; }
}

/**
 * Fetches /auth/me once and exposes the logged-in account's business type.
 * Wrap the dashboard layout with <AccountRoleProvider> so every page/component
 * below it (ProtectedRoute, Sidebar, dashboard pages) shares a single fetch
 * instead of each re-deriving the role from its own request.
 */
export function AccountRoleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccountRoleState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${await getAccessToken()}` },
        });
        if (!res.ok) { if (!cancelled) setState({ role: null, pending: false, loading: false }); return; }
        const { roles }: { roles: string[] } = await res.json();
        let role: AccountRole = null;
        let pending = false;
        if (roles.includes("pharmacy")) role = "pharmacy";
        else if (roles.includes("pharmacy_pending")) { role = "pharmacy"; pending = true; }
        else if (roles.includes("lab")) role = "lab";
        else if (roles.includes("lab_pending")) { role = "lab"; pending = true; }
        if (!cancelled) setState({ role, pending, loading: false });
      } catch {
        if (!cancelled) setState({ role: null, pending: false, loading: false });
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return React.createElement(AccountRoleContext.Provider, { value: state }, children);
}

/** Returns the current account's role/pending/loading state from the nearest AccountRoleProvider. */
export function useAccountRole(): AccountRoleState {
  const ctx = useContext(AccountRoleContext);
  return ctx ?? DEFAULT_STATE;
}
