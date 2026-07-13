/**
 * One-time script to assign the "admin" role to a user by email.
 *
 * Usage:
 *   npx ts-node -e "$(cat src/scripts/assignAdminRole.ts)" <email>
 *
 * Or add to package.json scripts and run:
 *   npx ts-node src/scripts/assignAdminRole.ts <email>
 *
 * Example:
 *   npx ts-node src/scripts/assignAdminRole.ts admin@example.com
 */

import "dotenv/config";
import { initSuperTokens } from "../config/supertokens";
import { listUsersByAccountInfo } from "supertokens-node";
import UserRoles from "supertokens-node/recipe/userroles";
import { adminsContainer } from "../config/cosmos";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx ts-node src/scripts/assignAdminRole.ts <email>");
    process.exit(1);
  }

  // Initialise SuperTokens (needed to call its APIs)
  initSuperTokens();

  // 1. Look up the user in SuperTokens by email
  const users = await listUsersByAccountInfo("public", { email });
  if (!users || users.length === 0) {
    console.error(`No SuperTokens user found with email: ${email}`);
    process.exit(1);
  }

  const userId = users[0].id;
  console.log(`Found user: ${userId} (${email})`);

  // 2. Check existing roles
  const { roles: existing } = await UserRoles.getRolesForUser("public", userId);
  console.log(`Current roles: [${existing.join(", ") || "none"}]`);

  if (existing.includes("admin")) {
    console.log("User already has the admin role. Nothing to do.");
    process.exit(0);
  }

  // 3. Assign admin role
  const addResult = await UserRoles.addRoleToUser("public", userId, "admin");
  if (addResult.status !== "OK") {
    console.error("Failed to assign role:", addResult);
    process.exit(1);
  }

  console.log(`Successfully assigned "admin" role to ${email}`);

  // 4. Ensure an admin doc exists in Cosmos (so profile GET returns something)
  try {
    let existing: any = null;
    try {
      const { resource } = await adminsContainer.item(userId, userId).read();
      existing = resource;
    } catch {}

    if (!existing) {
      await adminsContainer.items.upsert({
        id: userId,
        email,
        fullName: email.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      console.log("Created admin Cosmos document.");
    } else {
      console.log("Admin Cosmos document already exists.");
    }
  } catch (err) {
    console.warn("Could not create Cosmos document (non-fatal):", err);
  }

  console.log("\nDone! The user must log out and log back in for the new role to take effect.");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
