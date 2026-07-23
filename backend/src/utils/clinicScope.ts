import { Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { clinicsContainer } from "../config/cosmos";

// Resolves which clinicId(s) a clinic-role caller is allowed to act as/see.
//
// - An ordinary single-location clinic (no orgId, no isMultiBranchOrg — every
//   clinic that exists today) always resolves to its own id, exactly what
//   req.session!.getUserId() already produced before branches existed.
// - A branch user account (has its own branchId) resolves to that branchId —
//   several user accounts can share one branchId, so this is what makes them
//   all see the same branch's doctors/appointments/patients.
// - A multi-branch org's own top-level account resolves to a *single* branch
//   when ?branchId= is passed (and belongs to them) — this is the "View Dash"
//   / branch-filter mechanism — or, for read endpoints that opt in via
//   allowAggregate, to *all* of their active branches at once.
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

  // Multi-branch org's own top-level account.
  if (caller.isMultiBranchOrg) {
    const branches: any[] = caller.branches ?? [];

    if (requestedBranchId) {
      const branch = branches.find((b) => b.id === requestedBranchId);
      if (!branch || branch.status !== "active") {
        res.status(403).json({ error: "branchId does not belong to your organization." });
        return null;
      }
      return { mode: "single", scopeId: branch.id, actorId, orgId: actorId };
    }

    if (opts.allowAggregate) {
      const activeBranchIds = branches.filter((b) => b.status === "active").map((b) => b.id);
      return { mode: "aggregate", scopeIds: activeBranchIds, actorId, orgId: actorId };
    }

    res.status(400).json({ error: "branchId is required." });
    return null;
  }

  // Ordinary single-location clinic — unchanged behavior.
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
  if (doc.isMultiBranchOrg) {
    return (doc.branches ?? []).filter((b: any) => b.status === "active").map((b: any) => b.id);
  }
  return [actorId];
}

// Builds a parameterized "field IN (@p0, @p1, ...)" clause for a list of ids —
// the same expansion pattern used all over the clinic routes for doctorIds.
export function buildInClause(field: string, ids: string[]) {
  return {
    clause: `${field} IN (${ids.map((_, i) => `@in${i}`).join(", ")})`,
    parameters: ids.map((value, i) => ({ name: `@in${i}`, value })),
  };
}
