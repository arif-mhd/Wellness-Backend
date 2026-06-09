/**
 * Assigns the "admin" role to an existing account in SuperTokens.
 * Talks to the SuperTokens Core REST API directly — no SDK version issues.
 *
 * Usage:  node assign-admin-role.js <email>
 * Example: node assign-admin-role.js arif@test.com
 */
require("dotenv/config");

const http = require("http");

const CORE = process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567";
const email = process.argv[2];

if (!email) {
  console.error("Usage: node assign-admin-role.js <email>");
  process.exit(1);
}

// Tiny helper — promisified HTTP request to the Core
function coreRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(CORE + path);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port:     url.port || 3567,
      path:     url.pathname + (url.search || ""),
      method,
      headers: {
        "Content-Type":    "application/json",
        "api-version":     "0",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // 1. Find the user by email via Core search API
  const search = await coreRequest(
    "GET",
    `/users?email=${encodeURIComponent(email)}&includeRecipeIds=emailpassword`,
  );

  if (search.status !== 200) {
    console.error("❌ Could not query SuperTokens Core:", search.body);
    console.error("   Is SuperTokens Core running on", CORE, "?");
    process.exit(1);
  }

  const users = search.body.users || [];
  if (users.length === 0) {
    console.error(`❌ No account found for "${email}".`);
    console.error("   Create the account first by logging into the admin portal,");
    console.error("   then run this script to assign the admin role.");
    process.exit(1);
  }

  // SuperTokens Core returns loginMethods inside each user object
  const userId = users[0].user?.id || users[0].id;
  console.log(`✅ Found user: ${userId} (${email})`);

  // 2. Ensure the "admin" role exists
  await coreRequest("PUT", "/recipe/role", { role: "admin", permissions: [] });

  // 3. Assign the role
  const assign = await coreRequest("PUT", "/recipe/user/role", {
    userId,
    role:   "admin",
    userContext: {},
  });

  if (assign.status === 200) {
    console.log(`✅ 'admin' role assigned to ${email}`);
    console.log("\n→ Log out of the admin portal and log back in — the queue will now load.");
  } else {
    console.error("❌ Role assignment failed:", assign.body);
  }
}

main().catch(console.error).finally(() => process.exit());
