import { Router } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { requireRole } from "../middleware/requireRole";
import { doctorsContainer } from "../config/cosmos";

const router = Router();

// All routes here require the "admin" role
// ─── GET /api/admin/doctors/pending ─────────────────────────────────────────
// Returns all doctors whose status is "pending_approval" (the onboarding queue).
router.get("/pending", requireRole("admin"), async (_req, res) => {
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
router.get("/approved", requireRole("admin"), async (_req, res) => {
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

// ─── POST /api/admin/doctors/:id/approve ────────────────────────────────────
// Promotes a pending doctor to approved:
//   1. Swaps role from "doctor_pending" → "doctor" in SuperTokens
//   2. Updates Cosmos document status to "approved"
router.post("/:id/approve", requireRole("admin"), async (req: SessionRequest, res) => {
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
      status:     "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    res.json({ status: "OK", message: "Doctor approved successfully." });
  } catch (err) {
    console.error("Approve doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/reject ─────────────────────────────────────
// Rejects a pending doctor: removes their ST account marker, updates Cosmos.
router.post("/:id/reject", requireRole("admin"), async (req: SessionRequest, res) => {
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
      status:     "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    res.json({ status: "OK", message: "Doctor application rejected." });
  } catch (err) {
    console.error("Reject doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
