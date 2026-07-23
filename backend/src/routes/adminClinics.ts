import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import multer from "multer";
import { requireRole } from "../middleware/requireRole";
import { clinicsContainer } from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";
import { uploadBlob, generateSasUrl } from "../config/blob";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes here require the "admin" role
// ─── GET /api/admin/clinics/pending ──────────────────────────────────────────
// Returns all clinics whose status is "pending_approval" (the onboarding queue).
router.get("/pending", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await clinicsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.registeredAt DESC",
        parameters: [{ name: "@status", value: "pending_approval" }],
      })
      .fetchAll();

    res.json({ clinics: resources });
  } catch (err) {
    console.error("Fetch pending clinics error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/clinics/approved ─────────────────────────────────────────
// Returns all clinics whose status is "approved" (the onboarded list).
router.get("/approved", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { resources } = await clinicsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.approvedAt DESC",
        parameters: [{ name: "@status", value: "approved" }],
      })
      .fetchAll();

    res.json({ clinics: resources });
  } catch (err) {
    console.error("Fetch approved clinics error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/clinics/:orgId/branches/:branchId/approve ──────────────
// Two-phase add-branch flow: a "requested" branch (name/license/address
// only) is approved into "details_pending" — the clinic must then submit
// its full company profile + schedule (POST .../submit-details) before a
// second, final approval activates it. A "pending_approval" branch (either
// a details submission, or a branch declared during the clinic's own
// registration with everything already filled in) is approved straight to
// "active". Same endpoint, same admin UI — just phase-aware.
router.post("/:orgId/branches/:branchId/approve", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { orgId, branchId } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
    if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

    const branch = (org.branches ?? []).find((b: any) => b.id === branchId);
    if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

    if (branch.status !== "requested" && branch.status !== "pending_approval") {
      res.status(400).json({ error: "This branch isn't awaiting approval." });
      return;
    }

    const now = new Date().toISOString();
    const isFinal = branch.status === "pending_approval";
    const branches = org.branches.map((b: any) =>
      b.id === branchId
        ? isFinal
          ? { ...b, status: "active", approvedAt: now }
          : { ...b, status: "details_pending", detailsRequestedAt: now }
        : b
    );
    await clinicsContainer.items.upsert({ ...org, branches, updatedAt: now });

    logActivity({
      source: "admin",
      action: isFinal ? "Branch Approved" : "Branch Request Approved",
      details: isFinal
        ? `Branch "${branch.name}" approved for ${org.fullName ?? orgId}`
        : `Branch request "${branch.name}" approved for ${org.fullName ?? orgId} — awaiting full details`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "clinic",
      entityId: orgId,
    });

    res.json({ status: "OK", branchStatus: isFinal ? "active" : "details_pending" });
  } catch (err) {
    console.error("Approve branch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/clinics/:orgId/branches/:branchId/reject ───────────────
router.post("/:orgId/branches/:branchId/reject", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { orgId, branchId } = req.params;
  const { reason } = req.body;
  const adminId = req.session!.getUserId();

  try {
    const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
    if (!org) { res.status(404).json({ error: "Clinic not found." }); return; }

    const branch = (org.branches ?? []).find((b: any) => b.id === branchId);
    if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

    if (branch.status !== "requested" && branch.status !== "pending_approval") {
      res.status(400).json({ error: "This branch isn't awaiting approval." });
      return;
    }

    const branches = org.branches.map((b: any) =>
      b.id === branchId ? { ...b, status: "rejected", rejectedReason: reason || null } : b
    );
    await clinicsContainer.items.upsert({ ...org, branches, updatedAt: new Date().toISOString() });

    logActivity({
      source: "admin",
      action: "Branch Rejected",
      details: `Branch "${branch.name}" rejected for ${org.fullName ?? orgId}${reason ? `: ${reason}` : ""}`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "clinic",
      entityId: orgId,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Reject branch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/clinics/:id ──────────────────────────────────────────────
// Must come after /pending and /approved to avoid those being captured as :id
router.get("/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resources } = await clinicsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Clinic not found." }); return; }
    res.json({ clinic: resources[0] });
  } catch (err) {
    console.error("Fetch clinic error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/clinics/:id/approve ─────────────────────────────────────
// Promotes a pending clinic to approved:
//   1. Swaps role from "clinic_pending" → "clinic" in SuperTokens
//   2. Updates Cosmos document status to "approved"
router.post("/:id/approve", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.session!.getUserId();

  try {
    const { resource: clinic } = await clinicsContainer.item(id, id).read();

    if (!clinic) {
      res.status(404).json({ error: "Clinic not found." });
      return;
    }

    if (clinic.status === "approved") {
      res.status(409).json({ error: "Clinic is already approved." });
      return;
    }

    await UserRoles.removeUserRole("public", id, "clinic_pending");
    await UserRoles.addRoleToUser("public", id, "clinic");

    const now = new Date().toISOString();
    // Branches declared as part of this registration (status still
    // "pending_approval" — a not-yet-approved clinic has no way to submit a
    // later add-request, so every branch here was part of the same
    // submission, already has its full company profile + schedule, and
    // skips the two-phase add-branch flow) get activated in the same
    // approval action as the clinic itself.
    const branches = Array.isArray(clinic.branches)
      ? clinic.branches.map((b: any) =>
          b.status === "pending_approval" ? { ...b, status: "active", approvedAt: now } : b
        )
      : clinic.branches;

    const updatedClinic = {
      ...clinic,
      status: "approved",
      approvedAt: now,
      approvedBy: adminId,
      branches,
    };

    await clinicsContainer.items.upsert(updatedClinic);

    logActivity({
      source: "admin",
      action: "Clinic Approved",
      details: `${clinic.fullName ?? id} clinic profile approved`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "clinic",
      entityId: id,
    });

    res.json({ status: "OK", message: "Clinic approved successfully." });
  } catch (err) {
    console.error("Approve clinic error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/clinics/:id/reject ──────────────────────────────────────
// Rejects a pending clinic, recording the reason given by the admin.
router.post("/:id/reject", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.session!.getUserId();

  try {
    const { resource: clinic } = await clinicsContainer.item(id, id).read();

    if (!clinic) {
      res.status(404).json({ error: "Clinic not found." });
      return;
    }

    const updatedClinic = {
      ...clinic,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId,
      rejectedReason: reason || null,
    };

    await clinicsContainer.items.upsert(updatedClinic);

    logActivity({
      source: "admin",
      action: "Clinic Rejected",
      details: `${clinic.fullName ?? id} clinic application rejected${reason ? `: ${reason}` : ""}`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "clinic",
      entityId: id,
    });

    res.json({ status: "OK", message: "Clinic application rejected." });
  } catch (err) {
    console.error("Reject clinic error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/clinics ──────────────────────────────────────────────────
// Admin manually creates a fully-onboarded clinic account in one step: real
// SuperTokens credentials (admin sets an initial password), role "clinic"
// directly (not "clinic_pending" — the admin already vetted/entered every
// field themselves, so there's no separate approval step to wait on), and
// status "approved" immediately. Mirrors POST /api/admin/doctors.
router.post("/", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const adminId = req.session!.getUserId();
  const {
    email, password, fullName, phone,
    dateOfBirth, gender, emiratesIdOrPassport,
    positionInClinic, languages, otherInfo,
    bloodGroup, maritalStatus, height, weight,
    insurances,
    licenseNumber, dohLicense, address, addressProofFileUrl,
    consultationRates, paymentSettings, bio, clinicImageUrl,
    slots,
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
      res.status(400).json({ error: "Could not create the clinic's account. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;

    // Admin-created clinics skip "clinic_pending" entirely — assign "clinic"
    // directly since the admin has already entered/verified every field.
    await UserRoles.addRoleToUser("public", supertokensId, "clinic");

    const now = new Date().toISOString();
    const clinicDoc = {
      id:                    supertokensId,
      supertokens_id:        supertokensId,
      status:                "approved",
      email,
      fullName,
      phone,
      dateOfBirth:           dateOfBirth           || null,
      gender:                gender                || null,
      emiratesIdOrPassport:  emiratesIdOrPassport  || null,
      positionInClinic:      positionInClinic      || null,
      bloodGroup:            bloodGroup            || null,
      maritalStatus:         maritalStatus         || null,
      height:                height                || null,
      weight:                weight                || null,
      languages:             languages             || null,
      otherInfo:             otherInfo             ?? [],
      insurances:            insurances            ?? [],
      licenseNumber:         licenseNumber         || null,
      licenseVerified:       false,
      dohLicense:            dohLicense            || null,
      dohLicenseVerified:    false,
      address:               address               || null,
      addressProofFileUrl:   addressProofFileUrl   || null,
      addressProofVerified:  false,
      consultationRates:     consultationRates     ?? [],
      paymentSettings:       paymentSettings       || null,
      bio:                   bio                   || null,
      clinicImageUrl:        clinicImageUrl        || null,
      slots:                 slots                 ?? [],
      registeredAt:          now,
      approvedAt:            now,
      approvedBy:            adminId,
      createdByAdmin:        true,
      profileCompletedAt:    now,
    };

    await clinicsContainer.items.upsert(clinicDoc);

    logActivity({
      source: "admin",
      action: "Clinic Created",
      details: `${fullName} added directly by admin`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "clinic",
      entityId: supertokensId,
    });

    res.status(201).json({ status: "OK", clinic: clinicDoc });
  } catch (err) {
    console.error("Admin create clinic error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/clinics/upload ──────────────────────────────────────────
// Admin-scoped equivalent of POST /api/clinics/upload, for use while building
// the Add Clinic wizard before the clinic account exists yet. Files are
// staged under a temp folder keyed by a client-generated draftId.
router.post(
  "/upload",
  requireRole("admin"),
  upload.fields([
    { name: "logo",          maxCount: 1 },
    { name: "addressProof",  maxCount: 1 },
    { name: "spcContract",   maxCount: 1 },
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
        const blobPath = `clinics/${draftId}/${field}_${Date.now()}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Admin clinic file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

export default router;
