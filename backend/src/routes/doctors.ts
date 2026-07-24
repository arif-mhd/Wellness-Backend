import { Router, Request, Response } from "express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import { doctorsContainer, appointmentsContainer, queryDocuments, patientsContainer, otpCodesContainer, feedbackContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import multer from "multer";
import { uploadBlob, generateSasUrl } from "../config/blob";
import { logActivity } from "../utils/activityLogger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── POST /api/doctors/upload ────────────────────────────────────────────────
// Multipart file upload for doctor profile assets (avatar, emirates ID, certificates).
// Accessible by doctor_pending (onboarding) and doctor (profile updates).
// Field names: avatar | emiratesId | degree | spec | other
// Returns a SAS URL for each uploaded file.
router.post(
  "/upload",
  requireRole("doctor"),
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "emiratesId", maxCount: 1 },
    { name: "degree", maxCount: 1 },
    { name: "spec", maxCount: 1 },
    { name: "other", maxCount: 1 },
  ]),
  async (req: SessionRequest, res: Response) => {
    const doctorId = req.session!.getUserId();
    const files = req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};

    const MIME_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "application/pdf": "pdf",
    };

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        const ext = MIME_EXT[file.mimetype] ?? "bin";
        const filename = (field === "avatar" || field === "emiratesId" || field === "degree" || field === "spec")
          ? field
          : `${field}_${Date.now()}`;
        const blobPath = `doctors/${doctorId}/${filename}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Doctor file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

// ─── GET /api/doctors/me ─────────────────────────────────────────────────────
// Returns the currently logged-in doctor's own profile (doctor or doctor_pending role).
router.get("/me", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "Doctor not found." }); return; }
    res.json({ doctor });
  } catch (err) {
    console.error("Get doctor me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/doctors/profile ───────────────────────────────────────────────
// Doctor submits their full onboarding profile after signup.
// Called by the complete-profile wizard. Saves all details to Cosmos.
router.put("/profile", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const {
    // Personal
    bio, businessEmail, bloodGroup, height, weight,
    maritalStatus, address, postalCode, languages,
    phone, timezone, consultationTimeLimitMins,
    avatarUrl, emiratesIdFileUrl,
    // Medical career
    specialty, license, experience, medicalSchool, residency,
    // Fees
    fees, feesPerEmirate,
    // Availability slots
    slots,
    // Documents
    degreeFileUrl, specFileUrl, otherFileUrl,
    // Payment/bank details
    bankDetails,
  } = req.body;

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }

    const updated = {
      ...doctor,
      bio:                       bio                       ?? doctor.bio,
      businessEmail:             businessEmail             ?? doctor.businessEmail,
      bloodGroup:                bloodGroup                ?? doctor.bloodGroup,
      height:                    height                    ?? doctor.height,
      weight:                    weight                    ?? doctor.weight,
      maritalStatus:             maritalStatus             ?? doctor.maritalStatus,
      address:                   address                   ?? doctor.address,
      postalCode:                postalCode                ?? doctor.postalCode,
      languages:                 languages                 ?? doctor.languages,
      phone:                     phone                     ?? doctor.phone,
      timezone:                  timezone                  ?? doctor.timezone,
      consultationTimeLimitMins: consultationTimeLimitMins ?? doctor.consultationTimeLimitMins,
      avatarUrl:                 avatarUrl                 ?? doctor.avatarUrl,
      emiratesIdFileUrl: emiratesIdFileUrl ?? doctor.emiratesIdFileUrl,
      specialty: specialty ?? doctor.specialty,
      license: license ?? doctor.license,
      experience: experience ?? doctor.experience,
      medicalSchool: medicalSchool ?? doctor.medicalSchool,
      residency: residency ?? doctor.residency,
      fees: fees ?? doctor.fees,
      feesPerEmirate: feesPerEmirate ?? doctor.feesPerEmirate,
      slots: slots ?? doctor.slots,
      degreeFileUrl: degreeFileUrl ?? doctor.degreeFileUrl,
      specFileUrl: specFileUrl ?? doctor.specFileUrl,
      otherFileUrl: otherFileUrl ?? doctor.otherFileUrl,
      bankDetails: bankDetails ?? doctor.bankDetails,
      profileCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await doctorsContainer.items.upsert(updated);

    logActivity({
      source: "doctor",
      action: "Doctor Profile Updated",
      details: `Dr. ${updated.fullName ?? doctorId} submitted profile (${updated.specialty ?? "specialty TBD"})`,
      performedBy: updated.fullName ?? "Doctor",
      performedById: doctorId,
      entityType: "doctor",
      entityId: doctorId,
    });

    res.json({ status: "OK", doctor: updated });
  } catch (err) {
    console.error("Update doctor profile error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/doctors/slots ──────────────────────────────────────────────────
// Doctor sets their weekly availability. Slots shape:
// [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMins: 30, isActive: true }]
router.put("/slots", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { slots } = req.body;

  if (!Array.isArray(slots)) {
    res.status(400).json({ error: "slots must be an array." });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }

    const updated = { ...doctor, tempSlots: slots, slotsPending: true, updatedAt: new Date().toISOString() };
    await doctorsContainer.items.upsert(updated);

    res.json({ status: "OK", slots: doctor.slots ?? [], tempSlots: slots });
  } catch (err) {
    console.error("Set slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/slots ──────────────────────────────────────────────────
// Returns the currently logged-in doctor's own slots
router.get("/slots", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }
    res.json({
      slots: doctor.slots ?? [],
      tempSlots: doctor.tempSlots ?? [],
      slotsPending: doctor.slotsPending ?? false,
    });
  } catch (err) {
    console.error("Get doctor slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/absences ───────────────────────────────────────────────
router.get("/absences", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }
    res.json({ absences: doctor.absences ?? [] });
  } catch (err) {
    console.error("Get doctor absences error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/doctors/absences/check-conflicts ──────────────────────────────
router.post("/absences/check-conflicts", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    res.status(400).json({ error: "startDate and endDate are required." });
    return;
  }

  try {
    // Query appointments within the time frame
    const rangeStart = new Date(new Date(startDate).getTime() - 30 * 60 * 1000).toISOString();
    const appts = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.id, c.patientId, c.scheduledAt, c.reason, c.durationMins, c.familyMemberId FROM c
              WHERE c.doctorId = @doctorId
                AND c.status != 'cancelled'
                AND c.scheduledAt >= @rangeStart
                AND c.scheduledAt <= @rangeEnd`,
      parameters: [
        { name: "@doctorId", value: doctorId },
        { name: "@rangeStart", value: rangeStart },
        { name: "@rangeEnd", value: endDate },
      ],
    });

    const conflicts = [];
    for (const a of appts) {
      const apptStart = new Date(a.scheduledAt);
      const apptEnd = new Date(apptStart.getTime() + (a.durationMins || 30) * 60 * 1000);
      if (apptStart < new Date(endDate) && apptEnd > new Date(startDate)) {
        // Fetch patient details
        let patientName = "Unknown Patient";
        let patientAvatarUrl = null;
        let patientDob = null;
        try {
          const { resource: patient } = await patientsContainer.item(a.patientId, a.patientId).read();
          if (patient) {
            patientName = patient.fullName ?? patientName;
            patientAvatarUrl = patient.avatarUrl ?? null;
            patientDob = patient.dateOfBirth ?? patient.dob ?? null;
            if (a.familyMemberId && patient.familyMembers) {
              const member = patient.familyMembers.find((m: any) => m.id === a.familyMemberId);
              if (member) {
                patientName = member.fullName ?? patientName;
                patientAvatarUrl = member.avatarUrl ?? patientAvatarUrl;
                patientDob = member.dateOfBirth ?? member.dob ?? patientDob;
              }
            }
          }
        } catch { }

        conflicts.push({
          id: a.id,
          patientName,
          patientAvatarUrl,
          patientDob,
          scheduledAt: a.scheduledAt,
          reason: a.reason ?? "General Consultation",
        });
      }
    }

    res.json({ conflicts });
  } catch (err) {
    console.error("Check conflicts error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/doctors/absences ──────────────────────────────────────────────
router.post("/absences", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { startDate, endDate, reason, fileUrl, fileName } = req.body;

  if (!startDate || !endDate || !reason) {
    res.status(400).json({ error: "startDate, endDate, and reason are required." });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }

    // 1. Calculate conflicts
    const rangeStart = new Date(new Date(startDate).getTime() - 30 * 60 * 1000).toISOString();
    const appts = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.id, c.patientId, c.scheduledAt, c.reason, c.durationMins, c.familyMemberId FROM c
              WHERE c.doctorId = @doctorId
                AND c.status != 'cancelled'
                AND c.scheduledAt >= @rangeStart
                AND c.scheduledAt <= @rangeEnd`,
      parameters: [
        { name: "@doctorId", value: doctorId },
        { name: "@rangeStart", value: rangeStart },
        { name: "@rangeEnd", value: endDate },
      ],
    });

    const conflicts = [];
    for (const a of appts) {
      const apptStart = new Date(a.scheduledAt);
      const apptEnd = new Date(apptStart.getTime() + (a.durationMins || 30) * 60 * 1000);
      if (apptStart < new Date(endDate) && apptEnd > new Date(startDate)) {
        conflicts.push(a);
      }
    }

    // Conflicting appointments must be explicitly rescheduled (via
    // PATCH /:id/reschedule) before the absence can be confirmed — we no
    // longer auto-cancel them out from under the patient.
    if (conflicts.length > 0) {
      res.status(409).json({
        error: "There are appointments booked during this absence window. Please reschedule them first.",
        conflicts,
      });
      return;
    }

    const now = new Date().toISOString();

    // 3. Create the absence entry
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    let duration = `${diffHours} hour(s)`;
    if (diffHours >= 24) {
      const diffDays = Math.round(diffHours / 24);
      duration = `${diffDays} day(s)`;
    }

    const newAbsence = {
      id: "abs_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      startDate,
      endDate,
      reason,
      duration,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      createdAt: now,
      status: "pending",
    };

    const currentAbsences = doctor.absences ?? [];
    const updatedDoctor = {
      ...doctor,
      absences: [...currentAbsences, newAbsence],
      updatedAt: now,
    };
    await doctorsContainer.items.upsert(updatedDoctor);

    res.status(201).json({ status: "OK", absences: updatedDoctor.absences });
  } catch (err) {
    console.error("Create absence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/doctors/absences/:id ────────────────────────────────────────
router.delete("/absences/:id", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { id } = req.params;

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) {
      res.status(404).json({ error: "Doctor profile not found." });
      return;
    }

    const currentAbsences = doctor.absences ?? [];
    const updatedAbsences = currentAbsences.filter((abs: any) => abs.id !== id);

    const updatedDoctor = {
      ...doctor,
      absences: updatedAbsences,
      updatedAt: new Date().toISOString(),
    };
    await doctorsContainer.items.upsert(updatedDoctor);

    res.json({ status: "OK", absences: updatedAbsences });
  } catch (err) {
    console.error("Delete absence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/:id/slots ──────────────────────────────────────────────
router.get("/:id/slots", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();
    if (!doctor || doctor.status !== "approved") {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }
    res.json({ slots: doctor.slots ?? [] });
  } catch (err) {
    console.error("Get slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/:id/available-slots?date=YYYY-MM-DD ───────────────────
// Returns the list of available time strings (HH:MM) for a specific date,
// excluding slots already booked for that doctor.
router.get("/:id/available-slots", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date query param required (YYYY-MM-DD)" });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();
    if (!doctor || doctor.status !== "approved") {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    const slots: any[] = doctor.slots ?? [];
    const dayOfWeek = new Date(date + "T12:00:00Z").getUTCDay();
    const activeDaySlots = slots.filter((s: any) => s.dayOfWeek === dayOfWeek && s.isActive);

    if (activeDaySlots.length === 0) {
      res.json({ available: [], slotDurationMins: 30 });
      return;
    }

    const intervals: string[] = [];
    let duration = 30;

    for (const daySlot of activeDaySlots) {
      duration = daySlot.slotDurationMins ?? 30;
      if (!daySlot.startTime || !daySlot.endTime) continue;
      const [startH, startM] = daySlot.startTime.split(":").map(Number);
      const [endH, endM] = daySlot.endTime.split(":").map(Number);
      let cursor = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (cursor + duration <= endMinutes) {
        const h = Math.floor(cursor / 60).toString().padStart(2, "0");
        const m = (cursor % 60).toString().padStart(2, "0");

        // Check if slot falls in any scheduled absences
        const slotStart = new Date(`${date}T${h}:${m}:00.000Z`);
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

    // Find booked slots for this date
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const booked = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.scheduledAt FROM c
              WHERE c.doctorId = @doctorId
                AND c.scheduledAt >= @dayStart
                AND c.scheduledAt <= @dayEnd
                AND c.status != 'cancelled'`,
      parameters: [
        { name: "@doctorId", value: id },
        { name: "@dayStart", value: dayStart },
        { name: "@dayEnd", value: dayEnd },
      ],
    });

    const bookedSet = new Set(
      booked.map((b: any) => {
        const d = new Date(b.scheduledAt);
        return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
      })
    );

    const available = uniqueIntervals.filter((t) => !bookedSet.has(t));
    res.json({ available, slotDurationMins: duration });
  } catch (err) {
    console.error("Available slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/search?q=<query> ──────────────────────────────────────
// Doctor searches across their own patients, appointments, and prescriptions.
// Returns categorised results: patients, appointments, prescriptions.
router.get("/search", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const q = ((req.query.q as string) ?? "").trim().toLowerCase();

  if (!q || q.length < 2) {
    res.json({ patients: [], appointments: [], prescriptions: [] });
    return;
  }

  try {
    // Fetch all of this doctor's appointments (with patient info)
    const allApts = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT * FROM c WHERE c.doctorId = @doctorId ORDER BY c.scheduledAt DESC`,
      parameters: [{ name: "@doctorId", value: doctorId }],
    });

    // Collect unique patient IDs this doctor has seen
    const patientIds = Array.from(new Set(allApts.map((a: any) => a.patientId).filter(Boolean)));

    // Fetch patient docs in parallel (cap at 50 to avoid blowing throughput)
    const patientDocs: Record<string, any> = {};
    await Promise.all(
      patientIds.slice(0, 50).map(async (pid: string) => {
        try {
          const { resource } = await patientsContainer.item(pid, pid).read();
          if (resource) patientDocs[pid] = resource;
        } catch { /* ignore missing */ }
      })
    );

    // ── Patients section ─────────────────────────────────────────────────────
    const matchedPatients: any[] = [];
    const seenPatients = new Set<string>();
    for (const pid of patientIds) {
      if (seenPatients.has(pid)) continue;
      seenPatients.add(pid);
      const p = patientDocs[pid];
      if (!p) continue;
      const haystack = [p.fullName, p.email, p.phone, p.gender, p.dob, p.dateOfBirth]
        .filter(Boolean).join(" ").toLowerCase();
      if (haystack.includes(q)) {
        matchedPatients.push({
          type: "patient",
          id: pid,
          title: p.fullName ?? "Patient",
          subtitle: p.email ?? p.phone ?? "",
          avatarUrl: p.avatarUrl ?? null,
          href: `/appointments/patient-details?id=${pid}&from=patients`,
        });
      }
      if (matchedPatients.length >= 5) break;
    }

    // ── Appointments section ─────────────────────────────────────────────────
    const matchedApts: any[] = [];
    for (const a of allApts) {
      if (matchedApts.length >= 5) break;
      const patient = patientDocs[a.patientId];
      const patientName = patient?.fullName ?? "Patient";
      const haystack = [patientName, a.reason, a.status, a.scheduledAt, a.id]
        .filter(Boolean).join(" ").toLowerCase();
      if (haystack.includes(q)) {
        matchedApts.push({
          type: "appointment",
          id: a.id,
          title: patientName,
          subtitle: `${a.id} · ${a.reason ?? "Consultation"} · ${a.status}`,
          date: a.scheduledAt,
          status: a.status,
          avatarUrl: patient?.avatarUrl ?? null,
          href: `/appointments/complete-emr?appointmentId=${a.id}&patientName=${encodeURIComponent(patientName)}`,
        });
      }
    }

    // ── Prescriptions section (appointments that have EMR medicines saved) ───
    const matchedPrescriptions: any[] = [];
    for (const a of allApts) {
      if (matchedPrescriptions.length >= 5) break;
      if (!a.emr?.medicines?.length) continue;
      const patient = patientDocs[a.patientId];
      const patientName = patient?.fullName ?? "Patient";
      const medNames = (a.emr.medicines as any[]).map((m: any) => m.name ?? "").join(" ");
      const haystack = [patientName, medNames, a.reason, a.id].filter(Boolean).join(" ").toLowerCase();
      if (haystack.includes(q)) {
        matchedPrescriptions.push({
          type: "prescription",
          id: a.id,
          title: patientName,
          subtitle: (a.emr.medicines as any[]).slice(0, 3).map((m: any) => m.name).filter(Boolean).join(", "),
          date: a.emr.savedAt ?? a.scheduledAt,
          avatarUrl: patient?.avatarUrl ?? null,
          href: `/appointments/patient-details?id=${a.patientId}&from=patients`,
        });
      }
    }

    res.json({
      patients: matchedPatients,
      appointments: matchedApts,
      prescriptions: matchedPrescriptions,
    });
  } catch (err) {
    console.error("Doctor search error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/doctors/online-status ───────────────────────────────────────
// Doctor toggles their online/offline visibility in the patient app.
router.patch("/online-status", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { isOnline } = req.body;
  if (typeof isOnline !== "boolean") {
    res.status(400).json({ error: "isOnline must be a boolean." });
    return;
  }
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "Doctor not found." }); return; }
    await doctorsContainer.items.upsert({ ...doctor, isOnline, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", isOnline });
  } catch (err) {
    console.error("Update online status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors ───────────────────────────────────────────────────────
// Public or Patient endpoint to list all approved doctors.
// Optional ?clinicId= filters to just that clinic's roster (used by the
// Clinic Profile screen's "Doctors Available" section) — additive, existing
// callers that don't pass it are unaffected.
router.get("/", async (req: Request, res: Response) => {
  const clinicId = typeof req.query.clinicId === "string" ? req.query.clinicId : null;
  try {
    const query = clinicId
      ? "SELECT * FROM c WHERE c.status = @status AND c.clinicId = @clinicId ORDER BY c.approvedAt DESC"
      : "SELECT * FROM c WHERE c.status = @status ORDER BY c.approvedAt DESC";
    const parameters = clinicId
      ? [{ name: "@status", value: "approved" }, { name: "@clinicId", value: clinicId }]
      : [{ name: "@status", value: "approved" }];

    const { resources } = await doctorsContainer.items.query({ query, parameters }).fetchAll();

    res.json({ doctors: resources });
  } catch (err) {
    console.error("Fetch approved doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/:id/stats ─────────────────────────────────────────────
// Public endpoint — returns completed consultation count for a doctor.
router.get("/:id/stats", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { resources } = await appointmentsContainer.items
      .query({
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.doctorId = @doctorId AND c.status = 'completed'",
        parameters: [{ name: "@doctorId", value: id }],
      })
      .fetchAll();
    res.json({ completedConsultations: resources[0] ?? 0 });
  } catch (err) {
    console.error("Fetch doctor stats error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/doctors/:id/reviews ───────────────────────────────────────────
router.get("/:id/reviews", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const reviews = await queryDocuments<any>(feedbackContainer, {
      query: "SELECT * FROM c WHERE c.folder = 'appointment' AND c.provider.id = @doctorId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@doctorId", value: id }],
    });
    const total = reviews.length;
    const avgRating = total > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / total) * 10) / 10
      : null;
    res.json({ reviews, total, avgRating });
  } catch (err) {
    console.error("Fetch doctor reviews error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/doctors/change-password ──────────────────────────────────────
router.post("/change-password", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
    return;
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const signInResult = await EmailPassword.signIn("public", doctor.email, currentPassword);
    if (signInResult.status !== "OK") {
      res.status(403).json({ error: "WRONG_PASSWORD" });
      return;
    }

    const tokenResult = await EmailPassword.createResetPasswordToken("public", doctorId, doctor.email);
    if (tokenResult.status !== "OK") { res.status(500).json({ error: "RESET_TOKEN_FAILED" }); return; }

    const resetResult = await EmailPassword.resetPasswordUsingToken("public", tokenResult.token, newPassword);
    if (resetResult.status !== "OK") { res.status(500).json({ error: "RESET_FAILED" }); return; }

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Doctor change-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/doctors/notifications ───────────────────────────────────────
router.patch("/notifications", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  const { emailFreq, appToggles } = req.body;

  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "Doctor not found." }); return; }

    const updated = {
      ...doctor,
      notificationPreferences: {
        emailFreq:  emailFreq  ?? doctor.notificationPreferences?.emailFreq  ?? "instant",
        appToggles: appToggles ?? doctor.notificationPreferences?.appToggles ?? {},
      },
      updatedAt: new Date().toISOString(),
    };

    await doctorsContainer.items.upsert(updated);
    res.json({ status: "OK", notificationPreferences: updated.notificationPreferences });
  } catch (err) {
    console.error("Doctor notifications update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/doctors/reset-password ───────────────────────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) { res.status(400).json({ error: "email and newPassword are required" }); return; }
    if (newPassword.length < 8) { res.status(400).json({ error: "PASSWORD_TOO_SHORT" }); return; }

    const normalizedEmail = email.trim().toLowerCase();

    const { resources: otpDocs } = await otpCodesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email AND c.verified = true ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    if (!otpDocs.length) { res.status(403).json({ error: "OTP_NOT_VERIFIED" }); return; }

    const { resources: doctorDocs } = await doctorsContainer.items
      .query({
        query: "SELECT c.id FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    if (!doctorDocs.length) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const supertokensId = doctorDocs[0].id;
    const tokenResult = await EmailPassword.createResetPasswordToken("public", supertokensId, normalizedEmail);
    if (tokenResult.status !== "OK") { res.status(500).json({ error: "RESET_TOKEN_FAILED" }); return; }

    const resetResult = await EmailPassword.resetPasswordUsingToken("public", tokenResult.token, newPassword);
    if (resetResult.status !== "OK") { res.status(500).json({ error: "RESET_FAILED", detail: resetResult.status }); return; }

    try { await otpCodesContainer.item(otpDocs[0].id, otpDocs[0].email).delete(); } catch {}

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Doctor reset-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/doctors/2fa/status ─────────────────────────────────────────────
router.get("/2fa/status", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    res.json({ twoFactorEnabled: doctor?.twoFactorEnabled === true });
  } catch (err) {
    console.error("2FA status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/doctors/2fa/enable ────────────────────────────────────────────
router.post("/2fa/enable", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "Doctor profile not found." }); return; }
    await doctorsContainer.items.upsert({ ...doctor, twoFactorEnabled: true, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", twoFactorEnabled: true });
  } catch (err) {
    console.error("2FA enable error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/doctors/2fa/disable ───────────────────────────────────────────
router.post("/2fa/disable", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "Doctor profile not found." }); return; }
    await doctorsContainer.items.upsert({ ...doctor, twoFactorEnabled: false, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", twoFactorEnabled: false });
  } catch (err) {
    console.error("2FA disable error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/doctors/me ──────────────────────────────────────────────────
// Marks the doctor's account as deleted in Cosmos DB and revokes all sessions.
// Data is preserved so patients retain access to their appointment history.
router.delete("/me", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  const doctorId = req.session!.getUserId();
  try {
    const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read();
    if (!doctor) { res.status(404).json({ error: "Doctor not found." }); return; }

    await doctorsContainer.items.upsert({
      ...doctor,
      status: "deleted",
      deletedAt: new Date().toISOString(),
    });

    await req.session!.revokeSession();
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Doctor delete-account error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

