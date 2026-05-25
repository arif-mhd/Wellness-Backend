import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "wellness_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

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
    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("❌ Database init failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
