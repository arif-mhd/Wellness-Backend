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

// True if this doctor is either the primary doctor on the appointment, or the
// specialist who was invited — both are allowed to view the
// patient's EHR and contribute to the shared EMR for this encounter.
function isAuthorizedDoctor(apt: any, doctorId: string): boolean {
  if (apt.doctorId === doctorId) return true;
  // If they have an invite, allow them (even if status is pending, as they
  // might be loading EMR concurrently with the join process).
  return apt.specialistInvite?.doctorId === doctorId;
}

function makeLivekitToken(userId: string, room: string, name?: string): { token: Promise<string>; wsUrl: string } {
  const apiKey    = process.env.LIVEKIT_API_KEY    || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000";
  const wsUrl     = process.env.LIVEKIT_WS_URL_DOCTOR || process.env.LIVEKIT_WS_URL || "ws://localhost:7880";
  const at = new AccessToken(apiKey, apiSecret, { identity: userId, name, ttl: 2 * 60 * 60 });
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
  const { doctorId, scheduledAt, reason, shareMedicalHistory, paymentAmount, familyMemberId } = req.body;

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
      familyMemberId: familyMemberId ?? null,
    };

    await appointmentsContainer.items.create(appointment);

    // Log activity (best-effort)
    const patientDoc = await patientsContainer.item(patientId, patientId).read().then(r => r.resource).catch(() => null);
    let displayName = patientDoc?.fullName ?? patientId;
    if (familyMemberId && patientDoc?.familyMembers) {
      const member = patientDoc.familyMembers.find((m: any) => m.id === familyMemberId);
      if (member) displayName = `${member.fullName} (Family Member of ${patientDoc.fullName})`;
    }

    logActivity({
      source: "patient",
      action: "Appointment Scheduled",
      details: `Patient ${displayName} booked with Dr. ${doctor.fullName ?? doctorId} — ${reason}`,
      performedBy: displayName,
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
          
          let patientName = patient?.fullName ?? "Unknown Patient";
          let patientEmail = patient?.email ?? "";
          let patientPhone = patient?.phone ?? "";
          let patientGender = patient?.gender ?? "";
          let patientDob = patient?.dateOfBirth ?? patient?.dob ?? "";
          let patientAvatarUrl = patient?.avatarUrl ?? null;
          let patientBloodGroup = patient?.bloodGroup ?? "";
          let patientHeight = patient?.height ?? "";
          let patientWeight = patient?.weight ?? "";

          // Format chronic illnesses/diseases
          let chronicIllnesses = Array.isArray(patient?.chronicDiseases) 
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

          // Check if appointment is for a family member
          if (apt.familyMemberId && patient?.familyMembers) {
            const member = patient.familyMembers.find((m: any) => m.id === apt.familyMemberId);
            if (member) {
              patientName = member.fullName ?? patientName;
              patientGender = member.gender ?? patientGender;
              patientDob = member.dob ?? member.dateOfBirth ?? patientDob;
              patientAvatarUrl = member.avatarUrl ?? patientAvatarUrl;
              if (member.email) patientEmail = member.email;
              if (member.phone) patientPhone = member.phone;
              if (member.bloodGroup) patientBloodGroup = member.bloodGroup;
              if (member.height) patientHeight = member.height;
              if (member.weight) patientWeight = member.weight;

              chronicIllnesses = Array.isArray(member.chronicDiseases) 
                ? member.chronicDiseases.join(", ") 
                : (member.chronicDiseases || "None reported");

              currentMedications = "None";
              if (member.medications?.current) {
                currentMedications = Array.isArray(member.medications.current)
                  ? member.medications.current.map((m: any) => typeof m === "string" ? m : `${m.name || ""} ${m.dosage || ""}`.trim()).join("\n")
                  : String(member.medications.current);
              }

              allergies = "None";
              if (member.allergies) {
                allergies = Array.isArray(member.allergies)
                  ? member.allergies.map((a: any) => {
                      if (typeof a === "string") return a;
                      const category = a.category ?? "";
                      const selected = Array.isArray(a.selected) ? a.selected.join(", ") : (a.selected ?? "");
                      return `${category}: ${selected}`.trim();
                    }).join("\n")
                  : String(member.allergies);
              }
            }
          }

          return {
            ...apt,
            patientName,
            patientEmail,
            patientPhone,
            patientGender,
            patientDob,
            patientAvatarUrl,
            patientBloodGroup,
            patientHeight,
            patientWeight,
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

// ─── GET /api/appointments/doctor/tasks ─────────────────────────────────────
// Doctor's task list. Like the admin dashboard's task feed, this is derived
// live from appointments — there is no separate "task" record. Two task
// types for now:
//   - upcoming_consultation: scheduled appointment still ahead of now
//   - pending_emr: appointment marked completed but c.emr was never saved
// A task disappears once the underlying appointment moves past it (consult
// happens, or EMR gets saved).
router.get("/doctor/tasks", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();

  try {
    const appointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.doctorId = @doctorId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@doctorId", value: doctorId }],
    });

    const now = Date.now();
    const relevant = appointments.filter(
      (apt) =>
        (apt.status === "scheduled" && new Date(apt.scheduledAt).getTime() >= now) ||
        (apt.status === "completed" && !apt.emr)
    );

    const enriched = await Promise.all(
      relevant.map(async (apt) => {
        let patientName = "Unknown Patient";
        let patientEmail = "";
        let patientAvatarUrl: string | null = null;
        let patientAge: number | null = null;
        try {
          const { resource: patient } = await patientsContainer.item(apt.patientId, apt.patientId).read();
          patientName = patient?.fullName ?? patientName;
          patientEmail = patient?.email ?? "";
          patientAvatarUrl = patient?.avatarUrl ?? null;
          const dob = patient?.dateOfBirth ?? patient?.dob;
          if (dob) {
            const diff = Date.now() - new Date(dob).getTime();
            patientAge = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
          }
        } catch { /* keep defaults */ }

        const isUpcoming = apt.status === "scheduled";

        return {
          id: `appointment:${apt.id}`,
          type: isUpcoming ? "upcoming_consultation" : "pending_emr",
          title: isUpcoming ? "Upcoming Consultation" : "Complete EMR for Consultation",
          summary: isUpcoming
            ? (apt.reason ?? "Consultation")
            : `Consultation completed — EMR notes and prescription still pending`,
          priority: isUpcoming ? "Normal" : "High",
          status: "Pending",
          time: apt.scheduledAt,
          patientName,
          patientEmail,
          patientAvatarUrl,
          patientAge,
          appointmentId: apt.id,
        };
      })
    );

    enriched.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    res.json({
      tasks: enriched,
      counts: {
        upcomingConsultations: enriched.filter((t) => t.type === "upcoming_consultation").length,
        pendingEmr: enriched.filter((t) => t.type === "pending_emr").length,
        total: enriched.length,
      },
    });
  } catch (err) {
    console.error("Fetch doctor tasks error:", err);
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

    const { token, wsUrl } = makeLivekitToken(specialistDoctorId, apt.livekitRoom, specialist.fullName);
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
    const { resource: specialist } = await doctorsContainer.item(specialistId, specialistId).read();
    const { token, wsUrl } = makeLivekitToken(specialistId, apt.livekitRoom, specialist?.fullName);
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

// ─── POST /api/appointments/:id/pre-visit ─────────────────────────────────────
// Patient saves pre-visit questionnaire answers to their appointment document.
// This data is then visible to the doctor in the consultation room.
router.post("/:id/pre-visit", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { id }    = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.patientId !== patientId) { res.status(403).json({ error: "Not authorized." }); return; }

    const {
      primaryReason, symptoms, severity, duration,
      conditions, medications, allergies, additionalNotes, submittedAt,
    } = req.body;

    const updated = {
      ...apt,
      preVisitData: {
        primaryReason:   primaryReason   ?? "",
        symptoms:        symptoms        ?? [],
        severity:        severity        ?? "",
        duration:        duration        ?? "",
        conditions:      conditions      ?? "",
        medications:     medications     ?? "",
        allergies:       allergies       ?? "",
        additionalNotes: additionalNotes ?? "",
        submittedAt:     submittedAt     ?? new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    await appointmentsContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Pre-visit save error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/patient-profile ───────────────────────────────
// Doctor fetches the patient's registered profile for an appointment they own.
// Returns the medically relevant subset of the patient Cosmos document.
router.get("/:id/patient-profile", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id }   = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== doctorId) { res.status(403).json({ error: "Not authorized." }); return; }

    const { resource: patient } = await patientsContainer.item(apt.patientId, apt.patientId).read();
    if (!patient) { res.status(404).json({ error: "Patient profile not found." }); return; }

    // Return medically relevant fields only
    const profile = {
      fullName:       patient.fullName      ?? "",
      email:          patient.email         ?? "",
      phone:          patient.phone         ?? "",
      gender:         patient.gender        ?? "",
      dateOfBirth:    patient.dob           ?? patient.dateOfBirth ?? "",
      bloodGroup:     patient.bloodGroup    ?? "",
      height:         patient.height        ?? "",
      weight:         patient.weight        ?? "",
      emiratesId:     patient.emiratesId    ?? "",
      maritalStatus:  patient.maritalStatus ?? "",
      location:       patient.location      ?? "",
      allergies:      patient.allergies     ?? [],
      medications:    patient.medications   ?? { current: [], past: [] },
      chronicDiseases: patient.chronicDiseases ?? [],
      insurance:      patient.insurance     ?? [],
    };

    res.json({ profile });
  } catch (err) {
    console.error("patient-profile fetch error:", err);
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
// Doctor saves the structured EMR for this single encounter: per-section
// clinical notes, prescribed medicines, and recommended labs. This is the
// encounter-level medical record (EMR) — distinct from the patient's
// longitudinal EHR, which is assembled on read from all past EMRs (see
// GET /:id/ehr below).
//
// IMPORTANT — Shared EMR for multi-doctor consultations:
// Medicines and labs are merged by contributorDoctorId so that the primary
// doctor and any invited specialist can each manage their own entries without
// overwriting each other's. The saving doctor's previous entries are replaced
// while all other doctors' entries are preserved.
router.post("/:id/emr", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id }   = req.params;
  const { sections, medicines, labs } = req.body;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (!isAuthorizedDoctor(apt, doctorId)) { res.status(403).json({ error: "Not authorized." }); return; }

    // Resolve doctor name for contributor labelling
    let contributorName = "Doctor";
    try {
      const { resource: doc } = await doctorsContainer.item(doctorId, doctorId).read();
      contributorName = doc?.fullName ?? contributorName;
    } catch { /* use default */ }

    // Safety net: drop any incoming entries that are explicitly tagged as belonging
    // to a different doctor (the frontend should already filter these out, but we
    // enforce it here too so a bad payload never corrupts another doctor's entries).
    const ownIncomingMedicines = (medicines ?? []).filter(
      (m: any) => !m.contributorDoctorId || m.contributorDoctorId === doctorId
    );
    const ownIncomingLabs = (labs ?? []).filter(
      (l: any) => !l.contributorDoctorId || l.contributorDoctorId === doctorId
    );

    // Tag the incoming entries with this doctor's identity
    const taggedMedicines = ownIncomingMedicines.map((m: any) => ({
      ...m,
      contributorDoctorId: doctorId,
      contributorName,
    }));
    const taggedLabs = ownIncomingLabs.map((l: any) => ({
      ...l,
      contributorDoctorId: doctorId,
      contributorName,
    }));

    // Merge: keep other doctors' existing entries, replace this doctor's entries
    const existingMedicines: any[] = apt.emr?.medicines ?? [];
    const existingLabs: any[]      = apt.emr?.labs      ?? [];

    const otherMedicines = existingMedicines.filter(
      // Keep if it belongs to someone else OR if it's a legacy entry with no tag
      (m: any) => m.contributorDoctorId !== doctorId
    );
    const otherLabs = existingLabs.filter(
      (l: any) => l.contributorDoctorId !== doctorId
    );

    const mergedMedicines = [...otherMedicines, ...taggedMedicines];
    const mergedLabs      = [...otherLabs,      ...taggedLabs];

    // Merge sections: layer this doctor's section notes on top of whatever was
    // previously saved. This prevents a specialist from wiping the primary
    // doctor's clinical notes when they save their own additions.
    const existingSections = apt.emr?.sections ?? {};
    const mergedSections   = { ...existingSections, ...(sections ?? {}) };

    const updated = {
      ...apt,
      emr: {
        sections:  mergedSections,
        medicines: mergedMedicines,
        labs:      mergedLabs,
        savedAt:   new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);
    res.json({ status: "OK", emr: updated.emr });
  } catch (err) {
    console.error("Save EMR error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/emr ──────────────────────────────────────────
// Doctor reads back the saved EMR (and pre-visit data) for this appointment —
// used to restore the consult screen if the doctor reloads or rejoins.
router.get("/:id/emr", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id }   = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (!isAuthorizedDoctor(apt, doctorId)) { res.status(403).json({ error: "Not authorized." }); return; }

    res.json({
      emr:          apt.emr ?? null,
      preVisitData: apt.preVisitData ?? null,
    });
  } catch (err) {
    console.error("Fetch EMR error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/appointments/:id/ehr ───────────────────────────────────────────
// Doctor fetches the patient's full longitudinal Electronic Health Record:
// demographics + standing medical profile (allergies, chronic conditions,
// current medications) PLUS a timeline of every past appointment's EMR for
// this patient, across all doctors. This is the patient's complete medical
// history — as opposed to /:id/emr, which is just this one encounter.
router.get("/:id/ehr", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id }   = req.params;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (!isAuthorizedDoctor(apt, doctorId)) { res.status(403).json({ error: "Not authorized." }); return; }

    const { resource: patient } = await patientsContainer.item(apt.patientId, apt.patientId).read();
    if (!patient) { res.status(404).json({ error: "Patient profile not found." }); return; }

    const profile = {
      fullName:        patient.fullName       ?? "",
      email:           patient.email          ?? "",
      phone:           patient.phone          ?? "",
      gender:          patient.gender         ?? "",
      dateOfBirth:     patient.dob            ?? patient.dateOfBirth ?? "",
      bloodGroup:      patient.bloodGroup     ?? "",
      height:          patient.height         ?? "",
      weight:          patient.weight         ?? "",
      emiratesId:      patient.emiratesId     ?? "",
      maritalStatus:   patient.maritalStatus  ?? "",
      location:        patient.location       ?? "",
      allergies:       patient.allergies      ?? [],
      medications:     patient.medications    ?? { current: [], past: [] },
      chronicDiseases: patient.chronicDiseases ?? [],
      insurance:       patient.insurance      ?? [],
    };

    // All of this patient's appointments across every doctor, most recent first.
    const allAppointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@patientId", value: apt.patientId }],
    });

    const doctorIds = Array.from(new Set(allAppointments.map((a) => a.doctorId).filter(Boolean)));
    const doctorNames: Record<string, string> = {};
    await Promise.all(doctorIds.map(async (did) => {
      try {
        const { resource: doc } = await doctorsContainer.item(did, did).read();
        doctorNames[did] = doc?.fullName ?? "Unknown Doctor";
      } catch {
        doctorNames[did] = "Unknown Doctor";
      }
    }));

    const visitHistory = allAppointments
      .filter((a) => a.emr || a.status === "completed")
      .map((a) => ({
        appointmentId: a.id,
        scheduledAt:   a.scheduledAt,
        status:        a.status,
        reason:        a.reason ?? "",
        doctorId:      a.doctorId,
        doctorName:    doctorNames[a.doctorId] ?? "Unknown Doctor",
        emr:           a.emr ?? null,
      }));

    res.json({ profile, visitHistory, preVisitData: apt.preVisitData ?? null });
  } catch (err) {
    console.error("Fetch EHR error:", err);
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

    const participantName = isDoctor
      ? (await doctorsContainer.item(userId, userId).read()).resource?.fullName
      : (await patientsContainer.item(userId, userId).read()).resource?.fullName;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name:     participantName,
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
