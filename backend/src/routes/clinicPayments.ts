import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import {
  clinicsContainer,
  doctorsContainer,
  appointmentsContainer,
  patientsContainer,
  feeChangeRequestsContainer,
  withdrawalRequestsContainer,
  adminNotificationsContainer,
} from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { logActivity } from "../utils/activityLogger";
import {
  resolveClinicScope,
  scopeToClinicIds,
  hasPermission,
  mainBranchFrom,
  branchAsPublicClinic,
  buildInClause,
  ClinicScope,
} from "../utils/clinicScope";

const router = Router();

const DEFAULT_DOCTOR_SHARE_PERCENT = 60;

// ─── Branch/org document resolution ──────────────────────────────────────────
// consultationRates/bankAccount/doctorSharePercent live either directly on
// the org's own top-level Cosmos doc ("my main branch" — a standalone
// clinic, the org owner acting as themselves, or a main-branch senior-staff
// account whose branchId is stamped as the org's own id — see
// clinicScope.ts's own comment on resolveClinicScope for why those three
// cases all collapse to the same scopeId) or, for a real secondary branch,
// nested inside the parent org doc's branches[] array (a real branch has no
// standalone Cosmos document of its own). This resolves a single-mode scope
// down to wherever those fields actually live, and how to save back to it.
type BranchTarget =
  | { kind: "org"; org: any; view: any }
  | { kind: "branch"; org: any; branchIndex: number; view: any };

// mainBranchFrom/branchAsPublicClinic (target.view) hand-pick an explicit
// field list and are also used for PUBLIC/patient-facing clinic views, so
// bankAccount/doctorSharePercent were deliberately never added there — that
// would leak a clinic's bank details into public listings. Reads of those
// two fields go through the raw underlying document instead.
function rawBranchDoc(target: BranchTarget): any {
  return target.kind === "org" ? target.org : target.org.branches[target.branchIndex];
}

async function loadBranchTarget(scope: Extract<ClinicScope, { mode: "single" }>): Promise<BranchTarget | null> {
  const isMainBranch = !scope.orgId || scope.scopeId === scope.orgId;
  const orgId = scope.orgId ?? scope.scopeId;

  const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
  if (!org) return null;

  if (isMainBranch) {
    return { kind: "org", org, view: mainBranchFrom(org) };
  }

  const branchIndex = (org.branches ?? []).findIndex((b: any) => b.id === scope.scopeId);
  if (branchIndex === -1) return null;
  return { kind: "branch", org, branchIndex, view: branchAsPublicClinic(org, org.branches[branchIndex]) };
}

async function saveBranchTarget(target: BranchTarget, fields: { consultationRates?: any[]; bankAccount?: any; doctorSharePercent?: number }) {
  if (target.kind === "org") {
    const updated = { ...target.org, ...fields, updatedAt: new Date().toISOString() };
    await clinicsContainer.items.upsert(updated);
    return;
  }
  const branches = [...target.org.branches];
  branches[target.branchIndex] = { ...branches[target.branchIndex], ...fields };
  const updated = { ...target.org, branches, updatedAt: new Date().toISOString() };
  await clinicsContainer.items.upsert(updated);
}

function doctorSharePercentOf(view: any): number {
  return typeof view.doctorSharePercent === "number" ? view.doctorSharePercent : DEFAULT_DOCTOR_SHARE_PERCENT;
}

// Fire-and-forget clinic-facing notification, reusing the same shared
// adminNotificationsContainer the doctor-facing notification system already
// uses (discriminated there by a doctorId field) — this adds the equivalent
// orgId-keyed variant rather than standing up a whole new container.
async function notifyClinic(orgId: string, entry: { type: string; title: string; body: string; referenceId: string }) {
  try {
    await adminNotificationsContainer.items.create({
      id: `clinic_${entry.type}_${entry.referenceId}_${Date.now()}`,
      orgId,
      type: entry.type,
      title: entry.title,
      body: entry.body,
      referenceId: entry.referenceId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[notifyClinic] Failed:", err);
  }
}

// ─── GET /api/clinics/payments/summary?branchId= ─────────────────────────────
router.get("/summary", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  try {
    const clinicIds = scopeToClinicIds(scope);

    // Fetched row-by-row (rather than a single SUM) so it can be split by
    // paymentMethod in the same pass — an appointment with no paymentMethod
    // field at all (booked before this field existed) counts as cash.
    // paymentStatus = 'paid' excludes in-person ("pay at clinic") visits
    // that haven't actually been collected yet — see PATCH /:id/mark-paid.
    let totalEarnings = 0;
    let cashEarnings = 0;
    let insuranceEarnings = 0;
    if (clinicIds.length > 0) {
      const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
      const { resources } = await appointmentsContainer.items
        .query({ query: `SELECT c.paymentAmount, c.paymentMethod FROM c WHERE ${clause} AND c.status = 'completed' AND c.paymentStatus = 'paid'`, parameters })
        .fetchAll();
      for (const a of resources) {
        const amount = a.paymentAmount ?? 0;
        totalEarnings += amount;
        if (a.paymentMethod === "insurance") insuranceEarnings += amount;
        else cashEarnings += amount;
      }
    }

    const { resources: withdrawn } = await withdrawalRequestsContainer.items
      .query({
        query: "SELECT VALUE SUM(c.amount) FROM c WHERE c.orgId = @orgId AND c.status = 'processed'",
        parameters: [{ name: "@orgId", value: scope.orgId ?? scope.actorId }],
      })
      .fetchAll();
    const totalWithdrawn = withdrawn[0] ?? 0;

    // Fee/bank/share fields only resolve for a single branch — if the
    // caller is viewing the aggregate ("Overall", no branchId), those come
    // back null and the frontend falls back to per-branch editing.
    let branchFields: { consultationRates: any[]; bankAccount: any; doctorSharePercent: number } | null = null;
    if (scope.mode === "single") {
      const target = await loadBranchTarget(scope);
      if (target) {
        branchFields = {
          consultationRates: target.view.consultationRates ?? [],
          bankAccount: rawBranchDoc(target).bankAccount ?? null,
          doctorSharePercent: doctorSharePercentOf(rawBranchDoc(target)),
        };
      }
    }

    res.json({
      totalEarnings,
      cashEarnings,
      insuranceEarnings,
      totalWithdrawn,
      balance: Math.max(0, totalEarnings - totalWithdrawn),
      consultationRates: branchFields?.consultationRates ?? [],
      bankAccount: branchFields?.bankAccount ?? null,
      doctorSharePercent: branchFields?.doctorSharePercent ?? DEFAULT_DOCTOR_SHARE_PERCENT,
    });
  } catch (err) {
    console.error("Fetch payment summary error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/payments/doctors ───────────────────────────────────────
// Roster for the Doctors tab, each annotated with a real earnings total.
router.get("/doctors", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  try {
    const clinicIds = scopeToClinicIds(scope);
    if (clinicIds.length === 0) { res.json({ doctors: [] }); return; }

    const { clause: docClause, parameters: docParams } = buildInClause("c.clinicId", clinicIds);
    const { resources: doctors } = await doctorsContainer.items
      .query({ query: `SELECT * FROM c WHERE ${docClause} AND c.status = 'approved' ORDER BY c.fullName ASC`, parameters: docParams })
      .fetchAll();

    const { clause: aptClause, parameters: aptParams } = buildInClause("c.clinicId", clinicIds);
    const appointments = await appointmentsContainer.items
      .query({ query: `SELECT c.doctorId, c.paymentAmount FROM c WHERE ${aptClause} AND c.status = 'completed' AND c.paymentStatus = 'paid'`, parameters: aptParams })
      .fetchAll()
      .then((r) => r.resources);

    const earningsByDoctor = new Map<string, number>();
    for (const a of appointments) {
      earningsByDoctor.set(a.doctorId, (earningsByDoctor.get(a.doctorId) ?? 0) + (a.paymentAmount ?? 0));
    }

    res.json({
      doctors: doctors.map((d: any) => ({
        id: d.id,
        fullName: d.fullName,
        specialty: d.specialty,
        avatarUrl: d.avatarUrl,
        fees: d.fees,
        earnings: earningsByDoctor.get(d.id) ?? 0,
      })),
    });
  } catch (err) {
    console.error("Fetch clinic payment doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/payments/doctors/:id/summary ───────────────────────────
router.get("/doctors/:id/summary", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  try {
    const clinicIds = scopeToClinicIds(scope);
    const { resource: doctor } = await doctorsContainer.item(req.params.id, req.params.id).read().catch(() => ({ resource: undefined as any }));
    if (!doctor || !clinicIds.includes(doctor.clinicId)) { res.status(404).json({ error: "Doctor not found." }); return; }

    const { resources: appointments } = await appointmentsContainer.items
      .query({
        query: "SELECT c.paymentAmount, c.paymentMethod FROM c WHERE c.doctorId = @doctorId AND c.status = 'completed' AND c.paymentStatus = 'paid'",
        parameters: [{ name: "@doctorId", value: doctor.id }],
      })
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

    res.json({
      id: doctor.id,
      fullName: doctor.fullName,
      avatarUrl: doctor.avatarUrl,
      fees: doctor.fees,
      totalEarnings,
      cashEarnings,
      insuranceEarnings,
    });
  } catch (err) {
    console.error("Fetch doctor payment summary error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/payments/history?branchId=&doctorId=&category= ────────
router.get("/history", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  const category = typeof req.query.category === "string" ? req.query.category : "all";
  const doctorIdFilter = typeof req.query.doctorId === "string" ? req.query.doctorId : null;

  if (category === "diagnostics-commissions") {
    // No lab-referral/commission attribution exists anywhere in the
    // codebase yet — honest empty state rather than fabricated rows.
    res.json({ history: [] });
    return;
  }

  try {
    const clinicIds = scopeToClinicIds(scope);
    if (clinicIds.length === 0) { res.json({ history: [] }); return; }

    let doctorSharePercent = DEFAULT_DOCTOR_SHARE_PERCENT;
    if (scope.mode === "single") {
      const target = await loadBranchTarget(scope);
      if (target) doctorSharePercent = doctorSharePercentOf(rawBranchDoc(target));
    }

    const statusFilter =
      category === "cancelled" ? "c.status = 'cancelled'" :
      "c.status = 'completed'"; // "all", "appointments", "dr-share" all draw from completed consultations

    const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
    const doctorFilter = doctorIdFilter ? " AND c.doctorId = @doctorId" : "";
    if (doctorIdFilter) parameters.push({ name: "@doctorId", value: doctorIdFilter });

    const { resources: appointments } = await appointmentsContainer.items
      .query({
        query: `SELECT * FROM c WHERE ${clause} AND ${statusFilter}${doctorFilter} ORDER BY c.scheduledAt DESC OFFSET 0 LIMIT 100`,
        parameters,
      })
      .fetchAll();

    const patientIds = Array.from(new Set(appointments.map((a: any) => a.patientId).filter(Boolean)));
    const patientById: Record<string, any> = {};
    await Promise.all(patientIds.map(async (id) => {
      try {
        const { resource } = await patientsContainer.item(id, id).read();
        if (resource) patientById[id] = resource;
      } catch { /* skip */ }
    }));

    const history = appointments.map((a: any) => {
      const patient = patientById[a.patientId];
      const fullAmount = a.paymentAmount ?? 0;
      // An in-person visit not yet marked paid (PATCH /:id/mark-paid) hasn't
      // actually been collected — don't count it as earned yet, same as a
      // cancelled appointment.
      const isUnpaidInPerson = a.paymentMethod === "pay_at_clinic" && a.paymentStatus !== "paid";
      const earning = category === "dr-share" ? fullAmount * (doctorSharePercent / 100) : (a.status === "cancelled" || isUnpaidInPerson ? 0 : fullAmount);
      return {
        id: a.id,
        patientName: patient?.fullName ?? "Unknown Patient",
        patientAge: patient?.dateOfBirth ? Math.max(0, new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) : null,
        patientEmail: patient?.email ?? "",
        diagnosis: a.emr?.sections?.impressionAndPlan?.trim() || a.reason || "—",
        date: a.scheduledAt,
        earning,
        status: a.status,
        doctorId: a.doctorId,
        paymentMethod: a.paymentMethod === "insurance" ? "insurance" : a.paymentMethod === "pay_at_clinic" ? "pay_at_clinic" : "cash",
        paymentStatus: a.paymentStatus ?? "paid",
      };
    });

    res.json({ history });
  } catch (err) {
    console.error("Fetch payment history error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/payments/fee-change-request ───────────────────────────
// Body: { targetType: "clinic"|"doctor", targetId, branchId?, newRates }
// OTP verification is the caller's responsibility (send/verify against
// purpose "clinic_fee_change" via the existing /api/otp routes) before
// calling this — matches the established pattern elsewhere in this app
// (e.g. doctor 2FA enable), where the action endpoint trusts a verify call
// already happened rather than re-checking OTP state itself.
router.post("/fee-change-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const { targetType, targetId, newRates } = req.body;
  if (targetType !== "clinic" && targetType !== "doctor") {
    res.status(400).json({ error: "targetType must be 'clinic' or 'doctor'." });
    return;
  }
  if (!Array.isArray(newRates) && targetType === "clinic") {
    res.status(400).json({ error: "newRates must be an array for targetType 'clinic'." });
    return;
  }

  // A doctor's own fee isn't tied to whichever branch happens to be selected
  // elsewhere in the UI (e.g. the Clinics tab's branch switcher) — it's
  // scoped to that doctor's own clinicId, which an org owner can reach
  // across *any* of their branches. So this resolves aggregate here and
  // checks membership directly, rather than requiring the caller to already
  // know and pass the doctor's specific branchId. Editing the clinic's own
  // consultationRates array, by contrast, genuinely needs one exact branch.
  if (targetType === "doctor") {
    const scope = await resolveClinicScope(req, res, { allowAggregate: true });
    if (!scope) return;
    if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

    try {
      const clinicIds = scopeToClinicIds(scope);
      const { resource: doctor } = await doctorsContainer.item(targetId, targetId).read().catch(() => ({ resource: undefined as any }));
      if (!doctor || !clinicIds.includes(doctor.clinicId)) { res.status(404).json({ error: "Doctor not found." }); return; }

      const orgId = scope.orgId ?? scope.actorId;
      const request = {
        id: `feereq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        orgId,
        branchId: doctor.clinicId === orgId ? null : doctor.clinicId,
        targetType: "doctor" as const,
        targetId,
        oldRates: doctor.fees ?? null,
        newRates,
        requestedBy: scope.actorId,
        requestedAt: new Date().toISOString(),
        status: "pending" as const,
      };
      await feeChangeRequestsContainer.items.create(request);

      logActivity({
        source: "clinic",
        action: "Fee Change Requested",
        details: `Fee change requested for doctor ${targetId}, pending admin approval`,
        performedBy: "Clinic",
        performedById: scope.actorId,
        entityType: "feeChangeRequest",
        entityId: request.id,
      });

      res.status(201).json({ status: "OK", request });
    } catch (err) {
      console.error("Create fee change request error:", err);
      res.status(500).json({ error: "Internal server error." });
    }
    return;
  }

  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  try {
    const orgId = scope.orgId ?? scope.actorId;
    const target = await loadBranchTarget(scope);
    if (!target) { res.status(404).json({ error: "Branch not found." }); return; }
    const oldRates = target.view.consultationRates ?? [];

    const request = {
      id: `feereq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      orgId,
      branchId: scope.scopeId === orgId ? null : scope.scopeId,
      targetType: "clinic" as const,
      targetId: scope.scopeId,
      oldRates,
      newRates,
      requestedBy: scope.actorId,
      requestedAt: new Date().toISOString(),
      status: "pending" as const,
    };
    await feeChangeRequestsContainer.items.create(request);

    logActivity({
      source: "clinic",
      action: "Fee Change Requested",
      details: "Fee change requested for clinic, pending admin approval",
      performedBy: "Clinic",
      performedById: scope.actorId,
      entityType: "feeChangeRequest",
      entityId: request.id,
    });

    res.status(201).json({ status: "OK", request });
  } catch (err) {
    console.error("Create fee change request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/payments/withdrawal-request ───────────────────────────
// Body: { amount }. OTP verification is the caller's responsibility (purpose
// "clinic_withdrawal"), same convention as fee-change-request above. Records
// the request and decrements the computed balance — never calls any real
// payment rail, matching how every other "payment" in this codebase works.
router.post("/withdrawal-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) { res.status(400).json({ error: "A positive amount is required." }); return; }

  try {
    const orgId = scope.orgId ?? scope.actorId;
    const clinicIds = scopeToClinicIds(scope);

    const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
    const { resources: earned } = await appointmentsContainer.items
      .query({ query: `SELECT VALUE SUM(c.paymentAmount) FROM c WHERE ${clause} AND c.status = 'completed'`, parameters })
      .fetchAll();
    const totalEarnings = earned[0] ?? 0;

    const { resources: withdrawn } = await withdrawalRequestsContainer.items
      .query({
        query: "SELECT VALUE SUM(c.amount) FROM c WHERE c.orgId = @orgId AND c.status = 'processed'",
        parameters: [{ name: "@orgId", value: orgId }],
      })
      .fetchAll();
    const totalWithdrawn = withdrawn[0] ?? 0;
    const balance = Math.max(0, totalEarnings - totalWithdrawn);

    if (amount > balance) { res.status(400).json({ error: "Amount exceeds available balance." }); return; }

    const target = await loadBranchTarget(scope);

    const request = {
      id: `wreq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      orgId,
      branchId: scope.scopeId === orgId ? null : scope.scopeId,
      amount,
      bankAccountSnapshot: target ? rawBranchDoc(target).bankAccount ?? null : null,
      requestedAt: new Date().toISOString(),
      status: "processed" as const,
      processedAt: new Date().toISOString(),
    };
    await withdrawalRequestsContainer.items.create(request);

    logActivity({
      source: "clinic",
      action: "Withdrawal Requested",
      details: `Withdrawal of ${amount} requested`,
      performedBy: "Clinic",
      performedById: scope.actorId,
      entityType: "withdrawalRequest",
      entityId: request.id,
    });

    res.status(201).json({ status: "OK", request, balance: balance - amount });
  } catch (err) {
    console.error("Create withdrawal request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/payments/bank-account ────────────────────────────────
router.patch("/bank-account", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  const { bankName, accountNumber, accountHolderName } = req.body;
  if (!bankName || !accountNumber) { res.status(400).json({ error: "bankName and accountNumber are required." }); return; }

  try {
    const target = await loadBranchTarget(scope);
    if (!target) { res.status(404).json({ error: "Branch not found." }); return; }

    const bankAccount = { bankName, accountNumber, accountHolderName: accountHolderName ?? null };
    await saveBranchTarget(target, { bankAccount });

    res.json({ status: "OK", bankAccount });
  } catch (err) {
    console.error("Update bank account error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/payments/doctor-share ────────────────────────────────
router.patch("/doctor-share", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  if (!hasPermission(scope, "manage_payment")) { res.status(403).json({ error: "Not authorized." }); return; }

  const doctorSharePercent = Number(req.body.doctorSharePercent);
  if (!Number.isFinite(doctorSharePercent) || doctorSharePercent < 0 || doctorSharePercent > 100) {
    res.status(400).json({ error: "doctorSharePercent must be a number between 0 and 100." });
    return;
  }

  try {
    const target = await loadBranchTarget(scope);
    if (!target) { res.status(404).json({ error: "Branch not found." }); return; }

    await saveBranchTarget(target, { doctorSharePercent });
    res.json({ status: "OK", doctorSharePercent });
  } catch (err) {
    console.error("Update doctor share error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/payments/notifications ─────────────────────────────────
router.get("/notifications", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const orgId = req.session!.getUserId();
  try {
    // The clinic's own account IS the orgId when acting as themselves; a
    // branch-staff login's notifications belong to their parent org, not
    // their own account id, so resolve orgId the same way resolveClinicScope
    // does rather than trusting the session id blindly.
    const { resource: caller } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
    const resolvedOrgId = caller?.orgId ?? orgId;

    const { resources } = await adminNotificationsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.orgId = @orgId ORDER BY c.createdAt DESC OFFSET 0 LIMIT 30",
        parameters: [{ name: "@orgId", value: resolvedOrgId }],
      })
      .fetchAll();

    res.json({ notifications: resources });
  } catch (err) {
    console.error("Fetch clinic notifications error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.patch("/notifications/:id/read", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  try {
    const { resource: doc } = await adminNotificationsContainer.item(req.params.id, req.params.id).read().catch(() => ({ resource: undefined as any }));
    if (!doc) { res.status(404).json({ error: "Notification not found." }); return; }
    await adminNotificationsContainer.items.upsert({ ...doc, isRead: true });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Mark clinic notification read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export { notifyClinic, loadBranchTarget, saveBranchTarget, doctorSharePercentOf };
export default router;
