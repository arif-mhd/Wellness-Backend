import { Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { clinicsContainer } from "../config/cosmos";

// Resolves which clinicId(s) a clinic-role caller is allowed to act as/see.
//
// - An ordinary clinic with no branches of its own always resolves to its
//   own id, exactly what req.session!.getUserId() already produced before
//   branches existed. Every clinic implicitly *is* its own "main branch" —
//   there is no separate stored branch entry for it; its own top-level
//   fields (address, slots, bio, license...) already are that data.
// - A branch user account (has its own branchId) resolves to that branchId —
//   several user accounts can share one branchId, so this is what makes them
//   all see the same branch's doctors/appointments/patients. This also
//   covers a *main-branch* senior-staff account: their branchId is stamped
//   as the org's own id, which resolves to the exact same scopeId the org
//   owner's own login already uses — same data, no separate branch record
//   needed.
// - The org owner's own top-level account resolves to a *single* branch
//   when ?branchId= is passed (and belongs to them — this includes their
//   own id, meaning "my main branch") — this is the "View Dash" / branch-
//   filter mechanism — or, for read endpoints that opt in via
//   allowAggregate, to *all* of their active branches (main branch
//   included) at once.
//
// `actorId` is always the real logged-in user, kept separate from the
// resolved scope — callers must use actorId (never scopeId/scopeIds) for
// audit fields like logActivity/approvedBy/slotsVerifiedBy.
export type ClinicScope =
  | { mode: "single"; scopeId: string; actorId: string; orgId: string | null }
  | { mode: "aggregate"; scopeIds: string[]; actorId: string; orgId: string };

// Overloads so TypeScript narrows the return type by the literal passed at
// each call site: mutation/ownership-check endpoints (allowAggregate: false)
// never have to deal with the "aggregate" branch at all.
export async function resolveClinicScope(
  req: SessionRequest,
  res: Response,
  opts: { allowAggregate: false }
): Promise<Extract<ClinicScope, { mode: "single" }> | null>;
export async function resolveClinicScope(
  req: SessionRequest,
  res: Response,
  opts: { allowAggregate: true }
): Promise<ClinicScope | null>;
export async function resolveClinicScope(
  req: SessionRequest,
  res: Response,
  opts: { allowAggregate: boolean }
): Promise<ClinicScope | null> {
  const actorId = req.session!.getUserId();
  const requestedBranchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;

  const { resource: caller } = await clinicsContainer
    .item(actorId, actorId)
    .read()
    .catch(() => ({ resource: undefined as any }));

  if (!caller) {
    res.status(404).json({ error: "Clinic not found." });
    return null;
  }

  // Branch user account: their own branchId is their scope.
  if (caller.branchId) {
    if (requestedBranchId && requestedBranchId !== caller.branchId) {
      res.status(403).json({ error: "Not authorized for this branch." });
      return null;
    }
    return { mode: "single", scopeId: caller.branchId, actorId, orgId: caller.orgId ?? null };
  }

  // Org owner's own top-level account, once it has (or has ever requested)
  // any branches beyond itself — gated on the branches array actually
  // having entries, not the isMultiBranchOrg flag alone, so a clinic that
  // registered single-location and only later requested its first branch
  // doesn't get stuck on stale flag state.
  const branches: any[] = caller.branches ?? [];
  if (branches.length > 0 || caller.isMultiBranchOrg) {
    if (requestedBranchId) {
      // The org's own id always means "my main branch" — it's not a real
      // entry in branches[], it's the org doc's own top-level fields.
      if (requestedBranchId === actorId) {
        return { mode: "single", scopeId: actorId, actorId, orgId: actorId };
      }
      const branch = branches.find((b) => b.id === requestedBranchId);
      if (!branch || branch.status !== "active") {
        res.status(403).json({ error: "branchId does not belong to your organization." });
        return null;
      }
      return { mode: "single", scopeId: branch.id, actorId, orgId: actorId };
    }

    if (opts.allowAggregate) {
      const activeBranchIds = branches.filter((b) => b.status === "active").map((b) => b.id);
      return { mode: "aggregate", scopeIds: [actorId, ...activeBranchIds], actorId, orgId: actorId };
    }

    res.status(400).json({ error: "branchId is required." });
    return null;
  }

  // Ordinary clinic with no branches of its own — unchanged behavior.
  return { mode: "single", scopeId: actorId, actorId, orgId: null };
}

export function scopeToClinicIds(scope: ClinicScope): string[] {
  return scope.mode === "aggregate" ? scope.scopeIds : [scope.scopeId];
}

export function scopeIncludes(scope: ClinicScope, clinicId: string | null | undefined): boolean {
  if (!clinicId) return false;
  return scope.mode === "aggregate" ? scope.scopeIds.includes(clinicId) : scope.scopeId === clinicId;
}

// Lightweight variant for endpoints shared across roles (appointments.ts's
// cancel/reschedule/remind/GET :id, which any of a patient, doctor, or
// clinic may call). Unlike resolveClinicScope, this never writes to `res` —
// the caller might legitimately not be a clinic account at all, so "no
// clinic doc found" just means "not a clinic-scoped actor" (empty array),
// not an error.
export async function getActorClinicIds(actorId: string): Promise<string[]> {
  const { resource: doc } = await clinicsContainer
    .item(actorId, actorId)
    .read()
    .catch(() => ({ resource: undefined as any }));
  if (!doc) return [];
  if (doc.branchId) return [doc.branchId];
  const branches: any[] = doc.branches ?? [];
  if (branches.length > 0 || doc.isMultiBranchOrg) {
    return [actorId, ...branches.filter((b: any) => b.status === "active").map((b: any) => b.id)];
  }
  return [actorId];
}

// A clinic's own top-level fields (address, slots, bio, license...) *are*
// its main branch — there's no separate stored record for it. Wherever code
// needs to treat "the org itself" as one branch among others (the branches
// list, a main-branch senior-staff account's GET /me, findBranch lookups),
// this builds that branch-shaped view from the org doc directly, so the
// same rendering/response code paths used for real branches[] entries work
// unmodified for the main one too.
export function mainBranchFrom(org: any) {
  return {
    id: org.id,
    name: org.clinicName || org.fullName,
    phone: org.phone ?? null,
    address: org.address ?? null,
    licenseNumber: org.licenseNumber ?? null,
    dohLicense: org.dohLicense ?? null,
    addressProofFileUrl: org.addressProofFileUrl ?? null,
    consultationRates: org.consultationRates ?? [],
    paymentSettings: org.paymentSettings ?? null,
    bio: org.bio ?? null,
    clinicImageUrl: org.clinicImageUrl ?? null,
    slots: org.slots ?? [],
    isOnline: org.isOnline,
    status: "active" as const,
    isMain: true,
  };
}

// The public/patient-facing mirror of mainBranchFrom, for a real (non-main)
// branch entry — branches have no standalone Cosmos document of their own
// (only an entry inside their parent org's branches[] array), so anywhere
// a real branch needs to be shown or looked up as if it were its own clinic
// (public directory listing, a doctor's clinicId resolving to a branch),
// this builds that clinic-shaped view from the branch + its parent org.
export function branchAsPublicClinic(org: any, branch: any) {
  return {
    id: branch.id,
    orgId: org.id,
    clinicName: branch.name,
    fullName: branch.name,
    phone: branch.phone ?? org.phone ?? null,
    address: branch.address ?? null,
    licenseNumber: branch.licenseNumber ?? null,
    dohLicense: branch.dohLicense ?? null,
    addressProofFileUrl: branch.addressProofFileUrl ?? null,
    consultationRates: branch.consultationRates ?? [],
    paymentSettings: branch.paymentSettings ?? org.paymentSettings ?? null,
    bio: branch.bio ?? null,
    clinicImageUrl: branch.clinicImageUrl ?? null,
    slots: branch.slots ?? [],
    isOnline: branch.isOnline ?? org.isOnline,
    status: "approved" as const,
  };
}

// Builds a parameterized "field IN (@p0, @p1, ...)" clause for a list of ids —
// the same expansion pattern used all over the clinic routes for doctorIds.
export function buildInClause(field: string, ids: string[]) {
  return {
    clause: `${field} IN (${ids.map((_, i) => `@in${i}`).join(", ")})`,
    parameters: ids.map((value, i) => ({ name: `@in${i}`, value })),
  };
}
