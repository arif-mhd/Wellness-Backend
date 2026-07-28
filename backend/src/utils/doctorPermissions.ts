// Granular self-service permissions a clinic org owner can set on one of
// their employed doctors (see clinicPermissions.ts's doctor-fallback path).
// Distinct from PermissionKey in clinicScope.ts, which restricts clinic
// STAFF accounts acting on clinic-portal endpoints — these instead restrict
// a doctor's own actions in their own dashboard. A standalone (non-clinic)
// doctor never has this field set, so this is a no-op for them.
//
// Default-allow, same as clinicScope's hasPermission: no `permissions` field,
// or a key simply not present, means allowed. Only an explicit `false`
// restricts.
export type DoctorPermissionKey =
  | "manage_own_schedule"
  | "manage_own_profile"
  | "view_analytics"
  | "manage_account_settings";

export function hasDoctorPermission(
  doctor: { permissions?: Record<string, boolean> } | null | undefined,
  key: DoctorPermissionKey
): boolean {
  if (!doctor?.permissions || typeof doctor.permissions !== "object") return true;
  return doctor.permissions[key] !== false;
}
