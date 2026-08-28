import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import {
  appointmentsContainer,
  patientsContainer,
  doctorsContainer,
  notificationsContainer,
} from "../config/cosmos";
import { sendPushToUser } from "../utils/pushNotifications";
import { autoExpireStaleAppointments } from "../utils/appointmentSweep";
import { deepgramCodeForLanguage } from "../utils/languages";

const router = Router();

// Same "the stored ISO string is actually wall-clock local time, not true
// UTC" convention used throughout appointments.ts (see its own parseLocalTime)
// — reused verbatim so this sweep's "minutes until" math agrees with every
// other "Consultation in Xh Ym" style label already shown across the app.
function parseLocalTime(isoString: string): Date {
  if (!isoString) return new Date();
  const clean = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
  return new Date(clean);
}

// Minutes-before-appointment windows, each paired with the boolean flag that
// ensures a stage fires at most once per appointment. Windows are a couple
// of minutes wide (rather than an exact instant) so a missed Cloud Scheduler
// tick doesn't skip a reminder outright — the flag still guarantees the
// patient never gets the same stage twice.
const STAGES: { field: "reminder30Sent" | "reminder10Sent"; minMins: number; maxMins: number; label: string }[] = [
  { field: "reminder30Sent", minMins: 29, maxMins: 31, label: "30 minutes" },
  { field: "reminder10Sent", minMins: 9, maxMins: 11, label: "10 minutes" },
];

// POST /api/internal/appointment-reminders/sweep
// Triggered by Google Cloud Scheduler roughly once a minute — not a logged-in
// user, so it's guarded by a shared secret header instead of verifySession().
router.post("/appointment-reminders/sweep", async (req: Request, res: Response) => {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    res.status(500).json({ error: "INTERNAL_CRON_SECRET not configured" });
    return;
  }
  if (req.headers["x-internal-secret"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const { resources: appointments } = await appointmentsContainer.items
      .query({ query: "SELECT * FROM c WHERE c.status = 'scheduled'" })
      .fetchAll();

    let sent = 0;
    for (const apt of appointments as any[]) {
      const minutesUntil = (parseLocalTime(apt.scheduledAt).getTime() - Date.now()) / 60000;

      for (const stage of STAGES) {
        if (apt[stage.field]) continue;
        if (minutesUntil < stage.minMins || minutesUntil > stage.maxMins) continue;

        let doctorName = "your doctor";
        try {
          const { resource: doc } = await doctorsContainer.item(apt.doctorId, apt.doctorId).read();
          if (doc?.fullName) doctorName = `Dr. ${doc.fullName}`;
        } catch { /* keep default */ }

        // Appointments booked for a family member get the member's name in
        // the message so the account holder isn't told "you" have an
        // appointment that's actually for someone else on their account.
        let subjectText = "You have";
        if (apt.familyMemberId) {
          try {
            const { resource: patient } = await patientsContainer.item(apt.patientId, apt.patientId).read();
            const member = patient?.familyMembers?.find((m: any) => m.id === apt.familyMemberId);
            if (member?.fullName) subjectText = `${member.fullName} has`;
          } catch { /* keep default */ }
        }

        const title = "Upcoming Appointment";
        const body = `${subjectText} an appointment with ${doctorName} in ${stage.label}.`;
        const now = new Date().toISOString();

        const notification = {
          id: "notif_" + Date.now().toString(36) + "_" + randomBytes(3).toString("hex"),
          patientId: apt.patientId,
          profileId: apt.familyMemberId ?? apt.patientId,
          title,
          body,
          type: "appointment_reminder",
          referenceId: apt.id,
          isRead: false,
          sentAt: now,
        };
        await notificationsContainer.items.create(notification);
        await sendPushToUser(apt.patientId, title, body, { type: notification.type, referenceId: apt.id });

        apt[stage.field] = true;
        apt.updatedAt = now;
        await appointmentsContainer.items.upsert(apt);
        sent++;
      }
    }

    res.json({ status: "OK", checked: appointments.length, sent });
  } catch (err) {
    console.error("[appointment-reminders] sweep failed:", err);
    res.status(500).json({ error: "Sweep failed" });
  }
});

// POST /api/internal/appointments/expire-stale
// Proactively runs the same auto-expire logic that GET /api/appointments
// (and its clinic/doctor equivalents) already run lazily on every read — this
// just does it ahead of time on a schedule (e.g. hourly via Cloud Scheduler)
// so those read paths almost never find anything left to expire, instead of
// writing to Cosmos as a side effect of a GET request. Purely additive: the
// lazy per-request check stays in place as a safety net for anything this
// sweep missed between runs.
router.post("/appointments/expire-stale", async (req: Request, res: Response) => {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    res.status(500).json({ error: "INTERNAL_CRON_SECRET not configured" });
    return;
  }
  if (req.headers["x-internal-secret"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const { resources: candidates } = await appointmentsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = 'scheduled' OR c.status = 'in_progress'",
      })
      .fetchAll();

    const checked = candidates.length;
    await autoExpireStaleAppointments(candidates as any[]);
    const expired = candidates.filter((apt: any) => apt.status === "cancelled").length;

    res.json({ status: "OK", checked, expired });
  } catch (err) {
    console.error("[appointments/expire-stale] sweep failed:", err);
    res.status(500).json({ error: "Sweep failed" });
  }
});

// GET /api/internal/appointments/:id/language
// Called by the live-transcript agent worker right after it joins a call's
// room (the room name is the appointment id — see livekitRoom in
// appointments.ts) to find out which language, if any, the patient asked
// this doctor to consult in, so the STT session can be configured for it
// instead of guessing/auto-detecting.
router.get("/appointments/:id/language", async (req: Request, res: Response) => {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    res.status(500).json({ error: "INTERNAL_CRON_SECRET not configured" });
    return;
  }
  if (req.headers["x-internal-secret"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const { resource: apt } = await appointmentsContainer.item(req.params.id, req.params.id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    // consultationLanguage is what the DOCTOR was booked to speak — only
    // ever applies to the doctor's own audio track. The patient (or family
    // member the appointment is actually for) speaks their own language
    // regardless of what the doctor was asked to speak, so each side of the
    // call needs its own STT language rather than one shared value.
    let patientLanguage: string | null = null;
    const { resource: account } = await patientsContainer.item(apt.patientId, apt.patientId).read();
    if (apt.familyMemberId) {
      const member = (account?.familyMembers as any[] | undefined)?.find((m) => m.id === apt.familyMemberId);
      patientLanguage = member?.language ?? null;
    } else {
      patientLanguage = account?.language ?? null;
    }

    res.json({
      doctorId: apt.doctorId,
      patientId: apt.patientId,
      consultationLanguage: apt.consultationLanguage ?? null,
      doctorDeepgramLanguageCode: deepgramCodeForLanguage(apt.consultationLanguage),
      patientLanguage,
      patientDeepgramLanguageCode: deepgramCodeForLanguage(patientLanguage),
    });
  } catch (err) {
    console.error("[appointments/:id/language] failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/internal/appointments/:id/transcript
// Called by the live-transcript agent worker once a call ends, with the full
// buffered transcript for that consultation.
router.post("/appointments/:id/transcript", async (req: Request, res: Response) => {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    res.status(500).json({ error: "INTERNAL_CRON_SECRET not configured" });
    return;
  }
  if (req.headers["x-internal-secret"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { transcript } = req.body;
  if (!Array.isArray(transcript)) {
    res.status(400).json({ error: "transcript must be an array" });
    return;
  }

  try {
    const { resource: apt } = await appointmentsContainer.item(req.params.id, req.params.id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    await appointmentsContainer.items.upsert({
      ...apt,
      transcript,
      transcriptSavedAt: new Date().toISOString(),
    });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("[appointments/:id/transcript] failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
