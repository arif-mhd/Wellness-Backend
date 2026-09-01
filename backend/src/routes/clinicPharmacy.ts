import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { pharmaciesContainer } from "../config/cosmos";
import { requireRole } from "../middleware/requireRole";
import { resolveClinicScope } from "../utils/clinicScope";
import { resolveClinicName } from "./clinicInsurance";
import { logActivity } from "../utils/activityLogger";

const router = Router();

// A branch can only ever have ONE affiliated pharmacy (clinicId -> single
// pharmacy), but the reverse isn't true — one pharmacy can serve several
// clinics/branches at once, so pharmacies.clinicIds is an array. Each entry
// is a specific branch scope (a real branch id, or the org's own id acting
// as its main branch) — the same id space doctor.clinicId already uses, so
// no org-level resolution is ever needed to match a doctor to "their"
// pharmacy.
//
// resolveClinicScope already requires a specific ?branchId= from a
// multi-branch org owner with no branch selected — that's the correct
// behavior here (each branch's pharmacy is managed separately), not an
// error case to route around.
async function requireClinicId(req: SessionRequest, res: Response): Promise<string | null> {
  const scope = await resolveClinicScope(req, res, { allowAggregate: false });
  if (!scope) return null;
  return scope.scopeId;
}

async function findPharmacyByClinicId(clinicId: string) {
  const { resources } = await pharmaciesContainer.items
    .query({
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.clinicIds, @clinicId)",
      parameters: [{ name: "@clinicId", value: clinicId }],
    })
    .fetchAll();
  return resources[0] ?? null;
}

// ─── GET /api/clinics/pharmacies/me ──────────────────────────────────────────
// Returns the affiliated pharmacy for this specific branch scope if one
// exists, otherwise any outgoing link-request this branch has sent that's
// still awaiting the target pharmacy's response (that pending state lives on
// the target's own doc, in linkRequests[], until they accept — see
// /link-request below).
router.get("/me", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;
  try {
    const pharmacy = await findPharmacyByClinicId(clinicId);
    if (pharmacy) {
      res.json({ pharmacy, pendingLinkRequest: null });
      return;
    }

    const { resources: pendingMatches } = await pharmaciesContainer.items
      .query({
        query: "SELECT c.pharmacyName, c.email, c.linkRequests FROM c WHERE EXISTS(SELECT VALUE r FROM r IN c.linkRequests WHERE r.fromClinicId = @clinicId)",
        parameters: [{ name: "@clinicId", value: clinicId }],
      })
      .fetchAll();

    const match = pendingMatches[0];
    const pendingLinkRequest = match
      ? { pharmacyName: match.pharmacyName, email: match.email, linkRequest: (match.linkRequests ?? []).find((r: any) => r.fromClinicId === clinicId) }
      : null;

    res.json({ pharmacy: null, pendingLinkRequest });
  } catch (err) {
    console.error("Clinic pharmacy me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinics/pharmacies ────────────────────────────────────────────
// Creates a brand-new pharmacy account, affiliated with this specific branch
// scope from creation. Mirrors pharmacy.ts's public POST /register (same
// SuperTokens signup + pending_approval gate — license/compliance review
// stays with the platform admin either way) but stamps clinicIds/affiliation
// up front.
router.post("/", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  const { password, ownerName, pharmacyName, licenseNumber, location, phone } = req.body;
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : req.body.email;
  if (!email || !password || !ownerName || !pharmacyName || !licenseNumber || !phone) {
    res.status(400).json({ error: "email, password, ownerName, pharmacyName, licenseNumber and phone are required." });
    return;
  }

  try {
    const existing = await findPharmacyByClinicId(clinicId);
    if (existing) {
      res.status(409).json({ error: "This branch already has an affiliated pharmacy." });
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

    const clinicName = await resolveClinicName(clinicId);

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
      clinicIds:      [clinicId],
      affiliation:    "owned" as const,
      linkRequests:   [],
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
      details: `${pharmacyName} created by ${clinicName ?? clinicId}`,
      performedBy: clinicName ?? "Clinic",
      performedById: clinicId,
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
// Invites an existing pharmacy — independent, or already serving other
// clinics — to also affiliate with this branch scope. The pharmacy must
// accept via /api/pharmacy/clinic-link-requests/accept before the link takes
// effect.
router.post("/link-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  const { pharmacyEmail } = req.body;
  if (!pharmacyEmail) {
    res.status(400).json({ error: "pharmacyEmail is required." });
    return;
  }

  try {
    const existingLink = await findPharmacyByClinicId(clinicId);
    if (existingLink) {
      res.status(409).json({ error: "This branch already has an affiliated pharmacy." });
      return;
    }

    // LOWER(TRIM(...)) on both sides so this still finds a pharmacy whose
    // email was stored with different casing/whitespace before write paths
    // normalized it (registration, profile edits) — no backfill needed.
    const { resources: matches } = await pharmaciesContainer.items
      .query({
        query: "SELECT * FROM c WHERE LOWER(TRIM(c.email)) = @email",
        parameters: [{ name: "@email", value: pharmacyEmail.trim().toLowerCase() }],
      })
      .fetchAll();

    if (!matches.length) {
      res.status(404).json({ error: "No pharmacy found with that email." });
      return;
    }

    const pharmacy = matches[0];
    const linkRequests: any[] = pharmacy.linkRequests ?? [];
    if (linkRequests.some((r: any) => r.fromClinicId === clinicId)) {
      res.status(409).json({ error: "A link request to this pharmacy is already pending." });
      return;
    }

    const clinicName = (await resolveClinicName(clinicId)) ?? "Your clinic";

    const updated = {
      ...pharmacy,
      linkRequests: [...linkRequests, { fromClinicId: clinicId, fromClinicName: clinicName, requestedAt: new Date().toISOString() }],
    };
    await pharmaciesContainer.items.upsert(updated);

    res.json({ status: "OK", pharmacy: updated });
  } catch (err) {
    console.error("Clinic pharmacy link-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/pharmacies/link-request ─────────────────────────────
// Cancels this branch's own pending outgoing link request.
router.delete("/link-request", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  try {
    const { resources: matches } = await pharmaciesContainer.items
      .query({
        query: "SELECT * FROM c WHERE EXISTS(SELECT VALUE r FROM r IN c.linkRequests WHERE r.fromClinicId = @clinicId)",
        parameters: [{ name: "@clinicId", value: clinicId }],
      })
      .fetchAll();

    if (!matches.length) {
      res.status(404).json({ error: "No pending link request found." });
      return;
    }

    const pharmacy = matches[0];
    const updated = { ...pharmacy, linkRequests: (pharmacy.linkRequests ?? []).filter((r: any) => r.fromClinicId !== clinicId) };
    await pharmaciesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Clinic pharmacy cancel link-request error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/clinics/pharmacies/me ───────────────────────────────────────
// Unlinks the current pharmacy from this branch only — other clinics that
// pharmacy also serves are untouched. If this was its last remaining
// affiliation, it reverts to a fully independent pharmacy.
router.delete("/me", requireRole("clinic"), async (req: SessionRequest, res: Response) => {
  const clinicId = await requireClinicId(req, res);
  if (!clinicId) return;

  try {
    const pharmacy = await findPharmacyByClinicId(clinicId);
    if (!pharmacy) {
      res.status(404).json({ error: "No affiliated pharmacy found." });
      return;
    }

    const remainingClinicIds = (pharmacy.clinicIds ?? []).filter((id: string) => id !== clinicId);
    const updated = {
      ...pharmacy,
      clinicIds: remainingClinicIds,
      affiliation: remainingClinicIds.length ? pharmacy.affiliation : null,
    };
    await pharmaciesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Clinic pharmacy unlink error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
