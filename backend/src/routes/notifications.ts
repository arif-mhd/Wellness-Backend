import { Router, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { notificationsContainer } from "../config/cosmos";

const router = Router();

// GET /api/notifications
// Retrieves notifications for the current user (patient).
router.get("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = (req.query.user_id as string) || req.session!.getUserId();
  const unreadOnly = req.query.unread_only === "true";

  try {
    let query = "SELECT * FROM c WHERE c.patientId = @patientId";
    const parameters = [{ name: "@patientId", value: patientId }];

    if (unreadOnly) {
      query += " AND c.isRead = false";
    }

    query += " ORDER BY c.sentAt DESC";

    const { resources } = await notificationsContainer.items
      .query({ query, parameters })
      .fetchAll();

    const mapped = resources.map((doc: any) => ({
      id: doc.id,
      user_id: doc.patientId,
      title: doc.title,
      body: doc.body,
      type: doc.type,
      reference_id: doc.referenceId,
      is_read: doc.isRead,
      sent_at: doc.sentAt,
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// PATCH /api/notifications/:id/read
// Marks a specific notification as read.
router.patch("/:id/read", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = (req.query.user_id as string) || req.session!.getUserId();
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
  const patientId = (req.query.user_id as string) || req.session!.getUserId();

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
