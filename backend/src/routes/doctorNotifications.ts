import { Router, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import {
  adminNotificationsContainer,
  appointmentsContainer,
  messagesContainer,
  supportContainer,
  doctorsContainer,
  patientsContainer,
  queryDocuments,
} from "../config/cosmos";

const router = Router();

type DoctorNotificationType =
  | "appointment_booked"
  | "patient_waiting"
  | "new_message"
  | "support_reply"
  | "doctor_approved"
  | "doctor_rejected"
  | "slots_verified";

interface DoctorNotification {
  id: string;
  doctorId: string;
  type: DoctorNotificationType;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

// Reuses the same adminNotifications container — doctor notifications are
// distinguished by a doctorId field and namespaced ids, so the two sets never
// collide even though they share storage.
async function buildNotificationsForDoctor(doctorId: string): Promise<DoctorNotification[]> {
  const [scheduledAppointments, waitingAppointments, doctorDoc] = await Promise.all([
    queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.id, c.patientId, c.scheduledAt, c.reason, c.createdAt FROM c WHERE c.doctorId = @doctorId AND c.status = 'scheduled'",
      parameters: [{ name: "@doctorId", value: doctorId }],
    }),
    queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.id, c.patientId, c.patientWaitingSince FROM c WHERE c.doctorId = @doctorId AND c.patientWaitingSince != null AND c.status != 'completed' AND c.status != 'cancelled'",
      parameters: [{ name: "@doctorId", value: doctorId }],
    }),
    doctorsContainer.item(doctorId, doctorId).read().then((r) => r.resource).catch(() => null),
  ]);

  // Message docs don't carry a standalone doctorId field — conversationId is
  // the deterministic "chat:{patientId}:{doctorId}", so match on its suffix.
  const allUnreadMessages = await queryDocuments<any>(messagesContainer, {
    query: "SELECT c.id, c.conversationId, c.patientId, c.text, c.createdAt FROM c WHERE c.senderRole = 'patient' AND c.isRead = false",
    parameters: [],
  });
  const unreadMessages = allUnreadMessages.filter(
    (m) => typeof m.conversationId === "string" && m.conversationId.endsWith(`:${doctorId}`)
  );

  const ownTickets = await queryDocuments<any>(supportContainer, {
    query: "SELECT c.id, c.subject, c.comments FROM c WHERE c.patientId = @doctorId AND c.submitterRole = 'doctor'",
    parameters: [{ name: "@doctorId", value: doctorId }],
  });

  const patientIds = Array.from(new Set([
    ...scheduledAppointments.map((a) => a.patientId),
    ...waitingAppointments.map((a) => a.patientId),
    ...unreadMessages.map((m) => m.patientId),
  ].filter(Boolean)));

  const patientNames: Record<string, string> = {};
  await Promise.all(patientIds.map(async (pid) => {
    try {
      const { resource: p } = await patientsContainer.item(pid, pid).read();
      patientNames[pid] = p?.fullName ?? "A patient";
    } catch {
      patientNames[pid] = "A patient";
    }
  }));

  const notifications: DoctorNotification[] = [];

  for (const a of scheduledAppointments) {
    notifications.push({
      id: `appointment_booked:${a.id}`,
      doctorId,
      type: "appointment_booked",
      title: "New appointment booked",
      body: `${patientNames[a.patientId] ?? "A patient"} booked a consultation${a.scheduledAt ? ` on ${new Date(a.scheduledAt).toLocaleString()}` : ""}${a.reason ? ` — ${a.reason}` : ""}`,
      link: `/appointments`,
      isRead: false,
      createdAt: a.createdAt ?? new Date(0).toISOString(),
    });
  }

  for (const a of waitingAppointments) {
    notifications.push({
      id: `patient_waiting:${a.id}:${a.patientWaitingSince}`,
      doctorId,
      type: "patient_waiting",
      title: "Patient is waiting",
      body: `${patientNames[a.patientId] ?? "A patient"} is in the waiting room`,
      link: `/appointments/waitingroom`,
      isRead: false,
      createdAt: a.patientWaitingSince ?? new Date().toISOString(),
    });
  }

  for (const m of unreadMessages) {
    notifications.push({
      id: `new_message:${m.id}`,
      doctorId,
      type: "new_message",
      title: `New message from ${patientNames[m.patientId] ?? "a patient"}`,
      body: String(m.text ?? "").slice(0, 100),
      link: `/dashboard/messages`,
      isRead: false,
      createdAt: m.createdAt ?? new Date(0).toISOString(),
    });
  }

  for (const t of ownTickets) {
    const comments: any[] = Array.isArray(t.comments) ? t.comments : [];
    const lastAdminComment = [...comments].reverse().find((c) => c.authorRole === "admin");
    if (lastAdminComment) {
      notifications.push({
        id: `support_reply:${t.id}:${lastAdminComment.id}`,
        doctorId,
        type: "support_reply",
        title: `Reply on your ticket: ${t.subject ?? "Support ticket"}`,
        body: String(lastAdminComment.message ?? "").slice(0, 100),
        link: `/dashboard/help`,
        isRead: false,
        createdAt: lastAdminComment.createdAt ?? new Date(0).toISOString(),
      });
    }
  }

  if (doctorDoc) {
    if (doctorDoc.status === "approved" && doctorDoc.approvedAt) {
      notifications.push({
        id: `doctor_approved:${doctorId}`,
        doctorId,
        type: "doctor_approved",
        title: "Your application was approved",
        body: "Your doctor profile is now live — patients can book appointments with you.",
        link: `/dashboard/profile`,
        isRead: false,
        createdAt: doctorDoc.approvedAt,
      });
    }
    if (doctorDoc.status === "rejected" && doctorDoc.rejectedAt) {
      notifications.push({
        id: `doctor_rejected:${doctorId}`,
        doctorId,
        type: "doctor_rejected",
        title: "Your application was not approved",
        body: doctorDoc.rejectedReason ? String(doctorDoc.rejectedReason).slice(0, 100) : "Please contact support for more information.",
        link: `/dashboard/profile`,
        isRead: false,
        createdAt: doctorDoc.rejectedAt,
      });
    }
    if (doctorDoc.slotsVerifiedAt) {
      notifications.push({
        id: `slots_verified:${doctorId}:${doctorDoc.slotsVerifiedAt}`,
        doctorId,
        type: "slots_verified",
        title: "Availability changes verified",
        body: "Your updated weekly availability has been verified and is now live.",
        link: `/dashboard/profile`,
        isRead: false,
        createdAt: doctorDoc.slotsVerifiedAt,
      });
    }
  }

  return notifications;
}

async function syncNotificationsForDoctor(doctorId: string): Promise<void> {
  const derived = await buildNotificationsForDoctor(doctorId);
  const existing = await queryDocuments<any>(adminNotificationsContainer, {
    query: "SELECT c.id FROM c WHERE c.doctorId = @doctorId",
    parameters: [{ name: "@doctorId", value: doctorId }],
  });
  const existingIds = new Set(existing.map((e) => e.id));

  const toCreate = derived.filter((n) => !existingIds.has(n.id));
  await Promise.all(toCreate.map((n) => adminNotificationsContainer.items.create(n).catch(() => {})));
}

// ─── GET /api/doctors/notifications ─────────────────────────────────────────
router.get("/", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    await syncNotificationsForDoctor(doctorId);

    const { resources } = await adminNotificationsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.doctorId = @doctorId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@doctorId", value: doctorId }],
      })
      .fetchAll();

    res.json({ notifications: resources });
  } catch (err) {
    console.error("Doctor notifications fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/doctors/notifications/:id/read ──────────────────────────────
router.patch("/:id/read", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id } = req.params;
  try {
    const { resource: doc } = await adminNotificationsContainer.item(id, id).read();
    if (!doc || doc.doctorId !== doctorId) { res.status(404).json({ error: "Notification not found." }); return; }

    doc.isRead = true;
    await adminNotificationsContainer.item(id, id).replace(doc);

    res.json({ notification: doc });
  } catch (err) {
    console.error("Mark doctor notification read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/doctors/notifications/read-all ──────────────────────────────
router.patch("/read-all", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resources } = await adminNotificationsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.doctorId = @doctorId AND c.isRead = false",
        parameters: [{ name: "@doctorId", value: doctorId }],
      })
      .fetchAll();

    await Promise.all(
      resources.map((doc: any) => {
        doc.isRead = true;
        return adminNotificationsContainer.item(doc.id, doc.id).replace(doc).catch(() => {});
      })
    );

    res.json({ updated: resources.length });
  } catch (err) {
    console.error("Mark all doctor notifications read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
