import { Router, Response } from "express";
import multer from "multer";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { pregnancyProfilesContainer, pregnancyLogsContainer } from "../config/cosmos";
import { uploadBlob, deleteBlob, generateSasUrl } from "../config/blob";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only images and PDFs are allowed"));
  },
});

const router = Router();
router.use(requireRole("patient"));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getProfile(patientId: string, profileId: string): Promise<Record<string, unknown>> {
  try {
    const { resource } = await pregnancyProfilesContainer.item(profileId, patientId).read();
    return resource ?? { id: profileId, patientId, profileId };
  } catch {
    return { id: profileId, patientId, profileId };
  }
}

async function getLog(patientId: string, profileId: string, date: string): Promise<Record<string, unknown>> {
  const docId = `${profileId}_${date}`;
  try {
    const { resource } = await pregnancyLogsContainer.item(docId, patientId).read();
    return resource ?? { id: docId, patientId, profileId, date };
  } catch {
    return { id: docId, patientId, profileId, date };
  }
}

// ─── GET /api/pregnancy/profile ──────────────────────────────────────────────
router.get("/profile", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const profile = await getProfile(patientId, profileId);
    res.json({ profile });
  } catch (err) {
    console.error("Pregnancy profile fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/pregnancy/profile ───────────────────────────────────────────────
// Body: { weeksPregnant, daysPregnant, numberOfChildren, dueDate, isActive }
router.put("/profile", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { weeksPregnant, daysPregnant, numberOfChildren, dueDate, isActive, profileId: bodyProfileId } = req.body;
    const profileId = bodyProfileId ?? patientId;
    const existing = await getProfile(patientId, profileId);

    const updated = {
      ...existing,
      patientId,
      profileId,
      ...(weeksPregnant     !== undefined && { weeksPregnant }),
      ...(daysPregnant      !== undefined && { daysPregnant }),
      ...(numberOfChildren  !== undefined && { numberOfChildren }),
      ...(dueDate           !== undefined && { dueDate }),
      ...(isActive          !== undefined && { isActive }),
      updatedAt: new Date().toISOString(),
    };

    await pregnancyProfilesContainer.items.upsert(updated);
    res.json({ status: "OK", profile: updated });
  } catch (err) {
    console.error("Pregnancy profile update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/pregnancy/profile ───────────────────────────────────────────
// Deletes the pregnancy profile and all logs for this patient
// Deletes the pregnancy profile and logs for one profile (the account owner,
// or one family member if ?profileId= is given). Omitting profileId deletes
// only the account owner's own profile — it does NOT wipe family members'
// pregnancy data, since this is a destructive operation.
router.delete("/profile", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;

    // Delete profile
    try {
      await pregnancyProfilesContainer.item(profileId, patientId).delete();
    } catch { /* already gone */ }

    // Delete all logs for this profile
    const { resources: logs } = await pregnancyLogsContainer.items.query(
      {
        query: "SELECT c.id FROM c WHERE c.patientId = @pid AND c.profileId = @profileId",
        parameters: [
          { name: "@pid", value: patientId },
          { name: "@profileId", value: profileId },
        ],
      },
      { partitionKey: patientId }
    ).fetchAll();

    for (const log of logs) {
      try {
        await pregnancyLogsContainer.item(log.id, patientId).delete();
      } catch { /* ignore */ }
    }

    res.json({ status: "OK", deleted: logs.length + 1 });
  } catch (err) {
    console.error("Pregnancy delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pregnancy/log?date=YYYY-MM-DD ──────────────────────────────────
router.get("/log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const date = (req.query.date as string) || todayStr();
    const log = await getLog(patientId, profileId, date);
    res.json({ log });
  } catch (err) {
    console.error("Pregnancy log fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/pregnancy/log ───────────────────────────────────────────────────
// Body: {
//   date?,
//   moods?: string[],
//   topSymptom?: string,
//   symptoms?: string[],
//   waterIntakeLiters?: number,
//   weightKg?: number,
//   pills?: { id, name, time, taken }[],
//   healthConditions?: string[],
//   scanReportUrl?: string,
//   scanReportPath?: string,
//   scanReportDate?: string,
// }
router.put("/log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const date = req.body.date || todayStr();
    const profileId = req.body.profileId ?? patientId;
    const existing = await getLog(patientId, profileId, date);

    const {
      moods, topSymptom, symptoms,
      waterIntakeLiters, weightKg,
      pills, healthConditions,
      scanReportUrl, scanReportPath, scanReportDate,
    } = req.body;

    const updated = {
      ...existing,
      patientId,
      profileId,
      ...(moods              !== undefined && { moods }),
      ...(topSymptom         !== undefined && { topSymptom }),
      ...(symptoms           !== undefined && { symptoms }),
      ...(waterIntakeLiters  !== undefined && { waterIntakeLiters }),
      ...(weightKg           !== undefined && { weightKg }),
      ...(pills              !== undefined && { pills }),
      ...(healthConditions   !== undefined && { healthConditions }),
      ...(scanReportUrl      !== undefined && { scanReportUrl }),
      ...(scanReportPath     !== undefined && { scanReportPath }),
      ...(scanReportDate     !== undefined && { scanReportDate }),
      updatedAt: new Date().toISOString(),
    };

    await pregnancyLogsContainer.items.upsert(updated);
    res.json({ status: "OK", log: updated });
  } catch (err) {
    console.error("Pregnancy log update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/pregnancy/log/history ──────────────────────────────────────────
// Returns all logged dates (newest first) for the calendar
router.get("/log/history", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT c.id, c.date, c.profileId, c.moods, c.symptoms, c.topSymptom, c.weightKg, c.waterIntakeLiters, c.updatedAt FROM c WHERE c.patientId = @pid";
    const parameters = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.date DESC";

    const { resources } = await pregnancyLogsContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();

    res.json({ history: resources });
  } catch (err) {
    console.error("Pregnancy log history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/pregnancy/scan ─────────────────────────────────────────────────
// Multipart upload: field "scan" (image or PDF)
// Also accepts ?date=YYYY-MM-DD query param
router.post(
  "/scan",
  upload.single("scan"),
  async (req: SessionRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const patientId = req.session!.getUserId();
      const profileId = (req.query.profileId as string) || patientId;
      const date = (req.query.date as string) || todayStr();
      const ext = req.file.mimetype === "application/pdf" ? "pdf"
        : req.file.mimetype.split("/")[1] ?? "jpg";
      const blobPath = `patients/${patientId}/scans/scan_${profileId}_${date}.${ext}`;

      // Delete old scan for that date if it exists
      const existing = await getLog(patientId, profileId, date);
      if ((existing as any).scanReportPath) {
        try { await deleteBlob((existing as any).scanReportPath); } catch { /* ignore */ }
      }

      await uploadBlob(blobPath, req.file.buffer, req.file.mimetype);
      const scanReportUrl = generateSasUrl(blobPath, 365);

      // Persist URL back into the log
      const updated = {
        ...existing,
        patientId,
        profileId,
        scanReportUrl,
        scanReportPath: blobPath,
        scanReportDate: date,
        updatedAt: new Date().toISOString(),
      };
      await pregnancyLogsContainer.items.upsert(updated);

      res.json({ status: "OK", scanReportUrl });
    } catch (err) {
      console.error("Scan upload error:", err);
      res.status(500).json({ error: "Scan upload failed" });
    }
  }
);

// ─── PUT /api/pregnancy/diabetes ─────────────────────────────────────────────
// Body: {
//   date?,
//   bloodSugarMgDl: number,
//   testingTime: string,       // ISO datetime string
//   testType: string,          // "Fasting" | "Post-Meal (1 Hour)" | "Post-Meal (2 Hours)"
//   dietNotes?: string,
//   insulinTaken: boolean,
//   medicationNotes?: string,
// }
router.put("/diabetes", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const date = req.body.date || todayStr();
    const profileId = req.body.profileId ?? patientId;
    const existing = await getLog(patientId, profileId, date);

    const {
      bloodSugarMgDl, testingTime, testType,
      dietNotes, insulinTaken, medicationNotes,
    } = req.body;

    const diabetes = {
      ...(existing as any).diabetes,
      ...(bloodSugarMgDl !== undefined && { bloodSugarMgDl }),
      ...(testingTime    !== undefined && { testingTime }),
      ...(testType       !== undefined && { testType }),
      ...(dietNotes      !== undefined && { dietNotes }),
      ...(insulinTaken   !== undefined && { insulinTaken }),
      ...(medicationNotes !== undefined && { medicationNotes }),
      loggedAt: new Date().toISOString(),
    };

    const updated = {
      ...existing,
      patientId,
      profileId,
      diabetes,
      updatedAt: new Date().toISOString(),
    };

    await pregnancyLogsContainer.items.upsert(updated);
    res.json({ status: "OK", diabetes });
  } catch (err) {
    console.error("Diabetes log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/pregnancy/diabetes?date= ────────────────────────────────────
router.delete("/diabetes", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const date = (req.query.date as string) || todayStr();
    const existing = await getLog(patientId, profileId, date);

    const updated = { ...existing, patientId, profileId, diabetes: null, updatedAt: new Date().toISOString() };
    await pregnancyLogsContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Diabetes delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
