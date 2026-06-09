import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { doctorsContainer, patientsContainer, adminsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";
import { getUser } from "supertokens-node";

const router = Router();
router.use(requireRole("admin"));

// Default permission sets per role
const DOCTOR_DEFAULTS = {
  medicalRecords: true,
  prescription:   true,
  emrUpdates:     true,
  systemConfig:   false,
};

const PATIENT_DEFAULTS = {
  medicalRecords: true,
  prescription:   false,
  emrUpdates:     false,
  systemConfig:   false,
};

const ADMIN_DEFAULTS = {
  medicalRecords: true,
  prescription:   true,
  emrUpdates:     true,
  systemConfig:   true,
};

// ─── GET /api/admin/roles/doctors ────────────────────────────────────────────
router.get("/doctors", async (_req: Request, res: Response) => {
  try {
    const { resources } = await doctorsContainer.items
      .query("SELECT * FROM c WHERE c.status = 'approved' ORDER BY c.approvedAt DESC")
      .fetchAll();
    const users = resources.map((d: any) => ({
      id:          d.id,
      name:        d.fullName,
      email:       d.email,
      avatarUrl:   d.avatarUrl ?? null,
      dateJoined:  d.approvedAt ?? d.registeredAt,
      emiratesId:  d.emiratesId ?? null,
      specialty:   d.specialty ?? null,
      license:     d.license ?? null,
      rating:      d.rating ?? null,
      bio:         d.bio ?? null,
      permissions: d.permissions ?? DOCTOR_DEFAULTS,
    }));
    res.json({ users });
  } catch (err) {
    console.error("Roles doctors error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/roles/patients ───────────────────────────────────────────
router.get("/patients", async (_req: Request, res: Response) => {
  try {
    const { resources } = await patientsContainer.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();
    const users = resources.map((p: any) => ({
      id:          p.id,
      name:        p.fullName,
      email:       p.email,
      avatarUrl:   p.avatarUrl ?? null,
      dateJoined:  p.createdAt,
      emiratesId:  p.emiratesId ?? null,
      specialty:   null,
      license:     null,
      rating:      null,
      bio:         p.bio ?? null,
      permissions: p.permissions ?? PATIENT_DEFAULTS,
    }));
    res.json({ users });
  } catch (err) {
    console.error("Roles patients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/roles/admins ─────────────────────────────────────────────
// Enumerates all SuperTokens users with the "admin" role, then merges any
// stored permissions from Cosmos adminsContainer.
router.get("/admins", async (_req: Request, res: Response) => {
  try {
    // 1. Get all user IDs with the "admin" role from SuperTokens
    const roleResult = await UserRoles.getUsersThatHaveRole("public", "admin");
    if (roleResult.status === "UNKNOWN_ROLE_ERROR") {
      res.json({ users: [] });
      return;
    }
    const adminIds: string[] = roleResult.users;

    if (!adminIds.length) {
      res.json({ users: [] });
      return;
    }

    // 2. Fetch SuperTokens user objects (email, createdAt)
    const stUsers = await Promise.all(
      adminIds.map((id: string) => getUser(id).catch(() => null))
    );

    // 3. Load any existing Cosmos docs for these admins (for permissions + profile)
    const { resources: cosmosAdmins } = await adminsContainer.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();
    const cosmosMap = new Map(cosmosAdmins.map((a: any) => [a.id, a]));

    const users = stUsers
      .filter(Boolean)
      .map((u: any) => {
        const cosmosDoc = cosmosMap.get(u.id);
        // Get the primary email from SuperTokens loginMethods
        const email = u.emails?.[0] ?? u.loginMethods?.[0]?.email ?? "";
        const createdAt = new Date(u.timeJoined).toISOString();
        return {
          id:          u.id,
          name:        cosmosDoc?.fullName ?? cosmosDoc?.name ?? email.split("@")[0],
          email,
          avatarUrl:   cosmosDoc?.avatarUrl ?? null,
          dateJoined:  cosmosDoc?.createdAt ?? createdAt,
          emiratesId:  cosmosDoc?.emiratesId ?? null,
          specialty:   null,
          license:     null,
          rating:      null,
          bio:         cosmosDoc?.bio ?? null,
          permissions: cosmosDoc?.permissions ?? ADMIN_DEFAULTS,
        };
      });

    res.json({ users });
  } catch (err) {
    console.error("Roles admins error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/roles/:role/:userId/permissions ────────────────────────
// Persists the permission object onto the user's own Cosmos document.
router.patch("/:role/:userId/permissions", async (req: SessionRequest, res: Response) => {
  const { role, userId } = req.params;
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== "object") {
    res.status(400).json({ error: "permissions object required" });
    return;
  }

  try {
    let container;
    if (role === "doctors")  container = doctorsContainer;
    else if (role === "patients") container = patientsContainer;
    else if (role === "admins")   container = adminsContainer;
    else { res.status(400).json({ error: "Invalid role" }); return; }

    // Find the document by query (partition-key-agnostic)
    const { resources } = await container.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: userId }],
    }).fetchAll();

    let doc: any;
    if (resources.length) {
      doc = { ...resources[0], permissions, updatedAt: new Date().toISOString() };
    } else if (role === "admins") {
      // Admin docs may not exist in Cosmos yet — create a minimal one
      const stUser = await getUser(userId).catch(() => null);
      if (!stUser) { res.status(404).json({ error: "Admin user not found" }); return; }
      const email = stUser.emails?.[0] ?? stUser.loginMethods?.[0]?.email ?? "";
      doc = {
        id:          userId,
        fullName:    email.split("@")[0],
        email,
        permissions,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      };
    } else {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await container.items.upsert(doc);
    res.json({ status: "OK", permissions });
  } catch (err) {
    console.error("Save permissions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
