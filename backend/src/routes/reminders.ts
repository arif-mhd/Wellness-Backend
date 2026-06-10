import { Router, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { v4 as uuidv4 } from "uuid";
import { remindersContainer } from "../config/cosmos";

const router = Router();

// GET /api/reminders — patient gets their reminders
router.get("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();

  const { resources } = await remindersContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@patientId", value: patientId }] as any[],
    })
    .fetchAll();

  return res.json(resources);
});

// POST /api/reminders — patient creates a reminder
router.post("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { name, dose, time, repeatDays } = req.body;

  if (!name || !time) {
    return res.status(400).json({ error: "name and time are required" });
  }

  const reminder = {
    id: uuidv4(),
    patientId,
    name,
    dose: dose || "",
    time,
    repeatDays: repeatDays || [],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  await remindersContainer.items.create(reminder);
  return res.status(201).json(reminder);
});

// PATCH /api/reminders/:reminderId — update reminder
router.patch("/:reminderId", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { reminderId } = req.params;

  const { resources } = await remindersContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @patientId",
      parameters: [
        { name: "@id", value: reminderId },
        { name: "@patientId", value: patientId },
      ] as any[],
    })
    .fetchAll();

  if (!resources[0]) return res.status(404).json({ error: "Reminder not found" });

  const reminder = { ...resources[0], ...req.body, id: reminderId, patientId };
  await remindersContainer.items.upsert(reminder);
  return res.json(reminder);
});

// DELETE /api/reminders/:reminderId — delete reminder
router.delete("/:reminderId", verifySession(), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { reminderId } = req.params;

  const { resources } = await remindersContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @patientId",
      parameters: [
        { name: "@id", value: reminderId },
        { name: "@patientId", value: patientId },
      ] as any[],
    })
    .fetchAll();

  if (!resources[0]) return res.status(404).json({ error: "Reminder not found" });

  const doc = resources[0] as any;
  await remindersContainer.item(doc.id, doc.patientId).delete();
  return res.json({ success: true });
});

export default router;
