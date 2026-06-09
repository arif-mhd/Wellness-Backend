import { Router, Request, Response } from "express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { doctorsContainer, appointmentsContainer, queryDocuments } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";

const router = Router();

// ─── POST /api/doctors/register ─────────────────────────────────────────────
// Public endpoint — called by the doctor portal signup flow (step 4).
// Creates the SuperTokens account, assigns the "doctor_pending" role,
// and saves the full registration profile to Cosmos with status "pending_approval".
// The doctor CANNOT log in to the dashboard until an admin approves them.
router.post("/register", async (req: Request, res: Response) => {
  const {
    email,
    password,
    fullName,
    phone,
    dateOfBirth,
    gender,
    emiratesId,
  } = req.body;

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!email || !password || !fullName || !phone) {
    res.status(400).json({
      error: "email, password, fullName and phone are required.",
    });
    return;
  }

  try {
    // ── 1. Create SuperTokens account ─────────────────────────────────────
    // We call the Node SDK directly (bypassing the signUpPOST override that
    // expects extra form fields like "name" and "role").
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: "Registration failed. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;

    // ── 2. Assign "doctor_pending" role ───────────────────────────────────
    // This role blocks dashboard access. It is upgraded to "doctor" on approval.
    await UserRoles.addRoleToUser("public", supertokensId, "doctor_pending");

    // ── 3. Save registration details to Cosmos ────────────────────────────
    const now = new Date().toISOString();
    const doctorDoc = {
      id:             supertokensId,   // Cosmos id = ST userId
      supertokens_id: supertokensId,
      status:         "pending_approval",
      email,
      fullName,
      phone,
      dateOfBirth:    dateOfBirth  || null,
      gender:         gender       || null,
      emiratesId:     emiratesId   || null,
      // Fields filled in after onboarding
      specialty:      null,
      license:        null,
      bio:            null,
      fees:           null,
      languages:      null,
      // Timestamps
      registeredAt:   now,
      approvedAt:     null,
      approvedBy:     null,
    };

    await doctorsContainer.items.upsert(doctorDoc);

    res.status(201).json({ status: "OK", message: "Registration submitted successfully." });
  } catch (err) {
    console.error("Doctor registration error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/doctors/slots ──────────────────────────────────────────────────
// Doctor sets their weekly availability. Slots shape:
// [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMins: 30, isActive: true }]
router.put("/slots", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { slots } = req.body;

  if (!Array.isArray(slots)) {
    res.status(400).json({ error: "slots must be an array." });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }

    const updated = { ...doctor, slots, updatedAt: new Date().toISOString() };
    await doctorsContainer.items.upsert(updated);

    res.json({ status: "OK", slots });
  } catch (err) {
    console.error("Set slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/:id/slots ──────────────────────────────────────────────
router.get("/:id/slots", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();
    if (!doctor || doctor.status !== "approved") {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }
    res.json({ slots: doctor.slots ?? [] });
  } catch (err) {
    console.error("Get slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/:id/available-slots?date=YYYY-MM-DD ───────────────────
// Returns the list of available time strings (HH:MM) for a specific date,
// excluding slots already booked for that doctor.
router.get("/:id/available-slots", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date query param required (YYYY-MM-DD)" });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();
    if (!doctor || doctor.status !== "approved") {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    const slots: any[] = doctor.slots ?? [];
    const dayOfWeek = new Date(date + "T12:00:00Z").getUTCDay();
    const daySlot   = slots.find((s: any) => s.dayOfWeek === dayOfWeek && s.isActive)
                   ?? { startTime: "09:00", endTime: "19:00", slotDurationMins: 30 };

    // Generate all time slots for this day
    const duration = daySlot.slotDurationMins ?? 30;
    const [startH, startM] = daySlot.startTime.split(":").map(Number);
    const [endH,   endM]   = daySlot.endTime.split(":").map(Number);
    let cursor = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const intervals: string[] = [];

    while (cursor + duration <= endMinutes) {
      const h = Math.floor(cursor / 60).toString().padStart(2, "0");
      const m = (cursor % 60).toString().padStart(2, "0");
      intervals.push(`${h}:${m}`);
      cursor += duration;
    }

    // Find booked slots for this date
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd   = `${date}T23:59:59.999Z`;

    const booked = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.scheduledAt FROM c
              WHERE c.doctorId = @doctorId
                AND c.scheduledAt >= @dayStart
                AND c.scheduledAt <= @dayEnd
                AND c.status != 'cancelled'`,
      parameters: [
        { name: "@doctorId", value: id },
        { name: "@dayStart", value: dayStart },
        { name: "@dayEnd",   value: dayEnd },
      ],
    });

    const bookedSet = new Set(
      booked.map((b: any) => {
        const d = new Date(b.scheduledAt);
        return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
      })
    );

    const available = intervals.filter((t) => !bookedSet.has(t));
    res.json({ available, slotDurationMins: duration });
  } catch (err) {
    console.error("Available slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors ───────────────────────────────────────────────────────
// Public or Patient endpoint to list all approved doctors.
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { resources } = await doctorsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.approvedAt DESC",
        parameters: [{ name: "@status", value: "approved" }],
      })
      .fetchAll();

    res.json({ doctors: resources });
  } catch (err) {
    console.error("Fetch approved doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
