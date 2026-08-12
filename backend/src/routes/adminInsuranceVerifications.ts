import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { patientsContainer, notificationsContainer } from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";
import { sendPushToUser } from "../utils/pushNotifications";

const router = Router();

// Insurance items live nested inside patient.insurance[] — there's no
// dedicated container to query directly, so this scans patients that have
// at least one entry and flattens matching items into rows, mirroring the
// admin fee-requests queue's list shape.

// ─── GET /api/admin/insurance-verifications?status=pending|active|rejected|all ─
router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";

  try {
    const { resources: patients } = await patientsContainer.items
      .query({ query: "SELECT c.id, c.fullName, c.email, c.insurance FROM c WHERE ARRAY_LENGTH(c.insurance) > 0" })
      .fetchAll();

    const rows = patients.flatMap((p: any) =>
      (p.insurance ?? [])
        .filter((i: any) => status === "all" || (i.status ?? "pending") === status)
        .map((i: any) => ({
          patientId: p.id,
          patientName: p.fullName ?? "Unknown Patient",
          patientEmail: p.email ?? "",
          id: i.id,
          provider: i.provider,
          policyId: i.policyId,
          plan: i.plan ?? null,
          status: i.status ?? "pending",
          rejectionReason: i.rejectionReason ?? null,
          reviewedAt: i.reviewedAt ?? null,
        }))
    );

    rows.sort((a: any, b: any) => Number(b.id) - Number(a.id) || 0);
    res.json({ policies: rows });
  } catch (err) {
    console.error("Fetch insurance verifications error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

async function reviewPolicy(
  req: SessionRequest,
  res: Response,
  newStatus: "active" | "rejected",
  reason: string | null
) {
  const { patientId, insuranceId } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: patient } = await patientsContainer.item(patientId, patientId).read().catch(() => ({ resource: undefined as any }));
    if (!patient) { res.status(404).json({ error: "Patient not found." }); return; }

    const idx = (patient.insurance ?? []).findIndex((i: any) => i.id === insuranceId);
    if (idx === -1) { res.status(404).json({ error: "Insurance policy not found." }); return; }
    if ((patient.insurance[idx].status ?? "pending") !== "pending") {
      res.status(409).json({ error: "This policy has already been reviewed." });
      return;
    }

    const insurance = [...patient.insurance];
    const now = new Date().toISOString();
    insurance[idx] = { ...insurance[idx], status: newStatus, reviewedBy: adminId, reviewedAt: now, rejectionReason: reason };
    await patientsContainer.items.upsert({ ...patient, insurance, updatedAt: now });

    const insuranceNotification = {
      id: "notif_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      patientId,
      title: newStatus === "active" ? "Insurance Verified" : "Insurance Not Verified",
      body:
        newStatus === "active"
          ? `Your ${insurance[idx].provider} insurance policy has been verified and can now be used to pay for appointments.`
          : `Your ${insurance[idx].provider} insurance policy could not be verified${reason ? `: ${reason}` : "."}`,
      type: newStatus === "active" ? "insurance_approved" : "insurance_rejected",
      referenceId: insuranceId,
      isRead: false,
      sentAt: now,
    };
    await notificationsContainer.items.create(insuranceNotification);
    await sendPushToUser(insuranceNotification.patientId, insuranceNotification.title, insuranceNotification.body, { type: insuranceNotification.type, referenceId: insuranceNotification.referenceId });

    logActivity({
      source: "admin",
      action: newStatus === "active" ? "Insurance Verified" : "Insurance Rejected",
      details: `${insurance[idx].provider} policy for patient ${patientId} ${newStatus === "active" ? "verified" : "rejected"}`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "insurancePolicy",
      entityId: insuranceId,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Review insurance policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

// ─── POST /api/admin/insurance-verifications/:patientId/:insuranceId/approve ─
router.post("/:patientId/:insuranceId/approve", requireRole("admin"), (req: SessionRequest, res: Response) => reviewPolicy(req, res, "active", null));

// ─── POST /api/admin/insurance-verifications/:patientId/:insuranceId/reject ──
router.post("/:patientId/:insuranceId/reject", requireRole("admin"), (req: SessionRequest, res: Response) =>
  reviewPolicy(req, res, "rejected", typeof req.body?.reason === "string" && req.body.reason.trim() ? req.body.reason.trim() : null)
);

export default router;
