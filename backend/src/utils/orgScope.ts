import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { pool } from "../config/database";
import { DEFAULT_ORG_SLUG } from "../config/features";
import { patientsContainer, clinicsContainer, doctorsContainer, pharmaciesContainer } from "../config/cosmos";

let defaultOrgIdCache: string | null = null;

async function getDefaultOrgId(): Promise<string> {
  if (defaultOrgIdCache) return defaultOrgIdCache;
  const { rows } = await pool.query(`SELECT id FROM organizations WHERE slug = $1`, [DEFAULT_ORG_SLUG]);
  if (!rows[0]) throw new Error(`Default organization '${DEFAULT_ORG_SLUG}' is not seeded — check initDb().`);
  defaultOrgIdCache = rows[0].id;
  return defaultOrgIdCache!;
}

// Resolves which white-label organization a request belongs to, by reading
// the caller's own `tenantId` field (stamped at registration — see
// patients.ts/clinics.ts POST /register). Not to be confused with the
// pre-existing `orgId` field on clinic docs, which means something entirely
// different (which parent clinic a branch belongs to — see clinicScope.ts).
//
// Falls back to the seeded default org when:
//   - the caller's doc predates this migration and has no tenantId yet
//   - the caller isn't a patient/clinic (e.g. a doctor or admin route that
//     happens to sit behind requireFeature) — nothing else carries a
//     tenantId yet, so there's nothing more specific to resolve
// This keeps every pre-migration account behaving exactly as before, while
// any newly-registered account carries a real, enforceable tenantId.
export async function resolveOrgId(req: SessionRequest): Promise<string> {
  const userId = req.session!.getUserId();

  try {
    const { roles } = await UserRoles.getRolesForUser("public", userId);

    if (roles.includes("patient")) {
      const { resource } = await patientsContainer.item(userId, userId).read().catch(() => ({ resource: undefined as any }));
      if (resource?.tenantId) return resource.tenantId;
    } else if (roles.includes("clinic") || roles.includes("clinic_pending")) {
      const { resource } = await clinicsContainer.item(userId, userId).read().catch(() => ({ resource: undefined as any }));
      if (resource?.tenantId) return resource.tenantId;
    } else if (roles.includes("pharmacy") || roles.includes("pharmacy_pending") || roles.includes("pharmacy_admin")) {
      const { resource } = await pharmaciesContainer.item(userId, userId).read().catch(() => ({ resource: undefined as any }));
      if (resource?.tenantId) return resource.tenantId;
    }
  } catch (err) {
    console.error("[resolveOrgId] role/doc lookup failed, falling back to default org:", err);
  }

  return getDefaultOrgId();
}

// Exposed so registration routes can stamp new accounts with a real
// tenantId instead of leaving the field unset — see patients.ts/clinics.ts.
export async function getDefaultOrgIdForRegistration(): Promise<string> {
  return getDefaultOrgId();
}

// Resolves the org a NEW signup belongs to, from the org slug the calling
// app/portal sends on its register request (see the `X-Org-Slug` header —
// each brand build/portal deployment is configured with its own slug at
// build time, so this needs no signup-time picker UI). Falls back to the
// default org whenever the header is missing or names an unknown slug, so
// an un-rebranded or misconfigured client still registers successfully
// instead of failing signup outright.
export async function resolveOrgIdForRegistration(orgSlug?: string | null): Promise<string> {
  if (orgSlug) {
    const { rows } = await pool.query(`SELECT id FROM organizations WHERE slug = $1`, [orgSlug]);
    if (rows[0]) return rows[0].id;
    console.warn(`[resolveOrgIdForRegistration] unknown org slug "${orgSlug}", falling back to default org`);
  }
  return getDefaultOrgId();
}

// Resolves an organization's branding (currently just its name) by id, for
// callers that already know the org id and just need display info — e.g.
// an OTP email that has to show which company's product this account
// belongs to. Falls back to the platform default's own name if the row is
// somehow missing (should not happen once seeded, but avoids a hard crash
// over a cosmetic email detail).
export async function getOrgBrandName(orgId: string): Promise<string> {
  const { rows } = await pool.query(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
  return rows[0]?.name ?? "Wellness";
}

// Resolves an organization's AI chat persona name (e.g. "Dr. Wellness") by
// id — kept separate from getOrgBrandName since the persona name is a
// distinct per-org field (organizations.persona_name), not derived from the
// org's display name. Falls back the same way getOrgBrandName does.
export async function getOrgPersonaName(orgId: string): Promise<string> {
  const { rows } = await pool.query(`SELECT persona_name FROM organizations WHERE id = $1`, [orgId]);
  return rows[0]?.persona_name ?? "Dr. Wellness";
}

// Resolves the org an EXISTING account belongs to, looked up by email
// rather than session — for pre-auth flows like OTP send, where the caller
// is identified by the email they typed, not a logged-in session. Covers
// every account type that carries (or chains to) a tenantId today:
//   - patient / clinic / pharmacy: direct tenantId field (see resolveOrgId
//     above)
//   - doctor: no tenantId of their own — resolved via clinicId, chained to
//     their employing clinic's tenantId (mirrors loadOrgDocForClinicId's
//     existing clinicId -> org-doc resolution used elsewhere for doctors)
// Returns the default org id if nothing more specific is found — same
// fallback semantics as resolveOrgId, so callers never have to special-case
// "no result".
export async function resolveOrgIdByEmail(email: string): Promise<string> {
  // Registration routes don't consistently lowercase the `email` field before
  // storing it (a pre-existing inconsistency across patients.ts/clinics.ts/
  // pharmacy.ts, not introduced here) — so this can't do an exact-match
  // query against whatever casing happens to be stored. LOWER() on both
  // sides makes the lookup resilient to that regardless of what's stored.
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { resources: patients } = await patientsContainer.items
      .query({ query: "SELECT c.tenantId FROM c WHERE LOWER(c.email) = @email", parameters: [{ name: "@email", value: normalizedEmail }] })
      .fetchAll();
    if (patients[0]?.tenantId) return patients[0].tenantId;

    const { resources: clinics } = await clinicsContainer.items
      .query({ query: "SELECT c.tenantId FROM c WHERE LOWER(c.email) = @email", parameters: [{ name: "@email", value: normalizedEmail }] })
      .fetchAll();
    if (clinics[0]?.tenantId) return clinics[0].tenantId;

    const { resources: pharmacies } = await pharmaciesContainer.items
      .query({ query: "SELECT c.tenantId FROM c WHERE LOWER(c.email) = @email", parameters: [{ name: "@email", value: normalizedEmail }] })
      .fetchAll();
    if (pharmacies[0]?.tenantId) return pharmacies[0].tenantId;

    const { resources: doctors } = await doctorsContainer.items
      .query({ query: "SELECT c.clinicId FROM c WHERE LOWER(c.email) = @email", parameters: [{ name: "@email", value: normalizedEmail }] })
      .fetchAll();
    if (doctors[0]?.clinicId) {
      // Lazy import avoids a load-time circular dependency (clinicInsurance.ts
      // pulls in clinicScope.ts, which has no reason to depend on orgScope.ts,
      // but keeping this import scoped to where it's used is the safer
      // pattern if that ever changes).
      const { loadOrgDocForClinicId } = await import("../routes/clinicInsurance");
      const org = await loadOrgDocForClinicId(doctors[0].clinicId);
      if (org?.tenantId) return org.tenantId;
    }
  } catch (err) {
    console.error("[resolveOrgIdByEmail] lookup failed, falling back to default org:", err);
  }

  return getDefaultOrgId();
}
