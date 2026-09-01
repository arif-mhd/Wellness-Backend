import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { appointmentsContainer } from "../config/cosmos";
import { generateShortLivedSasUrl } from "../config/blob";

const router = Router();
router.use(requireRole("admin"));

// ─── GET /api/admin/appointments/:id/recording ───────────────────────────────
// Platform-admin equivalent of GET /api/clinics/appointments/:id/recording —
// no ownership scoping beyond the "admin" role itself, since a wellness admin
// is authorized to review any appointment on the platform. Returns a
// short-lived (1hr) playback URL for the call recording plus the saved
// transcript, if either exist.
router.get("/:id/recording", async (req: SessionRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }

    res.json({
      recordingUrl: apt.recordingBlobPath ? generateShortLivedSasUrl(apt.recordingBlobPath) : null,
      transcript: apt.transcript ?? [],
    });
  } catch (err) {
    console.error("Fetch admin appointment recording error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
