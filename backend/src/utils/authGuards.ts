/**
 * Sign-in guards and patient provisioning shared between auth recipes.
 *
 * These started life inline inside EmailPassword's signInPOST override. They
 * live here now because the ThirdParty recipe (Google / Apple sign-in) has to
 * apply the *same* checks from a different API (signInUpPOST), and two copies
 * of a security check drift apart. Behaviour is unchanged from the original —
 * same order, same messages, same fail-open policy.
 */

import Session from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";
import { patientsContainer, doctorsContainer, clinicsContainer } from "../config/cosmos";
import { resolveOrgIdByEmail, resolveOrgIdForRegistration } from "./orgScope";

export type SignInGuardFailure = { status: "GENERAL_ERROR"; message: string };

/**
 * Runs after a successful authentication, before the caller returns OK.
 *
 * Returns a GENERAL_ERROR body to send instead of OK, or null to allow the
 * sign-in. Any session belonging to a rejected user is revoked first.
 *
 * Callers must have already completed the underlying sign-in — by this point
 * session tokens are on the response, so this can only reject by replacing the
 * response body, never by throwing.
 */
export async function enforcePostSignInGuards(params: {
  userId: string;
  /** Lower-cased account email. Omitted when the recipe can't supply one. */
  email?: string;
  /** Value of the x-org-slug header, if the client sent one. */
  orgSlugHeader?: string;
}): Promise<SignInGuardFailure | null> {
  const { userId, email, orgSlugHeader } = params;

  // Reject sign-in when the account belongs to a different organization than
  // the portal it's logging into. Each portal deployment sends its own org via
  // X-Org-Slug (see NEXT_PUBLIC_ORG_SLUG + SuperTokensProvider's preAPIHook on
  // the doctor/pharmacy portals); an account with no header sent, or resolving
  // to the default org, is never blocked, since there's nothing more specific
  // to enforce.
  try {
    if (orgSlugHeader && email) {
      const [portalOrgId, accountOrgId] = await Promise.all([
        resolveOrgIdForRegistration(orgSlugHeader),
        resolveOrgIdByEmail(email),
      ]);
      if (portalOrgId !== accountOrgId) {
        await Session.revokeAllSessionsForUser(userId);
        return {
          status: "GENERAL_ERROR",
          message: "This account belongs to a different organization.",
        };
      }
    }
  } catch (err) {
    // A DB hiccup here must not turn into a hung/failed request for the
    // client — the underlying sign-in already ran and set session
    // cookies/headers on the response by this point, so throwing here would
    // leave the client with an ambiguous half-succeeded request instead of a
    // clean OK or GENERAL_ERROR body. Fail open (same as "no header sent"): a
    // transient lookup failure shouldn't lock a legitimate user out of their
    // own account.
    console.error("[authGuards] org-scope check failed, allowing sign-in:", err);
  }

  try {
    const { resource: patient } = await patientsContainer.item(userId, userId).read();
    if (patient && (patient.status === "deactivated" || patient.status === "deleted")) {
      await Session.revokeAllSessionsForUser(userId);
      return {
        status: "GENERAL_ERROR",
        message: patient.status === "deleted"
          ? "This account no longer exists."
          : "Your account has been deactivated. Please contact support.",
      };
    }
  } catch {
    // Not a patient (doctor/admin/pharmacy) or no profile doc yet.
  }

  try {
    const { resource: doctor } = await doctorsContainer.item(userId, userId).read();
    if (doctor && doctor.status === "deleted") {
      await Session.revokeAllSessionsForUser(userId);
      return {
        status: "GENERAL_ERROR",
        message: "This account no longer exists. Please contact your clinic.",
      };
    }
  } catch {
    // Not a doctor or no profile doc yet — allow sign-in.
  }

  try {
    const { resource: clinicUser } = await clinicsContainer.item(userId, userId).read();
    if (clinicUser && clinicUser.status === "deleted") {
      await Session.revokeAllSessionsForUser(userId);
      return {
        status: "GENERAL_ERROR",
        message: "This account no longer exists.",
      };
    }
  } catch {
    // Not a clinic/branch user or no profile doc yet — allow sign-in.
  }

  return null;
}

/**
 * Gives a brand-new social sign-up everything POST /api/patients/register
 * gives an email/password one: the patient role, an org, and a Cosmos patient
 * document. Without all three the user authenticates successfully and is then
 * rejected by every patient endpoint — logged in but unusable.
 *
 * Deliberately mirrors that route rather than improving on it, so social and
 * email patients are indistinguishable downstream. Note it does NOT write a
 * user_profiles row: that route calls EmailPassword.signUp() directly rather
 * than the HTTP API, so the signUpPOST override never runs for patients and no
 * such row exists for them today either.
 *
 * Identity fields (emiratesId, exrNumber, identityDocuments) are left empty —
 * a social provider has no way to supply them. The app routes new social users
 * into the existing complete-profile onboarding chain to collect them, and
 * validateIdentityFieldPatterns runs there as it does for everyone else.
 */
export async function provisionSocialPatient(params: {
  userId: string;
  email: string;
  fullName: string;
  orgSlugHeader?: string;
}): Promise<void> {
  const { userId, email, fullName, orgSlugHeader } = params;

  await UserRoles.addRoleToUser("public", userId, "patient");

  const tenantId = await resolveOrgIdForRegistration(orgSlugHeader);
  const now = new Date().toISOString();

  await patientsContainer.items.upsert({
    id:                userId,
    supertokensId:     userId,
    email,
    fullName,
    phone:             "",
    dateOfBirth:       "",
    gender:            "",
    emiratesId:        "",
    exrNumber:         "",
    identityDocuments: {},
    status:            "active",
    tenantId,
    createdAt:         now,
    updatedAt:         now,
  });
}
