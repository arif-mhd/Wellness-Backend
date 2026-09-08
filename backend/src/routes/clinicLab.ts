import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { labServicesContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { resolveClinicScope } from "../utils/clinicScope";
import { resolveClinicName } from "./clinicInsurance";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// Mirrors clinicPharmacy.ts's requireClinicId/findPharmacyByClinicId exactly —
// same one-lab-per-branch, one-lab-serves-many-branches relationship as
// pharmacies (labServicesContainer.clinicIds is the array side).
async function requireClinicId(req: SessionRequest, res: Response): Promise<string | null> {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return null;
  return scope.scopeId;
}

async function findLabByClinicId(clinicId: string) {
  const { resources } = await labServicesContainer.items
    .query({
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.clinicIds, @clinicId)",
      parameters: [{ name: "@clinicId", value: clinicId }],
    })
    .fetchAll();
  return resources[0] ?? null;
}

// ─── GET /api/clinics/labs/me ────────────────────────────────────────────────
router.get("/me", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;
  try {
    const lab = await findLabByClinicId(clinicId);
    if (lab) {
      res.json({ lab, pendingLinkRequest: null });
      return;
    }

    const { resources: pendingMatches } = await labServicesContainer.items
      .query({
        query: "SELECT c.name, c.email, c.linkRequests FROM c WHERE EXISTS(SELECT VALUE r FROM r IN c.linkRequests WHERE r.fromClinicId = @clinicId)",
        parameters: [{ name: "@clinicId", value: clinicId }],
      })
      .fetchAll();

    const match = pendingMatches[0];
    const pendingLinkRequest = match
      ? { labName: match.name, email: match.email, linkRequest: (match.linkRequests ?? []).find((r: any) => r.fromClinicId === clinicId) }
      : null;

    res.json({ lab: null, pendingLinkRequest });
  } catch (err) {
    console.error("Clinic lab me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/labs ──────────────────────────────────────────────────
// Creates a brand-new lab account, affiliated with this branch scope from
// creation. Mirrors lab.ts's public POST /register (same SuperTokens signup +
// pending_approval gate) but stamps clinicIds/affiliation up front.
router.post("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  const { password, director, name, labLicense, location, contactNumber } = req.body;
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : req.body.email;
  if (!email || !password || !director || !name || !labLicense || !contactNumber) {
    res.status(400).json({ error: "email, password, director, name, labLicense and contactNumber are required." });
    return;
  }

  try {
    const existing = await findLabByClinicId(clinicId);
    if (existing) {
      res.status(409).json({ error: "This branch already has an affiliated lab." });
      return;
    }

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
    await UserRoles.addRoleToUser("public", supertokensId, "lab_pending");

    const clinicName = await resolveClinicName(clinicId);

    const now = new Date().toISOString();
    const labDoc = {
      id:             supertokensId,
      supertokens_id: supertokensId,
      status:         "pending_approval" as const,
      email,
      director,
      name,
      labLicense,
      location:       location || null,
      contactNumber,
      clinicIds:      [clinicId],
      affiliation:    "owned" as const,
      linkRequests:   [],
      registeredAt:   now,
      approvedAt:     null,
      approvedBy:     null,
      rejectedAt:     null,
      rejectedReason: null,
      totalTests:     0,
      rating:         0,
    };

    await labServicesContainer.items.upsert(labDoc);

    logActivity({
      source: "clinic",
      action: "Clinic Lab Created",
      details: `${name} created by ${clinicName ?? clinicId}`,
      performedBy: clinicName ?? "Clinic",
      performedById: clinicId,
      entityType: "lab",
      entityId: supertokensId,
    });

    res.status(201).json({ status: "OK", lab: labDoc });
  } catch (err) {
    console.error("Clinic create lab error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/labs/link-request ─────────────────────────────────────
router.post("/link-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  const { labEmail } = req.body;
  if (!labEmail) {
    res.status(400).json({ error: "labEmail is required." });
    return;
  }

  try {
    const existingLink = await findLabByClinicId(clinicId);
    if (existingLink) {
      res.status(409).json({ error: "This branch already has an affiliated lab." });
      return;
    }

    const { resources: matches } = await labServicesContainer.items
      .query({
        query: "SELECT * FROM c WHERE LOWER(TRIM(c.email)) = @email",
        parameters: [{ name: "@email", value: labEmail.trim().toLowerCase() }],
      })
      .fetchAll();

    if (!matches.length) {
      res.status(404).json({ error: "No lab found with that email." });
      return;
    }

    const lab = matches[0];
    const linkRequests: any[] = lab.linkRequests ?? [];
    if (linkRequests.some((r: any) => r.fromClinicId === clinicId)) {
      res.status(409).json({ error: "A link request to this lab is already pending." });
      return;
    }

    const clinicName = (await resolveClinicName(clinicId)) ?? "Your clinic";

    const updated = {
      ...lab,
      linkRequests: [...linkRequests, { fromClinicId: clinicId, fromClinicName: clinicName, requestedAt: new Date().toISOString() }],
    };
    await labServicesContainer.items.upsert(updated);

    res.json({ status: "OK", lab: updated });
  } catch (err) {
    console.error("Clinic lab link-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/labs/link-request ───────────────────────────────────
router.delete("/link-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  try {
    const { resources: matches } = await labServicesContainer.items
      .query({
        query: "SELECT * FROM c WHERE EXISTS(SELECT VALUE r FROM r IN c.linkRequests WHERE r.fromClinicId = @clinicId)",
        parameters: [{ name: "@clinicId", value: clinicId }],
      })
      .fetchAll();

    if (!matches.length) {
      res.status(404).json({ error: "No pending link request found." });
      return;
    }

    const lab = matches[0];
    const updated = { ...lab, linkRequests: (lab.linkRequests ?? []).filter((r: any) => r.fromClinicId !== clinicId) };
    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Clinic lab cancel link-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/labs/me ─────────────────────────────────────────────
router.delete("/me", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  try {
    const lab = await findLabByClinicId(clinicId);
    if (!lab) {
      res.status(404).json({ error: "No affiliated lab found." });
      return;
    }

    const remainingClinicIds = (lab.clinicIds ?? []).filter((id: string) => id !== clinicId);
    const updated = {
      ...lab,
      clinicIds: remainingClinicIds,
      affiliation: remainingClinicIds.length ? lab.affiliation : null,
    };
    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Clinic lab unlink error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
