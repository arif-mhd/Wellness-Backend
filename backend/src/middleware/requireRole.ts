import { Response, NextFunction } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";

// Use this middleware to protect routes that need one or more roles (OR logic).
// Example:  router.get("/doctor-only", requireRole("doctor"), handler)
// Example:  router.get("/either",      requireRole("doctor", "doctor_pending"), handler)
export function requireRole(...roles: string[]) {
  return [
    verifySession({ sessionRequired: false }),
    async (req: SessionRequest, res: Response, next: NextFunction) => {
      if (req.session) {
        const userId = req.session.getUserId();
        const { roles: userRoles } = await UserRoles.getRolesForUser("public", userId);

        const hasRole = roles.some(r => userRoles.includes(r));
        if (!hasRole) {
          res.status(403).json({
            error: `Access denied. Required role: ${roles.join(" or ")}`,
          });
          return;
        }
        next();
        return;
      }

      // Dev fallback: if patient role is among the required roles, use mock session
      if (roles.includes("patient")) {
        req.session = {
          getUserId: () => "patient_1",
          getHandle: () => "mock-handle",
          getAccessTokenPayload: () => ({}),
          getSessionDataFromServer: async () => ({}),
          updateSessionDataInDatabase: async () => {},
          mergeIntoAccessTokenPayload: async () => {},
          revokeSession: async () => {},
          getExpiryTime: () => Date.now() + 3600 * 1000,
          getAccessToken: () => "mock-token",
        } as any;
        next();
        return;
      }

      res.status(401).json({ error: "Session required" });
    },
  ];
}
