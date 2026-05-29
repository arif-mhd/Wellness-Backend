import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { patientsContainer } from "../config/cosmos";

const router = Router();

// ── GET /api/admin/patients ──────────────────────────────────────────────────
// Returns all patients in the Cosmos patients collection, newest first.
// Requires "admin" role.
router.get("/", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await patientsContainer.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();

    res.json({ patients: resources });
  } catch (err) {
    console.error("Admin patients fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
