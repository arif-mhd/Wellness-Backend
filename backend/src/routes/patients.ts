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
      res.status(400).json({ error: (signUpResult as any).status });
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
router.put("/profile", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const {
      fullName, name, phone, emiratesId, exrNumber, email, gender, bloodGroup,
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
      ...((fullName !== undefined || name !== undefined) && { fullName: fullName || name }),
      ...(phone        !== undefined && { phone }),
      ...(emiratesId   !== undefined && { emiratesId }),
      ...(exrNumber    !== undefined && { exrNumber }),
      ...(email        !== undefined && { email }),
      ...(gender       !== undefined && { gender }),
      ...(bloodGroup   !== undefined && { bloodGroup }),
      ...(dob          !== undefined && { dob, dateOfBirth: dob }),
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
router.put("/allergies", requireRole("patient"), async (req: SessionRequest, res: Response) => {
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
router.put("/medications", requireRole("patient"), async (req: SessionRequest, res: Response) => {
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
router.put("/chronic-diseases", requireRole("patient"), async (req: SessionRequest, res: Response) => {
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
    
    // Normalize date of birth properties
    if (resource.dateOfBirth && !resource.dob) {
      resource.dob = resource.dateOfBirth;
    } else if (resource.dob && !resource.dateOfBirth) {
      resource.dateOfBirth = resource.dob;
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

// ── PUT /api/patients/insurance ──────────────────────────────────────────────
// Body: { insurance: InsuranceItem[] }
router.put("/insurance", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { insurance } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    await patientsContainer.items.upsert({ ...existing, insurance, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Insurance update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/patients/family/:memberId/avatar ───────────────────────────────
// Uploads a family member's avatar to blob storage and stores the URL on the member object.
router.post(
  "/family/:memberId/avatar",
  requireRole("patient"),
  upload.single("avatar"),
  async (req: SessionRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided." });
        return;
      }

      const userId = req.session!.getUserId();
      const { memberId } = req.params;
      const ext = req.file.mimetype.split("/")[1] ?? "jpg";
      const blobPath = `patients/${userId}/family/${memberId}/avatar.${ext}`;

      try { await deleteBlob(blobPath); } catch { /* ignore */ }
      await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);
      const avatarUrl = generateSasUrl(blobPath, 365);

      let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
      try {
        const { resource } = await patientsContainer.item(userId, userId).read();
        if (resource) existing = resource;
      } catch { /* ignore */ }

      const familyMembers = ((existing.familyMembers as any[]) ?? []).map((m: any) =>
        m.id === memberId ? { ...m, avatarUrl } : m
      );
      await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });

      res.json({ status: "OK", avatarUrl });
    } catch (err) {
      console.error("Family avatar upload error:", err);
      res.status(500).json({ error: "Avatar upload failed." });
    }
  }
);

// ── GET /api/patients/family ─────────────────────────────────────────────────
router.get("/family", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { resource } = await patientsContainer.item(userId, userId).read();
    res.json({ familyMembers: resource?.familyMembers ?? [] });
  } catch (err) {
    console.error("Family fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/patients/family ────────────────────────────────────────────────
// Body: FamilyMemberItem (without id)
router.post("/family", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const member = { ...req.body, id: Date.now().toString() };

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    const familyMembers = [...((existing.familyMembers as any[]) ?? []), member];
    await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });
    res.json({ member });
  } catch (err) {
    console.error("Add family member error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/family/:memberId ───────────────────────────────────────
router.put("/family/:memberId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { memberId } = req.params;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    const familyMembers = ((existing.familyMembers as any[]) ?? []).map((m: any) =>
      m.id === memberId ? { ...m, ...req.body } : m
    );
    await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Update family member error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/patients/family/:memberId ────────────────────────────────────
router.delete("/family/:memberId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { memberId } = req.params;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    const familyMembers = ((existing.familyMembers as any[]) ?? []).filter((m: any) => m.id !== memberId);
    await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete family member error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/family/:memberId/allergies ─────────────────────────────
router.put("/family/:memberId/allergies", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { memberId } = req.params;
    const { allergies } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    const familyMembers = ((existing.familyMembers as any[]) ?? []).map((m: any) =>
      m.id === memberId ? { ...m, allergies } : m
    );
    await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Family member allergies error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/family/:memberId/medications ───────────────────────────
router.put("/family/:memberId/medications", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { memberId } = req.params;
    const { medications } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    const familyMembers = ((existing.familyMembers as any[]) ?? []).map((m: any) =>
      m.id === memberId ? { ...m, medications } : m
    );
    await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Family member medications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/patients/family/:memberId/chronic-diseases ──────────────────────
router.put("/family/:memberId/chronic-diseases", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const userId = req.session!.getUserId();
    const { memberId } = req.params;
    const { chronicDiseases } = req.body;

    let existing: Record<string, unknown> = { id: userId, supertokensId: userId };
    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) existing = resource;
    } catch { /* ignore */ }

    const familyMembers = ((existing.familyMembers as any[]) ?? []).map((m: any) =>
      m.id === memberId ? { ...m, chronicDiseases } : m
    );
    await patientsContainer.items.upsert({ ...existing, familyMembers, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Family member chronic diseases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
