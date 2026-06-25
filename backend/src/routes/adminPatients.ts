import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import {
  patientsContainer,
  appointmentsContainer,
  doctorsContainer,
  queryDocuments,
} from "../config/cosmos";
import { resolveProfileDisplay, getAllProfiles } from "../utils/profile";

const router = Router();

// ── GET /api/admin/patients ──────────────────────────────────────────────────
// Returns all patients in the Cosmos patients collection, newest first.
// Requires "admin" role.
router.get("/", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await patientsContainer.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();

    res.json({ patients: resources });
  } catch (err) {
    console.error("Admin patients fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/admin/patients/:patientId ──────────────────────────────────────
router.get("/:patientId", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { resources } = await patientsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: patientId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json({ patient: resources[0] });
  } catch (err) {
    console.error("Admin patient fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/admin/patients/:patientId/ehr ──────────────────────────────────
// Admin-scoped view of a patient's longitudinal Electronic Health Record:
// standing medical profile plus a timeline of every past appointment's EMR
// for this patient, across all doctors. Mirrors GET /api/appointments/:id/ehr
// (doctor-portal) but isn't tied to a specific appointment a doctor owns —
// admin can look up any patient directly by id.
router.get("/:patientId/ehr", requireRole("admin"), async (req: Request, res: Response) => {
  const { patientId } = req.params;

  try {
    const { resource: patient } = await patientsContainer.item(patientId, patientId).read();
    if (!patient) { res.status(404).json({ error: "Patient not found." }); return; }

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
      parameters: [{ name: "@patientId", value: patientId }],
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
      .map((a) => {
        const resolved = resolveProfileDisplay(patient, a.familyMemberId ?? patient.id);
        return {
          appointmentId: a.id,
          scheduledAt:   a.scheduledAt,
          status:        a.status,
          reason:        a.reason ?? "",
          doctorId:      a.doctorId,
          doctorName:    doctorNames[a.doctorId] ?? "Unknown Doctor",
          emr:           a.emr ?? null,
          profileId:        resolved.profileId,
          profileName:      resolved.fullName,
          profileRelationship: resolved.relationship,
        };
      });

    res.json({ profile, visitHistory, profiles: getAllProfiles(patient) });
  } catch (err) {
    console.error("Admin patient EHR fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/admin/patients/:patientId/status ─────────────────────────────
// Toggle a patient's account between "active" and "deactivated". Deactivated
// patients are blocked from signing in (enforced in config/supertokens.ts).
router.patch("/:patientId/status", requireRole("admin"), async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { status } = req.body as { status?: string };

  if (status !== "active" && status !== "deactivated") {
    res.status(400).json({ error: "status must be 'active' or 'deactivated'." });
    return;
  }

  try {
    const { resource: patient } = await patientsContainer.item(patientId, patientId).read();
    if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

    patient.status = status;
    patient.updatedAt = new Date().toISOString();
    await patientsContainer.item(patientId, patientId).replace(patient);

    res.json({ patient });
  } catch (err) {
    console.error("Admin patient status update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
