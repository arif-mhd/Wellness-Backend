import { Router, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { v4 as uuidv4 } from "uuid";
import { supportContainer, patientsContainer, doctorsContainer } from "../config/cosmos";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function requireRole(req: SessionRequest, res: Response, role: string): Promise<boolean> {
  const session = req.session!;
  const { roles } = await UserRoles.getRolesForUser("public", session.getUserId());
  if (!roles.includes(role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

async function getPatientName(patientId: string): Promise<string> {
  try {
    const { resource } = await patientsContainer.item(patientId, patientId).read();
    console.log(`[support] getPatientName(${patientId}) →`, resource?.fullName, resource?.id);
    return resource?.fullName || "Unknown Patient";
  } catch (err) {
    console.error(`[support] getPatientName(${patientId}) error:`, err);
    return "Unknown Patient";
  }
}

async function getDoctorName(doctorId: string): Promise<string> {
  try {
    const { resource } = await doctorsContainer.item(doctorId, doctorId).read();
    console.log(`[support] getDoctorName(${doctorId}) →`, resource?.fullName, resource?.id);
    return resource?.fullName || "Unknown Doctor";
  } catch (err) {
    console.error(`[support] getDoctorName(${doctorId}) error:`, err);
    return "Unknown Doctor";
  }
}

// ── Patient routes ────────────────────────────────────────────────────────────

// POST /api/support — patient or doctor creates a ticket
router.post("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const session = req.session!;
  const userId = session.getUserId();
  const { subject, description, category, role } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: "subject and description are required" });
  }

  const submitterRole = role === "doctor" ? "doctor" : "patient";

  const ticket = {
    id: uuidv4(),
    patientId: userId,
    submitterRole,
    subject,
    description,
    category: category || "other",
    status: "Open",
    adminReply: null as string | null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await supportContainer.items.create(ticket);
  return res.status(201).json(ticket);
});

// GET /api/support — patient gets their tickets
router.get("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const session = req.session!;
  const patientId = session.getUserId();

  const { resources } = await supportContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@patientId", value: patientId }] as any[],
    })
    .fetchAll();

  return res.json(resources);
});

// GET /api/support/:ticketId — patient gets a single ticket
router.get("/:ticketId", verifySession(), async (req: SessionRequest, res: Response) => {
  const session = req.session!;
  const patientId = session.getUserId();
  const { ticketId } = req.params;

  const { resources } = await supportContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @patientId",
      parameters: [
        { name: "@id", value: ticketId },
        { name: "@patientId", value: patientId },
      ] as any[],
    })
    .fetchAll();

  if (!resources[0]) return res.status(404).json({ error: "Ticket not found" });
  return res.json(resources[0]);
});

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/support/admin/all — admin gets all tickets
router.get("/admin/all", verifySession(), async (req: SessionRequest, res: Response) => {
  if (!(await requireRole(req, res, "admin"))) return;

  const { status, category, submitterRole } = req.query;
  let query = "SELECT * FROM c";
  const params: any[] = [];
  const conditions: string[] = [];

  if (status) {
    conditions.push("c.status = @status");
    params.push({ name: "@status", value: status });
  }
  if (category) {
    conditions.push("c.category = @category");
    params.push({ name: "@category", value: category });
  }
  if (submitterRole) {
    conditions.push("c.submitterRole = @submitterRole");
    params.push({ name: "@submitterRole", value: submitterRole });
  }
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY c.createdAt DESC";

  const { resources } = await supportContainer.items
    .query({ query, parameters: params })
    .fetchAll();

  // Enrich with submitter name
  const enriched = await Promise.all(
    resources.map(async (t: any) => {
      const isDoctor = t.submitterRole === "doctor";
      const submitterName = isDoctor
        ? await getDoctorName(t.patientId)
        : await getPatientName(t.patientId);
      return { ...t, patientName: submitterName, submitterName };
    })
  );

  return res.json(enriched);
});

// GET /api/support/admin/:ticketId — admin gets a single ticket
router.get("/admin/:ticketId", verifySession(), async (req: SessionRequest, res: Response) => {
  if (!(await requireRole(req, res, "admin"))) return;

  const { ticketId } = req.params;
  const { resources } = await supportContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: ticketId }] as any[],
    })
    .fetchAll();

  if (!resources[0]) return res.status(404).json({ error: "Ticket not found" });

  const ticket = resources[0] as any;
  const isDoctor = ticket.submitterRole === "doctor";
  const submitterName = isDoctor ? await getDoctorName(ticket.patientId) : await getPatientName(ticket.patientId);
  ticket.patientName = submitterName;
  ticket.submitterName = submitterName;
  return res.json(ticket);
});

// PATCH /api/support/admin/:ticketId/reply — admin adds reply
router.patch("/admin/:ticketId/reply", verifySession(), async (req: SessionRequest, res: Response) => {
  if (!(await requireRole(req, res, "admin"))) return;

  const { ticketId } = req.params;
  const { reply } = req.body;

  if (!reply) return res.status(400).json({ error: "reply is required" });

  const { resources } = await supportContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: ticketId }] as any[],
    })
    .fetchAll();

  if (!resources[0]) return res.status(404).json({ error: "Ticket not found" });

  const ticket = resources[0] as any;
  ticket.adminReply = reply;
  ticket.updatedAt = new Date().toISOString();

  await supportContainer.items.upsert(ticket);
  return res.json(ticket);
});

// PATCH /api/support/admin/:ticketId/status — admin changes status
router.patch("/admin/:ticketId/status", verifySession(), async (req: SessionRequest, res: Response) => {
  if (!(await requireRole(req, res, "admin"))) return;

  const { ticketId } = req.params;
  const { status } = req.body;

  const validStatuses = ["Open", "In Progress", "Closed"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "status must be Open, In Progress, or Closed" });
  }

  const { resources } = await supportContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: ticketId }] as any[],
    })
    .fetchAll();

  if (!resources[0]) return res.status(404).json({ error: "Ticket not found" });

  const ticket = resources[0] as any;
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  await supportContainer.items.upsert(ticket);
  return res.json(ticket);
});

export default router;
