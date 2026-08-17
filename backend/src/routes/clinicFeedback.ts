import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { doctorsContainer, feedbackContainer, queryDocuments } from "../config/cosmos";
import { resolveClinicScope, scopeToClinicIds, buildInClause, getActorClinicIds, ClinicScope } from "../utils/clinicScope";

const router = Router();

// ─── GET /api/clinics/feedback ───────────────────────────────────────────────
// Patient ratings/reviews left for any doctor on this clinic's roster (or a
// single branch's roster, via ?branchId=) — powers the Analytics page's
// "Patient Ratings" panel. Feedback docs store the doctor as `provider.id`,
// not clinicId, so this fans out from the doctor roster rather than a single
// flat query.
// Extracted so GET /api/clinics/analytics (in clinics.ts, gated by the
// view_analytics permission) can reuse this without duplicating it — this
// route itself stays open to every staff member, same as before.
export async function getClinicFeedbackData(scope: ClinicScope) {
  const clinicIds = scopeToClinicIds(scope);

  let doctorIds: string[] = [];
  if (clinicIds.length > 0) {
    const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
    const doctors = await queryDocuments<any>(doctorsContainer, {
      query: `SELECT c.id FROM c WHERE ${clause}`,
      parameters,
    });
    doctorIds = doctors.map((d) => d.id);
  }

  if (doctorIds.length === 0) {
    return { reviews: [], avgRating: 0, total: 0 };
  }

  const { clause, parameters } = buildInClause("c.provider.id", doctorIds);
  const reviews = await queryDocuments<any>(feedbackContainer, {
    query: `SELECT * FROM c WHERE c.folder = 'appointment' AND ${clause} ORDER BY c.createdAt DESC`,
    parameters,
  });

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length) * 10) / 10
    : 0;

  return { reviews, avgRating, total: reviews.length };
}

router.get("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  try {
    res.json(await getClinicFeedbackData(scope));
  } catch (err) {
    console.error("Fetch clinic feedback error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/feedback/:id/reply ───────────────────────────────────
// Clinic's public reply to a patient review. Ownership is checked against
// every clinic id the caller can act as (getActorClinicIds), same aggregate-
// safe pattern as verify-slots/absence-status — the Feedbacks page lists
// reviews across every branch's doctors at once, so replying to one outside
// whichever branch happens to be selected in the URL must not 404/400.
router.patch("/:id/reply", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const actorId = req.session!.getUserId();
  const { reply } = req.body;

  if (typeof reply !== "string" || !reply.trim()) {
    res.status(400).json({ error: "reply is required." });
    return;
  }

  try {
    const { resource: feedback } = await feedbackContainer
      .item(req.params.id, req.params.id)
      .read()
      .catch(() => ({ resource: undefined as any }));
    if (!feedback) { res.status(404).json({ error: "Review not found." }); return; }

    const allowedClinicIds = await getActorClinicIds(actorId);
    const { resource: doctor } = await doctorsContainer
      .item(feedback.provider?.id, feedback.provider?.id)
      .read()
      .catch(() => ({ resource: undefined as any }));
    if (!doctor || !allowedClinicIds.includes(doctor.clinicId)) {
      res.status(404).json({ error: "Review not found." });
      return;
    }

    const updated = {
      ...feedback,
      clinicReply: {
        text: reply.trim(),
        repliedAt: new Date().toISOString(),
        repliedBy: actorId,
      },
    };
    await feedbackContainer.items.upsert(updated);

    res.json({ review: updated });
  } catch (err) {
    console.error("Reply to feedback error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
