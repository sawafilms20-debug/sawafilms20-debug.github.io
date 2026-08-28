/* Applies pending migrations, then exits. Run from the start command, so every
   deploy migrates before it serves — without anyone having to remember a
   command, and without importing the Postgres driver into Next's module graph.
   (An `instrumentation.ts` that imports `pg` gets compiled for the edge runtime
   too, where `fs` does not exist, and the whole app then fails to build.)

   The migration LIST is shared with the application; only this short runner is
   duplicated, because Node cannot resolve TypeScript's extensionless relative
   imports and `lib/db.ts` has one.

   A failure here is loud but not fatal: the server still starts, the request
   path retries the runner through `migrate()`, and a migration problem must not
   take the whole site down. */

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[rk] no DATABASE_URL — skipping migrations");
  process.exit(0);
}

/* Imported dynamically, and only once we know there is work to do. This is a
   .ts file, which Node can only load where type stripping is available (22.6+).
   As a STATIC import it threw before the check above ever ran, on a host whose
   Node was older — and because the start command chained with &&, the server
   then never started at all. Nothing here is allowed to stop the app booting:
   migrate() in lib/db.ts runs the same list from inside Next, where the
   TypeScript is already compiled, so the migrations still get applied on the
   first request that touches the database. */
let MIGRATIONS;
try {
  ({ MIGRATIONS } = await import("../lib/migrations.ts"));
} catch (e) {
  console.error("[rk] could not load the migration list:", e instanceof Error ? e.message : e);
  console.error("[rk] starting anyway; the first database request will apply them");
  process.exit(0);
}

// Any 64-bit constant; must match LOCK_ID in lib/db.ts so the two runners
// cannot apply the same migration at the same moment.
const LOCK_ID = 8123400771;

function wantsSsl(u) {
  try {
    const parsed = new URL(u);
    const mode = parsed.searchParams.get("sslmode");
    if (mode) return mode !== "disable";
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (host.endsWith(".railway.internal") || host.endsWith(".internal")) return false;
    return host.includes(".");
  } catch {
    return true;
  }
}

let client;
try {
  const pg = await import("pg");
  client = new pg.default.Client({
    connectionString: url,
    ssl: wantsSsl(url) ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  await client.query(`SELECT pg_advisory_lock($1)`, [LOCK_ID]);

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          VARCHAR(120) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);

  const { rows } = await client.query(`SELECT id FROM schema_migrations`);
  const done = new Set(rows.map((r) => r.id));

  let applied = 0;
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await client.query("BEGIN");
    try {
      await client.query(m.sql);
      await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [m.id]);
      await client.query("COMMIT");
      applied++;
      console.log(`[rk] applied ${m.id}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${m.id} failed: ${e.message}`);
    }
  }

  await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_ID]);
  console.log(
    applied ? `[rk] migrations up to date (${applied} applied)` : "[rk] migrations up to date"
  );
  await client.end();
  process.exit(0);
} catch (e) {
  console.error("[rk] MIGRATION FAILED:", e instanceof Error ? e.message : e);
  console.error("[rk] starting anyway; the first database request will retry");
  try {
    await client?.end();
  } catch {
    /* the connection is already gone */
  }
  process.exit(0);
}
