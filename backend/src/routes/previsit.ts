import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { appointmentsContainer } from "../config/cosmos";
import {
  listTemplates, matchTemplate, generateQuestionsForReason,
} from "../utils/previsitTemplates";

const router = Router();

// ─── GET /api/previsit/form ──────────────────────────────────────────────────
// The questions for a patient's pre-visit form, chosen from the reason they
// gave when booking. Pass ?appointmentId= (preferred — the reason is read from
// the appointment, which must be the caller's own) or ?reason= for a form
// opened before an appointment exists.
//
//   source "template" — matched an admin template by keyword
//   source "ai"       — no template matched; questions generated for this reason
//   source "default"  — nothing matched and no AI available; the general form
router.get("/form", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    let reason = typeof req.query.reason === "string" ? req.query.reason : "";

    const appointmentId = typeof req.query.appointmentId === "string" ? req.query.appointmentId : "";
    if (appointmentId) {
      const { resource: apt } = await appointmentsContainer.item(appointmentId, appointmentId).read();
      if (!apt || apt.patientId !== patientId) {
        res.status(404).json({ error: "Appointment not found." });
        return;
      }
      reason = apt.reason ?? reason;
    }
    reason = reason.trim().slice(0, 300);

    const templates = await listTemplates();
    const fallback = templates.find((t) => t.isDefault && t.is_active) ?? templates.find((t) => t.isDefault) ?? null;

    const matched = matchTemplate(reason, templates);
    if (matched) {
      res.json({ source: "template", templateId: matched.id, templateName: matched.name, reason, questions: matched.questions });
      return;
    }

    const generated = reason ? await generateQuestionsForReason(reason) : null;
    if (generated) {
      res.json({ source: "ai", templateId: null, templateName: "Tailored to your visit", reason, questions: generated });
      return;
    }

    if (!fallback) {
      res.status(503).json({ error: "No pre-visit form is available right now." });
      return;
    }
    res.json({ source: "default", templateId: fallback.id, templateName: fallback.name, reason, questions: fallback.questions });
  } catch (err) {
    console.error("Pre-visit form error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
