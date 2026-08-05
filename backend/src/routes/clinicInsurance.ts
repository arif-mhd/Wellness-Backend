import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { clinicsContainer, doctorsContainer } from "../config/cosmos";
import { resolveClinicScope, scopeToClinicIds, hasPermission } from "../utils/clinicScope";

const router = Router();

// Both clinic and patient insurance entries are free text (no shared provider
// ID exists between "org.insurancePolicies[].name" and
// "patient.insurance[].provider"), so matching is a best-effort, lenient
// case-insensitive substring check in both directions — not a strict
// provider-ID system. Used both to decide what to *offer* a patient at
// booking and, server-side, to validate what they actually submitted.
export function insuranceNamesMatch(patientProvider: string, clinicPolicyName: string): boolean {
  const a = patientProvider.trim().toLowerCase();
  const b = clinicPolicyName.trim().toLowerCase();
  if (!a || !b) return false;
  return b.includes(a) || a.includes(b);
}

// A real (non-main) branch has no standalone Cosmos document of its own —
// its data lives nested inside the parent org's own top-level doc, under
// branches[]. Given only a clinicId (which may be an org's own id, for the
// main branch, or a real branch's id), there's no cheap direct lookup to the
// owning org doc without a caller-provided orgId hint (which clinic-staff
// scopes have, but a doctor/patient-booking context does not) — so this
// falls back to a query matching either the org's own id or a nested branch
// id. Infrequent, booking-time-only lookup; not a hot path.
export async function loadOrgDocForClinicId(clinicId: string): Promise<any | null> {
  const { resources } = await clinicsContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @clinicId OR EXISTS(SELECT VALUE b FROM b IN c.branches WHERE b.id = @clinicId)",
      parameters: [{ name: "@clinicId", value: clinicId }],
    })
    .fetchAll();
  return resources[0] ?? null;
}

// ─── GET /api/clinics/insurance-policies/by-doctor/:doctorId ────────────────
// Patient-facing (not clinic-staff-gated): given a doctor, returns the
// active insurance policies that doctor's clinic accepts, trimmed to what a
// patient needs to decide/display — no internal contract file or timestamps.
router.get("/by-doctor/:doctorId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const { resource: doctor } = await doctorsContainer.item(req.params.doctorId, req.params.doctorId).read().catch(() => ({ resource: undefined as any }));
    if (!doctor || !doctor.clinicId) { res.json({ policies: [] }); return; }

    const org = await loadOrgDocForClinicId(doctor.clinicId);
    if (!org) { res.json({ policies: [] }); return; }

    const policies = (org.insurancePolicies ?? [])
      .filter((p: any) => p.clinicId === doctor.clinicId && p.status === "active")
      .map((p: any) => ({ id: p.id, name: p.name, network: p.network ?? "", discounts: p.discounts ?? "" }));

    res.json({ policies });
  } catch (err) {
    console.error("Fetch insurance policies by doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Every insurance policy lives in a flat array on the ORG's own top-level doc
// (org.insurancePolicies), regardless of which branch it belongs to — each
// entry carries a clinicId that's either the org's own id (main branch) or a
// real branch id, the same convention doctors/appointments already use, so
// the existing aggregate/single scoping works unmodified here.
async function loadOrgDoc(actorId: string, orgIdHint: string | null) {
  const orgId = orgIdHint ?? actorId;
  const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
  return org;
}

// ─── GET /api/clinics/insurance-policies ─────────────────────────────────────
router.get("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);

  try {
    const org = await loadOrgDoc(scope.actorId, scope.orgId);
    if (!org) { res.json({ policies: [] }); return; }
    const policies = (org.insurancePolicies ?? []).filter((p: any) => clinicIds.includes(p.clinicId));
    res.json({ policies });
  } catch (err) {
    console.error("Fetch insurance policies error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/insurance-policies ────────────────────────────────────
// Always scoped to a single branch (the one currently selected in the UI, or
// the caller's own main branch) — mirrors how a new doctor is always added
// to one specific branch, never to "all" at once.
router.post("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  if (!hasPermission(scope, "manage_insurance")) {
    res.status(403).json({ error: "You don't have permission to manage insurance." });
    return;
  }
  const { name, network, discounts, spcContractFileUrl, renewDate } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required." });
    return;
  }

  try {
    const org = await loadOrgDoc(scope.actorId, scope.orgId);
    if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

    const now = new Date().toISOString();
    const policy = {
      id: "ins_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      clinicId: scope.scopeId,
      name,
      network: network ?? "",
      discounts: discounts ?? "",
      spcContractFileUrl: spcContractFileUrl ?? null,
      status: "active" as const,
      renewDate: renewDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const insurancePolicies = [...(org.insurancePolicies ?? []), policy];
    await clinicsContainer.items.upsert({ ...org, insurancePolicies, updatedAt: now });

    res.json({ policy });
  } catch (err) {
    console.error("Create insurance policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/clinics/insurance-policies/:id ─────────────────────────────────
router.put("/:id", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  if (!hasPermission(scope, "manage_insurance")) {
    res.status(403).json({ error: "You don't have permission to manage insurance." });
    return;
  }
  const clinicIds = scopeToClinicIds(scope);
  const { name, network, discounts, spcContractFileUrl, renewDate, status } = req.body;

  try {
    const org = await loadOrgDoc(scope.actorId, scope.orgId);
    if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

    const policies: any[] = org.insurancePolicies ?? [];
    const idx = policies.findIndex((p) => p.id === req.params.id && clinicIds.includes(p.clinicId));
    if (idx === -1) { res.status(404).json({ error: "Insurance policy not found." }); return; }

    const updated = {
      ...policies[idx],
      name: name ?? policies[idx].name,
      network: network ?? policies[idx].network,
      discounts: discounts ?? policies[idx].discounts,
      spcContractFileUrl: spcContractFileUrl ?? policies[idx].spcContractFileUrl,
      renewDate: renewDate ?? policies[idx].renewDate,
      status: status ?? policies[idx].status,
      updatedAt: new Date().toISOString(),
    };
    policies[idx] = updated;

    await clinicsContainer.items.upsert({ ...org, insurancePolicies: policies, updatedAt: new Date().toISOString() });
    res.json({ policy: updated });
  } catch (err) {
    console.error("Update insurance policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/insurance-policies/:id ──────────────────────────────
router.delete("/:id", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  if (!hasPermission(scope, "manage_insurance")) {
    res.status(403).json({ error: "You don't have permission to manage insurance." });
    return;
  }
  const clinicIds = scopeToClinicIds(scope);

  try {
    const org = await loadOrgDoc(scope.actorId, scope.orgId);
    if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

    const policies: any[] = org.insurancePolicies ?? [];
    const exists = policies.some((p) => p.id === req.params.id && clinicIds.includes(p.clinicId));
    if (!exists) { res.status(404).json({ error: "Insurance policy not found." }); return; }

    const remaining = policies.filter((p) => p.id !== req.params.id);
    await clinicsContainer.items.upsert({ ...org, insurancePolicies: remaining, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete insurance policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
