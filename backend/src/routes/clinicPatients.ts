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
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// Resolves display identity (name/email/dob/avatar/height/weight/bloodGroup/gender)
// for either the account holder or one of their family members.
function resolveIdentity(patient: any, familyMemberId: string | null) {
  let name = patient?.fullName ?? "Unknown Patient";
  let email = patient?.email ?? "";
  let dob = patient?.dateOfBirth ?? patient?.dob ?? null;
  let avatarUrl = patient?.avatarUrl ?? null;
  let gender = patient?.gender ?? null;
  let bloodGroup = patient?.bloodGroup ?? null;
  let height = patient?.height ?? null;
  let weight = patient?.weight ?? null;

  if (familyMemberId && patient?.familyMembers) {
    const member = patient.familyMembers.find((m: any) => m.id === familyMemberId);
    if (member) {
      name = member.fullName ?? name;
      dob = member.dob ?? member.dateOfBirth ?? dob;
      avatarUrl = member.avatarUrl ?? avatarUrl;
      gender = member.gender ?? gender;
      bloodGroup = member.bloodGroup ?? bloodGroup;
      height = member.height ?? height;
      weight = member.weight ?? weight;
      if (member.email) email = member.email;
    }
  }

  return { name, email, dob, avatarUrl, gender, bloodGroup, height, weight };
}

// ─── GET /api/clinics/patients ───────────────────────────────────────────────
// The clinic's patient roster — derived from appointments (patients aren't a
// clinic-owned entity, so there's no direct link; anyone who has ever booked
// with one of this clinic's doctors counts as a patient here). Grouped by
// patient identity (account holder or a specific family member).
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

    const patientIds = Array.from(new Set(appointments.map((a) => a.patientId).filter(Boolean)));
    const patientById: Record<string, any> = {};
    await Promise.all(patientIds.map(async (id) => {
      try {
        const { resource } = await patientsContainer.item(id, id).read();
        if (resource) patientById[id] = resource;
      } catch { /* skip */ }
    }));

    const doctorIds = Array.from(new Set(appointments.map((a) => a.doctorId).filter(Boolean)));
    const doctorById: Record<string, any> = {};
    await Promise.all(doctorIds.map(async (id) => {
      try {
        const { resource } = await doctorsContainer.item(id, id).read();
        if (resource) doctorById[id] = resource;
      } catch { /* skip */ }
    }));

    const groups: Record<string, any[]> = {};
    for (const apt of appointments) {
      const key = `${apt.patientId}::${apt.familyMemberId ?? ""}`;
      (groups[key] ??= []).push(apt);
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const patients = Object.entries(groups).map(([key, appts]) => {
      const [patientId, familyMemberId] = key.split("::");
      const identity = resolveIdentity(patientById[patientId], familyMemberId || null);

      const sorted = [...appts].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
      const latest = sorted[0];
      const latestCompleted = sorted.find((a) => a.status === "completed");

      const uniqueDoctorIds = Array.from(new Set(appts.map((a) => a.doctorId)));
      const doctors = uniqueDoctorIds.map((id) => ({
        id,
        name: doctorById[id]?.fullName ?? "Doctor",
        isOnline: !!doctorById[id]?.isOnline,
      }));

      const nextUpcoming = sorted
        .filter((a) => a.status === "scheduled" && new Date(a.scheduledAt).getTime() >= now)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

      const firstEver = sorted[sorted.length - 1];
      const isNew = !!firstEver && (now - new Date(firstEver.scheduledAt).getTime()) < THIRTY_DAYS;

      return {
        id: familyMemberId ? `${patientId}__${familyMemberId}` : patientId,
        patientId,
        familyMemberId: familyMemberId || null,
        name: identity.name,
        email: identity.email,
        avatarUrl: identity.avatarUrl,
        age: calcAge(identity.dob),
        diagnosis: latestCompleted?.emr?.sections?.impressionAndPlan?.trim() || "—",
        summary: latest?.reason ?? "—",
        lastConsult: latest?.scheduledAt ?? null,
        doctors,
        consultations: sorted.map((a) => ({ reason: a.reason, date: a.scheduledAt, status: a.status })),
        nextAppointmentId: nextUpcoming?.id ?? null,
        isNew,
      };
    });

    patients.sort((a, b) => new Date(b.lastConsult ?? 0).getTime() - new Date(a.lastConsult ?? 0).getTime());

    res.json({ patients });
  } catch (err) {
    console.error("Fetch clinic patients error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/patients/:patientId ────────────────────────────────────
// Single patient's (or one of their family member's, via ?member=) profile +
// full consultation history, scoped to this clinic's own doctors only.
router.get("/:patientId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);
  const { patientId } = req.params;
  const familyMemberId = typeof req.query.member === "string" ? req.query.member : null;

  try {
    const { resource: patient } = await patientsContainer.item(patientId, patientId).read().catch(() => ({ resource: undefined as any }));
    if (!patient) {
      res.status(404).json({ error: "Patient not found." });
      return;
    }

    let appointments: any[] = [];
    if (clinicIds.length > 0) {
      const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
      appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT * FROM c WHERE ${clause} AND c.patientId = @patientId
                AND ${familyMemberId ? "c.familyMemberId = @familyMemberId" : "(NOT IS_DEFINED(c.familyMemberId) OR c.familyMemberId = null)"}
                ORDER BY c.scheduledAt DESC`,
        parameters: [
          ...parameters,
          { name: "@patientId", value: patientId },
          ...(familyMemberId ? [{ name: "@familyMemberId", value: familyMemberId }] : []),
        ],
      });
    }

    if (appointments.length === 0) {
      res.status(404).json({ error: "This patient has no visits with your clinic." });
      return;
    }

    const identity = resolveIdentity(patient, familyMemberId);

    const doctorIds = Array.from(new Set(appointments.map((a) => a.doctorId).filter(Boolean)));
    const doctorById: Record<string, any> = {};
    await Promise.all(doctorIds.map(async (id) => {
      try {
        const { resource } = await doctorsContainer.item(id, id).read();
        if (resource) doctorById[id] = resource;
      } catch { /* skip */ }
    }));

    const age = calcAge(identity.dob);

    const consultations = appointments.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: doctorById[a.doctorId]?.fullName ?? "Doctor",
      doctorSpecialty: doctorById[a.doctorId]?.specialty ?? "General Medicine",
      age,
      reason: a.reason ?? "General Consultation",
      scheduledAt: a.scheduledAt,
      status: a.status,
    }));

    res.json({
      patient: {
        name: identity.name,
        email: identity.email,
        avatarUrl: identity.avatarUrl,
        gender: identity.gender,
        dob: identity.dob,
        bloodGroup: identity.bloodGroup,
        height: identity.height,
        weight: identity.weight,
        age,
      },
      consultations,
    });
  } catch (err) {
    console.error("Fetch clinic patient detail error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
