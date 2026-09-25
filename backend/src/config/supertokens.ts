import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import EmailVerification from "supertokens-node/recipe/emailverification";
import Session from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";
import Dashboard from "supertokens-node/recipe/dashboard";
import { pool } from "./database";
import { devFallbackOrThrow } from "../utils/env";
import { enforcePostSignInGuards, provisionSocialPatient } from "../utils/authGuards";
import { socialProviders } from "./socialProviders";

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
  // Resolved once so the ThirdParty recipe and the AccountLinking gate below
  // agree on whether social sign-in exists at all.
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

                // A first-time social sign-in is a registration. Give it the
                // role, org and patient document that POST /api/patients/register
                // would have, or the user authenticates and is then rejected by
                // every patient endpoint.
                if (response.createdNewRecipeUser && email) {
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

      // Links a social sign-in to an existing email/password account with the
      // same address, so a patient who registered with a password and later
      // taps "Continue with Google" keeps one identity and one patient record
      // instead of silently acquiring a second, unusable account.
      //
      // Only registered when social sign-in actually exists. This recipe sits
      // in front of EVERY sign-in and sign-up on the platform, staff portals
      // included, so with no social providers configured there is nothing to
      // link and no reason to alter live auth behaviour — a deployment without
      // credentials behaves exactly as it did before.
      //
      // Deliberately narrow even when active: linking only ever happens for a
      // verified email, and never while a session is already active, which
      // would be an account-takeover vector (attaching an attacker-controlled
      // identity to whoever is logged in).
      // AccountLinking below asks for a verified email before it will link two
      // accounts, and without this recipe SuperTokens has no notion of an
      // email being verified — so nothing is ever verified, every link is
      // refused, and a Google sign-in comes back SIGN_IN_UP_NOT_ALLOWED with
      // HTTP 200 and nothing logged.
      //
      // mode "OPTIONAL" tracks verification without forcing it on anyone, so
      // existing email/password users are unaffected: nobody is suddenly
      // blocked or prompted. Google reports email_verified, so social sign-ups
      // are marked verified automatically and can link.
      //
      // Gated with the rest of the social stack: no providers, no change.
      ...(socialAuthEnabled ? [EmailVerification.init({ mode: "OPTIONAL" })] : []),

      ...(socialAuthEnabled
        ? [
            AccountLinking.init({
              shouldDoAutomaticAccountLinking: async (_newAccount, _user, session) => {
                if (session !== undefined) return { shouldAutomaticallyLink: false };
                return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
              },
            }),
          ]
        : []),

      Session.init({
        getTokenTransferMethod: () => "header",
      }),

      UserRoles.init(),

      Dashboard.init(),
    ],
  });
}
