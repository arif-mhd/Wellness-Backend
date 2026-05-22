import { Response, NextFunction } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";

// Use this middleware to protect routes that need a specific role.
// Example:  router.get("/doctor-only", requireRole("doctor"), handler)
export function requireRole(role: string) {
  return [
    verifySession(),
    async (req: SessionRequest, res: Response, next: NextFunction) => {
      const userId = req.session!.getUserId();
      const { roles } = await UserRoles.getRolesForUser("public", userId);

      if (!roles.includes(role)) {
        res.status(403).json({
          error: `Access denied. Required role: ${role}`,
        });
        return;
      }
      next();
    },
  ];
}
