import { Router, Request, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { AccessToken, RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";
import {
  appointmentsContainer,
  patientsContainer,
  doctorsContainer,
  queryDocuments,
} from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { logActivity } from "../utils/activityLogger";

function makeLivekitToken(userId: string, room: string): { token: Promise<string>; wsUrl: string } {
  const apiKey    = process.env.LIVEKIT_API_KEY    || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000";
  const wsUrl     = process.env.LIVEKIT_WS_URL_DOCTOR || process.env.LIVEKIT_WS_URL || "ws://localhost:7880";
  const at = new AccessToken(apiKey, apiSecret, { identity: userId, ttl: 2 * 60 * 60 });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });
  return { token: at.toJwt(), wsUrl };
}

async function sendLivekitData(room: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const apiKey    = process.env.LIVEKIT_API_KEY    || "devkey";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000";
    const wsUrl     = process.env.LIVEKIT_WS_URL_DOCTOR || process.env.LIVEKIT_WS_URL || "ws://localhost:7880";
    const httpUrl   = wsUrl.replace(/^wss?:\/\//, "https://");
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const data = Buffer.from(JSON.stringify(payload));
    await svc.sendData(room, data, DataPacket_Kind.RELIABLE);
  } catch (err) {
    console.error("[sendLivekitData] Failed:", err);
  }
}

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

    // Log activity (best-effort)
    const patientDoc = await patientsContainer.item(patientId, patientId).read().then(r => r.resource).catch(() => null);
    logActivity({
      source: "patient",
      action: "Appointment Scheduled",
      details: `Patient ${patientDoc?.fullName ?? patientId} booked with Dr. ${doctor.fullName ?? doctorId} — ${reason}`,
      performedBy: patientDoc?.fullName ?? "Patient",
      performedById: patientId,
      entityType: "appointment",
      entityId: id,
    });

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
          
          // Format chronic illnesses/diseases
          const chronicIllnesses = Array.isArray(patient?.chronicDiseases) 
            ? patient.chronicDiseases.join(", ") 
            : (patient?.chronicDiseases || "None reported");

          // Format current medications
          let currentMedications = "None";
          if (patient?.medications?.current) {
            currentMedications = Array.isArray(patient.medications.current)
              ? patient.medications.current.map((m: any) => typeof m === "string" ? m : `${m.name || ""} ${m.dosage || ""}`.trim()).join("\n")
              : String(patient.medications.current);
          }

          // Format allergies
          let allergies = "None";
          if (patient?.allergies) {
            allergies = Array.isArray(patient.allergies)
              ? patient.allergies.map((a: any) => {
                  if (typeof a === "string") return a;
                  const category = a.category ?? "";
                  const selected = Array.isArray(a.selected) ? a.selected.join(", ") : (a.selected ?? "");
                  return `${category}: ${selected}`.trim();
                }).join("\n")
              : String(patient.allergies);
          }

          return {
            ...apt,
            patientName: patient?.fullName ?? "Unknown Patient",
            patientEmail: patient?.email ?? "",
            patientPhone: patient?.phone ?? "",
            patientGender: patient?.gender ?? "",
            patientDob: patient?.dateOfBirth ?? patient?.dob ?? "",
            patientAvatarUrl: patient?.avatarUrl ?? null,
            patientBloodGroup: patient?.bloodGroup ?? "",
            patientHeight: patient?.height ?? "",
            patientWeight: patient?.weight ?? "",
            patientChronicIllnesses: chronicIllnesses,
            patientCurrentMedications: currentMedications,
            patientAllergies: allergies,
          };
        } catch {
          return {
            ...apt,
            patientName: "Unknown Patient",
            patientEmail: "",
            patientPhone: "",
            patientGender: "",
            patientDob: "",
            patientAvatarUrl: null,
            patientBloodGroup: "",
            patientHeight: "",
            patientWeight: "",
            patientChronicIllnesses: "None reported",
            patientCurrentMedications: "None",
            patientAllergies: "None",
          };
        }
      })
    );

    res.json({ appointments: enriched });
  } catch (err) {
    console.error("Fetch doctor appointments error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/my-invite ────────────────────────────────────────
// Specialist (doctor) polls this to check if they have a pending invitation.
router.get("/my-invite", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const specialistId = req.session!.getUserId();
  try {
    // Find appointments where this doctor is invited, patient accepted, and specialist hasn't joined yet
    const results = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT * FROM c WHERE c.specialistInvite.doctorId = @sid AND c.specialistInvite.status = 'pending' AND c.specialistInvite.patientDecision = 'accepted'`,
      parameters: [{ name: "@sid", value: specialistId }],
    });
    if (results.length === 0) {
      res.json({ invite: null });
      return;
    }
    const apt = results[0];
    // Enrich with primary doctor info
    let primaryDoctorName = "Doctor";
    let primaryDoctorEmail = "";
    let primaryDoctorAvatar = null;
    let patientName = "Patient";
    let patientEmail = "";
    let patientAvatar = null;
    try {
      const { resource: doc } = await doctorsContainer.item(apt.doctorId, apt.doctorId).read();
      primaryDoctorName  = doc?.fullName ?? primaryDoctorName;
      primaryDoctorEmail = doc?.email    ?? primaryDoctorEmail;
      primaryDoctorAvatar = doc?.avatarUrl ?? null;
    } catch {}
    try {
      const { resource: pat } = await patientsContainer.item(apt.patientId, apt.patientId).read();
      patientName  = pat?.fullName ?? patientName;
      patientEmail = pat?.email    ?? patientEmail;
      patientAvatar = pat?.avatarUrl ?? null;
    } catch {}
    res.json({
      invite: {
        appointmentId: apt.id,
        primaryDoctorName,
        primaryDoctorEmail,
        primaryDoctorAvatar,
        patientName,
        patientEmail,
        patientAvatar,
        invitedAt: apt.specialistInvite.invitedAt,
      },
    });
  } catch (err) {
    console.error("my-invite error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/available-doctors ─────────────────────────────
// Doctor fetches available (not in an active call) approved doctors to add as specialist.
router.get("/:id/available-doctors", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const callingDoctorId = req.session!.getUserId();
  const { id } = req.params;
  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== callingDoctorId) { res.status(403).json({ error: "Not authorized." }); return; }

    // Fetch all approved doctors
    const { resources: allDoctors } = await doctorsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "approved" }],
      })
      .fetchAll();

    // Find doctors currently in an active call
    const busyResults = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.doctorId FROM c WHERE c.status = 'in_progress'",
      parameters: [],
    });
    const busyIds = new Set(busyResults.map((r: any) => r.doctorId));

    const available = allDoctors
      .filter((d: any) => d.id !== callingDoctorId && !busyIds.has(d.id))
      .map((d: any) => ({
        id:        d.id,
        fullName:  d.fullName,
        specialty: d.specialty ?? "General",
        avatarUrl: d.avatarUrl ?? null,
        email:     d.email,
        isOnline:  true, // All approved, non-busy doctors are considered available
        rating:    d.rating ?? 5,
        fees:      d.fees ?? null,
      }));

    res.json({ doctors: available });
  } catch (err) {
    console.error("available-doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/appointments/:id/invite-specialist ────────────────────────────
// Doctor invites a specialist to join the current call.
// Generates a LiveKit token for the specialist and stores the invite on the appointment.
router.post("/:id/invite-specialist", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const callingDoctorId = req.session!.getUserId();
  const { id } = req.params;
  const { specialistDoctorId } = req.body;
  if (!specialistDoctorId) {
    res.status(400).json({ error: "specialistDoctorId is required." }); return;
  }
  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== callingDoctorId) { res.status(403).json({ error: "Not authorized." }); return; }

    // Verify specialist is a real approved doctor
    const { resource: specialist } = await doctorsContainer.item(specialistDoctorId, specialistDoctorId).read();
    if (!specialist || specialist.status !== "approved") {
      res.status(404).json({ error: "Specialist not found or not approved." }); return;
    }

    const { token, wsUrl } = makeLivekitToken(specialistDoctorId, apt.livekitRoom);
    const resolvedToken = await token;

    // Store the invite on the appointment document
    const updated = {
      ...apt,
      specialistInvite: {
        doctorId:  specialistDoctorId,
        token:     resolvedToken,
        wsUrl,
        status:    "pending",
        invitedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);

    // Notify the patient inside the LiveKit room so the consent modal appears
    await sendLivekitData(apt.livekitRoom, {
      type: "specialist_invite",
      specialistName: specialist.fullName,
      specialistAvatarUrl: specialist.avatarUrl ?? null,
      fee: specialist.fees ? `AED ${specialist.fees}` : "AED 200",
    });

    res.json({
      status: "OK",
      specialistName: specialist.fullName,
      specialistEmail: specialist.email,
      specialistAvatar: specialist.avatarUrl ?? null,
      fees: specialist.fees ?? null,
    });
  } catch (err) {
    console.error("invite-specialist error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/specialist-join ───────────────────────────────
// Specialist doctor calls this to get a fresh LiveKit token and join the room.
router.get("/:id/specialist-join", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const specialistId = req.session!.getUserId();
  const { id } = req.params;
  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (!apt.specialistInvite || apt.specialistInvite.doctorId !== specialistId) {
      res.status(403).json({ error: "No invite found for this specialist." }); return;
    }
    // Mark invite as accepted on the appointment document
    const updated = {
      ...apt,
      specialistInvite: { ...apt.specialistInvite, status: "accepted", acceptedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);
    // Generate a fresh token using the same wsUrl the primary doctor uses
    const { token, wsUrl } = makeLivekitToken(specialistId, apt.livekitRoom);
    res.json({ token: await token, wsUrl, room: apt.livekitRoom });
  } catch (err) {
    console.error("specialist-join error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/appointments/:id/specialist-respond ───────────────────────────
// Patient accepts or declines the specialist invite.
router.post("/:id/specialist-respond", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { id } = req.params;
  const { decision } = req.body; // "accepted" | "declined"
  if (decision !== "accepted" && decision !== "declined") {
    res.status(400).json({ error: "decision must be 'accepted' or 'declined'." }); return;
  }
  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.patientId !== patientId) { res.status(403).json({ error: "Not authorized." }); return; }
    if (!apt.specialistInvite) { res.status(400).json({ error: "No specialist invite on this appointment." }); return; }

    const updated = {
      ...apt,
      specialistInvite: {
        ...apt.specialistInvite,
        patientDecision: decision,
        patientDecidedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);
    res.json({ ok: true });
  } catch (err) {
    console.error("specialist-respond error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/specialist-status ─────────────────────────────
// Primary doctor polls this to know if patient accepted/declined the invite.
router.get("/:id/specialist-status", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id } = req.params;
  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== doctorId) { res.status(403).json({ error: "Not authorized." }); return; }
    const invite = apt.specialistInvite ?? null;
    res.json({
      patientDecision: invite?.patientDecision ?? null,
      inviteStatus: invite?.status ?? null,
    });
  } catch (err) {
    console.error("specialist-status error:", err);
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

    // Determine who cancelled (patient vs doctor) for the log
    const isDoctor = apt.doctorId === userId;
    logActivity({
      source: isDoctor ? "doctor" : "patient",
      action: "Appointment Cancelled",
      details: `Appointment ${id} cancelled`,
      performedBy: isDoctor ? "Doctor" : "Patient",
      performedById: userId,
      entityType: "appointment",
      entityId: id,
    });

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

    if (status === "completed") {
      const docDoc = await doctorsContainer.item(doctorId, doctorId).read().then(r => r.resource).catch(() => null);
      logActivity({
        source: "doctor",
        action: "Appointment Completed",
        details: `Dr. ${docDoc?.fullName ?? doctorId} completed appointment ${id}`,
        performedBy: docDoc?.fullName ?? "Doctor",
        performedById: doctorId,
        entityType: "appointment",
        entityId: id,
      });
    }

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
