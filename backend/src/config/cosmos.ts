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
export async function upsertDocument<T extends { id: string }>(
  container: Container,
  document: T
): Promise<T> {
  const { resource } = await container.items.upsert<T>(document);
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
    const { resource } = await container.item(id, id).read<T>();
    return resource ?? null;
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
  spec: { query: string; parameters?: { name: string; value: unknown }[] }
): Promise<T[]> {
  const { resources } = await container.items.query<T>(spec).fetchAll();
  return resources;
}
