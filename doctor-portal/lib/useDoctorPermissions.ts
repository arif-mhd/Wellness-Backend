"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./apiFetch";

export type DoctorPermissionKey =
  | "manage_own_schedule"
  | "manage_own_profile"
  | "view_analytics"
  | "manage_account_settings";

/**
 * Mirrors the backend's default-allow model (backend/src/utils/doctorPermissions.ts
 * hasDoctorPermission): a doctor with no `permissions` field (every account
 * that existed before this feature, and any standalone/independent doctor a
 * clinic org never touches) has every permission. A key is only ever
 * restricted by a clinic org owner explicitly setting it to `false` on this
 * doctor's own record via the clinic's User Roles page.
 */
export function useDoctorPermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/doctors/me")
      .then((r) => r.json())
      .then((data) => setPermissions(data.doctor?.permissions ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const can = (key: DoctorPermissionKey) => permissions[key] !== false;

  return { permissions, loading, can };
}
