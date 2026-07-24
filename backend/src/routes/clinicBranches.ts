import { Router, Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import Session from "supertokens-node/recipe/session";
import RecipeUserId from "supertokens-node/lib/build/recipeUserId";
import multer from "multer";
import { requireRole } from "../middleware/requireRole";
import {
  clinicsContainer,
  doctorsContainer,
  appointmentsContainer,
  queryDocuments,
} from "../config/cosmos";
import { logActivity } from "../utils/activityLogger";
import { buildInClause, mainBranchFrom } from "../utils/clinicScope";
import { uploadBlob, generateSasUrl } from "../config/blob";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Loads the caller's own clinic doc — every route in this file is org-owner
// only (a branch-user account, including a main-branch senior-staff login,
// has its own branchId set and gets 403'd here; they manage their one
// branch through the ordinary clinic endpoints, never this file).
async function requireOrgOwner(req: SessionRequest, res: Response) {
  const actorId = req.session!.getUserId();
  const { resource: org } = await clinicsContainer.item(actorId, actorId).read().catch(() => ({ resource: undefined as any }));
  if (!org || org.branchId) {
    res.status(403).json({ error: "Not authorized." });
    return null;
  }
  return org;
}

// The org's own id always means "my main branch" — it has no separate
// entry in branches[], it's the org doc's own top-level fields (see
// mainBranchFrom).
function findBranch(org: any, branchId: string) {
  if (branchId === org.id) return mainBranchFrom(org);
  return (org.branches ?? []).find((b: any) => b.id === branchId) ?? null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Today's operating hours as a short string, e.g. "11:30 - 23:30" or "Closed".
function todayHoursFor(slots: any[] | undefined) {
  const dow = new Date().getDay();
  const daySlots = (slots ?? []).filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (daySlots.length === 0) return "Closed";
  return daySlots.map((s) => `${s.startTime} - ${s.endTime}`).join(", ");
}

// Groups the week's slots into compact "Mon - Fri : 11:30 - 23:30" style
// rows by collapsing consecutive days that share identical hours.
function weeklyHoursSummary(slots: any[] | undefined) {
  const perDay = DAY_NAMES.map((_, dow) => {
    const daySlots = (slots ?? []).filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return daySlots.length > 0 ? daySlots.map((s) => `${s.startTime} - ${s.endTime}`).join(", ") : null;
  });

  const rows: { label: string; hours: string }[] = [];
  let i = 0;
  while (i < 7) {
    if (!perDay[i]) { i++; continue; }
    let j = i;
    while (j + 1 < 7 && perDay[j + 1] === perDay[i]) j++;
    const label = j > i ? `${DAY_NAMES[i].slice(0, 3)} - ${DAY_NAMES[j].slice(0, 3)}` : DAY_NAMES[i].slice(0, 3);
    rows.push({ label, hours: perDay[i]! });
    i = j + 1;
  }
  return rows;
}

async function branchStats(branchId: string, orgId?: string) {
  const now = new Date();
  const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [{ resources: doctorCountRes }, appointments, users] = await Promise.all([
    doctorsContainer.items
      .query({
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.clinicId = @clinicId AND c.status = 'approved'",
        parameters: [{ name: "@clinicId", value: branchId }],
      })
      .fetchAll(),
    queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.scheduledAt, c.status, c.paymentAmount FROM c WHERE c.clinicId = @clinicId",
      parameters: [{ name: "@clinicId", value: branchId }],
    }),
    orgId
      ? queryDocuments<any>(clinicsContainer, {
          query: "SELECT c.id, c.fullName FROM c WHERE c.orgId = @orgId AND c.branchId = @branchId AND c.status != 'deleted' ORDER BY c.registeredAt ASC",
          parameters: [{ name: "@orgId", value: orgId }, { name: "@branchId", value: branchId }],
        })
      : Promise.resolve([]),
  ]);

  const nonCancelled = appointments.filter((a) => a.status !== "cancelled");
  const inRange = (iso: string, start: Date, end: Date) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t < end.getTime();
  };
  const sumRevenue = (start: Date, end: Date) =>
    nonCancelled.filter((a) => inRange(a.scheduledAt, start, end)).reduce((s, a) => s + (a.paymentAmount ?? 0), 0);

  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  // Last 8 days of consultation volume, for the small "Patients" trend chart.
  const patientsTrend = Array.from({ length: 8 }, (_, idx) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - (7 - idx));
    const dateStr = d.toISOString().slice(0, 10);
    const count = nonCancelled.filter((a) => a.scheduledAt?.slice(0, 10) === dateStr).length;
    return { label: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }), count };
  });

  return {
    doctorCount: doctorCountRes[0] ?? 0,
    userCount: users.length,
    firstUser: users[0] ? { id: users[0].id, fullName: users[0].fullName } : null,
    consultationsToday: nonCancelled.filter((a) => inRange(a.scheduledAt, todayStart, tomorrowStart)).length,
    revenueThisMonth: sumRevenue(startOfThisMonth, startOfNextMonth),
    revenueLastMonth: sumRevenue(startOfLastMonth, startOfThisMonth),
    patientsTrend,
  };
}

// ─── GET /api/clinics/branches ───────────────────────────────────────────────
router.get("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  try {
    const mainBranch = mainBranchFrom(org);
    const branches = org.branches ?? [];
    const enriched = await Promise.all([mainBranch, ...branches].map(async (b: any) => ({
      ...b,
      ...(await branchStats(b.id, org.id)),
      todayHours: todayHoursFor(b.slots),
    })));
    res.json({ branches: enriched });
  } catch (err) {
    console.error("Fetch branches error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinics/branches/:branchId ─────────────────────────────────────
router.get("/:branchId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  try {
    const branch = findBranch(org, req.params.branchId);
    if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

    res.json({
      branch: {
        ...branch,
        ...(await branchStats(branch.id, org.id)),
        todayHours: todayHoursFor(branch.slots),
        weeklyHours: weeklyHoursSummary(branch.slots),
      },
    });
  } catch (err) {
    console.error("Fetch branch error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/branches/:branchId/users/upload ──────────────────────
// Staged avatar upload for the Add User wizard, keyed by a client draftId —
// mirrors POST /api/clinics/doctors/upload.
router.post(
  "/:branchId/users/upload",
  requireRole("clinic"),
  upload.fields([{ name: "avatar", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    const draftId = (req.body?.draftId as string) || `draft_${Date.now()}`;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};

    const MIME_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    };

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        const ext = MIME_EXT[file.mimetype] ?? "bin";
        const blobPath = `branch-users/${draftId}/${field}_${Date.now()}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Branch user file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

// ─── GET /api/clinics/branches/:branchId/users ───────────────────────────────
router.get("/:branchId/users", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  try {
    const branch = findBranch(org, req.params.branchId);
    if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

    const { resources } = await clinicsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.orgId = @orgId AND c.branchId = @branchId AND c.status != 'deleted' ORDER BY c.registeredAt ASC",
        parameters: [{ name: "@orgId", value: org.id }, { name: "@branchId", value: branch.id }],
      })
      .fetchAll();

    res.json({ users: resources });
  } catch (err) {
    console.error("Fetch branch users error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/branches/:branchId/users ──────────────────────────────
// Adds a login-capable account to this branch — the first one added is the
// branch's senior account (it's who logs in and adds doctors to this
// branch); further accounts get identical, equal access. Mirrors
// POST /api/clinics/doctors exactly: real credentials set directly, role
// "clinic" immediately, no separate approval queue — the org is the vetting
// authority for its own branches.
router.post("/:branchId/users", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const branch = findBranch(org, req.params.branchId);
  if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }
  if (branch.status !== "active") { res.status(400).json({ error: "Branch is not active yet." }); return; }

  const {
    email, password, fullName, phone, emiratesId, address,
    gender, dateOfBirth, bloodGroup, languages, otherInfo, avatarUrl,
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
      res.status(400).json({ error: "Could not create the account. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;
    await UserRoles.addRoleToUser("public", supertokensId, "clinic");

    const now = new Date().toISOString();
    const userDoc = {
      id: supertokensId,
      supertokens_id: supertokensId,
      status: "approved",
      email,
      fullName,
      phone,
      emiratesId: emiratesId || null,
      emiratesIdOrPassport: emiratesId || null,
      address: address || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      bloodGroup: bloodGroup || null,
      languages: languages || null,
      otherInfo: Array.isArray(otherInfo) ? otherInfo : [],
      avatarUrl: avatarUrl || null,
      orgId: org.id,
      branchId: branch.id,
      registeredAt: now,
      approvedAt: now,
      approvedBy: org.id,
    };

    await clinicsContainer.items.upsert(userDoc);

    logActivity({
      source: "clinic",
      action: "Branch User Added",
      details: `${fullName} added to branch "${branch.name}"`,
      performedBy: org.fullName ?? "Clinic",
      performedById: org.id,
      entityType: "clinic",
      entityId: supertokensId,
    });

    res.status(201).json({ status: "OK", user: userDoc });
  } catch (err) {
    console.error("Create branch user error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PATCH /api/clinics/branches/:branchId/users/:userId ────────────────────
router.patch("/:branchId/users/:userId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const branch = findBranch(org, req.params.branchId);
  if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

  const { fullName, phone, emiratesId, address, gender, dateOfBirth, bloodGroup, languages, otherInfo, avatarUrl } = req.body;

  try {
    const { resource: user } = await clinicsContainer.item(req.params.userId, req.params.userId).read().catch(() => ({ resource: undefined as any }));
    if (!user || user.orgId !== org.id || user.branchId !== branch.id) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const updated = {
      ...user,
      fullName: fullName ?? user.fullName,
      phone: phone ?? user.phone,
      emiratesId: emiratesId ?? user.emiratesId,
      emiratesIdOrPassport: emiratesId ?? user.emiratesIdOrPassport ?? user.emiratesId,
      address: address ?? user.address,
      gender: gender ?? user.gender,
      dateOfBirth: dateOfBirth ?? user.dateOfBirth,
      bloodGroup: bloodGroup ?? user.bloodGroup,
      languages: languages ?? user.languages,
      otherInfo: Array.isArray(otherInfo) ? otherInfo : user.otherInfo,
      avatarUrl: avatarUrl ?? user.avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    await clinicsContainer.items.upsert(updated);
    res.json({ status: "OK", user: updated });
  } catch (err) {
    console.error("Update branch user error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/branches/:branchId/users/:userId/reset-password ──────
// Never stores or returns the password — same pattern as the clinic's own
// doctor credential reset.
router.post("/:branchId/users/:userId/reset-password", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const branch = findBranch(org, req.params.branchId);
  if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

  const { password } = req.body;
  if (!password || password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters." });
    return;
  }

  try {
    const { resource: user } = await clinicsContainer.item(req.params.userId, req.params.userId).read().catch(() => ({ resource: undefined as any }));
    if (!user || user.orgId !== org.id || user.branchId !== branch.id) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const result = await EmailPassword.updateEmailOrPassword({
      recipeUserId: new RecipeUserId(user.id),
      password,
    });
    if (result.status !== "OK") {
      res.status(400).json({ error: "Could not reset the password." });
      return;
    }

    logActivity({
      source: "clinic",
      action: "Branch User Credentials Reset",
      details: `${user.fullName ?? user.id} credentials reset (branch "${branch.name}")`,
      performedBy: org.fullName ?? "Clinic",
      performedById: org.id,
      entityType: "clinic",
      entityId: user.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Reset branch user password error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/branches/:branchId/users/:userId ───────────────────
router.delete("/:branchId/users/:userId", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const branch = findBranch(org, req.params.branchId);
  if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }

  try {
    const { resource: user } = await clinicsContainer.item(req.params.userId, req.params.userId).read().catch(() => ({ resource: undefined as any }));
    if (!user || user.orgId !== org.id || user.branchId !== branch.id) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    await clinicsContainer.items.upsert({ ...user, status: "deleted", deletedAt: new Date().toISOString() });
    await Session.revokeAllSessionsForUser(user.id);

    logActivity({
      source: "clinic",
      action: "Branch User Removed",
      details: `${user.fullName ?? user.id} removed from branch "${branch.name}"`,
      performedBy: org.fullName ?? "Clinic",
      performedById: org.id,
      entityType: "clinic",
      entityId: user.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Delete branch user error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/branches/add-request ──────────────────────────────────
// Phase 1 of a two-phase add-branch flow — the only way to add a branch after
// initial registration, never self-service. Collects the branch's core
// identity only (name, license, location); the full company profile and
// schedule are collected in phase 2, submitted via POST
// /:branchId/submit-details, only after the platform admin approves this
// initial request (status "requested" -> "details_pending" -> "pending_approval" -> "active").
router.post("/add-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const { name, address, licenseNumber, dohLicense, phone } = req.body;
  if (!name || !address) {
    res.status(400).json({ error: "name and address are required." });
    return;
  }

  try {
    const newBranch = {
      id: "branch_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name,
      address,
      licenseNumber: licenseNumber || null,
      dohLicense: dohLicense || null,
      phone: phone || null,
      status: "requested",
      requestedAt: new Date().toISOString(),
    };
    const branches = [...(org.branches ?? []), newBranch];
    // Flips true the moment a clinic requests its first branch beyond its
    // own main one, regardless of what it answered at registration — kept
    // accurate for display purposes, but scope resolution itself gates on
    // branches.length, never trusts this flag alone (see resolveClinicScope).
    await clinicsContainer.items.upsert({ ...org, branches, isMultiBranchOrg: true, updatedAt: new Date().toISOString() });

    logActivity({
      source: "clinic",
      action: "Branch Requested",
      details: `${org.fullName ?? org.id} requested a new branch: ${name}`,
      performedBy: org.fullName ?? "Clinic",
      performedById: org.id,
      entityType: "clinic",
      entityId: org.id,
    });

    res.status(201).json({ status: "OK", branch: newBranch });
  } catch (err) {
    console.error("Branch add-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/branches/:branchId/upload ─────────────────────────────
// Staged file upload for the phase-2 "complete branch setup" wizard (address
// proof, logo) — mirrors POST /api/clinics/branches/:branchId/users/upload.
router.post(
  "/:branchId/upload",
  requireRole("clinic"),
  upload.fields([{ name: "addressProofFile", maxCount: 1 }, { name: "clinicImage", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    const { branchId } = req.params;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};

    const MIME_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "application/pdf": "pdf",
    };

    try {
      for (const [field, fileArr] of Object.entries(files ?? {})) {
        const file = fileArr[0];
        const ext = MIME_EXT[file.mimetype] ?? "bin";
        const blobPath = `branches/${branchId}/${field}_${Date.now()}.${ext}`;
        await uploadBlob(blobPath, file.buffer, file.mimetype);
        urls[field] = generateSasUrl(blobPath);
      }
      res.json({ status: "OK", urls });
    } catch (err) {
      console.error("Branch file upload error:", err);
      res.status(500).json({ error: "File upload failed." });
    }
  }
);

// ─── POST /api/clinics/branches/:branchId/submit-details ────────────────────
// Phase 2 of the add-branch flow — only usable once the platform admin has
// approved the initial request (status "details_pending"). Fills in the
// branch's full company profile and schedule, then sends it back to the
// platform admin for final approval.
router.post("/:branchId/submit-details", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const org = await requireOrgOwner(req, res);
  if (!org) return;

  const branch = findBranch(org, req.params.branchId);
  if (!branch) { res.status(404).json({ error: "Branch not found." }); return; }
  if (branch.status !== "details_pending") {
    res.status(400).json({ error: "This branch isn't awaiting details submission." });
    return;
  }

  const {
    licenseNumber, dohLicense, address, addressProofFileUrl,
    consultationRates, paymentSettings, bio, clinicImageUrl, slots,
  } = req.body;

  try {
    const now = new Date().toISOString();
    const branches = (org.branches ?? []).map((b: any) => {
      if (b.id !== branch.id) return b;
      return {
        ...b,
        licenseNumber: licenseNumber ?? b.licenseNumber,
        dohLicense: dohLicense ?? b.dohLicense,
        address: address ?? b.address,
        addressProofFileUrl: addressProofFileUrl ?? b.addressProofFileUrl ?? null,
        consultationRates: consultationRates ?? [],
        paymentSettings: paymentSettings ?? null,
        bio: bio ?? null,
        clinicImageUrl: clinicImageUrl ?? null,
        slots: slots ?? [],
        status: "pending_approval",
        detailsSubmittedAt: now,
      };
    });
    await clinicsContainer.items.upsert({ ...org, branches, updatedAt: now });

    logActivity({
      source: "clinic",
      action: "Branch Details Submitted",
      details: `${org.fullName ?? org.id} submitted full details for branch "${branch.name}"`,
      performedBy: org.fullName ?? "Clinic",
      performedById: org.id,
      entityType: "clinic",
      entityId: org.id,
    });

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Branch submit-details error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
