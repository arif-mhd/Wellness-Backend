import SuperTokens from "supertokens-node";
import supertokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import EmailVerification from "supertokens-node/recipe/emailverification";
import Session from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";
import Dashboard from "supertokens-node/recipe/dashboard";
import { pool } from "./database";
import { devFallbackOrThrow } from "../utils/env";
import { enforcePostSignInGuards, provisionSocialPatient } from "../utils/authGuards";
import { socialProviders } from "./socialProviders";
import { patientsContainer } from "./cosmos";

// Each portal env var accepts a comma-separated list, because white-labelling
// means one portal per brand: the org slug is compiled into the build, so
// every client needs their own deployment on their own domain, and each of
// those is a separate CORS origin. A single value still works unchanged.
const originsFrom = (value: string | undefined, fallback: string): string[] =>
  (value ?? fallback).split(",").map((o) => o.trim()).filter(Boolean);

// Browser-based portals that are allowed to make CORS requests.
const browserOrigins = [
  ...originsFrom(process.env.DOCTOR_PORTAL_URL,   "http://localhost:3002"),
  ...originsFrom(process.env.ADMIN_PORTAL_URL,    "http://localhost:3003"),
  ...originsFrom(process.env.PHARMACY_PORTAL_URL, "http://localhost:3004"),
  ...originsFrom(process.env.PATIENT_APP_URL,     "http://localhost:8081"),
  // Always allow standard localhost dev ports
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:8081",
  "http://localhost:8082",
  // LAN IP for Expo web served over the local network
  "http://192.168.29.127:8081",
  "http://192.168.29.127:8082",
  // Allow SuperTokens dashboard (served from the backend itself) — this is
  // just API_DOMAIN again, kept as a fallback for deployments that haven't
  // set that env var yet.
  process.env.API_DOMAIN || "https://backend-741878858011.asia-south1.run.app",
];

/**
 * CORS origin function:
 * - Browser requests from the listed portals → allow with credentials.
 * - Requests with NO Origin header (React Native, Postman, curl) → allow.
 *   (Native apps are not subject to CORS, so they never block on this.)
 */
export const allowedOrigins = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin || browserOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS: origin ${origin} not allowed`));
  }
};

export function initSuperTokens(): void {
  // Resolved once so the ThirdParty and EmailVerification recipes below agree
  // on whether social sign-in exists at all.
  const providers = socialProviders();
  const socialAuthEnabled = providers.length > 0;

  SuperTokens.init({
    framework: "express",
    supertokens: {
      // This is the SuperTokens Core server you'll run via Docker
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || devFallbackOrThrow("SUPERTOKENS_CONNECTION_URI", "http://localhost:3567"),
    },
    appInfo: {
      // Only affects the SuperTokens Dashboard UI title (internal staff
      // tool) — this isn't per-org, since SuperTokens.init() runs once at
      // boot for the whole platform, not per request/tenant.
      appName: process.env.PLATFORM_NAME || "Wellness",
      // The URL of THIS backend
      apiDomain: process.env.API_DOMAIN || devFallbackOrThrow("API_DOMAIN", `http://localhost:${process.env.PORT || 3001}`),
      // Primary frontend (doctor portal). CORS handles the rest.
      websiteDomain: process.env.WEBSITE_DOMAIN || process.env.DOCTOR_PORTAL_URL || devFallbackOrThrow("WEBSITE_DOMAIN", "http://localhost:3002"),
      apiBasePath: "/auth",
      websiteBasePath: "/auth",
    },
    recipeList: [
      EmailPassword.init({
        // Add extra fields to the signup form
        signUpFeature: {
          formFields: [
            {
              id: "name",
              validate: async (value) => {
                if (typeof value !== "string" || value.trim().length < 2) {
                  return "Name must be at least 2 characters";
                }
                return undefined;
              },
            },
            {
              id: "role",
              // Frontends send "patient", "doctor", or "admin" here
              validate: async (value) => {
                const valid = ["patient", "doctor", "admin"];
                if (!valid.includes(String(value))) {
                  return "Invalid role. Must be patient, doctor, or admin.";
                }
                return undefined;
              },
            },
          ],
        },

        override: {
          apis: (originalImplementation) => ({
            ...originalImplementation,

            // After a successful signup, assign the role and save profile
            signUpPOST: async (input) => {
              if (originalImplementation.signUpPOST === undefined) {
                throw new Error("signUpPOST not defined");
              }

              const response = await originalImplementation.signUpPOST(input);

              if (response.status === "OK") {
                const userId = response.user.id;
                const roleField = input.formFields.find((f) => f.id === "role");
                const nameField = input.formFields.find((f) => f.id === "name");
                const role = String(roleField?.value || "patient");
                const name = String(nameField?.value || "");

                // Assign role in SuperTokens
                await UserRoles.addRoleToUser("public", userId, role);

                // Save extra profile info in our own DB
                await pool.query(
                  `INSERT INTO user_profiles (supertokens_id, name, role)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (supertokens_id) DO NOTHING`,
                  [userId, name, role]
                );
              }

              return response;
            },

            // Block sign-in for patients whose account has been deactivated by an
            // admin, and doctors whose account has been deleted by their clinic.
            // Without this, a deleted doctor's SuperTokens credentials keep
            // working indefinitely — deletion only ever soft-deleted the Cosmos
            // doctor doc (preserving appointment history for patients) and
            // revoked sessions active at that moment, but never stopped a
            // fresh sign-in afterward.
            signInPOST: async (input) => {
              if (originalImplementation.signInPOST === undefined) {
                throw new Error("signInPOST not defined");
              }

              const response = await originalImplementation.signInPOST(input);

              if (response.status === "OK") {
                const userId = response.user.id;

                // Cross-org, deactivated-patient, deleted-doctor and
                // deleted-clinic-user checks all live in enforcePostSignInGuards
                // so the ThirdParty recipe applies exactly the same rules from
                // its own API. See src/utils/authGuards.ts.
                const emailField = input.formFields.find((f) => f.id === "email");
                const failure = await enforcePostSignInGuards({
                  userId,
                  email: typeof emailField?.value === "string" ? emailField.value.trim().toLowerCase() : undefined,
                  orgSlugHeader: input.options.req.getHeaderValue("x-org-slug") ?? undefined,
                });
                if (failure) return failure as any;
              }

              return response;
            },
          }),
        },
      }),

      // ── Google / Apple sign-in (patient app only) ────────────────────────
      // A separate recipe from EmailPassword with its own endpoints, so the
      // existing email/password flow is untouched. Providers are configured in
      // ./socialProviders and are only registered when their credentials are
      // present, so a deployment without them simply has no social sign-in
      // rather than failing to boot.
      ThirdParty.init({
        signInAndUpFeature: { providers },

        override: {
          apis: (originalImplementation) => ({
            ...originalImplementation,

            signInUpPOST: async (input) => {
              if (originalImplementation.signInUpPOST === undefined) {
                throw new Error("signInUpPOST not defined");
              }

              const response = await originalImplementation.signInUpPOST(input);

              // SuperTokens returns business-logic outcomes as a status field
              // with HTTP 200 — SIGN_IN_UP_NOT_ALLOWED, NO_EMAIL_GIVEN_BY_PROVIDER
              // and so on. Without this they are invisible: the request looks
              // successful in the access log and the client only sees a generic
              // failure.
              if (response.status !== "OK") {
                console.warn(
                  `[signInUpPOST] non-OK status: ${response.status}`,
                  JSON.stringify(response).slice(0, 500)
                );
              }

              if (response.status === "OK") {
                const userId = response.user.id;
                const email = response.user.emails[0]?.trim().toLowerCase();
                const orgSlugHeader = input.options.req.getHeaderValue("x-org-slug") ?? undefined;

                // Account linking would normally attach this Google identity to
                // an existing password account, but that is a paid SuperTokens
                // feature and this core rejects it with HTTP 402. Without
                // linking, a Google sign-in on an address that already has a
                // password account means a SECOND account and a second patient
                // record — one person, two identities, split medical history.
                //
                // Checked on every sign-in, not only when this request created
                // the user. A failed earlier attempt can leave a third-party
                // credential behind (the 402 errors did exactly that), and then
                // the next attempt is not a new sign-up, skips the check, and
                // creates the duplicate this exists to prevent.
                if (email) {
                  try {
                    const existing = await supertokens.listUsersByAccountInfo("public", { email });
                    const conflicting = existing.find(
                      (u) =>
                        u.id !== userId &&
                        u.loginMethods.some((lm) => lm.recipeId === "emailpassword")
                    );

                    if (conflicting) {
                      await Session.revokeAllSessionsForUser(userId);

                      // Remove the third-party credential so a retry is a clean
                      // new sign-up rather than slipping past this check. Its
                      // patient document is deleted too, but only when it holds
                      // nothing a person entered — provisioning creates it empty,
                      // so anything filled in means real data worth keeping.
                      try {
                        const { resource: doc } = await patientsContainer
                          .item(userId, userId)
                          .read()
                          .catch(() => ({ resource: undefined as any }));
                        const isEmpty =
                          doc && !doc.phone && !doc.dateOfBirth && !doc.gender && !doc.emiratesId;
                        if (doc && isEmpty) {
                          await patientsContainer.item(userId, userId).delete();
                        } else if (doc) {
                          console.warn(
                            `[signInUpPOST] leaving patient doc ${userId} in place: it has data`
                          );
                        }
                        await supertokens.deleteUser(userId);
                      } catch (cleanupErr) {
                        console.error("[signInUpPOST] cleanup after conflict failed:", cleanupErr);
                      }

                      return {
                        status: "GENERAL_ERROR",
                        message:
                          "An account with this email already exists. Please sign in with your password instead.",
                      } as any;
                    }
                  } catch (err) {
                    // Failing open would create the duplicate this prevents.
                    console.error("[signInUpPOST] duplicate-account check failed:", err);
                    await Session.revokeAllSessionsForUser(userId);
                    return {
                      status: "GENERAL_ERROR",
                      message: "Could not complete sign-in. Please try again.",
                    } as any;
                  }
                }

                // A first-time social sign-in is a registration. Give it the
                // role, org and patient document that POST /api/patients/register
                // would have, or the user authenticates and is then rejected by
                // every patient endpoint.
                // Not just brand-new users: an account can exist in
                // SuperTokens with no patient document — an abandoned or
                // half-completed registration — and such a user would sign in
                // successfully and then be rejected by every patient endpoint.
                // Provisioning on absence repairs that instead of stranding them.
                const needsPatientDoc =
                  email !== undefined &&
                  (response.createdNewRecipeUser ||
                    !(await patientsContainer
                      .item(userId, userId)
                      .read()
                      .then((r) => Boolean(r.resource))
                      .catch(() => false)));

                if (needsPatientDoc && email) {
                  const rawName =
                    (response.rawUserInfoFromProvider?.fromUserInfoAPI as any)?.name ??
                    (response.rawUserInfoFromProvider?.fromIdTokenPayload as any)?.name ??
                    "";
                  try {
                    await provisionSocialPatient({
                      userId,
                      email,
                      fullName: String(rawName || "").trim(),
                      orgSlugHeader,
                    });
                  } catch (err) {
                    // Leaving a half-created account behind is worse than a
                    // failed sign-up: the credential would exist with no role
                    // and no patient doc, and retrying would find the user
                    // already present and never re-provision.
                    console.error("[signInUpPOST] provisioning failed:", err);
                    await Session.revokeAllSessionsForUser(userId);
                    return {
                      status: "GENERAL_ERROR",
                      message: "We could not finish setting up your account. Please try again.",
                    } as any;
                  }
                }

                const failure = await enforcePostSignInGuards({ userId, email, orgSlugHeader });
                if (failure) return failure as any;
              }

              return response;
            },
          }),
        },
      }),

      // Records which emails are verified. Not needed for account linking any
      // more — that is a paid SuperTokens feature this core rejects — but
      // POST /api/patients/register writes verification here after an OTP
      // passes, and utils/markEmailVerified.ts would throw without the recipe.
      //
      // mode "OPTIONAL" tracks verification without imposing it: nobody is
      // newly blocked or prompted. Gated with the rest of the social stack.
      ...(socialAuthEnabled ? [EmailVerification.init({ mode: "OPTIONAL" })] : []),

      Session.init({
        getTokenTransferMethod: () => "header",
      }),

      UserRoles.init(),

      Dashboard.init(),
    ],
  });
}
