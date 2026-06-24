import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import multer from "multer";
import { requireRole } from "../middleware/requireRole";
import { doctorsContainer, appointmentsContainer, feedbackContainer, queryDocuments } from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";
import { uploadBlob, generateSasUrl } from "../config/blob";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes here require the "admin" role
// ─── GET /api/admin/doctors/pending ─────────────────────────────────────────
// Returns all doctors whose status is "pending_approval" (the onboarding queue).
router.get("/pending", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await doctorsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.registeredAt DESC",
        parameters: [{ name: "@status", value: "pending_approval" }],
      })
      .fetchAll();

    res.json({ doctors: resources });
  } catch (err) {
    console.error("Fetch pending doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

async function populateDoctorStats(doctors: any[]) {
  if (doctors.length === 0) return doctors;

  const appointments = await queryDocuments<any>(appointmentsContainer, {
    query: "SELECT c.doctorId, c.status, c.emr FROM c WHERE c.status IN ('completed', 'in_progress')"
  });

  const feedbacks = await queryDocuments<any>(feedbackContainer, {
    query: "SELECT c.provider.id AS doctorId, c.rating FROM c WHERE c.folder = 'appointment'"
  });

  for (const doc of doctors) {
    const docAppts = appointments.filter(a => a.doctorId === doc.id);
    const docFeedbacks = feedbacks.filter(f => f.doctorId === doc.id);

    doc.consultations = docAppts.length;
    doc.prescriptions = docAppts.filter(a => Array.isArray(a.emr?.medicines) && a.emr.medicines.length > 0).length;
    
    if (docFeedbacks.length > 0) {
      const sum = docFeedbacks.reduce((s, f) => s + (f.rating ?? 0), 0);
      doc.rating = Math.round((sum / docFeedbacks.length) * 10) / 10;
    } else {
      doc.rating = 0;
    }

    doc.avgConsultation = 0; 
  }

  return doctors;
}

// ─── GET /api/admin/doctors/approved ────────────────────────────────────────
// Returns all doctors whose status is "approved" (the onboarded list).
router.get("/approved", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await doctorsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.approvedAt DESC",
        parameters: [{ name: "@status", value: "approved" }],
      })
      .fetchAll();

    const populated = await populateDoctorStats(resources);

    res.json({ doctors: populated });
  } catch (err) {
    console.error("Fetch approved doctors error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/:id ─────────────────────────────────────────────
// Must come after /pending and /approved to avoid those being captured as :id
router.get("/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Use a query instead of .item().read() to be partition-key-agnostic
    const { resources } = await doctorsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Doctor not found." }); return; }
    const populated = await populateDoctorStats([resources[0]]);
    res.json({ doctor: populated[0] });
  } catch (err) {
    console.error("Fetch doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/approve ────────────────────────────────────
// Promotes a pending doctor to approved:
//   1. Swaps role from "doctor_pending" → "doctor" in SuperTokens
//   2. Updates Cosmos document status to "approved"
router.post("/:id/approve", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    // ── 1. Read doctor record from Cosmos ────────────────────────────────
    const { resource: doctor } = await doctorsContainer.item(id, id).read();

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    if (doctor.status === "approved") {
      res.status(409).json({ error: "Doctor is already approved." });
      return;
    }

    // ── 2. Swap SuperTokens roles ─────────────────────────────────────────
    await UserRoles.removeUserRole("public", id, "doctor_pending");
    await UserRoles.addRoleToUser("public", id, "doctor");

    // ── 3. Update Cosmos document ─────────────────────────────────────────
    const updatedDoctor = {
      ...doctor,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "admin",
      action: "Doctor Approved",
      details: `Dr. ${doctor.fullName ?? id} (${doctor.specialty ?? ""}) profile approved`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: id,
    });

    res.json({ status: "OK", message: "Doctor approved successfully." });
  } catch (err) {
    console.error("Approve doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/reject ─────────────────────────────────────
// Rejects a pending doctor: removes their ST account marker, updates Cosmos.
router.post("/:id/reject", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    // Update Cosmos record
    const updatedDoctor = {
      ...doctor,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "admin",
      action: "Doctor Rejected",
      details: `Dr. ${doctor.fullName ?? id} application rejected`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: id,
    });

    res.json({ status: "OK", message: "Doctor application rejected." });
  } catch (err) {
    console.error("Reject doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/:id/diagnosis ───────────────────────────────────
// Aggregates appointment reasons for a doctor, returning the top 10 by count.
router.get("/:id/diagnosis", requireRole("admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const appointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.reason FROM c WHERE c.doctorId = @doctorId AND c.status != 'cancelled'",
      parameters: [{ name: "@doctorId", value: id }],
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
    console.error("Diagnosis fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/doctors/:id/reviews ─────────────────────────────────────
// Returns all consultation feedback submitted for a doctor
// (folder = "appointment", provider.id = doctorId).
router.get("/:id/reviews", requireRole("admin"), async (req: Request, res: Response) => {
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
    console.error("Reviews fetch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/:id/verify-slots ────────────────────────────────
// Verifies/approves updated slots for a doctor.
router.post("/:id/verify-slots", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: doctor } = await doctorsContainer.item(id, id).read();

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found." });
      return;
    }

    const updatedDoctor = {
      ...doctor,
      slots: doctor.tempSlots ?? doctor.slots,
      slotsPending: false,
      slotsVerifiedAt: new Date().toISOString(),
      slotsVerifiedBy: adminId,
    };

    await doctorsContainer.items.upsert(updatedDoctor);

    logActivity({
      source: "admin",
      action: "Doctor Slots Verified",
      details: `Dr. ${doctor.fullName ?? id} availability slots verified`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: id,
    });

    res.json({ status: "OK", message: "Doctor slots verified successfully." });
  } catch (err) {
    console.error("Verify doctor slots error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors ─────────────────────────────────────────────────
// Admin manually creates a fully-onboarded doctor account in one step: real
// SuperTokens credentials (admin sets an initial password), role "doctor"
// directly (not "doctor_pending" — the admin already vetted/entered every
// field themselves, so there's no separate approval step to wait on), and
// status "approved" immediately. Mirrors the self-registration doctor doc
// shape (POST /api/doctors/register + PUT /api/doctors/profile combined).
router.post("/", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const adminId = req.session!.getUserId();
  const {
    email, password, fullName, phone,
    dateOfBirth, gender, emiratesId,
    bio, businessEmail, bloodGroup, height, weight,
    maritalStatus, address, postalCode, languages,
    avatarUrl, emiratesIdFileUrl,
    specialty, license, experience, medicalSchool, residency,
    fees, feesPerEmirate,
    slots,
    degreeFileUrl, specFileUrl, otherFileUrl,
    bankDetails,
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

    // Admin-created doctors skip "doctor_pending" entirely — assign "doctor"
    // directly since the admin has already entered/verified every field.
    await UserRoles.addRoleToUser("public", supertokensId, "doctor");

    const now = new Date().toISOString();
    const doctorDoc = {
      id:             supertokensId,
      supertokens_id: supertokensId,
      status:         "approved",
      email,
      fullName,
      phone,
      dateOfBirth:    dateOfBirth    || null,
      gender:         gender         || null,
      emiratesId:     emiratesId     || null,
      bio:            bio            || null,
      businessEmail:  businessEmail  || null,
      bloodGroup:      bloodGroup     || null,
      height:          height         || null,
      weight:          weight         || null,
      maritalStatus:   maritalStatus  || null,
      address:         address        || null,
      postalCode:      postalCode     || null,
      languages:       languages      || null,
      avatarUrl:       avatarUrl      || null,
      emiratesIdFileUrl: emiratesIdFileUrl || null,
      specialty:       specialty      || null,
      license:         license        || null,
      experience:      experience     || null,
      medicalSchool:   medicalSchool  || null,
      residency:       residency      || null,
      fees:            fees           ?? null,
      feesPerEmirate:  feesPerEmirate ?? null,
      slots:           slots          ?? [],
      degreeFileUrl:   degreeFileUrl  || null,
      specFileUrl:     specFileUrl    || null,
      otherFileUrl:    otherFileUrl   || null,
      bankDetails:     bankDetails    ?? null,
      registeredAt:    now,
      approvedAt:      now,
      approvedBy:      adminId,
      createdByAdmin:  true,
      profileCompletedAt: now,
    };

    await doctorsContainer.items.upsert(doctorDoc);

    logActivity({
      source: "admin",
      action: "Doctor Created",
      details: `Dr. ${fullName} added directly by admin (${specialty ?? "specialty TBD"})`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "doctor",
      entityId: supertokensId,
    });

    res.status(201).json({ status: "OK", doctor: doctorDoc });
  } catch (err) {
    console.error("Admin create doctor error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/doctors/upload ──────────────────────────────────────────
// Admin-scoped equivalent of POST /api/doctors/upload, for use while building
// the Add Doctor wizard before the doctor account exists yet. Files are
// staged under a temp folder keyed by a client-generated draftId, then moved
// into the doctor's real blob path once the account is created — simplest
// approach: just upload now under doctors/{draftId}/... and pass the
// resulting URLs straight into POST /api/admin/doctors's body (blob storage
// doesn't care that draftId isn't a real Cosmos id).
router.post(
  "/upload",
  requireRole("admin"),
  upload.fields([
    { name: "avatar",     maxCount: 1 },
    { name: "emiratesId", maxCount: 1 },
    { name: "degree",     maxCount: 1 },
    { name: "spec",       maxCount: 1 },
    { name: "other",      maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const draftId = (req.body?.draftId as string) || `draft_${Date.now()}`;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};

    const MIME_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "application/pdf": "pdf",
    };

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        const ext  = MIME_EXT[file.mimetype] ?? "bin";
        const blobPath = `doctors/${draftId}/${field}_${Date.now()}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Admin doctor file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

export default router;
