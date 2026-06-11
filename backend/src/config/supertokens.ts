import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";
import { pool } from "./database";

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
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
    },
    appInfo: {
      appName: "Wellness",
      // The URL of THIS backend
      apiDomain: process.env.API_DOMAIN || `http://localhost:${process.env.PORT || 3001}`,
      // Primary frontend (doctor portal). CORS handles the rest.
      websiteDomain: process.env.WEBSITE_DOMAIN || process.env.DOCTOR_PORTAL_URL || "http://localhost:3002",
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
          }),
        },
      }),

      Session.init({
        getTokenTransferMethod: () => "header",
      }),

      UserRoles.init(),
    ],
  });
}
