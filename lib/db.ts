import { Pool, type PoolClient } from "pg";
import { MIGRATIONS } from "./migrations";

/* Postgres access + the migration runner.

   DATABASE_URL is injected by Railway once a Postgres database is attached to
   the project, so the dashboard degrades to "not connected" rather than
   crashing when it is absent. */

declare global {
  // eslint-disable-next-line no-var
  var _rkPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _rkMigrated: Promise<void> | undefined;
}

export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

/* Whether to negotiate TLS.

   Substring-matching the URL for "localhost" gets this wrong the moment a
   connection string says 127.0.0.1 — the driver then offers SSL to a server
   that does not speak it and every query fails with "the server does not
   support SSL connections". Parse the host and decide on that, and let an
   explicit sslmode in the string win over the guess. */
function wantsSsl(url: string): boolean {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (mode) return mode !== "disable";
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (host.endsWith(".railway.internal") || host.endsWith(".internal")) return false;
    // A bare hostname with no dot is a container or service name on a private
    // network, not something with a public certificate.
    if (!host.includes(".")) return false;
    return true;
  } catch {
    return true;
  }
}

export function pool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!global._rkPool) {
    const url = process.env.DATABASE_URL;
    global._rkPool = new Pool({
      connectionString: url,
      // Railway's public proxy presents a certificate this process has no CA
      // for; the connection is still encrypted, it is just not verified.
      ssl: wantsSsl(url) ? { rejectUnauthorized: false } : false,
      // Overridable so a single-connection local server (scripts/dev-postgres.mjs)
      // can be driven by the same code that talks to Railway.
      max: Number(process.env.DB_POOL_MAX) || 5,
      idleTimeoutMillis: 30000,
    });
    global._rkPool.on("error", () => {
      /* an idle client dropped; the pool replaces it on next checkout */
    });
  }
  return global._rkPool;
}

/* ---------------------------------------------------------------- migrations */

// Any 64-bit constant; identifies this app's migration lock inside Postgres.
const LOCK_ID = 8123400771;

async function runMigrations(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         VARCHAR(120) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const { rows } = await client.query<{ id: string }>(`SELECT id FROM schema_migrations`);
  const done = new Set(rows.map((r) => r.id));

  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await client.query("BEGIN");
    try {
      await client.query(m.sql);
      await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [m.id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(
        `migration ${m.id} failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

/** Apply every pending migration. Safe to call concurrently and repeatedly:
 *  an advisory lock serialises the runner across processes, and the result is
 *  memoised for the lifetime of this one. */
export function migrate(): Promise<void> {
  if (!global._rkMigrated) {
    global._rkMigrated = (async () => {
      const client = await pool().connect();
      try {
        await client.query(`SELECT pg_advisory_lock($1)`, [LOCK_ID]);
        try {
          await runMigrations(client);
        } finally {
          await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_ID]);
        }
      } finally {
        client.release();
      }
    })().catch((e) => {
      global._rkMigrated = undefined; // let the next request retry
      throw e;
    });
  }
  return global._rkMigrated;
}

/** Historical name, still imported by the public tracking routes. */
export const ensureSchema = migrate;

/* --------------------------------------------------------------- query API */

export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool().query(text, params);
  return res.rows as T[];
}

/** Same as `q`, but runs migrations first. Use this from anything that may be
 *  the first thing to touch the database after a cold start. */
export async function dbq<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await migrate();
  return q<T>(text, params);
}

export async function one<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await dbq<T>(text, params);
  return rows[0] ?? null;
}

/** Run several statements in one transaction. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await migrate();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
