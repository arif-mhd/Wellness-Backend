import { Router, Request, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { AccessToken, RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";
import {
  appointmentsContainer,
  patientsContainer,
  doctorsContainer,
  queryDocuments,
  notificationsContainer,
} from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { logActivity } from "../utils/activityLogger";
import { resolveProfileDisplay } from "../utils/profile";

function parseLocalTime(isoString: string): Date {
  if (!isoString) return new Date();
  const clean = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
  return new Date(clean);
}

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
// Patient's own appointments list. Optional ?profileId= filters to just the
// active profile (the account owner or one family member); omitted/absent
// means "all profiles" so the account owner retains full transparency.
router.get("/", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

  try {
    let appointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@patientId", value: patientId }],
    });

    if (profileId) {
      appointments = appointments.filter((apt) =>
        profileId === patientId ? !apt.familyMemberId : apt.familyMemberId === profileId
      );
    }

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
          let profileLabel = patientName;
          let profileRelationship = "Self";
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

              profileRelationship = member.relationship ?? "Family Member";
              profileLabel = `${patientName} (${profileRelationship} of ${patient.fullName})`;
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
            accountOwnerName: patient?.fullName ?? "Unknown",
            profileRelationship,
            profileLabel,
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

    const isDoctor = apt.doctorId === userId;
    const now = new Date().toISOString();

    const dateText = parseLocalTime(apt.scheduledAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeText = parseLocalTime(apt.scheduledAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (isDoctor) {
      // Notify patient
      const docDoc = await doctorsContainer.item(apt.doctorId, apt.doctorId).read().then(r => r.resource).catch(() => null);
      const doctorName = docDoc?.fullName ?? "Doctor";
      const patientNotification = {
        id: "notif_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        patientId: apt.patientId,
        profileId: apt.familyMemberId ?? apt.patientId,
        title: "Appointment Cancelled",
        body: `Your appointment with Dr. ${doctorName} on ${dateText} at ${timeText} has been cancelled by the doctor.`,
        type: "appointment_cancelled",
        referenceId: id,
        isRead: false,
        sentAt: now,
      };
      await notificationsContainer.items.create(patientNotification);
    } else {
      // Notify doctor
      const patientDoc = await patientsContainer.item(apt.patientId, apt.patientId).read().then(r => r.resource).catch(() => null);
      const patientName = patientDoc?.fullName ?? "Patient";
      const doctorNotification = {
        id: "notif_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        patientId: apt.doctorId,
        title: "Appointment Cancelled",
        body: `Your appointment with ${patientName} on ${dateText} at ${timeText} has been cancelled by the patient.`,
        type: "appointment_cancelled",
        referenceId: id,
        isRead: false,
        sentAt: now,
      };
      await notificationsContainer.items.create(doctorNotification);
    }

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

// ─── PATCH /api/appointments/:id/reschedule ─────────────────────────────────
router.patch("/:id/reschedule", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { id } = req.params;
  const { scheduledAt, reason } = req.body;

  if (!scheduledAt) {
    res.status(400).json({ error: "scheduledAt is required." });
    return;
  }

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

    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime())) {
      res.status(400).json({ error: "Invalid scheduledAt format." });
      return;
    }

    const dateStr = newDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const utcHours = newDate.getUTCHours().toString().padStart(2, "0");
    const utcMinutes = newDate.getUTCMinutes().toString().padStart(2, "0");
    const timeStr = `${utcHours}:${utcMinutes}`;

    const { resource: doctor } = await doctorsContainer.item(apt.doctorId, apt.doctorId).read();
    if (!doctor || doctor.status !== "approved") {
      res.status(404).json({ error: "Doctor not found or not active." });
      return;
    }

    const slots: any[] = doctor.slots ?? [];
    const dayOfWeek = new Date(dateStr + "T12:00:00Z").getUTCDay();
    const activeDaySlots = slots.filter((s: any) => s.dayOfWeek === dayOfWeek && s.isActive);

    if (activeDaySlots.length === 0) {
      res.status(400).json({ error: "Doctor does not have active slots on this day." });
      return;
    }

    const intervals: string[] = [];
    let duration = 30;

    for (const daySlot of activeDaySlots) {
      duration = daySlot.slotDurationMins ?? 30;
      if (!daySlot.startTime || !daySlot.endTime) continue;
      const [startH, startM] = daySlot.startTime.split(":").map(Number);
      const [endH,   endM]   = daySlot.endTime.split(":").map(Number);
      let cursor = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (cursor + duration <= endMinutes) {
        const h = Math.floor(cursor / 60).toString().padStart(2, "0");
        const m = (cursor % 60).toString().padStart(2, "0");
        
        const slotStart = new Date(`${dateStr}T${h}:${m}:00.000Z`);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        const absences = doctor.absences ?? [];
        const isAbsent = absences.some((abs: any) => {
          const absStart = new Date(abs.startDate);
          const absEnd = new Date(abs.endDate);
          return slotStart < absEnd && slotEnd > absStart;
        });

        if (!isAbsent) {
          intervals.push(`${h}:${m}`);
        }
        cursor += duration;
      }
    }

    const uniqueIntervals = Array.from(new Set(intervals)).sort();

    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd   = `${dateStr}T23:59:59.999Z`;

    const booked = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.scheduledAt FROM c
              WHERE c.doctorId = @doctorId
                AND c.id != @apptId
                AND c.scheduledAt >= @dayStart
                AND c.scheduledAt <= @dayEnd
                AND c.status != 'cancelled'`,
      parameters: [
        { name: "@doctorId", value: apt.doctorId },
        { name: "@apptId", value: id },
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

    const available = uniqueIntervals.filter((t) => !bookedSet.has(t));

    if (!available.includes(timeStr)) {
      res.status(400).json({ error: "The selected time slot is not available." });
      return;
    }

    const oldScheduledAt = apt.scheduledAt;
    const updated = {
      ...apt,
      scheduledAt,
      reason: reason ?? apt.reason,
      status: "scheduled",
      updatedAt: new Date().toISOString()
    };
    await appointmentsContainer.items.upsert(updated);

    const isDoctor = apt.doctorId === userId;
    const now = new Date().toISOString();

    const dateText = parseLocalTime(scheduledAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeText = parseLocalTime(scheduledAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (isDoctor) {
      const docDoc = await doctorsContainer.item(apt.doctorId, apt.doctorId).read().then(r => r.resource).catch(() => null);
      const doctorName = docDoc?.fullName ?? "Doctor";
      const patientNotification = {
        id: "notif_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        patientId: apt.patientId,
        profileId: apt.familyMemberId ?? apt.patientId,
        title: "Appointment Rescheduled",
        body: `Your appointment with Dr. ${doctorName} has been rescheduled to ${dateText} at ${timeText}.`,
        type: "appointment_rescheduled",
        referenceId: id,
        isRead: false,
        sentAt: now,
      };
      await notificationsContainer.items.create(patientNotification);
    } else {
      const patientDoc = await patientsContainer.item(apt.patientId, apt.patientId).read().then(r => r.resource).catch(() => null);
      const patientName = patientDoc?.fullName ?? "Patient";
      const doctorNotification = {
        id: "notif_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        patientId: apt.doctorId,
        title: "Appointment Rescheduled",
        body: `Your appointment with ${patientName} has been rescheduled to ${dateText} at ${timeText}.`,
        type: "appointment_rescheduled",
        referenceId: id,
        isRead: false,
        sentAt: now,
      };
      await notificationsContainer.items.create(doctorNotification);
    }

    logActivity({
      source: isDoctor ? "doctor" : "patient",
      action: "Appointment Rescheduled",
      details: `Appointment ${id} rescheduled from ${oldScheduledAt} to ${scheduledAt}`,
      performedBy: isDoctor ? "Doctor" : "Patient",
      performedById: userId,
      entityType: "appointment",
      entityId: id,
    });

    res.json({ status: "OK", appointment: updated });
  } catch (err) {
    console.error("Reschedule appointment error:", err);
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

// ─── PATCH /api/appointments/:id/waiting ────────────────────────────────────
// Patient signals they're present in the waiting room (or leaves it). Body:
// { waiting: boolean }. Sets/clears apt.patientWaitingSince, which the doctor
// portal reads (via GET /doctor) to show real "Online Now" presence instead
// of inferring it from call state alone.
router.patch("/:id/waiting", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { id } = req.params;
  const { waiting } = req.body;

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) {
      res.status(404).json({ error: "Appointment not found." });
      return;
    }
    if (apt.patientId !== patientId) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    const updated = {
      ...apt,
      patientWaitingSince: waiting ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);

    res.json({ status: "OK", patientWaitingSince: updated.patientWaitingSince });
  } catch (err) {
    console.error("Update waiting status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/appointments/:id/remind ──────────────────────────────────────
// Doctor sends the patient a manual reminder notification about an upcoming
// appointment.
router.post("/:id/remind", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id } = req.params;

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

    const docDoc = await doctorsContainer.item(doctorId, doctorId).read().then(r => r.resource).catch(() => null);
    const doctorName = docDoc?.fullName ?? "Doctor";

    const dateText = parseLocalTime(apt.scheduledAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeText = parseLocalTime(apt.scheduledAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const patientNotification = {
      id: "notif_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      patientId: apt.patientId,
      profileId: apt.familyMemberId ?? apt.patientId,
      title: "Appointment Reminder",
      body: `Dr. ${doctorName} sent you a reminder about your appointment on ${dateText} at ${timeText}.`,
      type: "appointment_reminder",
      referenceId: id,
      isRead: false,
      sentAt: new Date().toISOString(),
    };
    await notificationsContainer.items.create(patientNotification);

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Send reminder error:", err);
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
  const { sections, visitInfo, medicines, labs, addendum } = req.body;

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

    // Addenda are append-only: each note is timestamped and signed at write
    // time and never edited or removed afterward, matching real EMR
    // audit-trail conventions (a correction is a new addendum, not an edit).
    const existingAddenda: any[] = apt.emr?.addenda ?? [];
    const mergedAddenda = addendum && String(addendum).trim()
      ? [
          ...existingAddenda,
          {
            text: String(addendum).trim(),
            doctorId,
            doctorName: contributorName,
            createdAt: new Date().toISOString(),
          },
        ]
      : existingAddenda;

    const updated = {
      ...apt,
      emr: {
        sections:  mergedSections,
        visitInfo: visitInfo ?? apt.emr?.visitInfo ?? null,
        medicines: mergedMedicines,
        labs:      mergedLabs,
        addenda:   mergedAddenda,
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

    res.json({
      profile,
      visitHistory,
      preVisitData: apt.preVisitData ?? null,
      clinicalNotes: patient.clinicalNotes ?? [],
    });
  } catch (err) {
    console.error("Fetch EHR error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/appointments/patient/:patientId/notes ────────────────────────
// Doctor adds a freestanding clinical note to a patient's record — not tied
// to any specific appointment/encounter (unlike an EMR addendum). Append-only,
// timestamped and signed, same audit-trail convention as EMR addenda. Only a
// doctor who has actually had at least one appointment with this patient may
// add notes for them.
router.post("/patient/:patientId/notes", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { patientId } = req.params;
  const { text } = req.body;

  if (!text || !String(text).trim()) {
    res.status(400).json({ error: "Note text is required." });
    return;
  }

  try {
    const hasSeenPatient = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT TOP 1 c.id FROM c WHERE c.patientId = @patientId AND (c.doctorId = @doctorId OR c.specialistInvite.doctorId = @doctorId)",
      parameters: [
        { name: "@patientId", value: patientId },
        { name: "@doctorId", value: doctorId },
      ],
    });
    if (hasSeenPatient.length === 0) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    const { resource: patient } = await patientsContainer.item(patientId, patientId).read();
    if (!patient) { res.status(404).json({ error: "Patient not found." }); return; }

    let doctorName = "Doctor";
    try {
      const { resource: doc } = await doctorsContainer.item(doctorId, doctorId).read();
      doctorName = doc?.fullName ?? doctorName;
    } catch { /* use default */ }

    const newNote = {
      id: "note_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      text: String(text).trim(),
      doctorId,
      doctorName,
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [...(patient.clinicalNotes ?? []), newNote];

    await patientsContainer.items.upsert({ ...patient, clinicalNotes: updatedNotes });
    res.json({ status: "OK", clinicalNotes: updatedNotes });
  } catch (err) {
    console.error("Add clinical note error:", err);
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

// ─── POST /api/appointments/:id/send-followup ────────────────────────────────
// Doctor (primary only) sends a follow-up consultation proposal to the patient
// in the current call via the LiveKit data channel. A pendingFollowUp field is
// also written to the appointment so the patient can respond via REST if the
// LiveKit message is missed.
router.post("/:id/send-followup", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id }   = req.params;
  const { followUpDate, followUpTime, reason } = req.body;
  // followUpDate: "YYYY-MM-DD", followUpTime: "HH:MM", reason: string

  if (!followUpDate || !followUpTime) {
    res.status(400).json({ error: "followUpDate and followUpTime are required." });
    return;
  }

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== doctorId) { res.status(403).json({ error: "Not authorized." }); return; }

    let doctorName = "Doctor";
    try {
      const { resource: doc } = await doctorsContainer.item(doctorId, doctorId).read();
      doctorName = doc?.fullName ?? doctorName;
    } catch { /* use default */ }

    const followUpScheduledAt = `${followUpDate}T${followUpTime}:00.000`;

    // Store the pending follow-up on the appointment
    const updated = {
      ...apt,
      pendingFollowUp: {
        followUpDate,
        followUpTime,
        followUpScheduledAt,
        reason: reason ?? "Follow-up consultation",
        status: "pending",
        sentAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await appointmentsContainer.items.upsert(updated);

    // Send real-time notification to the patient via LiveKit data channel
    await sendLivekitData(apt.livekitRoom, {
      type: "followup_request",
      followUpDate,
      followUpTime,
      followUpScheduledAt,
      reason: reason ?? "Follow-up consultation",
      doctorName,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("send-followup error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/appointments/:id/followup-respond ─────────────────────────────
// Patient accepts or declines a follow-up consultation proposal.
// If accepted: creates a new scheduled appointment, notifies the patient,
// and sends a LiveKit data message back to the doctor.
router.post("/:id/followup-respond", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();
  const { id }    = req.params;
  const { decision } = req.body; // "accepted" | "declined"

  if (decision !== "accepted" && decision !== "declined") {
    res.status(400).json({ error: "decision must be 'accepted' or 'declined'." });
    return;
  }

  try {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.patientId !== patientId) { res.status(403).json({ error: "Not authorized." }); return; }
    if (!apt.pendingFollowUp) { res.status(400).json({ error: "No pending follow-up on this appointment." }); return; }

    const now = new Date().toISOString();
    let newAppointmentId: string | null = null;

    if (decision === "accepted") {
      // Create the follow-up appointment
      newAppointmentId = generateId();
      const followUpApt = {
        id: newAppointmentId,
        patientId,
        doctorId: apt.doctorId,
        scheduledAt: apt.pendingFollowUp.followUpScheduledAt,
        durationMins: apt.durationMins ?? 30,
        reason: apt.pendingFollowUp.reason ?? "Follow-up consultation",
        shareMedicalHistory: apt.shareMedicalHistory ?? false,
        status: "scheduled",
        paymentStatus: "paid",
        paymentAmount: apt.paymentAmount ?? 250,
        livekitRoom: newAppointmentId,
        isFollowUp: true,
        sourceAppointmentId: id,
        familyMemberId: apt.familyMemberId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await appointmentsContainer.items.create(followUpApt);

      // Resolve doctor name for the notification message
      let doctorName = "Doctor";
      try {
        const { resource: doc } = await doctorsContainer.item(apt.doctorId, apt.doctorId).read();
        doctorName = doc?.fullName ?? doctorName;
      } catch { /* use default */ }

      const followUpDate = apt.pendingFollowUp.followUpDate;
      const followUpTime = apt.pendingFollowUp.followUpTime;
      const dateText = new Date(`${followUpDate}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const [h, m] = followUpTime.split(":");
      const hr = parseInt(h, 10);
      const ampm = hr >= 12 ? "PM" : "AM";
      const hr12 = hr % 12 || 12;
      const timeText = `${hr12}:${m} ${ampm}`;

      // Notify the patient
      const notifId = "notif_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const notification = {
        id: notifId,
        patientId,
        profileId: apt.familyMemberId ?? patientId,
        title: "Follow-up Appointment Booked",
        body: `Your follow-up with Dr. ${doctorName} has been scheduled for ${dateText} at ${timeText}.`,
        type: "followup_booked",
        referenceId: newAppointmentId,
        isRead: false,
        sentAt: now,
      };
      await notificationsContainer.items.create(notification);

      // Notify doctor via LiveKit that the patient accepted
      await sendLivekitData(apt.livekitRoom, {
        type: "followup_accepted",
        newAppointmentId,
        followUpDate,
        followUpTime,
      });

      logActivity({
        source: "patient",
        action: "Follow-up Appointment Booked",
        details: `Patient accepted follow-up — new appointment ${newAppointmentId} created from ${id}`,
        performedBy: "Patient",
        performedById: patientId,
        entityType: "appointment",
        entityId: newAppointmentId,
      });
    } else {
      // Notify doctor via LiveKit that the patient declined
      await sendLivekitData(apt.livekitRoom, {
        type: "followup_declined",
      });
    }

    // Update the source appointment's pendingFollowUp status
    const updatedApt = {
      ...apt,
      pendingFollowUp: {
        ...apt.pendingFollowUp,
        status: decision,
        decidedAt: now,
        ...(newAppointmentId ? { newAppointmentId } : {}),
      },
      updatedAt: now,
    };
    await appointmentsContainer.items.upsert(updatedApt);

    res.json({ ok: true, newAppointmentId });
  } catch (err) {
    console.error("followup-respond error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;

