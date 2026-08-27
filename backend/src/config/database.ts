import { Pool } from "pg";

const dbHost = process.env.DB_HOST || "localhost";
const isUnixSocket = dbHost.startsWith("/");

// Caps how many connections a single instance can open to Postgres and how
// long a query waits for one before failing fast — without this, `pg`
// defaults to max:10 per instance with no ceiling on how many instances can
// exist, so a Cloud Run scale-out could still open far more connections than
// Postgres allows, and a starved pool would hang requests instead of erroring.
const poolLimits = {
  max: parseInt(process.env.DB_POOL_MAX || "10"),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

export const pool = new Pool(
  isUnixSocket
    ? {
        host: dbHost,
        database: process.env.DB_NAME || "wellness_db",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        ...poolLimits,
      }
    : {
        host: dbHost,
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "wellness_db",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        ...poolLimits,
      }
);

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    // Stores extra profile info beyond what SuperTokens manages
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supertokens_id TEXT UNIQUE NOT NULL,
        name           TEXT,
        role           TEXT NOT NULL DEFAULT 'patient',
        phone          TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Add two_factor_enabled column if it doesn't exist yet (safe on existing DBs)
    await client.query(`
      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✅ Database tables ready");

  } catch (err) {
    console.error("❌ Database init failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
