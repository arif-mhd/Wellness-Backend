import { Router, Request, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { AccessToken } from "livekit-server-sdk";
import {
  appointmentsContainer,
  patientsContainer,
  doctorsContainer,
  queryDocuments,
} from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";

const router = Router();

function generateId(): string {
  return `apt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── POST /api/appointments ──────────────────────────────────────────────────
// Patient books an appointment. Payment is mocked — appointment is immediately scheduled.
router.post("/", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { doctorId, scheduledAt, reason, shareMedicalHistory, paymentAmount } = req.body;

  if (!doctorId || !scheduledAt || !reason) {
    res.status(400).json({ error: "doctorId, scheduledAt, and reason are required." });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor || doctor.status !== "approved") {
      res.status(404).json({ error: "Doctor not found or not available." });
      return;
    }

    const id = generateId();
    const now = new Date().toISOString();

    const appointment = {
      id,
      patientId,
      doctorId,
      scheduledAt,
      durationMins: 30,
      reason,
      shareMedicalHistory: !!shareMedicalHistory,
      status: "scheduled",
      paymentStatus: "paid",
      paymentAmount: paymentAmount ?? doctor.fees ?? 250,
      livekitRoom: id,
      createdAt: now,
      updatedAt: now,
    };

    await appointmentsContainer.items.create(appointment);

    res.status(201).json({ status: "OK", appointment });
  } catch (err) {
    console.error("Create appointment error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments ───────────────────────────────────────────────────
// Patient's own appointments list.
router.get("/", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();

  try {
    const appointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@patientId", value: patientId }],
    });

    // Enrich with doctor name
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        try {
          const { resource: doctor } = await doctorsContainer.item(apt.doctorId, apt.doctorId).read();
          return { ...apt, doctorName: doctor?.fullName ?? "Unknown Doctor", doctorSpecialty: doctor?.specialty ?? "", doctorAvatarUrl: doctor?.avatarUrl ?? null };
        } catch {
          return { ...apt, doctorName: "Unknown Doctor", doctorSpecialty: "", doctorAvatarUrl: null };
        }
      })
    );

    res.json({ appointments: enriched });
  } catch (err) {
    console.error("Fetch patient appointments error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/doctor ───────────────────────────────────────────
// Doctor's appointment list — enriched with patient details.
// IMPORTANT: this route must be registered BEFORE /:id routes.
router.get("/doctor", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();

  try {
    const appointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.doctorId = @doctorId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@doctorId", value: doctorId }],
    });

    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        try {
          const { resource: patient } = await patientsContainer.item(apt.patientId, apt.patientId).read();
          return {
            ...apt,
            patientName: patient?.fullName ?? "Unknown Patient",
            patientEmail: patient?.email ?? "",
          };
        } catch {
          return { ...apt, patientName: "Unknown Patient", patientEmail: "" };
        }
      })
    );

    res.json({ appointments: enriched });
  } catch (err) {
    console.error("Fetch doctor appointments error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id ───────────────────────────────────────────────
// Single appointment — accessible by both patient and doctor of that appointment.
router.get("/:id", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { id } = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found." });
      return;
    }
    if (apt.patientId !== userId && apt.doctorId !== userId) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    res.json({ appointment: apt });
  } catch (err) {
    console.error("Fetch appointment error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/appointments/:id/cancel ─────────────────────────────────────
router.patch("/:id/cancel", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { id } = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found." });
      return;
    }
    if (apt.patientId !== userId && apt.doctorId !== userId) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    const updated = { ...apt, status: "cancelled", updatedAt: new Date().toISOString() };
    await appointmentsContainer.items.upsert(updated);

    res.json({ status: "OK", appointment: updated });
  } catch (err) {
    console.error("Cancel appointment error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/appointments/:id/status ─────────────────────────────────────
// Doctor updates appointment status (in_progress, completed).
router.patch("/:id/status", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["scheduled", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found." });
      return;
    }
    if (apt.doctorId !== doctorId) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    const updated = { ...apt, status, updatedAt: new Date().toISOString() };
    await appointmentsContainer.items.upsert(updated);

    res.json({ status: "OK", appointment: updated });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/appointments/:id/emr ─────────────────────────────────────────
// Doctor saves EMR notes, medicines, and lab recommendations for an appointment.
router.post("/:id/emr", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id }   = req.params;
  const { notes, medicines, labs } = req.body;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== doctorId) { res.status(403).json({ error: "Not authorized." }); return; }

    const updated = {
      ...apt,
      emr: { notes: notes ?? "", medicines: medicines ?? [], labs: labs ?? [], savedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Save EMR error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/livekit-token ────────────────────────────────
// Generate a LiveKit room token for either the patient or doctor of an appointment.
router.get("/:id/livekit-token", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { id } = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found." });
      return;
    }

    const isPatient = apt.patientId === userId;
    const isDoctor  = apt.doctorId  === userId;

    if (!isPatient && !isDoctor) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    const apiKey    = process.env.LIVEKIT_API_KEY    || "devkey";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000";
    // Doctors connect from a browser on the same machine → use localhost (avoids Chrome
    // blocking WebRTC from HTTP pages to non-localhost IPs).
    // Patients connect from a physical device on the LAN → use LAN IP.
    const wsUrlDoctor  = process.env.LIVEKIT_WS_URL_DOCTOR  || "ws://localhost:7880";
    const wsUrlPatient = process.env.LIVEKIT_WS_URL_PATIENT || process.env.LIVEKIT_WS_URL || "ws://localhost:7880";
    const wsUrl = isDoctor ? wsUrlDoctor : wsUrlPatient;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      ttl:      2 * 60 * 60, // 2 hours
    });

    at.addGrant({
      roomJoin:       true,
      room:           apt.livekitRoom,
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });

    res.json({ token: await at.toJwt(), wsUrl, room: apt.livekitRoom });
  } catch (err) {
    console.error("LiveKit token error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
