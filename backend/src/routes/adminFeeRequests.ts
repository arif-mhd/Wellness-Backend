import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { feeChangeRequestsContainer, clinicsContainer, doctorsContainer } from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";
import { notifyClinic } from "./clinicPayments";

const router = Router();

// ─── GET /api/admin/fee-requests?status= ─────────────────────────────────────
// Defaults to pending only (the approval queue); pass status=all for history.
router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";

  try {
    const { resources: requests } = await feeChangeRequestsContainer.items
      .query(
        status === "all"
          ? { query: "SELECT * FROM c ORDER BY c.requestedAt DESC" }
          : { query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.requestedAt DESC", parameters: [{ name: "@status", value: status }] }
      )
      .fetchAll();

    const orgIds = Array.from(new Set(requests.map((r: any) => r.orgId).filter(Boolean)));
    const orgById: Record<string, any> = {};
    await Promise.all(orgIds.map(async (id) => {
      try {
        const { resource } = await clinicsContainer.item(id, id).read();
        if (resource) orgById[id] = resource;
      } catch { /* skip */ }
    }));

    const doctorIds = Array.from(new Set(requests.filter((r: any) => r.targetType === "doctor").map((r: any) => r.targetId)));
    const doctorById: Record<string, any> = {};
    await Promise.all(doctorIds.map(async (id) => {
      try {
        const { resource } = await doctorsContainer.item(id, id).read();
        if (resource) doctorById[id] = resource;
      } catch { /* skip */ }
    }));

    const enriched = requests.map((r: any) => {
      const org = orgById[r.orgId];
      const branchName = r.branchId ? org?.branches?.find((b: any) => b.id === r.branchId)?.clinicName : null;
      return {
        ...r,
        clinicName: org?.clinicName ?? "Unknown Clinic",
        branchName: branchName ?? null,
        doctorName: r.targetType === "doctor" ? (doctorById[r.targetId]?.fullName ?? "Unknown Doctor") : null,
      };
    });

    res.json({ requests: enriched });
  } catch (err) {
    console.error("Fetch fee requests error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/fee-requests/:id/approve ────────────────────────────────
router.post("/:id/approve", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    // Partition key is /orgId, which the client doesn't necessarily know, so
    // look the request up by id via query rather than a direct point-read.
    const doc = (await feeChangeRequestsContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
      .fetchAll()).resources[0];

    if (!doc) { res.status(404).json({ error: "Request not found." }); return; }
    if (doc.status !== "pending") { res.status(409).json({ error: "Request has already been reviewed." }); return; }

    if (doc.targetType === "clinic") {
      const { resource: org } = await clinicsContainer.item(doc.orgId, doc.orgId).read();
      if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

      if (doc.branchId) {
        const branchIndex = (org.branches ?? []).findIndex((b: any) => b.id === doc.branchId);
        if (branchIndex === -1) { res.status(404).json({ error: "Branch not found." }); return; }
        const branches = [...org.branches];
        branches[branchIndex] = { ...branches[branchIndex], consultationRates: doc.newRates };
        await clinicsContainer.items.upsert({ ...org, branches, updatedAt: new Date().toISOString() });
      } else {
        await clinicsContainer.items.upsert({ ...org, consultationRates: doc.newRates, updatedAt: new Date().toISOString() });
      }
    } else {
      const { resource: doctor } = await doctorsContainer.item(doc.targetId, doc.targetId).read();
      if (!doctor) { res.status(404).json({ error: "Doctor not found." }); return; }
      await doctorsContainer.items.upsert({ ...doctor, fees: doc.newRates, updatedAt: new Date().toISOString() });
    }

    await feeChangeRequestsContainer.items.upsert({
      ...doc,
      status: "approved",
      reviewedBy: adminId,
      reviewedAt: new Date().toISOString(),
    });

    await notifyClinic(doc.orgId, {
      type: "fee_change_approved",
      title: "Fee Change Approved",
      body: doc.targetType === "clinic" ? "Your consultation fee change has been approved and is now live." : "The doctor fee change you requested has been approved and is now live.",
      referenceId: doc.id,
    });

    logActivity({
      source: "admin",
      action: "Fee Change Approved",
      details: `Fee change for ${doc.targetType === "clinic" ? `clinic ${doc.orgId}` : `doctor ${doc.targetId}`} approved`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "feeChangeRequest",
      entityId: doc.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Approve fee request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/fee-requests/:id/reject ─────────────────────────────────
router.post("/:id/reject", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();
  const { reason } = req.body;

  try {
    const doc = (await feeChangeRequestsContainer.items
      .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
      .fetchAll()).resources[0];

    if (!doc) { res.status(404).json({ error: "Request not found." }); return; }
    if (doc.status !== "pending") { res.status(409).json({ error: "Request has already been reviewed." }); return; }

    await feeChangeRequestsContainer.items.upsert({
      ...doc,
      status: "rejected",
      reviewedBy: adminId,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason ?? null,
    });

    await notifyClinic(doc.orgId, {
      type: "fee_change_rejected",
      title: "Fee Change Rejected",
      body: reason ? `Your fee change request was rejected: ${reason}` : "Your fee change request was rejected.",
      referenceId: doc.id,
    });

    logActivity({
      source: "admin",
      action: "Fee Change Rejected",
      details: `Fee change for ${doc.targetType === "clinic" ? `clinic ${doc.orgId}` : `doctor ${doc.targetId}`} rejected`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "feeChangeRequest",
      entityId: doc.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Reject fee request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
