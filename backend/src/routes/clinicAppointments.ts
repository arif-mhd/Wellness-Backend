import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import {
  appointmentsContainer,
  doctorsContainer,
  patientsContainer,
  queryDocuments,
} from "../config/cosmos";
import { resolveClinicScope, scopeToClinicIds, buildInClause } from "../utils/clinicScope";

const router = Router();

function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const diffMs = Date.now() - birth.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

// ─── GET /api/clinics/appointments ───────────────────────────────────────────
// Every appointment ever booked with one of this clinic's doctors, enriched
// with patient/doctor display data. clinicId is stamped on the appointment
// doc directly at booking time (see POST /api/appointments), so this is a
// single flat query — no need to fan out over the doctor roster first.
router.get("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);

  try {
    let appointments: any[] = [];
    if (clinicIds.length > 0) {
      const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
      appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT * FROM c WHERE ${clause} ORDER BY c.scheduledAt DESC`,
        parameters,
      });
    }

    const doctorIds = Array.from(new Set(appointments.map((a) => a.doctorId).filter(Boolean)));
    const doctorById: Record<string, any> = {};
    await Promise.all(doctorIds.map(async (id) => {
      try {
        const { resource } = await doctorsContainer.item(id, id).read();
        if (resource) doctorById[id] = resource;
      } catch { /* skip */ }
    }));

    const patientIds = Array.from(new Set(appointments.map((a) => a.patientId).filter(Boolean)));
    const patientById: Record<string, any> = {};
    await Promise.all(patientIds.map(async (id) => {
      try {
        const { resource } = await patientsContainer.item(id, id).read();
        if (resource) patientById[id] = resource;
      } catch { /* skip */ }
    }));

    const enriched = appointments.map((apt) => {
      const doctor = doctorById[apt.doctorId];
      const patient = patientById[apt.patientId];

      let patientName = patient?.fullName ?? "Unknown Patient";
      let patientDob = patient?.dateOfBirth ?? patient?.dob ?? null;
      let patientEmail = patient?.email ?? "";
      let patientAvatarUrl = patient?.avatarUrl ?? null;

      if (apt.familyMemberId && patient?.familyMembers) {
        const member = patient.familyMembers.find((m: any) => m.id === apt.familyMemberId);
        if (member) {
          patientName = member.fullName ?? patientName;
          patientDob = member.dob ?? member.dateOfBirth ?? patientDob;
          patientAvatarUrl = member.avatarUrl ?? patientAvatarUrl;
          if (member.email) patientEmail = member.email;
        }
      }

      const primaryDiagnosis = apt.status === "completed"
        ? (apt.emr?.sections?.impressionAndPlan?.trim() || "No diagnosis recorded")
        : "Pending";

      return {
        ...apt,
        patientName,
        patientEmail,
        patientAge: calcAge(patientDob),
        patientAvatarUrl,
        doctorName: doctor?.fullName ?? "Doctor",
        doctorEmail: doctor?.email ?? "",
        doctorAvatarUrl: doctor?.avatarUrl ?? null,
        doctorSpecialty: doctor?.specialty ?? "General Medicine",
        doctorIsOnline: !!doctor?.isOnline,
        primaryDiagnosis,
      };
    });

    res.json({ appointments: enriched });
  } catch (err) {
    console.error("Fetch clinic appointments error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
