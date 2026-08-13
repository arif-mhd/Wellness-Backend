import { Router, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { notificationsContainer } from "../config/cosmos";

const router = Router();

// GET /api/notifications?limit=20&offset=0
// Retrieves notifications for the current user (patient), newest first,
// paginated — the app shows a page at a time with a "view older" action
// that bumps the offset, rather than ever fetching a patient's full history
// in one call.
router.get("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const unreadOnly = req.query.unread_only === "true";
  const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const rawOffset = parseInt(req.query.offset as string, 10);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  try {
    let query = "SELECT * FROM c WHERE c.patientId = @patientId";
    const parameters = [{ name: "@patientId", value: patientId }];

    if (unreadOnly) {
      query += " AND c.isRead = false";
    }
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }

    // Fetch one extra row past the page size so we can tell the client
    // whether a further "view older" page actually exists, without a
    // separate COUNT query.
    query += " ORDER BY c.sentAt DESC OFFSET @offset LIMIT @fetchLimit";
    parameters.push({ name: "@offset", value: offset as any }, { name: "@fetchLimit", value: (limit + 1) as any });

    const { resources } = await notificationsContainer.items
      .query({ query, parameters })
      .fetchAll();

    const hasMore = resources.length > limit;
    const page = hasMore ? resources.slice(0, limit) : resources;

    const mapped = page.map((doc: any) => ({
      id: doc.id,
      user_id: doc.patientId,
      profile_id: doc.profileId ?? doc.patientId,
      title: doc.title,
      body: doc.body,
      type: doc.type,
      reference_id: doc.referenceId,
      is_read: doc.isRead,
      sent_at: doc.sentAt,
    }));

    res.json({ notifications: mapped, hasMore });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// PATCH /api/notifications/:id/read
// Marks a specific notification as read.
router.patch("/:id/read", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { id } = req.params;

  try {
    const { resources } = await notificationsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @patientId",
        parameters: [
          { name: "@id", value: id },
          { name: "@patientId", value: patientId },
        ],
      })
      .fetchAll();

    if (resources.length === 0) {
      res.status(404).json({ error: "Notification not found." });
      return;
    }

    const doc = resources[0];
    doc.isRead = true;
    doc.updatedAt = new Date().toISOString();

    await notificationsContainer.items.upsert(doc);

    res.json({
      id: doc.id,
      user_id: doc.patientId,
      title: doc.title,
      body: doc.body,
      type: doc.type,
      reference_id: doc.referenceId,
      is_read: doc.isRead,
      sent_at: doc.sentAt,
    });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// PATCH /api/notifications/read-all
// Marks all notifications for a patient as read.
router.patch("/read-all", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();

  try {
    const { resources } = await notificationsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.patientId = @patientId AND c.isRead = false",
        parameters: [{ name: "@patientId", value: patientId }],
      })
      .fetchAll();

    for (const doc of resources) {
      doc.isRead = true;
      doc.updatedAt = new Date().toISOString();
      await notificationsContainer.items.upsert(doc);
    }

    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
