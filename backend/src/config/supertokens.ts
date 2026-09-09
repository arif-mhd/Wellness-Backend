import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";
import Dashboard from "supertokens-node/recipe/dashboard";
import { pool } from "./database";
import { patientsContainer, doctorsContainer, clinicsContainer } from "./cosmos";
import { devFallbackOrThrow } from "../utils/env";
import { resolveOrgIdByEmail, resolveOrgIdForRegistration } from "../utils/orgScope";

// Browser-based portals that are allowed to make CORS requests.
const browserOrigins = [
  process.env.DOCTOR_PORTAL_URL   || "http://localhost:3002",
  process.env.ADMIN_PORTAL_URL    || "http://localhost:3003",
  process.env.PHARMACY_PORTAL_URL || "http://localhost:3004",
  process.env.PATIENT_APP_URL     || "http://localhost:8081",
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

                // Reject sign-in when the account belongs to a different
                // organization than the portal it's logging into. Each
                // portal deployment sends its own org via X-Org-Slug (see
                // NEXT_PUBLIC_ORG_SLUG + SuperTokensProvider's preAPIHook on
                // the doctor/pharmacy portals); an account with no header
                // sent (e.g. the patient app, which has no per-deployment
                // portal to scope) or resolving to the default org is never
                // blocked, since there's nothing more specific to enforce.
                const orgSlugHeader = input.options.req.getHeaderValue("x-org-slug");
                if (orgSlugHeader) {
                  const emailField = input.formFields.find((f) => f.id === "email");
                  const email = typeof emailField?.value === "string" ? emailField.value.trim().toLowerCase() : undefined;
                  if (email) {
                    const [portalOrgId, accountOrgId] = await Promise.all([
                      resolveOrgIdForRegistration(orgSlugHeader),
                      resolveOrgIdByEmail(email),
                    ]);
                    if (portalOrgId !== accountOrgId) {
                      await Session.revokeAllSessionsForUser(userId);
                      return {
                        status: "GENERAL_ERROR",
                        message: "This account belongs to a different organization.",
                      } as any;
                    }
                  }
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
                    } as any;
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
                    } as any;
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
                    } as any;
                  }
                } catch {
                  // Not a clinic/branch user or no profile doc yet — allow sign-in.
                }
              }

              return response;
            },
          }),
        },
      }),

      Session.init({
        getTokenTransferMethod: () => "header",
      }),

      UserRoles.init(),

      Dashboard.init(),
    ],
  });
}
