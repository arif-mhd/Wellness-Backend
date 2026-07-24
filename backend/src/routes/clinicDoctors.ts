import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import Session from "supertokens-node/recipe/session";
import RecipeUserId from "supertokens-node/lib/build/recipeUserId";
import multer from "multer";
import { requireRole } from "../middleware/requireRole";
import {
  doctorsContainer,
  appointmentsContainer,
  feedbackContainer,
  patientsContainer,
  queryDocuments,
} from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";
import { uploadBlob, generateSasUrl } from "../config/blob";
import { resolveClinicScope, scopeToClinicIds, buildInClause, getActorClinicIds } from "../utils/clinicScope";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Loads a doctor by id and confirms it belongs to the calling clinic.
// Returns null (and has already sent a 404) if not found or not owned —
// deliberately the same response either way, so a clinic can't probe for
// the existence of another clinic's doctor.
async function getOwnedDoctorOr404(clinicId: string, doctorId: string, res: Response) {
  const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read().catch(() => ({ resource: undefined as any }));
  if (!doctor || doctor.clinicId !== clinicId) {
    res.status(404).json({ error: "Doctor not found." });
    return null;
  }
  return doctor;
}

async function populateDoctorStats(doctors: any[]) {
  if (doctors.length === 0) return doctors;

  const appointments = await queryDocuments<any>(appointmentsContainer, {
    query: "SELECT c.doctorId, c.status, c.emr, c.visitType FROM c WHERE c.status IN ('completed', 'in_progress')",
  });
  const feedbacks = await queryDocuments<any>(feedbackContainer, {
    query: "SELECT c.provider.id AS doctorId, c.rating FROM c WHERE c.folder = 'appointment'",
  });

  for (const doc of doctors) {
    const docAppts = appointments.filter((a) => a.doctorId === doc.id);
    const docFeedbacks = feedbacks.filter((f) => f.doctorId === doc.id);

    doc.consultations = docAppts.length;
    doc.consultationsOnline = docAppts.filter((a) => a.visitType === "online").length;
    doc.prescriptions = docAppts.filter((a) => Array.isArray(a.emr?.medicines) && a.emr.medicines.length > 0).length;

    if (docFeedbacks.length > 0) {
      const sum = docFeedbacks.reduce((s, f) => s + (f.rating ?? 0), 0);
      doc.rating = Math.round((sum / docFeedbacks.length) * 10) / 10;
    } else {
      doc.rating = 0;
    }

    // Consultations per week since the clinic added this doctor — a rough
    // "how busy" indicator for the Manage Doctors table.
    const weeksSinceAdded = doc.approvedAt
      ? Math.max(1, (Date.now() - new Date(doc.approvedAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 1;
    doc.avgConsultation = Math.round((docAppts.length / weeksSinceAdded) * 10) / 10;
  }

  return doctors;
}

// ─── POST /api/clinics/doctors/upload ────────────────────────────────────────
// Staged file upload for the Add Doctor wizard, keyed by a client draftId,
// mirrors POST /api/admin/doctors/upload.
router.post(
  "/upload",
  requireRole("clinic"),
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "emiratesId", maxCount: 1 },
    { name: "resume", maxCount: 1 },
    { name: "specCert", maxCount: 5 },
  ]),
  async (req: Request, res: Response) => {
    const draftId = (req.body?.draftId as string) || `draft_${Date.now()}`;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string | string[]> = {};

    const MIME_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "application/pdf": "pdf",
    };

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        if (field === "specCert") {
          const specUrls: string[] = [];
          for (const file of fileArr) {
            const ext = MIME_EXT[file.mimetype] ?? "bin";
            const blobPath = `doctors/${draftId}/specCert_${Date.now()}_${specUrls.length}.${ext}`;
            await uploadBlob(blobPath, file.buffer, file.mimetype);
            specUrls.push(generateSasUrl(blobPath));
          }
          urls.specCert = specUrls;
          continue;
        }
        const file = fileArr[0];
        const ext = MIME_EXT[file.mimetype] ?? "bin";
        const blobPath = `doctors/${draftId}/${field}_${Date.now()}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Clinic doctor file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

// ─── POST /api/clinics/doctors ───────────────────────────────────────────────
// Clinic creates a fully-onboarded doctor account in one step: real
// SuperTokens credentials (the clinic sets the initial password directly —
// nothing is ever stored or read back), role "doctor" assigned immediately
// (no pending queue — the clinic is the vetting authority for its own
// doctors), status "approved", stamped with clinicId. Mirrors
// POST /api/admin/doctors.
router.post("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  const {
    email, password, fullName, phone,
    dateOfBirth, gender, emiratesId, bloodGroup, height, weight, address, languages, otherInfo,
    avatarUrl, emiratesIdFileUrl,
    specialty, license, qualification, specializations,
    fees, consultationRates, paymentSettings, resumeFileUrl,
    bio,
  } = req.body;

  if (!email || !password || !fullName || !phone) {
    res.status(400).json({ error: "email, password, fullName and phone are required." });
    return;
  }

  try {
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: "Could not create the doctor's account. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;
    await UserRoles.addRoleToUser("public", supertokensId, "doctor");

    const now = new Date().toISOString();
    const doctorDoc = {
      id: supertokensId,
      supertokens_id: supertokensId,
      status: "approved",
      email,
      fullName,
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      emiratesId: emiratesId || null,
      bloodGroup: bloodGroup || null,
      height: height || null,
      weight: weight || null,
      address: address || null,
      languages: languages || null,
      otherInfo: otherInfo ?? [],
      avatarUrl: avatarUrl || null,
      emiratesIdFileUrl: emiratesIdFileUrl || null,
      specialty: specialty || null,
      license: license || null,
      qualification: qualification || null,
      specializations: specializations ?? [],
      fees: fees ?? null,
      consultationRates: consultationRates ?? [],
      paymentSettings: paymentSettings || null,
      resumeFileUrl: resumeFileUrl || null,
      bio: bio || null,
      slots: [],
      isOnline: true,
      registeredAt: now,
      approvedAt: now,
      approvedBy: scope.actorId,
      createdByClinic: true,
      clinicId,
      profileCompletedAt: now,
    };

    await doctorsContainer.items.upsert(doctorDoc);

    logActivity({
      source: "clinic",
      action: "Doctor Added",
      details: `Dr. ${fullName} added by clinic (${specialty ?? "specialty TBD"})`,
      performedBy: "Clinic",
      performedById: scope.actorId,
      entityType: "doctor",
      entityId: supertokensId,
    });

    res.status(201).json({ status: "OK", doctor: doctorDoc });
  } catch (err) {
    console.error("Clinic create doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/doctors ────────────────────────────────────────────────
router.get("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);

  try {
    let resources: any[] = [];
    if (clinicIds.length > 0) {
      const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
      const result = await doctorsContainer.items
        .query({
          query: `SELECT * FROM c WHERE ${clause} AND c.status = 'approved' ORDER BY c.approvedAt DESC`,
          parameters,
        })
        .fetchAll();
      resources = result.resources;
    }

    const populated = await populateDoctorStats(resources);
    res.json({ doctors: populated });
  } catch (err) {
    console.error("Fetch clinic doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/doctors/:id ────────────────────────────────────────────
router.get("/:id", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;
    const [populated] = await populateDoctorStats([doctor]);
    res.json({ doctor: populated });
  } catch (err) {
    console.error("Fetch clinic doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/doctors/:id ──────────────────────────────────────────
router.patch("/:id", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  const {
    fullName, bio, eligibility, specialty, license, qualification, specializations,
    address, languages, fees, consultationRates, paymentSettings,
    avatarUrl, resumeFileUrl, phone, gender, dateOfBirth, bloodGroup, height, weight,
  } = req.body;

  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    const updated = {
      ...doctor,
      fullName:          fullName          ?? doctor.fullName,
      bio:               bio               ?? doctor.bio,
      eligibility:       eligibility       ?? doctor.eligibility,
      specialty:         specialty         ?? doctor.specialty,
      license:           license           ?? doctor.license,
      qualification:     qualification     ?? doctor.qualification,
      specializations:   specializations   ?? doctor.specializations,
      address:           address           ?? doctor.address,
      languages:         languages         ?? doctor.languages,
      fees:              fees              ?? doctor.fees,
      consultationRates: consultationRates ?? doctor.consultationRates,
      paymentSettings:   paymentSettings   ?? doctor.paymentSettings,
      avatarUrl:         avatarUrl         ?? doctor.avatarUrl,
      resumeFileUrl:     resumeFileUrl     ?? doctor.resumeFileUrl,
      phone:             phone             ?? doctor.phone,
      gender:            gender            ?? doctor.gender,
      dateOfBirth:       dateOfBirth       ?? doctor.dateOfBirth,
      bloodGroup:        bloodGroup        ?? doctor.bloodGroup,
      height:            height            ?? doctor.height,
      weight:            weight            ?? doctor.weight,
      updatedAt: new Date().toISOString(),
    };

    await doctorsContainer.items.upsert(updated);
    res.json({ status: "OK", doctor: updated });
  } catch (err) {
    console.error("Update clinic doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/doctors/:id/online-status ────────────────────────────
router.patch("/:id/online-status", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  const { isOnline } = req.body;
  if (typeof isOnline !== "boolean") {
    res.status(400).json({ error: "isOnline must be a boolean." });
    return;
  }
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;
    await doctorsContainer.items.upsert({ ...doctor, isOnline, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", isOnline });
  } catch (err) {
    console.error("Update clinic doctor online status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/doctors/:id/reset-password ────────────────────────────
// Clinic sets a brand-new password for the doctor directly. The password is
// only ever known to whoever typed it into this request — nothing is stored
// or returned by this endpoint or any other.
router.post("/:id/reset-password", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  const { password } = req.body;
  if (!password || password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters." });
    return;
  }
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    const result = await EmailPassword.updateEmailOrPassword({
      recipeUserId: new RecipeUserId(doctor.id),
      password,
    });
    if (result.status !== "OK") {
      res.status(400).json({ error: "Could not reset the doctor's password." });
      return;
    }

    logActivity({
      source: "clinic",
      action: "Doctor Credentials Reset",
      details: `Dr. ${doctor.fullName ?? doctor.id} credentials reset by clinic`,
      performedBy: "Clinic",
      performedById: scope.actorId,
      entityType: "doctor",
      entityId: doctor.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Reset clinic doctor password error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/clinics/doctors/:id/slots ──────────────────────────────────────
// Clinic sets the doctor's weekly availability directly — no tempSlots/
// pending-verification step, since the clinic is the authority for its own
// doctors (unlike the legacy self-registered-doctor + admin-verifies flow).
router.put("/:id/slots", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  const { slots } = req.body;
  if (!Array.isArray(slots)) {
    res.status(400).json({ error: "slots must be an array." });
    return;
  }
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;
    await doctorsContainer.items.upsert({ ...doctor, slots, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", slots });
  } catch (err) {
    console.error("Update clinic doctor slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/doctors/:id/verify-slots ──────────────────────────────
// Promotes a doctor's pending schedule change (submitted via their own
// self-service dashboard) into their live slots. Mirrors
// POST /api/admin/doctors/:id/verify-slots, scoped to the clinic's own
// doctors — this is what the Home page's task-list "Approve" action calls.
//
// The task list itself is built from the caller's *aggregate* view (every
// branch's pending schedule changes, shown together on the main dashboard),
// but the "Approve" button doesn't know which specific branch a given task's
// doctor belongs to — so ownership here is checked against every clinic id
// the caller can act as (getActorClinicIds), not a single resolved branch
// scope. Using resolveClinicScope's single-branch mode here would 400 for
// any doctor outside whichever branch happens to be selected in the URL.
router.post("/:id/verify-slots", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const actorId = req.session!.getUserId();
  try {
    const allowedClinicIds = await getActorClinicIds(actorId);
    const { resource: doctor } = await doctorsContainer
      .item(req.params.id, req.params.id)
      .read()
      .catch(() => ({ resource: undefined as any }));
    if (!doctor || !allowedClinicIds.includes(doctor.clinicId)) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    const updatedDoctor = {
      ...doctor,
      slots: doctor.tempSlots ?? doctor.slots,
      slotsPending: false,
      slotsVerifiedAt: new Date().toISOString(),
      slotsVerifiedBy: actorId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "clinic",
      action: "Doctor Slots Verified",
      details: `Dr. ${doctor.fullName ?? doctor.id} availability slots verified by clinic`,
      performedBy: "Clinic",
      performedById: actorId,
      entityType: "doctor",
      entityId: doctor.id,
    });

    res.json({ status: "OK", doctor: updatedDoctor });
  } catch (err) {
    console.error("Verify clinic doctor slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/doctors/:id/absences ──────────────────────────────────
router.post("/:id/absences", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  const { startDate, endDate, reason, fileUrl, fileName } = req.body;
  if (!startDate || !endDate || !reason) {
    res.status(400).json({ error: "startDate, endDate, and reason are required." });
    return;
  }
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    const rangeStart = new Date(new Date(startDate).getTime() - 30 * 60 * 1000).toISOString();
    const appts = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.id, c.scheduledAt, c.durationMins FROM c
              WHERE c.doctorId = @doctorId AND c.status != 'cancelled'
                AND c.scheduledAt >= @rangeStart AND c.scheduledAt <= @rangeEnd`,
      parameters: [
        { name: "@doctorId", value: doctor.id },
        { name: "@rangeStart", value: rangeStart },
        { name: "@rangeEnd", value: endDate },
      ],
    });

    const conflicts = appts.filter((a) => {
      const apptStart = new Date(a.scheduledAt);
      const apptEnd = new Date(apptStart.getTime() + (a.durationMins || 30) * 60 * 1000);
      return apptStart < new Date(endDate) && apptEnd > new Date(startDate);
    });

    if (conflicts.length > 0) {
      res.status(409).json({
        error: "There are appointments booked during this absence window. Please reschedule them first.",
        conflicts,
      });
      return;
    }

    const now = new Date().toISOString();
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffHours = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60));
    const duration = diffHours >= 24 ? `${Math.round(diffHours / 24)} day(s)` : `${diffHours} hour(s)`;

    const newAbsence = {
      id: "abs_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      startDate, endDate, reason, duration,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      createdAt: now,
      status: "approved",
    };

    const updatedAbsences = [...(doctor.absences ?? []), newAbsence];
    await doctorsContainer.items.upsert({ ...doctor, absences: updatedAbsences, updatedAt: now });

    res.status(201).json({ status: "OK", absences: updatedAbsences });
  } catch (err) {
    console.error("Create clinic doctor absence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/doctors/:id/absences/:absenceId ────────────────────
router.delete("/:id/absences/:absenceId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    const updatedAbsences = (doctor.absences ?? []).filter((a: any) => a.id !== req.params.absenceId);
    await doctorsContainer.items.upsert({ ...doctor, absences: updatedAbsences, updatedAt: new Date().toISOString() });

    res.json({ status: "OK", absences: updatedAbsences });
  } catch (err) {
    console.error("Delete clinic doctor absence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/doctors/:id/absences/:absenceId/status ──────────────
// Ownership is checked against every clinic id the caller can act as
// (getActorClinicIds), not a single resolved branch scope — the Doctors
// Timing tab lists doctors across every branch at once when viewing "All",
// so approving an absence for a doctor outside whichever branch happens to
// be selected in the URL must not 400. Same fix as POST /:id/verify-slots.
router.patch("/:id/absences/:absenceId/status", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const actorId = req.session!.getUserId();
  const { status } = req.body;

  if (status !== "approved" && status !== "rejected") {
    res.status(400).json({ error: "Invalid status." });
    return;
  }

  try {
    const allowedClinicIds = await getActorClinicIds(actorId);
    const { resource: doctor } = await doctorsContainer
      .item(req.params.id, req.params.id)
      .read()
      .catch(() => ({ resource: undefined as any }));
    if (!doctor || !allowedClinicIds.includes(doctor.clinicId)) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    const currentAbsences = doctor.absences ?? [];
    let updated = false;
    const updatedAbsences = currentAbsences.map((abs: any) => {
      if (abs.id === req.params.absenceId) {
        updated = true;
        return { ...abs, status };
      }
      return abs;
    });

    if (!updated) {
      res.status(404).json({ error: "Absence not found." });
      return;
    }

    await doctorsContainer.items.upsert({ ...doctor, absences: updatedAbsences, updatedAt: new Date().toISOString() });

    res.json({ status: "OK", absences: updatedAbsences });
  } catch (err) {
    console.error("Update clinic doctor absence status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/doctors/:id/consultations ──────────────────────────────
router.get("/:id/consultations", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    const appts = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT * FROM c WHERE c.doctorId = @doctorId ORDER BY c.scheduledAt DESC",
      parameters: [{ name: "@doctorId", value: doctor.id }],
    });

    const patientIds = Array.from(new Set(appts.map((a) => a.patientId).filter(Boolean)));
    const patientDocs: Record<string, any> = {};
    for (const pid of patientIds) {
      try {
        const { resource } = await patientsContainer.item(pid, pid).read();
        if (resource) patientDocs[pid] = resource;
      } catch { /* skip */ }
    }

    const consultations = appts.map((a) => {
      const patient = patientDocs[a.patientId];
      const dob = patient?.dateOfBirth ?? patient?.dob ?? null;
      const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      return {
        id: a.id,
        patientId: a.patientId,
        patientName: patient?.fullName ?? "Patient",
        patientEmail: patient?.email ?? "",
        patientAvatarUrl: patient?.avatarUrl ?? null,
        patientAge: age,
        reason: a.reason ?? "General Consultation",
        primaryDiagnosis: a.status === "completed" ? (a.emr?.sections?.impressionAndPlan?.trim() || "No diagnosis recorded") : "Pending",
        status: a.status,
        scheduledAt: a.scheduledAt,
        patientWaitingSince: a.patientWaitingSince ?? null,
        hasReport: !!a.emr?.savedAt,
        preVisitData: a.preVisitData ?? null,
      };
    });

    res.json({ consultations });
  } catch (err) {
    console.error("Fetch clinic doctor consultations error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/doctors/:id/reviews ────────────────────────────────────
router.get("/:id/reviews", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    const reviews = await queryDocuments<any>(feedbackContainer, {
      query: "SELECT * FROM c WHERE c.folder = 'appointment' AND c.provider.id = @doctorId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@doctorId", value: doctor.id }],
    });

    const total = reviews.length;
    const avgRating = total > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / total) * 10) / 10
      : null;

    res.json({ reviews, total, avgRating });
  } catch (err) {
    console.error("Fetch clinic doctor reviews error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/doctors/:id ──────────────────────────────────────────
// Soft-delete: data is preserved so patients retain access to appointment
// history, but the doctor's account is deactivated and all sessions revoked.
router.delete("/:id", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;
  const clinicId = scope.scopeId;
  try {
    const doctor = await getOwnedDoctorOr404(clinicId, req.params.id, res);
    if (!doctor) return;

    await doctorsContainer.items.upsert({
      ...doctor,
      status: "deleted",
      deletedAt: new Date().toISOString(),
    });

    await Session.revokeAllSessionsForUser(doctor.id);

    logActivity({
      source: "clinic",
      action: "Doctor Removed",
      details: `Dr. ${doctor.fullName ?? doctor.id} removed by clinic`,
      performedBy: "Clinic",
      performedById: scope.actorId,
      entityType: "doctor",
      entityId: doctor.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete clinic doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
