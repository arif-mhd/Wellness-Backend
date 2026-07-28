"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./apiFetch";

export type PermissionKey =
  | "manage_doctors"
  | "manage_patients"
  | "manage_appointments"
  | "manage_schedules"
  | "view_analytics"
  | "manage_insurance"
  | "manage_payment";

/**
 * Mirrors the backend's default-allow model (backend/src/utils/clinicScope.ts
 * hasPermission): only a branch-staff account is ever restricted, and only an
 * explicit `false` removes access. The org owner (isBranchUser false) always
 * has every permission, so existing single-location clinics and org-owner
 * logins see no change in behavior.
 */
export function useClinicPermissions() {
  const [isBranchUser, setIsBranchUser] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/clinics/me")
      .then((r) => r.json())
      .then((data) => {
        const c = data.clinic ?? {};
        setIsBranchUser(!!c.branchId);
        setPermissions(c.permissions ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const can = (key: PermissionKey) => (!isBranchUser ? true : permissions[key] !== false);

  return { isBranchUser, permissions, loading, can };
}
