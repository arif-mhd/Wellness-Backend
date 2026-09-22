import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { feedbackContainer, appointmentsContainer, doctorsContainer, patientsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// GET /api/feedback/doctor — retrieve feedback for currently logged-in doctor
router.get("/doctor", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    const { resources } = await feedbackContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.provider.id = @doctorId AND c.folder = 'appointment' ORDER BY c.createdAt DESC",
        parameters: [{ name: "@doctorId", value: doctorId }]
      })
      .fetchAll();

    return res.json(resources);
  } catch (err: any) {
    console.error("Error fetching doctor feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/pharmacy/stats — retrieve feedback stats for currently logged-in pharmacy
router.get("/pharmacy/stats", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resources } = await feedbackContainer.items
      .query({
        query: "SELECT c.rating, c.createdAt FROM c WHERE c.provider.id = @pharmacyId AND c.folder = 'pharmacy'",
        parameters: [{ name: "@pharmacyId", value: pharmacyId }]
      })
      .fetchAll();

    if (resources.length === 0) {
      return res.json({ averageRating: 0, totalReviews: 0, history: [] });
    }

    const totalReviews = resources.length;
    const sum = resources.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const averageRating = Number((sum / totalReviews).toFixed(1));

    // Group ratings by month (YYYY-MM) for trends
    const trendsMap: Record<string, { sum: number, count: number }> = {};
    resources.forEach((r) => {
      if (!r.createdAt) return;
      const monthKey = new Date(r.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!trendsMap[monthKey]) trendsMap[monthKey] = { sum: 0, count: 0 };
      trendsMap[monthKey].sum += (r.rating || 0);
      trendsMap[monthKey].count += 1;
    });

    const history = Object.keys(trendsMap).sort().map(key => ({
      month: key,
      average: Number((trendsMap[key].sum / trendsMap[key].count).toFixed(1))
    }));

    return res.json({ averageRating, totalReviews, history });
  } catch (err: any) {
    console.error("Error fetching pharmacy feedback stats:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/pharmacy — retrieve feedback for currently logged-in pharmacy
router.get("/pharmacy", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resources } = await feedbackContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.provider.id = @pharmacyId AND c.folder = 'pharmacy' ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pharmacyId", value: pharmacyId }]
      })
      .fetchAll();

    return res.json(resources);
  } catch (err: any) {
    console.error("Error fetching pharmacy feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "P";
}

// POST /api/feedback — submit feedback. Requires a logged-in patient; reviewer
// identity always comes from the session (never the request body), so no one
// can post feedback as another patient. Consultation feedback (folder ===
// "appointment") additionally requires the appointmentId it's rating, checks
// the caller actually owns that appointment and it's completed, and is
// written under a deterministic id derived from that appointmentId — Cosmos
// rejects a duplicate create() (409), which enforces "one feedback per
// appointment" atomically even under concurrent submissions, the same
// slot-lock pattern used for double-booking prevention in appointments.ts.
router.post("/", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { folder, rating, comment } = req.body;

    if (!folder || rating === undefined) {
      return res.status(400).json({ error: "folder and rating are required" });
    }
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "rating must be a number between 1 and 5" });
    }
    const trimmedComment = typeof comment === "string" ? comment.slice(0, 2000) : "";

    const patientDoc = await patientsContainer.item(patientId, patientId).read().then(r => r.resource).catch(() => null);
    const reviewer = {
      id: patientId,
      name: patientDoc?.fullName || "Patient",
      email: patientDoc?.email || "",
      avatar: initials(patientDoc?.fullName || "Patient"),
    };

    if (folder === "appointment") {
      const { appointmentId } = req.body;
      if (!appointmentId || typeof appointmentId !== "string") {
        return res.status(400).json({ error: "appointmentId is required for appointment feedback." });
      }

      const appointment = await appointmentsContainer.item(appointmentId, appointmentId).read().then(r => r.resource).catch(() => null);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found." });
      }
      if (appointment.patientId !== patientId) {
        return res.status(403).json({ error: "You can only give feedback for your own appointments." });
      }
      if (appointment.status !== "completed") {
        return res.status(400).json({ error: "You can only give feedback once the consultation is completed." });
      }

      const doctor = await doctorsContainer.item(appointment.doctorId, appointment.doctorId).read().then(r => r.resource).catch(() => null);
      const feedbackId = `appointment-feedback-${appointmentId}`;
      const feedbackDoc = {
        id: feedbackId,
        folder: "appointment",
        appointmentId,
        rating: numericRating,
        comment: trimmedComment,
        reviewer,
        provider: {
          id: appointment.doctorId,
          name: doctor?.fullName || "Doctor",
          email: doctor?.email || "",
          avatar: doctor?.avatarUrl || initials(doctor?.fullName || "Doctor"),
        },
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      };

      try {
        await feedbackContainer.items.create(feedbackDoc);
      } catch (err: any) {
        if (err?.code === 409) {
          return res.status(409).json({ error: "You've already submitted feedback for this appointment." });
        }
        throw err;
      }

      logActivity({
        source: "patient",
        action: "Feedback Submitted",
        details: `${reviewer.name} rated ${feedbackDoc.provider.name} — ${numericRating}/5${trimmedComment ? `: ${trimmedComment.slice(0, 80)}` : ""}`,
        performedBy: reviewer.name,
        performedById: patientId,
        entityType: "feedback",
        entityId: feedbackId,
      });

      return res.status(201).json(feedbackDoc);
    }

    // Other feedback folders (e.g. "pharmacy") aren't tied to a specific
    // appointment — reviewer identity is still always server-resolved above,
    // just without the per-appointment ownership/dedupe checks.
    const { provider } = req.body;
    const feedbackId = uuidv4();
    const feedbackDoc = {
      id: feedbackId,
      folder,
      rating: numericRating,
      comment: trimmedComment,
      reviewer,
      provider: {
        id: provider?.id || "unknown",
        name: provider?.name || "Unknown Provider",
        email: provider?.email || "provider@example.com",
        avatar: provider?.avatar || initials(provider?.name || "Unknown Provider"),
      },
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    await feedbackContainer.items.create(feedbackDoc);

    logActivity({
      source: "patient",
      action: "Feedback Submitted",
      details: `${reviewer.name} rated ${feedbackDoc.provider.name} — ${numericRating}/5${trimmedComment ? `: ${trimmedComment.slice(0, 80)}` : ""}`,
      performedBy: reviewer.name,
      performedById: patientId,
      entityType: "feedback",
      entityId: feedbackId,
    });

    return res.status(201).json(feedbackDoc);
  } catch (err: any) {
    console.error("Error creating feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/admin — retrieve all feedback (requires admin role)
router.get("/admin", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  try {
    const { folder } = req.query;
    let query = "SELECT * FROM c";
    const params: any[] = [];

    if (folder) {
      query += " WHERE c.folder = @folder";
      params.push({ name: "@folder", value: folder });
    }
    query += " ORDER BY c.createdAt DESC";

    const { resources } = await feedbackContainer.items
      .query({ query, parameters: params })
      .fetchAll();

    return res.json(resources);
  } catch (err: any) {
    console.error("Error fetching feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
