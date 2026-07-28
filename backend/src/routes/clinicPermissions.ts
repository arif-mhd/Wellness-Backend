import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { clinicsContainer, doctorsContainer } from "../config/cosmos";
import { PermissionKey } from "../utils/clinicScope";
import { DoctorPermissionKey } from "../utils/doctorPermissions";

const router = Router();

// Clinic staff (branch-user) permissions — restrict what that staff account
// can do on clinic-portal endpoints.
const STAFF_KEYS: PermissionKey[] = [
  "manage_doctors",
  "manage_patients",
  "manage_appointments",
  "manage_schedules",
  "view_analytics",
  "manage_insurance",
  "manage_payment",
];

// A doctor's own self-service permissions — a different, smaller set, since
// a doctor's dashboard is mostly view-only/core clinical work that can't be
// restricted without breaking their job. See utils/doctorPermissions.ts.
const DOCTOR_KEYS: DoctorPermissionKey[] = [
  "manage_own_schedule",
  "manage_own_profile",
  "view_analytics",
  "manage_account_settings",
];

function sanitizeByKeys(input: any, keys: readonly string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!input || typeof input !== "object") return out;
  for (const key of keys) {
    if (key in input) out[key] = !!input[key];
  }
  return out;
}

// Only the org owner (their own account has no branchId) grants permissions —
// a branch-user account, even if it could somehow reach these routes, isn't
// allowed to touch anyone's access including its own.
async function requireOrgOwner(req: SessionRequest, res: Response) {
  const actorId = req.session!.getUserId();
  const { resource: org } = await clinicsContainer.item(actorId, actorId).read().catch(() => ({ resource: undefined as any }));
  if (!org || org.branchId) {
    res.status(403).json({ error: "Not authorized." });
    return null;
  }
  return org;
}

// ─── GET /api/clinics/permissions/:targetId ──────────────────────────────────
// targetId may be a branch-user (staff) account or a doctor account —
// whichever container it's found in and actually belongs to this org.
router.get("/:targetId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  try {
    const { resource: staff } = await clinicsContainer.item(req.params.targetId, req.params.targetId).read().catch(() => ({ resource: undefined as any }));
    if (staff && staff.orgId === org.id) {
      res.json({ permissions: staff.permissions ?? {} });
      return;
    }

    const { resource: doctor } = await doctorsContainer.item(req.params.targetId, req.params.targetId).read().catch(() => ({ resource: undefined as any }));
    const orgClinicIds = [org.id, ...(org.branches ?? []).map((b: any) => b.id)];
    if (doctor && orgClinicIds.includes(doctor.clinicId)) {
      res.json({ permissions: doctor.permissions ?? {} });
      return;
    }

    res.status(404).json({ error: "Account not found." });
  } catch (err) {
    console.error("Fetch permissions error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/permissions/:targetId ────────────────────────────────
// Body: { permissions: Record<PermissionKey, boolean> } — merged into the
// target's existing permissions (only the keys sent are changed).
router.patch("/:targetId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  try {
    const { resource: staff } = await clinicsContainer.item(req.params.targetId, req.params.targetId).read().catch(() => ({ resource: undefined as any }));
    if (staff && staff.orgId === org.id) {
      const updates = sanitizeByKeys(req.body?.permissions, STAFF_KEYS);
      const permissions = { ...(staff.permissions ?? {}), ...updates };
      await clinicsContainer.items.upsert({ ...staff, permissions, updatedAt: new Date().toISOString() });
      res.json({ permissions });
      return;
    }

    const { resource: doctor } = await doctorsContainer.item(req.params.targetId, req.params.targetId).read().catch(() => ({ resource: undefined as any }));
    const orgClinicIds = [org.id, ...(org.branches ?? []).map((b: any) => b.id)];
    if (doctor && orgClinicIds.includes(doctor.clinicId)) {
      const updates = sanitizeByKeys(req.body?.permissions, DOCTOR_KEYS);
      const permissions = { ...(doctor.permissions ?? {}), ...updates };
      await doctorsContainer.items.upsert({ ...doctor, permissions, updatedAt: new Date().toISOString() });
      res.json({ permissions });
      return;
    }

    res.status(404).json({ error: "Account not found." });
  } catch (err) {
    console.error("Update permissions error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/permissions/branch/:branchId/all ─────────────────────
// "Save for all users" — applies the same permission updates to every
// staff account currently in this branch. Does not touch doctors (a branch
// has its own doctor roster, but "all users" in the Branches tab means the
// branch's login accounts).
router.patch("/branch/:branchId/all", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const updates = sanitizeByKeys(req.body?.permissions, STAFF_KEYS);

  try {
    const { resources: staffAccounts } = await clinicsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.orgId = @orgId AND c.branchId = @branchId AND c.status != 'deleted'",
        parameters: [{ name: "@orgId", value: org.id }, { name: "@branchId", value: req.params.branchId }],
      })
      .fetchAll();

    await Promise.all(
      staffAccounts.map((staff: any) => {
        const permissions = { ...(staff.permissions ?? {}), ...updates };
        return clinicsContainer.items.upsert({ ...staff, permissions, updatedAt: new Date().toISOString() });
      })
    );

    res.json({ status: "OK", updatedCount: staffAccounts.length });
  } catch (err) {
    console.error("Bulk update permissions error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
