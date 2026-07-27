import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { clinicsContainer } from "../config/cosmos";
import { resolveClinicScope, scopeToClinicIds } from "../utils/clinicScope";

const router = Router();

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
