import { Router, Request, Response } from "express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { clinicsContainer, otpCodesContainer, doctorsContainer, appointmentsContainer, patientsContainer, feedbackContainer, queryDocuments } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import multer from "multer";
import { uploadBlob, generateSasUrl } from "../config/blob";
import { logActivity } from "../utils/activityLogger";
import { resolveClinicScope, scopeToClinicIds, buildInClause } from "../utils/clinicScope";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── POST /api/clinics/upload ────────────────────────────────────────────────
// Multipart file upload for clinic profile assets.
// Field names: logo | addressProof | spcContract
// Returns a SAS URL for each uploaded file.
router.post(
  "/upload",
  requireRole("clinic_pending", "clinic"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "spcContract", maxCount: 1 },
  ]),
  async (req: SessionRequest, res: Response) => {
    const clinicId = req.session!.getUserId();
    const files = req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};

    const MIME_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "application/pdf": "pdf",
    };

    // A multi-branch registration uploads each branch's files separately
    // (its own logo/address proof) — without this, every branch's upload
    // would land on the exact same blob path and silently overwrite the
    // previous branch's file.
    const branchIndex = typeof req.body?.branchIndex === "string" && req.body.branchIndex !== ""
      ? req.body.branchIndex
      : null;

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        const ext = MIME_EXT[file.mimetype] ?? "bin";
        const blobPath = branchIndex !== null
          ? `clinics/${clinicId}/branch-${branchIndex}/${field}.${ext}`
          : `clinics/${clinicId}/${field}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Clinic file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

// ─── GET /api/clinics/me ─────────────────────────────────────────────────────
// Returns the currently logged-in clinic's own profile. A branch user's own
// doc only carries their personal details (name, phone, email...) — the
// branch's business identity (name, logo, hours, bio, licenses) lives on the
// org doc's branches[] entry instead, so it's merged in here. This is what
// makes a branch senior's login render a fully working single-clinic-style
// dashboard (same screens the org owner sees) rather than a blank shell.
router.get("/me", requireRole("clinic_pending", "clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = req.session!.getUserId();
  try {
    const { resource: clinic } = await clinicsContainer.item(clinicId, clinicId).read();
    if (!clinic) { res.status(404).json({ error: "Clinic not found." }); return; }

    if (clinic.branchId && clinic.orgId) {
      const { resource: org } = await clinicsContainer.item(clinic.orgId, clinic.orgId).read().catch(() => ({ resource: undefined as any }));
      const branch = org?.branches?.find((b: any) => b.id === clinic.branchId);
      if (branch) {
        res.json({
          clinic: {
            ...clinic,
            emiratesIdOrPassport: clinic.emiratesIdOrPassport ?? clinic.emiratesId ?? null,
            fullName: branch.name,
            clinicImageUrl: branch.clinicImageUrl ?? null,
            slots: branch.slots ?? [],
            isOnline: branch.isOnline,
            bio: branch.bio ?? null,
            licenseNumber: branch.licenseNumber ?? null,
            dohLicense: branch.dohLicense ?? null,
            address: branch.address ?? clinic.address ?? null,
            consultationRates: branch.consultationRates ?? [],
            paymentSettings: branch.paymentSettings ?? null,
            insurances: org.insurances ?? [],
            isMultiBranchOrg: false,
          },
        });
        return;
      }
    }

    res.json({ clinic });
  } catch (err) {
    console.error("Get clinic me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/register ─────────────────────────────────────────────
// Public endpoint — called by the clinic registration signup flow (step 4).
// Creates the SuperTokens account, assigns the "clinic_pending" role,
// and saves the basic registration details to Cosmos with status "pending_approval".
// The clinic CANNOT log in to the clinic dashboard until an admin approves them.
router.post("/register", async (req: Request, res: Response) => {
  const {
    email,
    password,
    fullName,
    phone,
    dateOfBirth,
    gender,
    emiratesIdOrPassport,
  } = req.body;

  if (!email || !password || !fullName || !phone) {
    res.status(400).json({
      error: "email, password, fullName and phone are required.",
    });
    return;
  }

  try {
    // ── 0. Confirm OTP was verified for this email ────────────────────────
    const normalizedEmail = email.trim().toLowerCase();
    const { resources: otpDocs } = await otpCodesContainer.items
      .query({
        query:
          "SELECT * FROM c WHERE c.email = @email AND c.verified = true ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    if (!otpDocs.length) {
      res.status(403).json({ error: "OTP_NOT_VERIFIED" });
      return;
    }

    // ── 1. Create SuperTokens account ─────────────────────────────────────
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: "Registration failed. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;

    // ── 2. Assign "clinic_pending" role ────────────────────────────────────
    // This role blocks the clinic dashboard. It is upgraded to "clinic" on approval.
    await UserRoles.addRoleToUser("public", supertokensId, "clinic_pending");

    // ── 3. Save registration details to Cosmos ────────────────────────────
    const now = new Date().toISOString();
    const clinicDoc = {
      id: supertokensId,   // Cosmos id = ST userId
      supertokens_id: supertokensId,
      status: "pending_approval",
      email,
      fullName,
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      emiratesIdOrPassport: emiratesIdOrPassport || null,
      // Fields filled in after onboarding
      positionInClinic: null,
      languages: null,
      otherInfo: [],
      insurances: [],
      licenseNumber: null,
      licenseVerified: false,
      dohLicense: null,
      dohLicenseVerified: false,
      address: null,
      addressProofFileUrl: null,
      addressProofVerified: false,
      consultationRates: [],
      paymentSettings: null,
      bio: null,
      clinicImageUrl: null,
      slots: [],
      // Timestamps
      registeredAt: now,
      approvedAt: null,
      approvedBy: null,
    };

    await clinicsContainer.items.upsert(clinicDoc);

    res.status(201).json({ status: "OK", message: "Registration submitted successfully." });
  } catch (err) {
    console.error("Clinic registration error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/clinics/profile ───────────────────────────────────────────────
// Clinic submits their full onboarding profile after signup.
// Called by the complete-profile wizard. Saves all details to Cosmos.
router.put("/profile", requireRole("clinic_pending", "clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = req.session!.getUserId();
  const {
    // Owner's personal information
    fullName, phone, emiratesIdOrPassport, email, gender, dateOfBirth,
    positionInClinic, languages, otherInfo,
    bloodGroup, maritalStatus, height, weight,
    // Insurances
    insurances,
    // Clinic / company information
    licenseNumber, dohLicense, address, addressProofFileUrl,
    consultationRates, paymentSettings, bio, clinicImageUrl,
    // Timeslots
    slots,
    // Multi-branch (registration-time only — see clinicBranches.ts for
    // everything post-approval)
    isMultiBranchOrg, branches,
  } = req.body;

  try {
    const { resource: clinic } = await clinicsContainer.item(clinicId, clinicId).read();
    if (!clinic) {
      res.status(404).json({ error: "Clinic profile not found." });
      return;
    }

    // A branch user's personal fields (name, contact info...) live on their
    // own doc, but the branch's business fields (hours, bio, licenses...)
    // live on the org doc's branches[] entry — see GET /me for the same
    // split. Without this, e.g. the Schedules page's save would silently
    // write slots to a field GET /me never reads back for a branch user.
    if (clinic.branchId && clinic.orgId) {
      const { resource: org } = await clinicsContainer.item(clinic.orgId, clinic.orgId).read().catch(() => ({ resource: undefined as any }));
      if (!org) { res.status(404).json({ error: "Clinic profile not found." }); return; }

      const updatedUser = {
        ...clinic,
        fullName:             fullName             ?? clinic.fullName,
        phone:                phone                ?? clinic.phone,
        emiratesIdOrPassport: emiratesIdOrPassport ?? clinic.emiratesIdOrPassport ?? clinic.emiratesId,
        emiratesId:           emiratesIdOrPassport ?? clinic.emiratesId,
        email:                email                ?? clinic.email,
        gender:               gender               ?? clinic.gender,
        dateOfBirth:          dateOfBirth          ?? clinic.dateOfBirth,
        positionInClinic:     positionInClinic     ?? clinic.positionInClinic,
        languages:            languages            ?? clinic.languages,
        otherInfo:            otherInfo            ?? clinic.otherInfo,
        bloodGroup:           bloodGroup           ?? clinic.bloodGroup,
        maritalStatus:        maritalStatus        ?? clinic.maritalStatus,
        height:               height               ?? clinic.height,
        weight:               weight               ?? clinic.weight,
        updatedAt: new Date().toISOString(),
      };
      await clinicsContainer.items.upsert(updatedUser);

      const branchFieldsProvided = [licenseNumber, dohLicense, address, addressProofFileUrl, consultationRates, paymentSettings, bio, clinicImageUrl, slots].some((v) => v !== undefined);
      let updatedBranch = (org.branches ?? []).find((b: any) => b.id === clinic.branchId) ?? null;
      if (branchFieldsProvided && updatedBranch) {
        const branches = (org.branches ?? []).map((b: any) => {
          if (b.id !== clinic.branchId) return b;
          updatedBranch = {
            ...b,
            licenseNumber:       licenseNumber       ?? b.licenseNumber,
            dohLicense:          dohLicense          ?? b.dohLicense,
            address:             address             ?? b.address,
            addressProofFileUrl: addressProofFileUrl ?? b.addressProofFileUrl,
            consultationRates:   consultationRates   ?? b.consultationRates,
            paymentSettings:     paymentSettings     ?? b.paymentSettings,
            bio:                 bio                 ?? b.bio,
            clinicImageUrl:      clinicImageUrl      ?? b.clinicImageUrl,
            slots:               slots               ?? b.slots,
          };
          return updatedBranch;
        });
        await clinicsContainer.items.upsert({ ...org, branches, updatedAt: new Date().toISOString() });
      }

      logActivity({
        source: "clinic",
        action: "Branch Profile Updated",
        details: `${updatedUser.fullName ?? clinicId} updated branch "${updatedBranch?.name ?? clinic.branchId}"`,
        performedBy: updatedUser.fullName ?? "Clinic",
        performedById: clinicId,
        entityType: "clinic",
        entityId: clinicId,
      });

      res.json({
        status: "OK",
        clinic: {
          ...updatedUser,
          fullName: updatedBranch?.name ?? updatedUser.fullName,
          clinicImageUrl: updatedBranch?.clinicImageUrl ?? null,
          slots: updatedBranch?.slots ?? [],
          isOnline: updatedBranch?.isOnline,
          bio: updatedBranch?.bio ?? null,
          licenseNumber: updatedBranch?.licenseNumber ?? null,
          dohLicense: updatedBranch?.dohLicense ?? null,
          address: updatedBranch?.address ?? updatedUser.address ?? null,
          consultationRates: updatedBranch?.consultationRates ?? [],
          paymentSettings: updatedBranch?.paymentSettings ?? null,
          insurances: org.insurances ?? [],
          isMultiBranchOrg: false,
        },
      });
      return;
    }

    const updated = {
      ...clinic,
      fullName:              fullName              ?? clinic.fullName,
      phone:                 phone                 ?? clinic.phone,
      emiratesIdOrPassport:  emiratesIdOrPassport  ?? clinic.emiratesIdOrPassport,
      email:                 email                 ?? clinic.email,
      gender:                gender                ?? clinic.gender,
      dateOfBirth:           dateOfBirth           ?? clinic.dateOfBirth,
      positionInClinic:      positionInClinic      ?? clinic.positionInClinic,
      languages:             languages             ?? clinic.languages,
      otherInfo:             otherInfo             ?? clinic.otherInfo,
      bloodGroup:            bloodGroup            ?? clinic.bloodGroup,
      maritalStatus:         maritalStatus         ?? clinic.maritalStatus,
      height:                height                ?? clinic.height,
      weight:                weight                ?? clinic.weight,
      insurances:            insurances            ?? clinic.insurances,
      licenseNumber:         licenseNumber         ?? clinic.licenseNumber,
      dohLicense:            dohLicense            ?? clinic.dohLicense,
      address:               address               ?? clinic.address,
      addressProofFileUrl:   addressProofFileUrl   ?? clinic.addressProofFileUrl,
      consultationRates:     consultationRates     ?? clinic.consultationRates,
      paymentSettings:       paymentSettings       ?? clinic.paymentSettings,
      bio:                   bio                   ?? clinic.bio,
      clinicImageUrl:        clinicImageUrl        ?? clinic.clinicImageUrl,
      slots:                 slots                 ?? clinic.slots,
      isMultiBranchOrg:      isMultiBranchOrg       ?? clinic.isMultiBranchOrg,
      branches:              branches               ?? clinic.branches,
      profileCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await clinicsContainer.items.upsert(updated);

    logActivity({
      source: "clinic",
      action: "Clinic Profile Updated",
      details: `${updated.fullName ?? clinicId} submitted their clinic profile`,
      performedBy: updated.fullName ?? "Clinic",
      performedById: clinicId,
      entityType: "clinic",
      entityId: clinicId,
    });

    res.json({ status: "OK", clinic: updated });
  } catch (err) {
    console.error("Update clinic profile error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/dashboard ──────────────────────────────────────────────
// One-call aggregation for the clinic Home page: today/yesterday consultation
// counts, this/last month revenue, patients currently waiting online, a
// handful of upcoming appointments, and a live-derived "tasks" list. Nothing
// here is stored — same "compute from appointments/doctors on read" pattern
// as doctors.ts's own GET /doctor/tasks, just aggregated across the clinic's
// whole doctor roster instead of one doctor. This is entirely separate from
// (and doesn't touch) the doctor-portal's own /api/appointments/doctor/tasks.
// Must come before GET /:id below, or Express would match "dashboard" as an id.
router.get("/dashboard", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);

  try {
    let clinicDoctors: any[] = [];
    if (clinicIds.length > 0) {
      const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
      const { resources } = await doctorsContainer.items
        .query({
          query: `SELECT * FROM c WHERE ${clause} AND c.status = 'approved'`,
          parameters,
        })
        .fetchAll();
      clinicDoctors = resources;
    }
    const doctorIds: string[] = clinicDoctors.map((d: any) => d.id);
    const doctorNameById: Record<string, string> = {};
    clinicDoctors.forEach((d: any) => { doctorNameById[d.id] = d.fullName ?? "Doctor"; });

    let appointments: any[] = [];
    if (doctorIds.length > 0) {
      appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT * FROM c WHERE c.doctorId IN (${doctorIds.map((_, i) => `@d${i}`).join(", ")})`,
        parameters: doctorIds.map((id, i) => ({ name: `@d${i}`, value: id })),
      });
    }

    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
    const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const inRange = (iso: string, start: Date, end: Date) => {
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t < end.getTime();
    };

    const nonCancelled = appointments.filter((a) => a.status !== "cancelled");
    const consultationsToday = nonCancelled.filter((a) => inRange(a.scheduledAt, startOfToday, startOfTomorrow)).length;
    const consultationsYesterday = nonCancelled.filter((a) => inRange(a.scheduledAt, startOfYesterday, startOfToday)).length;

    const sumRevenue = (start: Date, end: Date) =>
      nonCancelled
        .filter((a) => inRange(a.scheduledAt, start, end))
        .reduce((sum, a) => sum + (a.paymentAmount ?? 0), 0);
    const revenueThisMonth = sumRevenue(startOfThisMonth, startOfNextMonth);
    const revenueLastMonth = sumRevenue(startOfLastMonth, startOfThisMonth);

    const waitingAppointments = appointments.filter(
      (a) => a.patientWaitingSince && a.status !== "completed" && a.status !== "cancelled"
    );

    const upcoming = appointments
      .filter((a) => a.status === "scheduled" && new Date(a.scheduledAt).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);

    const missingDocs = appointments.filter((a) => a.status === "completed" && !a.emr);

    // Last 8 days of consultation volume, for the "Patients This Month" trend card.
    const patientsTrend = Array.from({ length: 8 }, (_, idx) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - (7 - idx));
      const dateStr = d.toISOString().slice(0, 10);
      const count = nonCancelled.filter((a) => a.scheduledAt?.slice(0, 10) === dateStr).length;
      return { label: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }), count };
    });

    // Batch-fetch patient details needed for waiting list + recent appointments + missing-doc tasks
    const patientIds = Array.from(new Set([
      ...waitingAppointments.map((a) => a.patientId),
      ...upcoming.map((a) => a.patientId),
      ...missingDocs.map((a) => a.patientId),
    ].filter(Boolean)));
    const patientById: Record<string, any> = {};
    await Promise.all(patientIds.map(async (pid) => {
      try {
        const { resource } = await patientsContainer.item(pid, pid).read();
        if (resource) patientById[pid] = resource;
      } catch { /* skip */ }
    }));

    const tasks: any[] = [];
    for (const d of clinicDoctors) {
      if (d.slotsPending) {
        tasks.push({
          type: "doctor_schedule_pending",
          label: `${d.fullName ?? "A doctor"} submitted a schedule change awaiting your approval`,
          doctorId: d.id,
          doctorName: d.fullName ?? "Doctor",
        });
      }
    }
    for (const a of missingDocs) {
      tasks.push({
        type: "missing_documentation",
        label: `Missing consultation notes — ${patientById[a.patientId]?.fullName ?? "a patient"} with ${doctorNameById[a.doctorId] ?? "a doctor"}`,
        doctorId: a.doctorId,
        doctorName: doctorNameById[a.doctorId] ?? "Doctor",
        appointmentId: a.id,
      });
    }

    res.json({
      consultationsToday,
      consultationsYesterday,
      revenueThisMonth,
      revenueLastMonth,
      patientsWaiting: {
        count: waitingAppointments.length,
        patients: waitingAppointments.slice(0, 3).map((a) => ({
          name: patientById[a.patientId]?.fullName ?? "Patient",
          avatarUrl: patientById[a.patientId]?.avatarUrl ?? null,
        })),
      },
      recentAppointments: upcoming.map((a) => ({
        id: a.id,
        patientName: patientById[a.patientId]?.fullName ?? "Patient",
        patientEmail: patientById[a.patientId]?.email ?? "",
        reason: a.reason ?? "General Consultation",
        doctorId: a.doctorId,
        doctorName: doctorNameById[a.doctorId] ?? "Doctor",
        scheduledAt: a.scheduledAt,
      })),
      tasks: { total: tasks.length, items: tasks },
      patientsTrend,
    });
  } catch (err) {
    console.error("Clinic dashboard fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/online-status ────────────────────────────────────────
// Whether the clinic is currently open/accepting bookings. Mirrors
// doctors.ts's own PATCH /online-status, just on the clinic doc.
// Must also come before GET /:id below, same reason as /dashboard above.
router.patch("/online-status", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const { isOnline } = req.body;
  if (typeof isOnline !== "boolean") {
    res.status(400).json({ error: "isOnline must be a boolean." });
    return;
  }

  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return;

  try {
    if (scope.orgId) {
      // Branch context (either a branch user, or the org owner viewing as
      // one via ?branchId=) — availability is a property of the branch
      // itself (several users can share it), so it lives on the org doc's
      // branches[] entry, not on any individual login.
      const { resource: org } = await clinicsContainer.item(scope.orgId, scope.orgId).read();
      if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }
      const branches = (org.branches ?? []).map((b: any) =>
        b.id === scope.scopeId ? { ...b, isOnline } : b
      );
      await clinicsContainer.items.upsert({ ...org, branches, updatedAt: new Date().toISOString() });
      res.json({ status: "OK", isOnline });
      return;
    }

    const { resource: clinic } = await clinicsContainer.item(scope.scopeId, scope.scopeId).read();
    if (!clinic) { res.status(404).json({ error: "Clinic not found." }); return; }
    await clinicsContainer.items.upsert({ ...clinic, isOnline, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", isOnline });
  } catch (err) {
    console.error("Update clinic online status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/reviews ─────────────────────────────────────────────────
// Every patient review across the clinic's (or org's, aggregated across
// branches) doctors — powers the Profile page's "Patient Reviews" tab.
// There's no "peer" (clinic-to-clinic) review concept anywhere in the
// system, so that tab has nothing to aggregate — the frontend just shows it
// empty. Must come before GET /:id below, same reason as /dashboard above.
router.get("/reviews", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const scope = await resolveClinicScope(req, res, { allowAggregate: true });
  if (!scope) return;
  const clinicIds = scopeToClinicIds(scope);

  try {
    if (clinicIds.length === 0) {
      res.json({ reviews: [], total: 0, avgRating: null });
      return;
    }

    const { clause, parameters } = buildInClause("c.clinicId", clinicIds);
    const { resources: docs } = await doctorsContainer.items
      .query({ query: `SELECT c.id FROM c WHERE ${clause}`, parameters })
      .fetchAll();
    const doctorIds: string[] = docs.map((d: any) => d.id);

    if (doctorIds.length === 0) {
      res.json({ reviews: [], total: 0, avgRating: null });
      return;
    }

    const { clause: doctorClause, parameters: doctorParams } = buildInClause("c.provider.id", doctorIds);
    const reviews = await queryDocuments<any>(feedbackContainer, {
      query: `SELECT * FROM c WHERE c.folder = 'appointment' AND ${doctorClause} ORDER BY c.createdAt DESC`,
      parameters: doctorParams,
    });

    const total = reviews.length;
    const avgRating = total > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / total) * 10) / 10
      : null;

    res.json({ reviews, total, avgRating });
  } catch (err) {
    console.error("Fetch clinic reviews error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics ─────────────────────────────────────────────────────────
// Public directory — approved clinics only. Mirrors GET /api/doctors.
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { resources } = await clinicsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.approvedAt DESC",
        parameters: [{ name: "@status", value: "approved" }],
      })
      .fetchAll();
    res.json({ clinics: resources });
  } catch (err) {
    console.error("Fetch clinics error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/:id ─────────────────────────────────────────────────────
// Public clinic profile. Must come after all literal-path routes above.
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { resource: clinic } = await clinicsContainer.item(req.params.id, req.params.id).read();
    if (!clinic || clinic.status !== "approved") {
      res.status(404).json({ error: "Clinic not found." });
      return;
    }
    res.json({ clinic });
  } catch (err) {
    console.error("Fetch clinic error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/:id/diagnosis ──────────────────────────────────────────
// Top appointment reasons across every doctor at this clinic — powers the
// "Facilities and specialities" stat tiles on the Clinic Profile screen.
// Mirrors adminDoctors.ts's per-doctor GET /:id/diagnosis, aggregated over
// the clinic's whole doctor roster instead of one doctor.
router.get("/:id/diagnosis", async (req: Request, res: Response) => {
  try {
    const { resources: clinicDoctors } = await doctorsContainer.items
      .query({
        query: "SELECT c.id FROM c WHERE c.clinicId = @clinicId AND c.status = 'approved'",
        parameters: [{ name: "@clinicId", value: req.params.id }],
      })
      .fetchAll();
    const doctorIds = clinicDoctors.map((d: any) => d.id);

    if (doctorIds.length === 0) {
      res.json({ diagnosis: [], total: 0 });
      return;
    }

    const appointments = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT c.reason FROM c WHERE c.doctorId IN (${doctorIds.map((_, i) => `@d${i}`).join(", ")}) AND c.status != 'cancelled'`,
      parameters: doctorIds.map((id, i) => ({ name: `@d${i}`, value: id })),
    });

    const counts: Record<string, number> = {};
    for (const apt of appointments) {
      if (apt.reason) {
        const key = apt.reason.trim();
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }

    const diagnosis = Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ diagnosis, total: appointments.length });
  } catch (err) {
    console.error("Clinic diagnosis fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
