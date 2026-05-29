import { Router, Request, Response } from "express";
import multer from "multer";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { requireRole } from "../middleware/requireRole";
import { patientsContainer } from "../config/cosmos";
import { uploadBlob, deleteBlob, generateSasUrl } from "../config/blob";
import { SessionRequest } from "supertokens-node/framework/express";

// multer stores the uploaded file in memory as a Buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

// ── POST /api/patients/register ─────────────────────────────────────────────
// Public — called from the patient app after the (mocked) OTP screen.
// Creates a SuperTokens EmailPassword account, assigns the "patient" role,
// and saves the core registration data to Cosmos DB.
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, dateOfBirth, gender, emiratesId } =
      req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: "email, password, and fullName are required" });
      return;
    }

    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: signUpResult.status });
      return;
    }

    const supertokensId = signUpResult.user.id;

    // Assign "patient" role
    await UserRoles.addRoleToUser("public", supertokensId, "patient");

    // Persist to Cosmos  (patients collection, partition key = /id)
    const patientDoc = {
      id:             supertokensId,
      supertokensId,
      email,
      fullName,
      phone:          phone        ?? "",
      dateOfBirth:    dateOfBirth  ?? "",
      gender:         gender       ?? "",
      emiratesId:     emiratesId   ?? "",
      status:         "active",
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };

    await patientsContainer.items.upsert(patientDoc);

    res.json({ status: "OK", userId: supertokensId });
  } catch (err) {
    console.error("Patient registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/profile ────────────────────────────────────────────────
// Protected — requires a valid "patient" session.
// Merges the submitted fields into the existing Cosmos document.
router.put("/profile", requireRole("patient"), async (req: SessionRequest, res) => {
  try {
    const userId = req.session!.getUserId();
    const {
      phone, emiratesId, exrNumber, email, gender, bloodGroup,
      dob, maritalStatus, height, weight, location, language,
    } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch {
      // doc might not exist yet — that's fine, we'll create it
    }

    const updated = {
      ...existing,
      ...(phone        !== undefined && { phone }),
      ...(emiratesId   !== undefined && { emiratesId }),
      ...(exrNumber    !== undefined && { exrNumber }),
      ...(email        !== undefined && { email }),
      ...(gender       !== undefined && { gender }),
      ...(bloodGroup   !== undefined && { bloodGroup }),
      ...(dob          !== undefined && { dob }),
      ...(maritalStatus !== undefined && { maritalStatus }),
      ...(height       !== undefined && { height }),
      ...(weight       !== undefined && { weight }),
      ...(location     !== undefined && { location }),
      ...(language     !== undefined && { language }),
      updatedAt: new Date().toISOString(),
    };

    await patientsContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/allergies ──────────────────────────────────────────────
// Body: { allergies: Array<{ category: string; selected: string[] }> }
router.put("/allergies", requireRole("patient"), async (req: SessionRequest, res) => {
  try {
    const userId = req.session!.getUserId();
    const { allergies } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    await patientsContainer.items.upsert({
      ...existing,
      allergies,
      updatedAt: new Date().toISOString(),
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Allergies update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/medications ────────────────────────────────────────────
// Body: { medications: { current: MedItem[]; past: MedItem[] } }
router.put("/medications", requireRole("patient"), async (req: SessionRequest, res) => {
  try {
    const userId = req.session!.getUserId();
    const { medications } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    await patientsContainer.items.upsert({
      ...existing,
      medications,
      updatedAt: new Date().toISOString(),
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Medications update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/chronic-diseases ───────────────────────────────────────
// Body: { chronicDiseases: string[] }
router.put("/chronic-diseases", requireRole("patient"), async (req: SessionRequest, res) => {
  try {
    const userId = req.session!.getUserId();
    const { chronicDiseases } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    await patientsContainer.items.upsert({
      ...existing,
      chronicDiseases,
      updatedAt: new Date().toISOString(),
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Chronic diseases update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/patients/profile ────────────────────────────────────────────────
// Returns the full Cosmos patient document for the authenticated patient.
router.get("/profile", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { resource } = await patientsContainer.item(userId, userId).read();
    if (!resource) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile: resource });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/fitness-profile ────────────────────────────────────────
// Saves the computed fitness profile (goal, TDEE, target calories, macros, etc.)
// into the patient's Cosmos document under the `fitnessProfile` sub-object.
router.put("/fitness-profile", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const {
      goal, activityLevel, heightStr, weightKg, goalWeightKg,
      weeklyRateKg, targetCalories, tdee, macros,
    } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    await patientsContainer.items.upsert({
      ...existing,
      fitnessProfile: {
        goal, activityLevel, heightStr, weightKg, goalWeightKg,
        weeklyRateKg, targetCalories, tdee, macros,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Fitness profile save error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/patients/avatar ────────────────────────────────────────────────
// Accepts a multipart/form-data upload with field name "avatar".
// Uploads the image to Azure Blob Storage at patients/{userId}/avatar.{ext},
// generates a 1-year SAS URL, stores it in Cosmos, and returns it.
router.post(
  "/avatar",
  requireRole("patient"),
  upload.single("avatar"),
  async (req: SessionRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided." });
        return;
      }

      const userId = req.session!.getUserId();
      const ext    = req.file.mimetype.split("/")[1] ?? "jpg"; // e.g. "jpeg" → "jpeg"
      const blobPath = `patients/${userId}/avatar.${ext}`;

      // Delete any old avatar first (ignore errors if it doesn't exist)
      try { await deleteBlob(blobPath); } catch { /* ignore */ }

      // Upload new avatar
      await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);

      // Generate a 1-year SAS URL so the app can display it directly
      const avatarUrl = generateSasUrl(blobPath, 365);

      // Persist avatarUrl in the Cosmos patient document
      let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
      try {
        const { resource } = await patientsContainer.item(userId, userId).read();
        if (resource) existing = resource;
      } catch { /* ignore */ }

      await patientsContainer.items.upsert({
        ...existing,
        avatarUrl,
        avatarPath: blobPath,
        updatedAt: new Date().toISOString(),
      });

      res.json({ status: "OK", avatarUrl });
    } catch (err) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ error: "Avatar upload failed." });
    }
  }
);

export default router;
