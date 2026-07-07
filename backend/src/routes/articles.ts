import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { articlesContainer } from "../config/cosmos";

const router = Router();
router.use(requireRole("patient"));

// GET /api/articles — returns all non-flagged articles
// Optional query: ?category=Wellness
router.get("/", async (req: SessionRequest, res: Response) => {
  try {
    const { category } = req.query;
    let query = "SELECT * FROM c WHERE c.flagged = false";
    const params: { name: string; value: any }[] = [];

    if (category && category !== "All") {
      query += " AND c.category = @category";
      params.push({ name: "@category", value: category });
    }
    query += " ORDER BY c.createdAt DESC";

    const { resources } = await articlesContainer.items
      .query({ query, parameters: params })
      .fetchAll();

    res.json({ articles: resources });
  } catch (err) {
    console.error("[articles patient] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/articles/:id — single article
router.get("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await articlesContainer.item(id, id).read();
    if (!resource || resource.flagged) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({ article: resource });
  } catch (err: any) {
    if (err.code === 404) { res.status(404).json({ error: "Article not found" }); return; }
    console.error("[articles patient] get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
