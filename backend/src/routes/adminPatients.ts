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

// ── GET /api/admin/patients/:patientId ──────────────────────────────────────
router.get("/:patientId", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { resources } = await patientsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: patientId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json({ patient: resources[0] });
  } catch (err) {
    console.error("Admin patient fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
