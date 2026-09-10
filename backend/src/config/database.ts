import { Pool } from "pg";
import { FEATURE_KEYS, DEFAULT_ORG_SLUG } from "./features";

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

    // White-label tenants. Every clinic/doctor/patient will eventually carry
    // an org_id; until that migration lands, callers fall back to the
    // DEFAULT_ORG_SLUG row seeded below so existing behavior is unaffected.
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug              TEXT UNIQUE NOT NULL,
        name              TEXT NOT NULL,
        logo_url          TEXT,
        logo_url_light    TEXT,
        favicon_url       TEXT,
        primary_color     TEXT,
        secondary_color   TEXT,
        support_email     TEXT,
        support_phone     TEXT,
        persona_name      TEXT NOT NULL DEFAULT 'Dr. Wellness',
        app_bundle_id     TEXT,
        play_store_url    TEXT,
        app_store_url     TEXT,
        plan_tier         TEXT NOT NULL DEFAULT 'starter',
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // One row per (org, feature). `config` carries feature-specific tuning
    // (e.g. { "maxBookingsPerDay": 20 }) that requireFeature's callers can
    // read once they've already confirmed enabled=true.
    await client.query(`
      CREATE TABLE IF NOT EXISTS org_features (
        org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        feature_key TEXT NOT NULL,
        enabled     BOOLEAN NOT NULL DEFAULT false,
        config      JSONB,
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, feature_key)
      )
    `);

    // Add persona_name column if it doesn't exist yet (safe on existing DBs).
    // Defaults to 'Dr. Wellness' so the already-seeded default org's AI chat
    // persona keeps its current name without a manual backfill.
    await client.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS persona_name TEXT NOT NULL DEFAULT 'Dr. Wellness'
    `);

    // Add logo_url_light if it doesn't exist yet (safe on existing DBs) — a
    // second, white/light-colored logo variant for dark or gradient
    // backgrounds (e.g. the patient app's MainHeader, which swaps between a
    // colored and white bundled logo depending on the screen behind it).
    // NULL until an org explicitly uploads one; callers fall back to
    // logo_url (or the bundled default) when it's unset — see
    // GET /api/meta/branding and MainHeader.tsx.
    await client.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS logo_url_light TEXT
    `);

    // Seed the default org once. Every feature defaults ON here so current
    // (pre-white-label) behavior is unchanged for the one tenant that exists
    // today; new orgs created later via the admin API start with everything
    // off until a super-admin opts them in.
    const { rows: defaultOrgRows } = await client.query(
      `INSERT INTO organizations (slug, name, plan_tier)
       VALUES ($1, 'Wellness', 'enterprise')
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [DEFAULT_ORG_SLUG]
    );
    const defaultOrgId = defaultOrgRows[0]?.id
      ?? (await client.query(`SELECT id FROM organizations WHERE slug = $1`, [DEFAULT_ORG_SLUG])).rows[0].id;

    for (const key of FEATURE_KEYS) {
      await client.query(
        `INSERT INTO org_features (org_id, feature_key, enabled)
         VALUES ($1, $2, true)
         ON CONFLICT (org_id, feature_key) DO NOTHING`,
        [defaultOrgId, key]
      );
    }

    console.log("✅ Database tables ready");

  } catch (err) {
    console.error("❌ Database init failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
