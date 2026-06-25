import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import {
  adminNotificationsContainer,
  doctorsContainer,
  pharmaciesContainer,
  pharmacyProductsContainer,
  supportContainer,
  sosCodesContainer,
  feedbackContainer,
  queryDocuments,
} from "../config/cosmos";

const router = Router();

type NotificationType =
  | "doctor_approval"
  | "pharmacy_approval"
  | "product_approval"
  | "support_ticket"
  | "support_reply"
  | "slot_change"
  | "sos_emergency"
  | "low_rating";

interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

// Builds the full, current set of notifications from live source data across
// the platform. Each notification has a deterministic id derived from the
// source event, so re-running this never creates duplicates — it only adds
// new ones. Read state is preserved because existing docs are never
// overwritten; only the rare "comments/text changed" tail-events overwrite.
async function buildNotificationsFromSources(): Promise<AdminNotification[]> {
  const [pendingDoctors, pendingPharmacies, pendingProducts, openTickets, pendingSlotChanges, sosCodes, lowRatings] =
    await Promise.all([
      queryDocuments<any>(doctorsContainer, {
        query: "SELECT c.id, c.fullName, c.email, c.specialty, c.registeredAt FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "pending_approval" }],
      }),
      queryDocuments<any>(pharmaciesContainer, {
        query: "SELECT c.id, c.pharmacyName, c.ownerName, c.email, c.registeredAt FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "pending_approval" }],
      }),
      queryDocuments<any>(pharmacyProductsContainer, {
        query: "SELECT c.id, c.name, c.pharmacyId, c.pharmacyName, c.createdAt FROM c WHERE c.status = 'pending_approval'",
        parameters: [],
      }),
      queryDocuments<any>(supportContainer, {
        query: "SELECT c.id, c.subject, c.description, c.submitterRole, c.category, c.createdAt, c.comments FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "Open" }],
      }),
      queryDocuments<any>(doctorsContainer, {
        query: "SELECT c.id, c.fullName, c.email, c.specialty, c.updatedAt FROM c WHERE c.slotsPending = true",
        parameters: [],
      }),
      queryDocuments<any>(sosCodesContainer, {
        query: "SELECT * FROM c ORDER BY c.createdAt DESC",
        parameters: [],
      }),
      queryDocuments<any>(feedbackContainer, {
        query: "SELECT * FROM c WHERE c.rating <= 2 ORDER BY c.createdAt DESC",
        parameters: [],
      }),
    ]);

  const notifications: AdminNotification[] = [];

  for (const d of pendingDoctors) {
    notifications.push({
      id: `doctor_approval:${d.id}`,
      type: "doctor_approval",
      title: `New doctor application: ${d.fullName ?? "Unknown"}`,
      body: `${d.specialty ?? "Specialty pending"} — awaiting onboarding approval`,
      link: `/dashboard/doctors?id=${d.id}`,
      isRead: false,
      createdAt: d.registeredAt ?? new Date(0).toISOString(),
    });
  }

  for (const p of pendingPharmacies) {
    notifications.push({
      id: `pharmacy_approval:${p.id}`,
      type: "pharmacy_approval",
      title: `New pharmacy application: ${p.pharmacyName ?? "Unknown"}`,
      body: `Owner: ${p.ownerName ?? "Unknown"} — awaiting onboarding approval`,
      link: `/dashboard/pharmacy?id=${p.id}`,
      isRead: false,
      createdAt: p.registeredAt ?? new Date(0).toISOString(),
    });
  }

  for (const pr of pendingProducts) {
    notifications.push({
      id: `product_approval:${pr.id}`,
      type: "product_approval",
      title: `New product awaiting approval`,
      body: `${pr.pharmacyName ?? "A pharmacy"} submitted "${pr.name ?? "a product"}" for approval`,
      link: `/dashboard/pharmacy/${pr.pharmacyId}/product/${pr.id}`,
      isRead: false,
      createdAt: pr.createdAt ?? new Date(0).toISOString(),
    });
  }

  for (const t of openTickets) {
    notifications.push({
      id: `support_ticket:${t.id}`,
      type: "support_ticket",
      title: `New Ticket created: ${t.subject ?? "Support ticket"}`,
      body: `${t.submitterRole === "doctor" ? "Doctor" : "Patient"} request — ${(t.description ?? "").slice(0, 100)}`,
      link: `/dashboard/support?id=${t.id}`,
      isRead: false,
      createdAt: t.createdAt ?? new Date(0).toISOString(),
    });

    // A reply from the submitter (not the admin's own comment) on an already-open
    // ticket is a distinct, separately-trackable notification.
    const comments: any[] = Array.isArray(t.comments) ? t.comments : [];
    const lastSubmitterComment = [...comments].reverse().find((c) => c.authorRole !== "admin");
    if (lastSubmitterComment) {
      notifications.push({
        id: `support_reply:${t.id}:${lastSubmitterComment.id}`,
        type: "support_reply",
        title: `New reply on ticket: ${t.subject ?? "Support ticket"}`,
        body: String(lastSubmitterComment.message ?? "").slice(0, 100),
        link: `/dashboard/support?id=${t.id}`,
        isRead: false,
        createdAt: lastSubmitterComment.createdAt ?? t.createdAt ?? new Date(0).toISOString(),
      });
    }
  }

  for (const d of pendingSlotChanges) {
    notifications.push({
      id: `slot_change:${d.id}`,
      type: "slot_change",
      title: `Task to complete: Availability update`,
      body: `${d.fullName ?? "A doctor"} updated their weekly availability — awaiting verification`,
      link: `/dashboard/doctors?id=${d.id}`,
      isRead: false,
      createdAt: d.updatedAt ?? new Date(0).toISOString(),
    });
  }

  for (const s of sosCodes) {
    notifications.push({
      id: `sos_emergency:${s.id}`,
      type: "sos_emergency",
      title: `SOS Emergency triggered`,
      body: `A patient generated an emergency access code at ${new Date(s.createdAt).toLocaleString()}`,
      link: `/dashboard/emergencies`,
      isRead: false,
      createdAt: s.createdAt ?? new Date(0).toISOString(),
    });
  }

  for (const f of lowRatings) {
    notifications.push({
      id: `low_rating:${f.id}`,
      type: "low_rating",
      title: `Low rating received`,
      body: `${f.reviewer?.name ?? "A patient"} rated ${f.provider?.name ?? "a provider"} ${f.rating}/5${f.comment ? `: ${String(f.comment).slice(0, 80)}` : ""}`,
      link: `/dashboard/feedback`,
      isRead: false,
      createdAt: f.createdAt ?? new Date(0).toISOString(),
    });
  }

  return notifications;
}

// Syncs freshly-derived notifications into the persisted container — only
// inserts ids that don't already exist, so read/unread state already saved
// for an existing notification is never clobbered.
async function syncNotifications(): Promise<void> {
  const derived = await buildNotificationsFromSources();
  const existing = await queryDocuments<any>(adminNotificationsContainer, {
    query: "SELECT c.id FROM c",
    parameters: [],
  });
  const existingIds = new Set(existing.map((e) => e.id));

  const toCreate = derived.filter((n) => !existingIds.has(n.id));
  await Promise.all(toCreate.map((n) => adminNotificationsContainer.items.create(n).catch(() => {})));
}

// ─── GET /api/admin/notifications ───────────────────────────────────────────
// Syncs in any new notifications from live source data, then returns the
// full persisted list (newest first) so read/unread state is preserved.
router.get("/", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    await syncNotifications();

    const { resources } = await adminNotificationsContainer.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();

    res.json({ notifications: resources });
  } catch (err) {
    console.error("Admin notifications fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/admin/notifications/:id/read ────────────────────────────────
router.patch("/:id/read", requireRole("admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { resource: doc } = await adminNotificationsContainer.item(id, id).read();
    if (!doc) { res.status(404).json({ error: "Notification not found." }); return; }

    doc.isRead = true;
    await adminNotificationsContainer.item(id, id).replace(doc);

    res.json({ notification: doc });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/admin/notifications/read-all ────────────────────────────────
router.patch("/read-all", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await adminNotificationsContainer.items
      .query("SELECT * FROM c WHERE c.isRead = false")
      .fetchAll();

    await Promise.all(
      resources.map((doc: any) => {
        doc.isRead = true;
        return adminNotificationsContainer.item(doc.id, doc.id).replace(doc).catch(() => {});
      })
    );

    res.json({ updated: resources.length });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
