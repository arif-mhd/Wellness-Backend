import "dotenv/config"; // Must be the very first import

import express from "express";
import cors from "cors";
import SuperTokens from "supertokens-node";
import { middleware, errorHandler } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";

import { initSuperTokens, allowedOrigins } from "./config/supertokens";
import { initDb } from "./config/database";
import authRouter from "./routes/auth";

// ─── 1. Initialise SuperTokens ───────────────────────────────────────────────
initSuperTokens();

// ─── 2. Create Express app ───────────────────────────────────────────────────
const app = express();

// CORS must be set up BEFORE the SuperTokens middleware
app.use(
  cors({
    origin: allowedOrigins,
    allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
    credentials: true,
  })
);

// SuperTokens middleware handles all /auth/* routes automatically
app.use(middleware());

app.use(express.json());

// ─── 3. Routes ───────────────────────────────────────────────────────────────
app.use("/auth", authRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SuperTokens error handler (must be last)
app.use(errorHandler());

// ─── 4. Start server ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001");

async function main() {
  // Init database tables
  await initDb();

  // Create the three roles in SuperTokens Core.
  // "createNewRoleOrAddPermissions" is idempotent — safe to call every startup.
  try {
    await UserRoles.createNewRoleOrAddPermissions("patient", []);
    await UserRoles.createNewRoleOrAddPermissions("doctor",  []);
    await UserRoles.createNewRoleOrAddPermissions("admin",   []);
    console.log("✅ SuperTokens roles ready");
  } catch {
    console.warn("⚠️  Could not create roles — is SuperTokens Core (Docker) running?");
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Backend running at http://localhost:${PORT}`);
    console.log(`   Auth endpoints:  http://localhost:${PORT}/auth`);
    console.log(`   Health check:    http://localhost:${PORT}/health\n`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
