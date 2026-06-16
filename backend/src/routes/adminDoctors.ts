import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { requireRole } from "../middleware/requireRole";
import { doctorsContainer, appointmentsContainer, feedbackContainer, queryDocuments } from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// All routes here require the "admin" role
// ─── GET /api/admin/doctors/pending ─────────────────────────────────────────
// Returns all doctors whose status is "pending_approval" (the onboarding queue).
router.get("/pending", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await doctorsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.registeredAt DESC",
        parameters: [{ name: "@status", value: "pending_approval" }],
      })
      .fetchAll();

    res.json({ doctors: resources });
  } catch (err) {
    console.error("Fetch pending doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/approved ────────────────────────────────────────
// Returns all doctors whose status is "approved" (the onboarded list).
router.get("/approved", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await doctorsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.approvedAt DESC",
        parameters: [{ name: "@status", value: "approved" }],
      })
      .fetchAll();

    res.json({ doctors: resources });
  } catch (err) {
    console.error("Fetch approved doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/:id ─────────────────────────────────────────────
// Must come after /pending and /approved to avoid those being captured as :id
router.get("/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Use a query instead of .item().read() to be partition-key-agnostic
    const { resources } = await doctorsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Doctor not found." }); return; }
    res.json({ doctor: resources[0] });
  } catch (err) {
    console.error("Fetch doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/approve ────────────────────────────────────
// Promotes a pending doctor to approved:
//   1. Swaps role from "doctor_pending" → "doctor" in SuperTokens
//   2. Updates Cosmos document status to "approved"
router.post("/:id/approve", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    // ── 1. Read doctor record from Cosmos ────────────────────────────────
    const { resource: doctor } = await doctorsContainer.item(id, id).read();

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    if (doctor.status === "approved") {
      res.status(409).json({ error: "Doctor is already approved." });
      return;
    }

    // ── 2. Swap SuperTokens roles ─────────────────────────────────────────
    await UserRoles.removeUserRole("public", id, "doctor_pending");
    await UserRoles.addRoleToUser("public", id, "doctor");

    // ── 3. Update Cosmos document ─────────────────────────────────────────
    const updatedDoctor = {
      ...doctor,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "admin",
      action: "Doctor Approved",
      details: `Dr. ${doctor.fullName ?? id} (${doctor.specialty ?? ""}) profile approved`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: id,
    });

    res.json({ status: "OK", message: "Doctor approved successfully." });
  } catch (err) {
    console.error("Approve doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/reject ─────────────────────────────────────
// Rejects a pending doctor: removes their ST account marker, updates Cosmos.
router.post("/:id/reject", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    // Update Cosmos record
    const updatedDoctor = {
      ...doctor,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "admin",
      action: "Doctor Rejected",
      details: `Dr. ${doctor.fullName ?? id} application rejected`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: id,
    });

    res.json({ status: "OK", message: "Doctor application rejected." });
  } catch (err) {
    console.error("Reject doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/:id/diagnosis ───────────────────────────────────
// Aggregates appointment reasons for a doctor, returning the top 10 by count.
router.get("/:id/diagnosis", requireRole("admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const appointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.reason FROM c WHERE c.doctorId = @doctorId AND c.status != 'cancelled'",
      parameters: [{ name: "@doctorId", value: id }],
    });

    const counts: Record<string, number> = {};
    for (const apt of appointments) {
      if (apt.reason) {
        const key = apt.reason.trim();
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }

    const diagnosis = Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ diagnosis, total: appointments.length });
  } catch (err) {
    console.error("Diagnosis fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/:id/reviews ─────────────────────────────────────
// Returns all consultation feedback submitted for a doctor
// (folder = "appointment", provider.id = doctorId).
router.get("/:id/reviews", requireRole("admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const reviews = await queryDocuments<any>(feedbackContainer, {
      query: "SELECT * FROM c WHERE c.folder = 'appointment' AND c.provider.id = @doctorId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@doctorId", value: id }],
    });

    const total = reviews.length;
    const avgRating = total > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / total) * 10) / 10
      : null;

    res.json({ reviews, total, avgRating });
  } catch (err) {
    console.error("Reviews fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/verify-slots ────────────────────────────────
// Verifies/approves updated slots for a doctor.
router.post("/:id/verify-slots", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    const updatedDoctor = {
      ...doctor,
      slots: doctor.tempSlots ?? doctor.slots,
      slotsPending: false,
      slotsVerifiedAt: new Date().toISOString(),
      slotsVerifiedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "admin",
      action: "Doctor Slots Verified",
      details: `Dr. ${doctor.fullName ?? id} availability slots verified`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: id,
    });

    res.json({ status: "OK", message: "Doctor slots verified successfully." });
  } catch (err) {
    console.error("Verify doctor slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
