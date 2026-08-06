import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import {
  doctorsContainer,
  clinicsContainer,
  patientsContainer,
  appointmentsContainer,
  queryDocuments,
} from "../config/cosmos";

const router = Router();

// ─── GET /api/admin/search?q=<query> ────────────────────────────────────────
// Global search across doctors, clinics, patients, and appointments for admin.
// Returns categorised results with navigation links.
router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim() ?? "";

  if (!q || q.length < 2) {
    res.json({ doctors: [], clinics: [], patients: [], appointments: [] });
    return;
  }

  const lower = q.toLowerCase();

  try {
    // Run all queries in parallel for speed
    const [allDoctors, allClinics, allPatients, allAppointments] = await Promise.all([
      queryDocuments<any>(doctorsContainer, {
        query: "SELECT c.id, c.fullName, c.email, c.specialty, c.status, c.avatarUrl FROM c",
      }),
      queryDocuments<any>(clinicsContainer, {
        query: "SELECT c.id, c.clinicName, c.fullName, c.email, c.address, c.status, c.clinicImageUrl FROM c",
      }),
      queryDocuments<any>(patientsContainer, {
        query: "SELECT c.id, c.name, c.fullName, c.email, c.phone, c.avatarUrl FROM c",
      }),
      queryDocuments<any>(appointmentsContainer, {
        query:
          "SELECT c.id, c.patientName, c.doctorName, c.reason, c.status, c.scheduledAt FROM c ORDER BY c.scheduledAt DESC OFFSET 0 LIMIT 500",
      }),
    ]);

    // Helper: check if any field contains the query
    function matchText(fields: (string | null | undefined)[]): boolean {
      return fields.some((f) => f && f.toLowerCase().includes(lower));
    }

    const doctors = allDoctors
      .filter((d) => matchText([d.fullName, d.email, d.specialty]))
      .slice(0, 8)
      .map((d) => ({
        type: "doctor",
        id: d.id,
        title: d.fullName ?? "Unknown Doctor",
        subtitle: d.specialty ?? d.email ?? "",
        status: d.status,
        avatarUrl: d.avatarUrl ?? null,
        href: `/dashboard/doctors?id=${d.id}`,
      }));

    const clinics = allClinics
      .filter((c) => matchText([c.clinicName, c.fullName, c.email, c.address]))
      .slice(0, 8)
      .map((c) => ({
        type: "clinic",
        id: c.id,
        title: c.clinicName ?? c.fullName ?? "Unknown Clinic",
        subtitle: c.address ?? c.email ?? "",
        status: c.status,
        avatarUrl: c.clinicImageUrl ?? null,
        href: `/dashboard/clinics?id=${c.id}`,
      }));

    const patients = allPatients
      .filter((p) => matchText([p.name, p.fullName, p.email, p.phone]))
      .slice(0, 8)
      .map((p) => ({
        type: "patient",
        id: p.id,
        title: p.name ?? p.fullName ?? "Unknown Patient",
        subtitle: p.email ?? p.phone ?? "",
        avatarUrl: p.avatarUrl ?? null,
        href: `/dashboard/patients?id=${p.id}`,
      }));

    const appointments = allAppointments
      .filter((a) => matchText([a.patientName, a.doctorName, a.reason]))
      .slice(0, 6)
      .map((a) => ({
        type: "appointment",
        id: a.id,
        title: a.patientName ?? "Unknown Patient",
        subtitle: `${a.reason ?? "Consultation"} · ${a.doctorName ?? ""}`,
        status: a.status,
        date: a.scheduledAt,
        avatarUrl: null,
        href: `/dashboard/doctors`,
      }));

    res.json({ doctors, clinics, patients, appointments });
  } catch (err) {
    console.error("Admin global search error:", err);
    res.status(500).json({ error: "Search failed." });
  }
});

export default router;
