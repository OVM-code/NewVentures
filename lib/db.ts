import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(
  authToken ? { url, authToken } : { url }
);

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  initialized = true;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      pitch TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS variants (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      headline TEXT NOT NULL,
      subcopy TEXT,
      cta_text TEXT NOT NULL DEFAULT 'Join the waitlist',
      weight INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      referrer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS signups (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      referrer TEXT,
      intent TEXT,
      price_expectation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migrate databases created before the intent columns existed. SQLite has no
  // ADD COLUMN IF NOT EXISTS, so tolerate only the duplicate-column error.
  for (const sql of [
    "ALTER TABLE signups ADD COLUMN intent TEXT",
    "ALTER TABLE signups ADD COLUMN price_expectation TEXT",
  ]) {
    try {
      await db.execute(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/duplicate column/i.test(message)) throw err;
    }
  }

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS signups_idea_email_idx ON signups(idea_id, email)
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS variants_idea_idx ON variants(idea_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS visits_idea_idx ON visits(idea_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS visits_variant_idx ON visits(variant_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS signups_variant_idx ON signups(variant_id)`);
}
