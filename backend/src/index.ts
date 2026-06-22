import "dotenv/config"; // Must be the very first import

import express from "express";
import cors from "cors";
import SuperTokens from "supertokens-node";
import { middleware, errorHandler } from "supertokens-node/framework/express";
import UserRoles from "supertokens-node/recipe/userroles";

import { initSuperTokens, allowedOrigins } from "./config/supertokens";
import { initDb } from "./config/database";
import { initCosmosContainers } from "./config/cosmos";
import authRouter from "./routes/auth";
import doctorsRouter from "./routes/doctors";
import adminDoctorsRouter from "./routes/adminDoctors";
import patientsRouter from "./routes/patients";
import adminPatientsRouter from "./routes/adminPatients";
import appointmentsRouter from "./routes/appointments";
import wellnessRouter from "./routes/wellness";
import pregnancyRouter from "./routes/pregnancy";
import menstrualRouter from "./routes/menstrual";
import pharmacyRouter from "./routes/pharmacy";
import adminPharmacyRouter from "./routes/adminPharmacy";
import adminRolesRouter from "./routes/adminRoles";
import adminOrdersRouter from "./routes/adminOrders";
import adminLabRouter from "./routes/adminLab";
import labRouter from "./routes/lab";
import medicineOrdersRouter from "./routes/medicineOrders";
import adminVaccinesRouter from "./routes/adminVaccines";
import vaccinesRouter from "./routes/vaccines";
import supportRouter from "./routes/support";
import remindersRouter from "./routes/reminders";
import feedbackRouter from "./routes/feedback";
import notificationsRouter from "./routes/notifications";
import adminActivityLogRouter from "./routes/adminActivityLog";
import adminDashboardRouter from "./routes/adminDashboard";
import messagesRouter from "./routes/messages";

// ─── 1. Initialise SuperTokens ───────────────────────────────────────────────
initSuperTokens();

// ─── 2. Create Express app ───────────────────────────────────────────────────
const app = express();

// CORS must be set up BEFORE the SuperTokens middleware
app.use(
  cors({
    origin: allowedOrigins,
    allowedHeaders: [
      "content-type",
      "authorization",
      "rid",
      "ngrok-skip-browser-warning",
      ...SuperTokens.getAllCORSHeaders(),
    ],
    credentials: true,
  })
);

// MUST be before SuperTokens middleware so /auth/* routes can read the body
app.use(express.json());

// SuperTokens middleware handles all /auth/* routes automatically
app.use(middleware());

// ─── 3. Routes ───
app.use("/auth", authRouter);

// Doctor self-registration (public)
app.use("/api/doctors", doctorsRouter);

// Admin doctor management (requires admin role)
app.use("/api/admin/doctors", adminDoctorsRouter);

// Patient self-registration + profile updates (public register, rest require patient role)
app.use("/api/patients", patientsRouter);

// Admin patient management (requires admin role)
app.use("/api/admin/patients", adminPatientsRouter);

// Appointment booking + LiveKit tokens (patient + doctor roles)
app.use("/api/appointments", appointmentsRouter);

// Wellness: food logs, workout logs, food/exercise search, daily summary
app.use("/api/wellness", wellnessRouter);

// Pregnancy tracking: profile, daily logs, symptoms, health monitor, gestational diabetes
app.use("/api/pregnancy", pregnancyRouter);

// Menstrual cycle tracking: period logs, cycle profile, daily symptoms/health
app.use("/api/menstrual", menstrualRouter);

// Pharmacy: registration, products (pharmacy role)
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/pharmacy", medicineOrdersRouter); // orders & prescriptions

// Admin pharmacy management: approve/reject pharmacies + products
app.use("/api/admin/pharmacy", adminPharmacyRouter);
app.use("/api/admin/roles",   adminRolesRouter);
app.use("/api/admin/orders",  adminOrdersRouter);
app.use("/api/admin/lab",      adminLabRouter);
app.use("/api/lab",            labRouter);
app.use("/api/admin/vaccines", adminVaccinesRouter);
app.use("/api/vaccines",       vaccinesRouter);
app.use("/api/support",        supportRouter);
app.use("/api/reminders",      remindersRouter);
app.use("/api/feedback",       feedbackRouter);
app.use("/api/notifications",  notificationsRouter);
app.use("/api/admin/activity-logs", adminActivityLogRouter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/messages", messagesRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SuperTokens error handler (must be last)
app.use(errorHandler());

// ─── 4. Start server ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001");

async function main() {
  // Start listening immediately so Cloud Run health checks pass
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Backend running at http://0.0.0.0:${PORT}`);
  });

  // Init PostgreSQL tables (non-fatal)
  try {
    await initDb();
  } catch (err) {
    console.warn("⚠️  DB init failed (will retry on next request):", err);
  }

  // Ensure all Cosmos DB containers exist (non-fatal)
  try {
    await initCosmosContainers();
  } catch (err) {
    console.warn("⚠️  Cosmos init failed:", err);
  }

  // Create SuperTokens roles (non-fatal)
  try {
    await UserRoles.createNewRoleOrAddPermissions("patient",          []);
    await UserRoles.createNewRoleOrAddPermissions("doctor",           []);
    await UserRoles.createNewRoleOrAddPermissions("doctor_pending",   []);
    await UserRoles.createNewRoleOrAddPermissions("admin",            []);
    await UserRoles.createNewRoleOrAddPermissions("pharmacy",         []);
    await UserRoles.createNewRoleOrAddPermissions("pharmacy_pending", []);
    console.log("✅ SuperTokens roles ready");
  } catch {
    console.warn("⚠️  Could not create roles — SuperTokens may not be reachable yet");
  }
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
});
