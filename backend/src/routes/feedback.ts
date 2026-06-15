import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { feedbackContainer } from "../config/cosmos";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { requireRole } from "../middleware/requireRole";

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

// POST /api/feedback — submit feedback (publicly accessible by patient app)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { folder, rating, comment, reviewer, provider } = req.body;

    if (!folder || rating === undefined) {
      return res.status(400).json({ error: "folder and rating are required" });
    }

    const feedbackId = uuidv4();
    const feedbackDoc = {
      id: feedbackId,
      folder,
      rating: Number(rating),
      comment: comment || "",
      reviewer: {
        id: reviewer?.id || "anonymous",
        name: reviewer?.name || "Anonymous Patient",
        email: reviewer?.email || "anonymous@example.com",
        avatar: reviewer?.avatar || (reviewer?.name ? reviewer.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "AP")
      },
      provider: {
        id: provider?.id || "unknown",
        name: provider?.name || "Unknown Provider",
        email: provider?.email || "provider@example.com",
        avatar: provider?.avatar || (provider?.name ? provider.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "UP")
      },
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };

    await feedbackContainer.items.create(feedbackDoc);
    return res.status(201).json(feedbackDoc);
  } catch (err: any) {
    console.error("Error creating feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/admin — retrieve all feedback (requires admin role)
async function requireAdmin(req: SessionRequest, res: Response): Promise<boolean> {
  const session = req.session;
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const { roles } = await UserRoles.getRolesForUser("public", session.getUserId());
  if (!roles.includes("admin")) {
    res.status(403).json({ error: "Forbidden: Requires Admin role" });
    return false;
  }
  return true;
}

router.get("/admin", verifySession(), async (req: SessionRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

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
