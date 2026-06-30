import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { feedbackContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { logActivity } from "../utils/activityLogger";

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

// GET /api/feedback/pharmacy/stats — retrieve feedback stats for currently logged-in pharmacy
router.get("/pharmacy/stats", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resources } = await feedbackContainer.items
      .query({
        query: "SELECT c.rating, c.createdAt FROM c WHERE c.provider.id = @pharmacyId AND c.folder = 'pharmacy'",
        parameters: [{ name: "@pharmacyId", value: pharmacyId }]
      })
      .fetchAll();

    if (resources.length === 0) {
      return res.json({ averageRating: 0, totalReviews: 0, history: [] });
    }

    const totalReviews = resources.length;
    const sum = resources.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const averageRating = Number((sum / totalReviews).toFixed(1));

    // Group ratings by month (YYYY-MM) for trends
    const trendsMap: Record<string, { sum: number, count: number }> = {};
    resources.forEach((r) => {
      if (!r.createdAt) return;
      const monthKey = new Date(r.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!trendsMap[monthKey]) trendsMap[monthKey] = { sum: 0, count: 0 };
      trendsMap[monthKey].sum += (r.rating || 0);
      trendsMap[monthKey].count += 1;
    });

    const history = Object.keys(trendsMap).sort().map(key => ({
      month: key,
      average: Number((trendsMap[key].sum / trendsMap[key].count).toFixed(1))
    }));

    return res.json({ averageRating, totalReviews, history });
  } catch (err: any) {
    console.error("Error fetching pharmacy feedback stats:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/pharmacy — retrieve feedback for currently logged-in pharmacy
router.get("/pharmacy", requireRole("pharmacy"), async (req: SessionRequest, res: Response) => {
  try {
    const pharmacyId = req.session!.getUserId();
    const { resources } = await feedbackContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.provider.id = @pharmacyId AND c.folder = 'pharmacy' ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pharmacyId", value: pharmacyId }]
      })
      .fetchAll();

    return res.json(resources);
  } catch (err: any) {
    console.error("Error fetching pharmacy feedback:", err);
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

    logActivity({
      source: "patient",
      action: "Feedback Submitted",
      details: `${feedbackDoc.reviewer.name} rated ${feedbackDoc.provider.name} — ${rating}/5${comment ? `: ${String(comment).slice(0, 80)}` : ""}`,
      performedBy: feedbackDoc.reviewer.name,
      performedById: feedbackDoc.reviewer.id,
      entityType: "feedback",
      entityId: feedbackId,
    });

    return res.status(201).json(feedbackDoc);
  } catch (err: any) {
    console.error("Error creating feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/admin — retrieve all feedback (requires admin role)
router.get("/admin", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  try {
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
