import { CosmosClient, Container, Database } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING!;
const databaseName     = process.env.COSMOS_DATABASE || "wellness";

// Singleton Cosmos client
const cosmosClient = new CosmosClient(connectionString);

// Reference to the wellness database (created via provisioning script)
const db: Database = cosmosClient.database(databaseName);

// ─── Pre-wired collection references ────────────────────────────────────────
// Add more containers here as features are implemented.

/** Patients collection — partition key: /id */
export const patientsContainer: Container = db.container("patients");

/** Doctors collection — partition key: /id */
export const doctorsContainer: Container = db.container("doctors");

/** Admins collection — partition key: /id */
export const adminsContainer: Container = db.container("admins");

/** Appointments collection — partition key: /id */
export const appointmentsContainer: Container = db.container("appointments");

/** Food logs — partition key: /patientId  (one doc per logged food entry) */
export const foodLogsContainer: Container = db.container("foodLogs");

/** Workout logs — partition key: /patientId (one doc per logged exercise) */
export const workoutLogsContainer: Container = db.container("workoutLogs");

/** Weight logs — partition key: /patientId (one doc per weigh-in) */
export const weightLogsContainer: Container = db.container("weightLogs");

/** Routines — partition key: /patientId (user-saved workout routines) */
export const routinesContainer: Container = db.container("routines");

/** Assessment results — partition key: /patientId (completed health assessments) */
export const assessmentResultsContainer: Container = db.container("assessmentResults");

/** Pregnancy profiles — partition key: /patientId (one doc per patient, their pregnancy setup) */
export const pregnancyProfilesContainer: Container = db.container("pregnancyProfiles");

/** Pregnancy daily logs — partition key: /patientId (one doc per patient per date) */
export const pregnancyLogsContainer: Container = db.container("pregnancyLogs");

/** Menstrual cycle profile — partition key: /patientId (one doc per patient) */
export const menstrualProfilesContainer: Container = db.container("menstrualProfiles");

/** Menstrual period logs — partition key: /patientId (one doc per logged period) */
export const menstrualLogsContainer: Container = db.container("menstrualLogs");

/** Menstrual daily health logs — partition key: /patientId (one doc per patient per date) */
export const menstrualDailyContainer: Container = db.container("menstrualDaily");

/** Pharmacy profiles — partition key: /id (one doc per pharmacy owner) */
export const pharmaciesContainer: Container = db.container("pharmacies");

/** Clinic profiles — partition key: /id (one doc per clinic account) */
export const clinicsContainer: Container = db.container("clinics");

/** Pharmacy products — partition key: /pharmacyId */
export const pharmacyProductsContainer: Container = db.container("pharmacyProducts");

/** Medicine orders — partition key: /patientId */
export const medicineOrdersContainer: Container = db.container("medicineOrders");

/** Prescriptions — partition key: /patientId */
export const prescriptionsContainer: Container = db.container("prescriptions");

/** Lab services (onboarded diagnostic labs) — partition key: /id */
export const labServicesContainer: Container = db.container("labServices");

/** Lab tests catalogue — partition key: /labId */
export const labTestsContainer: Container = db.container("labTests");

/** Lab bookings — partition key: /patientId */
export const labBookingsContainer: Container = db.container("labBookings");

/** Vaccines catalogue — partition key: /id */
export const vaccinesContainer: Container = db.container("vaccines");

/** Vaccination bookings — partition key: /patientId */
export const vaccinationBookingsContainer: Container = db.container("vaccinationBookings");

/** Support tickets — partition key: /patientId */
export const supportContainer: Container = db.container("support");

/** Reminders — partition key: /patientId */
export const remindersContainer: Container = db.container("reminders");

/** Feedback collection — partition key: /id */
export const feedbackContainer: Container = db.container("feedback");

/** Notifications collection — partition key: /patientId */
export const notificationsContainer: Container = db.container("notifications");

/** Activity logs — partition key: /source (admin | doctor | patient | pharmacy | lab) */
export const activityLogsContainer: Container = db.container("activityLogs");

/** Chat messages — partition key: /conversationId (format: chat:{patientId}:{doctorId}) */
export const messagesContainer: Container = db.container("messages");

/** SOS emergency codes — partition key: /patientId (short-lived, single-use access codes) */
export const sosCodesContainer: Container = db.container("sosCodes");

/** Admin notifications — partition key: /id (synced from real platform events, read-state tracked here) */
export const adminNotificationsContainer: Container = db.container("adminNotifications");

/** Articles — partition key: /id (admin-managed wellness articles) */
export const articlesContainer: Container = db.container("articles");

/** OTP codes — partition key: /email (short-lived, auto-TTL 600s) */
export const otpCodesContainer: Container = db.container("otpCodes");

// ─── Container provisioning ──────────────────────────────────────────────────

/**
 * Ensures all required Cosmos containers exist.
 * Uses createIfNotExists — safe to call on every startup.
 */
export async function initCosmosContainers(): Promise<void> {
  const required = [
    { id: "patients",     partitionKey: { paths: ["/id"] } },
    { id: "doctors",      partitionKey: { paths: ["/id"] } },
    { id: "admins",       partitionKey: { paths: ["/id"] } },
    { id: "appointments", partitionKey: { paths: ["/id"] } },
    { id: "foodLogs",     partitionKey: { paths: ["/patientId"] } },
    { id: "workoutLogs",  partitionKey: { paths: ["/patientId"] } },
    { id: "weightLogs",   partitionKey: { paths: ["/patientId"] } },
    { id: "routines",           partitionKey: { paths: ["/patientId"] } },
    { id: "assessmentResults",  partitionKey: { paths: ["/patientId"] } },
    { id: "pregnancyProfiles",  partitionKey: { paths: ["/patientId"] } },
    { id: "pregnancyLogs",      partitionKey: { paths: ["/patientId"] } },
    { id: "menstrualProfiles",  partitionKey: { paths: ["/patientId"] } },
    { id: "menstrualLogs",      partitionKey: { paths: ["/patientId"] } },
    { id: "menstrualDaily",     partitionKey: { paths: ["/patientId"] } },
    { id: "pharmacies",         partitionKey: { paths: ["/id"] } },
    { id: "clinics",            partitionKey: { paths: ["/id"] } },
    { id: "pharmacyProducts",   partitionKey: { paths: ["/pharmacyId"] } },
    { id: "medicineOrders",    partitionKey: { paths: ["/patientId"] } },
    { id: "prescriptions",     partitionKey: { paths: ["/patientId"] } },
    { id: "labServices",            partitionKey: { paths: ["/id"] } },
    { id: "labTests",               partitionKey: { paths: ["/labId"] } },
    { id: "labBookings",            partitionKey: { paths: ["/patientId"] } },
    { id: "vaccines",               partitionKey: { paths: ["/id"] } },
    { id: "vaccinationBookings",    partitionKey: { paths: ["/patientId"] } },
    { id: "support",                partitionKey: { paths: ["/patientId"] } },
    { id: "reminders",              partitionKey: { paths: ["/patientId"] } },
    { id: "feedback",               partitionKey: { paths: ["/id"] } },
    { id: "notifications",          partitionKey: { paths: ["/patientId"] } },
    { id: "activityLogs",           partitionKey: { paths: ["/source"] } },
    { id: "messages",               partitionKey: { paths: ["/conversationId"] } },
    { id: "sosCodes",               partitionKey: { paths: ["/patientId"] } },
    { id: "adminNotifications",     partitionKey: { paths: ["/id"] } },
    { id: "articles",               partitionKey: { paths: ["/id"] } },
    { id: "otpCodes",               partitionKey: { paths: ["/email"] }, defaultTtl: 600 },
  ];

  for (const spec of required) {
    await db.containers.createIfNotExists(spec);
  }
  console.log("✅ Cosmos DB containers ready");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get any container by name (for future collections added per-feature).
 */
export function getContainer(name: string): Container {
  return db.container(name);
}

/**
 * Upsert a document into a container.
 * The document must have an `id` field (string).
 */
export async function upsertDocument<T>(
  container: Container,
  document: T
): Promise<T> {
  const { resource } = await container.items.upsert(document as any);
  return resource as T;
}

/**
 * Fetch a document by id from a container.
 * Returns null if not found.
 */
export async function getDocument<T>(
  container: Container,
  id: string
): Promise<T | null> {
  try {
    const { resource } = await container.item(id, id).read();
    return (resource as T) ?? null;
  } catch (err: any) {
    if (err.code === 404) return null;
    throw err;
  }
}

/**
 * Delete a document by id from a container.
 */
export async function deleteDocument(
  container: Container,
  id: string
): Promise<void> {
  await container.item(id, id).delete();
}

/**
 * Run a parameterised SQL query against a container.
 *
 * Example:
 *   queryDocuments<Doctor>(doctorsContainer, {
 *     query: "SELECT * FROM c WHERE c.status = @status",
 *     parameters: [{ name: "@status", value: "active" }],
 *   });
 */
export async function queryDocuments<T>(
  container: Container,
  spec: { query: string; parameters?: { name: string; value: any }[] }
): Promise<T[]> {
  const { resources } = await container.items.query<T>(spec as any).fetchAll();
  return resources;
}
