import { Router, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import {
  sosCodesContainer,
  patientsContainer,
  appointmentsContainer,
  doctorsContainer,
  queryDocuments,
} from "../config/cosmos";

const router = Router();

const CODE_VALIDITY_MINUTES = 15;

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── POST /api/sos/generate ───────────────────────────────────────────────────
// Patient taps the SOS button. Generates a fresh 6-digit code valid for 15
// minutes, single-use. Any previously unused code for this patient is left in
// place (harmless — only the most recently generated one is looked up first,
// and verify only ever matches a real, unexpired, unused code).
router.post("/generate", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  const patientId = req.session!.getUserId();

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_VALIDITY_MINUTES * 60 * 1000);

    const sosCode = {
      id: "sos_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      patientId,
      code: generateSixDigitCode(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      usedAt: null as string | null,
      usedByDoctorId: null as string | null,
    };

    await sosCodesContainer.items.create(sosCode);

    res.status(201).json({
      code: sosCode.code,
      expiresAt: sosCode.expiresAt,
    });
  } catch (err) {
    console.error("Generate SOS code error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/sos/verify ──────────────────────────────────────────────────────
// Doctor enters the patient's SOS code. Validates it's a real, unexpired,
// unused code, marks it used (single-use), and returns the patient's full
// medical history — same profile/visitHistory shape as the admin EHR view,
// since an SOS-responding doctor has no prior relationship with this patient
// and can't go through the appointment-scoped EHR route.
router.post("/verify", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required." });
    return;
  }

  try {
    const matches = await queryDocuments<any>(sosCodesContainer, {
      query: "SELECT * FROM c WHERE c.code = @code ORDER BY c.createdAt DESC",
      parameters: [{ name: "@code", value: code.trim() }],
    });

    const now = Date.now();
    const validMatch = matches.find(
      (m) => !m.usedAt && new Date(m.expiresAt).getTime() > now
    );

    if (!validMatch) {
      res.status(400).json({ error: "Invalid or expired code." });
      return;
    }

    // Mark used (single-use)
    await sosCodesContainer.items.upsert({
      ...validMatch,
      usedAt: new Date().toISOString(),
      usedByDoctorId: doctorId,
    });

    const { resource: patient } = await patientsContainer.item(validMatch.patientId, validMatch.patientId).read();
    if (!patient) {
      res.status(404).json({ error: "Patient not found." });
      return;
    }

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

    const allAppointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@patientId", value: validMatch.patientId }],
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

    res.json({ patientId: validMatch.patientId, profile, visitHistory });
  } catch (err) {
    console.error("Verify SOS code error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
