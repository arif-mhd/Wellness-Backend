import { Router, Request, Response } from "express";
import { clinicsContainer, doctorsContainer, appointmentsContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { mainBranchFrom, buildInClause } from "../utils/clinicScope";

const router = Router();

// Platform-wide, real consultation earnings for the Wellness Admin — mirrors
// the same paymentStatus:'paid' + status:'completed' rule already used on
// the per-clinic payment page (backend/src/routes/clinicPayments.ts), just
// aggregated across every clinic instead of one caller's own scope.
// paymentMethod 'pay_at_clinic' (in-person, marked paid by the clinic after
// the visit) is bucketed together with 'cash' — same convention already
// used there.

// ─── GET /api/admin/earnings/summary ─────────────────────────────────────────
router.get("/summary", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources: appointments } = await appointmentsContainer.items
      .query({ query: "SELECT c.paymentAmount, c.paymentMethod FROM c WHERE c.status = 'completed' AND c.paymentStatus = 'paid'" })
      .fetchAll();

    let totalEarnings = 0;
    let cashEarnings = 0;
    let insuranceEarnings = 0;
    for (const a of appointments) {
      const amount = a.paymentAmount ?? 0;
      totalEarnings += amount;
      if (a.paymentMethod === "insurance") insuranceEarnings += amount;
      else cashEarnings += amount;
    }

    res.json({ totalEarnings, cashEarnings, insuranceEarnings });
  } catch (err) {
    console.error("Fetch admin earnings summary error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/earnings/clinics ─────────────────────────────────────────
// Clinic-wise rollup. A "clinic" here means one org — its own top-level
// account plus every active branch nested under it (branches have no
// standalone Cosmos doc of their own), so a multi-branch org's earnings are
// combined into a single row, matching how the org is presented everywhere
// else in the admin portal.
router.get("/clinics", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources: orgs } = await clinicsContainer.items
      .query({ query: "SELECT * FROM c WHERE c.status = 'approved' AND (NOT IS_DEFINED(c.branchId))" })
      .fetchAll();

    // Every clinicId (org's own id, or one of its active branch ids) an
    // appointment/doctor might be stamped with, resolved back to its owning
    // org — built once so appointments/doctors can be bucketed in a single
    // pass instead of one query per clinic.
    const clinicIdToOrg = new Map<string, any>();
    for (const org of orgs) {
      clinicIdToOrg.set(org.id, org);
      for (const branch of org.branches ?? []) {
        if (branch.status === "active") clinicIdToOrg.set(branch.id, org);
      }
    }

    const [{ resources: appointments }, { resources: doctors }] = await Promise.all([
      appointmentsContainer.items
        .query({ query: "SELECT c.clinicId, c.paymentAmount, c.paymentMethod FROM c WHERE c.status = 'completed' AND c.paymentStatus = 'paid'" })
        .fetchAll(),
      doctorsContainer.items
        .query({ query: "SELECT c.id, c.clinicId FROM c WHERE c.status = 'approved'" })
        .fetchAll(),
    ]);

    interface Bucket { totalEarnings: number; cashEarnings: number; insuranceEarnings: number; doctorCount: number; }
    const buckets = new Map<string, Bucket>();
    const bucketFor = (orgId: string) => {
      let b = buckets.get(orgId);
      if (!b) { b = { totalEarnings: 0, cashEarnings: 0, insuranceEarnings: 0, doctorCount: 0 }; buckets.set(orgId, b); }
      return b;
    };

    for (const a of appointments) {
      const org = clinicIdToOrg.get(a.clinicId);
      if (!org) continue; // appointment predates the clinic, or clinic since deleted — skip rather than misattribute
      const b = bucketFor(org.id);
      const amount = a.paymentAmount ?? 0;
      b.totalEarnings += amount;
      if (a.paymentMethod === "insurance") b.insuranceEarnings += amount;
      else b.cashEarnings += amount;
    }

    for (const d of doctors) {
      const org = clinicIdToOrg.get(d.clinicId);
      if (!org) continue;
      bucketFor(org.id).doctorCount += 1;
    }

    const clinics = orgs
      .map((org) => {
        const main = mainBranchFrom(org);
        const b = buckets.get(org.id) ?? { totalEarnings: 0, cashEarnings: 0, insuranceEarnings: 0, doctorCount: 0 };
        return {
          id: org.id,
          name: main.name ?? "Clinic",
          avatarUrl: main.clinicImageUrl ?? null,
          branchCount: (org.branches ?? []).filter((b: any) => b.status === "active").length,
          ...b,
        };
      })
      .sort((a, b) => b.totalEarnings - a.totalEarnings);

    res.json({ clinics });
  } catch (err) {
    console.error("Fetch admin clinic earnings error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/earnings/clinics/:orgId/doctors ──────────────────────────
// Doctor-wise breakdown within one clinic (org), drilled into from the
// clinics rollup above.
router.get("/clinics/:orgId/doctors", requireRole("admin"), async (req: Request, res: Response) => {
  const { orgId } = req.params;
  try {
    const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
    if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

    const clinicIds = [org.id, ...(org.branches ?? []).filter((b: any) => b.status === "active").map((b: any) => b.id)];
    const { clause, parameters } = buildInClause("c.clinicId", clinicIds);

    const { resources: doctors } = await doctorsContainer.items
      .query({ query: `SELECT * FROM c WHERE ${clause} AND c.status = 'approved' ORDER BY c.fullName ASC`, parameters })
      .fetchAll();

    const { resources: appointments } = await appointmentsContainer.items
      .query({ query: `SELECT c.doctorId, c.paymentAmount, c.paymentMethod FROM c WHERE ${clause} AND c.status = 'completed' AND c.paymentStatus = 'paid'`, parameters })
      .fetchAll();

    const earningsByDoctor = new Map<string, { totalEarnings: number; cashEarnings: number; insuranceEarnings: number }>();
    for (const a of appointments) {
      let e = earningsByDoctor.get(a.doctorId);
      if (!e) { e = { totalEarnings: 0, cashEarnings: 0, insuranceEarnings: 0 }; earningsByDoctor.set(a.doctorId, e); }
      const amount = a.paymentAmount ?? 0;
      e.totalEarnings += amount;
      if (a.paymentMethod === "insurance") e.insuranceEarnings += amount;
      else e.cashEarnings += amount;
    }

    const main = mainBranchFrom(org);
    res.json({
      clinicName: main.name ?? "Clinic",
      doctors: doctors.map((d: any) => ({
        id: d.id,
        fullName: d.fullName,
        specialty: d.specialty,
        avatarUrl: d.avatarUrl,
        ...(earningsByDoctor.get(d.id) ?? { totalEarnings: 0, cashEarnings: 0, insuranceEarnings: 0 }),
      })).sort((a: any, b: any) => b.totalEarnings - a.totalEarnings),
    });
  } catch (err) {
    console.error("Fetch admin clinic doctor earnings error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
