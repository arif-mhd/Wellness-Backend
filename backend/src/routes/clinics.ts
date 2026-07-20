import { Router, Request, Response } from "express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { clinicsContainer, otpCodesContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import multer from "multer";
import { uploadBlob, generateSasUrl } from "../config/blob";
import { logActivity } from "../utils/activityLogger";

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

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        const ext = MIME_EXT[file.mimetype] ?? "bin";
        const blobPath = `clinics/${clinicId}/${field}.${ext}`;
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
// Returns the currently logged-in clinic's own profile.
router.get("/me", requireRole("clinic_pending", "clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = req.session!.getUserId();
  try {
    const { resource: clinic } = await clinicsContainer.item(clinicId, clinicId).read();
    if (!clinic) { res.status(404).json({ error: "Clinic not found." }); return; }
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
    // Insurances
    insurances,
    // Clinic / company information
    licenseNumber, dohLicense, address, addressProofFileUrl,
    consultationRates, paymentSettings, bio, clinicImageUrl,
    // Timeslots
    slots,
  } = req.body;

  try {
    const { resource: clinic } = await clinicsContainer.item(clinicId, clinicId).read();
    if (!clinic) {
      res.status(404).json({ error: "Clinic profile not found." });
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

export default router;
