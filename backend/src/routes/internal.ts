import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import {
  appointmentsContainer,
  patientsContainer,
  doctorsContainer,
  notificationsContainer,
} from "../config/cosmos";
import { sendPushToUser } from "../utils/pushNotifications";

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

export default router;
