import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { pharmaciesContainer, clinicsContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { resolveClinicScope } from "../utils/clinicScope";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// The pharmacy is an org-wide resource shared by every branch, not a
// per-branch one (unlike doctors/insurance/etc), so only the org owner
// account may view/manage it — a branch/senior-staff account is 403'd here
// the same way clinicBranches.ts's requireOrgOwner rejects them.
async function requireOrgId(req: SessionRequest, res: Response): Promise<string | null> {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return null;
  if (scope.isBranchUser) {
    res.status(403).json({ error: "Only the clinic owner account can manage the pharmacy." });
    return null;
  }
  return scope.orgId ?? scope.scopeId;
}

async function findPharmacyByOrgId(orgId: string) {
  const { resources } = await pharmaciesContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.orgId = @orgId",
      parameters: [{ name: "@orgId", value: orgId }],
    })
    .fetchAll();
  return resources[0] ?? null;
}

// ─── GET /api/clinics/pharmacies/me ──────────────────────────────────────────
// Returns the affiliated pharmacy if one exists, otherwise any outgoing
// link-request this org has sent that's still awaiting the target pharmacy's
// response (that pending state lives on the target's own doc, under
// linkRequest.fromOrgId, until they accept — see /link-request above).
router.get("/me", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const orgId = await requireOrgId(req, res);
  if (!orgId) return;
  try {
    const pharmacy = await findPharmacyByOrgId(orgId);
    if (pharmacy) {
      res.json({ pharmacy, pendingLinkRequest: null });
      return;
    }

    const { resources: pendingMatches } = await pharmaciesContainer.items
      .query({
        query: "SELECT c.pharmacyName, c.email, c.linkRequest FROM c WHERE c.linkRequest.fromOrgId = @orgId",
        parameters: [{ name: "@orgId", value: orgId }],
      })
      .fetchAll();

    res.json({ pharmacy: null, pendingLinkRequest: pendingMatches[0] ?? null });
  } catch (err) {
    console.error("Clinic pharmacy me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/pharmacies ────────────────────────────────────────────
// Clinic creates a brand-new pharmacy account, affiliated with this org from
// creation. Mirrors pharmacy.ts's public POST /register (same SuperTokens
// signup + pending_approval gate — license/compliance review stays with the
// platform admin either way) but stamps orgId/affiliation up front.
router.post("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const orgId = await requireOrgId(req, res);
  if (!orgId) return;

  const { email, password, ownerName, pharmacyName, licenseNumber, location, phone } = req.body;
  if (!email || !password || !ownerName || !pharmacyName || !licenseNumber || !phone) {
    res.status(400).json({ error: "email, password, ownerName, pharmacyName, licenseNumber and phone are required." });
    return;
  }

  try {
    const existing = await findPharmacyByOrgId(orgId);
    if (existing) {
      res.status(409).json({ error: "This clinic already has an affiliated pharmacy." });
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
    await UserRoles.addRoleToUser("public", supertokensId, "pharmacy_pending");

    const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));

    const now = new Date().toISOString();
    const pharmacyDoc = {
      id:             supertokensId,
      supertokens_id: supertokensId,
      status:         "pending_approval" as const,
      email,
      ownerName,
      pharmacyName,
      licenseNumber,
      location:       location || null,
      phone,
      orgId,
      orgName:        org?.clinicName || org?.fullName || null,
      affiliation:    "owned" as const,
      linkRequest:    null,
      registeredAt:   now,
      approvedAt:     null,
      approvedBy:     null,
      rejectedAt:     null,
      rejectedReason: null,
    };

    await pharmaciesContainer.items.upsert(pharmacyDoc);

    logActivity({
      source: "clinic",
      action: "Clinic Pharmacy Created",
      details: `${pharmacyName} created by ${org?.clinicName || org?.fullName || orgId}`,
      performedBy: org?.clinicName || org?.fullName || "Clinic",
      performedById: orgId,
      entityType: "pharmacy",
      entityId: supertokensId,
    });

    res.status(201).json({ status: "OK", pharmacy: pharmacyDoc });
  } catch (err) {
    console.error("Clinic create pharmacy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/pharmacies/link-request ───────────────────────────────
// Invites an already-existing independent pharmacy to affiliate with this
// clinic. The pharmacy must accept via /api/pharmacy/clinic-link-request/accept
// before the link takes effect.
router.post("/link-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const orgId = await requireOrgId(req, res);
  if (!orgId) return;

  const { pharmacyEmail } = req.body;
  if (!pharmacyEmail) {
    res.status(400).json({ error: "pharmacyEmail is required." });
    return;
  }

  try {
    const existingLink = await findPharmacyByOrgId(orgId);
    if (existingLink) {
      res.status(409).json({ error: "This clinic already has an affiliated pharmacy." });
      return;
    }

    const { resources: matches } = await pharmaciesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: pharmacyEmail.trim().toLowerCase() }],
      })
      .fetchAll();

    if (!matches.length) {
      res.status(404).json({ error: "No pharmacy found with that email." });
      return;
    }

    const pharmacy = matches[0];
    if (pharmacy.orgId) {
      res.status(409).json({ error: "That pharmacy is already affiliated with a clinic." });
      return;
    }
    if (pharmacy.linkRequest) {
      res.status(409).json({ error: "That pharmacy already has a pending link request." });
      return;
    }

    const { resource: org } = await clinicsContainer.item(orgId, orgId).read().catch(() => ({ resource: undefined as any }));
    const orgName = org?.clinicName || org?.fullName || "Your clinic";

    const updated = {
      ...pharmacy,
      linkRequest: { fromOrgId: orgId, fromOrgName: orgName, requestedAt: new Date().toISOString() },
    };
    await pharmaciesContainer.items.upsert(updated);

    res.json({ status: "OK", pharmacy: updated });
  } catch (err) {
    console.error("Clinic pharmacy link-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/pharmacies/link-request ─────────────────────────────
// Cancels the org's own pending outgoing link request.
router.delete("/link-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const orgId = await requireOrgId(req, res);
  if (!orgId) return;

  try {
    const { resources: matches } = await pharmaciesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.linkRequest.fromOrgId = @orgId",
        parameters: [{ name: "@orgId", value: orgId }],
      })
      .fetchAll();

    if (!matches.length) {
      res.status(404).json({ error: "No pending link request found." });
      return;
    }

    const updated = { ...matches[0], linkRequest: null };
    await pharmaciesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Clinic pharmacy cancel link-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/pharmacies/me ───────────────────────────────────────
// Unlinks the current pharmacy. The pharmacy account itself is untouched —
// it simply becomes independent again (matches its original default state).
router.delete("/me", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const orgId = await requireOrgId(req, res);
  if (!orgId) return;

  try {
    const pharmacy = await findPharmacyByOrgId(orgId);
    if (!pharmacy) {
      res.status(404).json({ error: "No affiliated pharmacy found." });
      return;
    }

    const updated = { ...pharmacy, orgId: null, orgName: null, affiliation: null };
    await pharmaciesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Clinic pharmacy unlink error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
