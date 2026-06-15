import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { activityLogsContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// GET /api/admin/activity-logs?source=&page=&limit=&from=&to=
router.get("/", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  try {
    const source  = (req.query.source  as string) || "";
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(100, parseInt(req.query.limit as string) || 20);
    const from    = (req.query.from as string) || "";   // ISO date string
    const to      = (req.query.to   as string) || "";

    const conditions: string[] = [];
    const params: { name: string; value: any }[] = [];

    if (source) {
      conditions.push("c.source = @source");
      params.push({ name: "@source", value: source });
    }
    if (from) {
      conditions.push("c.timestamp >= @from");
      params.push({ name: "@from", value: from });
    }
    if (to) {
      conditions.push("c.timestamp <= @to");
      params.push({ name: "@to", value: to });
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countQuery = `SELECT VALUE COUNT(1) FROM c ${where}`;
    const { resources: countRes } = await activityLogsContainer.items
      .query({ query: countQuery, parameters: params })
      .fetchAll();
    const total: number = countRes[0] ?? 0;

    // Fetch page (newest first)
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM c ${where} ORDER BY c.timestamp DESC OFFSET ${offset} LIMIT ${limit}`;
    const { resources: logs } = await activityLogsContainer.items
      .query({ query: dataQuery, parameters: params })
      .fetchAll();

    res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET /api/admin/activity-logs error:", err);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

export default router;
