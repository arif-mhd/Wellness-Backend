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

// ─── GET /api/clinics/search?q=<query> ───────────────────────────────────────
// Global search across this clinic's doctors, patients, and appointments.
// Returns categorised results with navigation links.
router.get("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim() ?? "";

  if (!q || q.length < 2) {
    res.json({ doctors: [], patients: [], appointments: [] });
    return;
  }

  const lower = q.toLowerCase();

  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);

  if (clinicIds.length === 0) {
    res.json({ doctors: [], patients: [], appointments: [] });
    return;
  }

  try {
    const { clause, parameters } = buildInClause("c.clinicId", clinicIds);

    // Run queries in parallel
    const [allDoctors, allAppointments] = await Promise.all([
      queryDocuments<any>(doctorsContainer, {
        query: `SELECT c.id, c.fullName, c.email, c.specialty, c.status, c.avatarUrl FROM c WHERE ${clause}`,
        parameters,
      }),
      queryDocuments<any>(appointmentsContainer, {
        query: `SELECT c.id, c.patientId, c.patientName, c.doctorName, c.reason, c.status, c.scheduledAt FROM c WHERE ${clause} ORDER BY c.scheduledAt DESC OFFSET 0 LIMIT 500`,
        parameters,
      }),
    ]);

    function matchText(fields: (string | null | undefined)[]): boolean {
      return fields.some((f) => f && f.toLowerCase().includes(lower));
    }

    // Doctors — scoped to this clinic
    const doctors = allDoctors
      .filter((d) => matchText([d.fullName, d.email, d.specialty]))
      .slice(0, 6)
      .map((d) => ({
        type: "doctor",
        id: d.id,
        title: d.fullName ?? "Unknown Doctor",
        subtitle: d.specialty ?? d.email ?? "",
        status: d.status,
        avatarUrl: d.avatarUrl ?? null,
        href: `/clinic/doctors/${d.id}`,
      }));

    // Appointments — match patient name, doctor name, or reason
    const matchedAppointments = allAppointments
      .filter((a) => matchText([a.patientName, a.doctorName, a.reason]))
      .slice(0, 8);

    // Enrich patient names from their profile if missing
    const patientIds = Array.from(new Set(matchedAppointments.map((a) => a.patientId).filter(Boolean)));
    const patientById: Record<string, any> = {};
    await Promise.all(
      patientIds.map(async (id) => {
        try {
          const { resource } = await patientsContainer.item(id, id).read();
          if (resource) patientById[id] = resource;
        } catch { /* skip */ }
      })
    );

    const appointments = matchedAppointments.map((a) => ({
      type: "appointment",
      id: a.id,
      title: a.patientName ?? patientById[a.patientId]?.fullName ?? "Unknown Patient",
      subtitle: `${a.reason ?? "Consultation"} · ${a.doctorName ?? ""}`,
      status: a.status,
      date: a.scheduledAt,
      avatarUrl: patientById[a.patientId]?.avatarUrl ?? null,
      href: `/clinic/appointments`,
    }));

    // Patients — derived from unique patients in appointment list
    const patientMap: Record<string, any> = {};
    for (const a of allAppointments) {
      if (!a.patientId || patientMap[a.patientId]) continue;
      const name = a.patientName ?? patientById[a.patientId]?.fullName ?? "";
      const email = patientById[a.patientId]?.email ?? "";
      if (matchText([name, email])) {
        patientMap[a.patientId] = {
          type: "patient",
          id: a.patientId,
          title: name || "Unknown Patient",
          subtitle: email,
          avatarUrl: patientById[a.patientId]?.avatarUrl ?? null,
          href: `/clinic/patients/${a.patientId}`,
        };
      }
    }
    const patients = Object.values(patientMap).slice(0, 6);

    res.json({ doctors, patients, appointments });
  } catch (err) {
    console.error("Clinic global search error:", err);
    res.status(500).json({ error: "Search failed." });
  }
});

export default router;
