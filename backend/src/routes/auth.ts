import { Router } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { pool } from "../config/database";

const router = Router();

// GET /auth/me  — returns current user info + roles
// The frontend calls this after login to know who is logged in
router.get("/me", verifySession(), async (req: SessionRequest, res) => {
  try {
    const userId = req.session!.getUserId();
    const { roles } = await UserRoles.getRolesForUser("public", userId);

    const result = await pool.query(
      "SELECT name, role, phone, created_at FROM user_profiles WHERE supertokens_id = $1",
      [userId]
    );

    res.json({
      userId,
      roles,
      profile: result.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
