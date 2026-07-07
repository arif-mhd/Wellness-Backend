import { Router, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import { getUser } from "supertokens-node";
import { adminsContainer } from "../config/cosmos";
import { uploadBlob, generateSasUrl } from "../config/blob";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Singleton document key for platform-wide settings
const PLATFORM_DOC_ID = "platform_settings";

// ─── GET /api/admin/settings/profile ────────────────────────────────────────
// Returns the logged-in admin's own profile doc from Cosmos, augmented with
// their email address from SuperTokens (which is the source of truth).
router.get("/profile", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const adminId = req.session!.getUserId();
  try {
    let cosmosDoc: any = { id: adminId };
    try {
      const { resource } = await adminsContainer.item(adminId, adminId).read();
      if (resource) cosmosDoc = resource;
    } catch {}

    let email = cosmosDoc.email ?? "";
    if (!email) {
      try {
        const stUser = await getUser(adminId);
        email = stUser?.emails?.[0] ?? stUser?.loginMethods?.[0]?.email ?? "";
      } catch {}
    }

    res.json({ profile: { ...cosmosDoc, email } });
  } catch (err: any) {
    console.error("Admin profile GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/admin/settings/profile ────────────────────────────────────────
// Updates non-sensitive admin profile fields (name, phone, timezone, avatarUrl).
router.put("/profile", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const adminId = req.session!.getUserId();
  const { fullName, phone, timezone, avatarUrl } = req.body;

  try {
    let existing: any = { id: adminId };
    try {
      const { resource } = await adminsContainer.item(adminId, adminId).read();
      if (resource) existing = resource;
    } catch {}

    const updated = {
      ...existing,
      id: adminId,
      fullName:  fullName  ?? existing.fullName,
      phone:     phone     ?? existing.phone,
      timezone:  timezone  ?? existing.timezone,
      avatarUrl: avatarUrl ?? existing.avatarUrl,
      updatedAt: new Date().toISOString(),
    };

    await adminsContainer.items.upsert(updated);
    res.json({ status: "OK", profile: updated });
  } catch (err) {
    console.error("Admin profile PUT error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/settings/platform ───────────────────────────────────────
// Returns the platform-wide settings singleton (general, appointment, security, etc.).
router.get("/platform", requireRole("admin"), async (_req: SessionRequest, res: Response) => {
  try {
    const { resource } = await adminsContainer.item(PLATFORM_DOC_ID, PLATFORM_DOC_ID).read();
    res.json({ settings: resource ?? {} });
  } catch (err: any) {
    if (err.code === 404) {
      res.json({ settings: {} });
    } else {
      console.error("Platform settings GET error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ─── PUT /api/admin/settings/platform ───────────────────────────────────────
// Merges partial updates into the platform settings singleton.
// The body can contain any subset of: general, appointment, security,
// maintenance, notificationPreferences fields.
router.put("/platform", requireRole("admin"), async (_req: SessionRequest, res: Response) => {
  const patch = _req.body;
  try {
    let existing: any = { id: PLATFORM_DOC_ID };
    try {
      const { resource } = await adminsContainer.item(PLATFORM_DOC_ID, PLATFORM_DOC_ID).read();
      if (resource) existing = resource;
    } catch {}

    const updated = {
      ...existing,
      ...patch,
      id: PLATFORM_DOC_ID,
      updatedAt: new Date().toISOString(),
    };

    await adminsContainer.items.upsert(updated);
    res.json({ status: "OK", settings: updated });
  } catch (err) {
    console.error("Platform settings PUT error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/settings/upload-policy ─────────────────────────────────
// Uploads an HTML file for privacy policy or terms & conditions to blob storage.
// Field name: "privacyPolicy" | "terms"
router.post(
  "/upload-policy",
  requireRole("admin"),
  upload.fields([
    { name: "privacyPolicy", maxCount: 1 },
    { name: "terms",         maxCount: 1 },
  ]),
  async (_req: SessionRequest, res: Response) => {
    const files = _req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        if (file.mimetype !== "text/html") {
          res.status(400).json({ error: `${field}: only HTML files are accepted.` });
          return;
        }
        const blobPath = `platform/${field}.html`;
        await uploadBlob(blobPath, file.buffer, "text/html");
        urls[field] = generateSasUrl(blobPath);
      }

      // Persist the URLs into platform settings
      let existing: any = { id: PLATFORM_DOC_ID };
      try {
        const { resource } = await adminsContainer.item(PLATFORM_DOC_ID, PLATFORM_DOC_ID).read();
        if (resource) existing = resource;
      } catch {}

      const updated = {
        ...existing,
        id: PLATFORM_DOC_ID,
        ...(urls.privacyPolicy ? { privacyPolicyUrl: urls.privacyPolicy, privacyPolicyUpdatedAt: new Date().toISOString() } : {}),
        ...(urls.terms         ? { termsUrl: urls.terms, termsUpdatedAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString(),
      };
      await adminsContainer.items.upsert(updated);

      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Policy upload error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
