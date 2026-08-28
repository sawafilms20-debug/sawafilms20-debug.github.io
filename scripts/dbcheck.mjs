/* Runs the real migrations and the real queries against an in-process Postgres.

   There is no database on a laptop and none in CI, so without this every line
   of SQL in the dashboard would first execute in production. A quoted
   camelCase identifier with one wrong letter typechecks perfectly and fails at
   runtime, on the login path, in front of the person who needs it.

   Usage:  node scripts/dbcheck.mjs
   Exit code is non-zero when anything fails. */

import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MIGRATIONS } from "../lib/migrations.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed++;
    process.stdout.write(`  ok   ${name}\n`);
  } catch (e) {
    failures.push({ name, error: e instanceof Error ? e.message : String(e) });
    process.stdout.write(`  FAIL ${name}\n       ${e?.message || e}\n`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const db = new PGlite();
await db.waitReady;

/* ------------------------------------------------------------- migrations */

console.log("\nmigrations");
await check("apply every migration in order", async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(120) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
  for (const m of MIGRATIONS) {
    try {
      await db.exec(m.sql);
      await db.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [m.id]);
    } catch (e) {
      throw new Error(`${m.id}: ${e.message}`);
    }
  }
  const { rows } = await db.query(`SELECT count(*)::int AS n FROM schema_migrations`);
  assert(rows[0].n === MIGRATIONS.length, `applied ${rows[0].n}/${MIGRATIONS.length}`);
});

await check("re-applying is a no-op (every migration is idempotent)", async () => {
  for (const m of MIGRATIONS) await db.exec(m.sql);
});

/* ------------------------------------------------------- schema inventory */

const { rows: columnRows } = await db.query(`
  SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position`);

const schema = new Map();
for (const r of columnRows) {
  if (!schema.has(r.table_name)) schema.set(r.table_name, new Set());
  schema.get(r.table_name).add(r.column_name);
}

const EXPECTED_TABLES = [
  "admin_users", "admin_sessions", "articles", "page_content", "services",
  "testimonials", "process_steps", "faq_items", "statistics", "enquiries",
  "newsletter_subscribers", "seo_settings", "site_settings", "media_assets",
  "media_blobs", "error_logs", "events", "schema_migrations",
];

console.log("\nschema");
await check("every expected table exists", () => {
  const missing = EXPECTED_TABLES.filter((t) => !schema.has(t));
  assert(!missing.length, `missing: ${missing.join(", ")}`);
});

/* Every double-quoted identifier written in SQL anywhere in the codebase has
   to be a real column somewhere. This is the check that catches "isVisble". */
const SQL_FILES = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // app/admin is the browser bundle; it contains no SQL by construction.
      if (["node_modules", ".next", ".git", "docs", "out", "admin"].includes(entry.name)) continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      SQL_FILES.push(p);
    }
  }
})(ROOT);

const allColumns = new Set();
for (const cols of schema.values()) for (const c of cols) allColumns.add(c);

// Names that appear double-quoted in SQL but are aliases, not columns.
const ALIASES = new Set([
  "pageViews", "avgSeconds", "sessionId", "firstPath", "lastSeen", "settingKey",
  "settingValue", "settingType", "storageKey", "appliedAt", "twoFactor",
]);

await check("no SQL references an unknown quoted identifier", () => {
  const unknown = new Map();
  for (const file of SQL_FILES) {
    const src = fs.readFileSync(file, "utf8");
    // A literal counts as SQL only when it OPENS with a SQL verb. Matching the
    // keyword anywhere instead pulls in ordinary template strings that merely
    // mention one, and every quoted union member inside them becomes a false
    // "unknown column".
    for (const lit of src.match(/`[^`]*`/g) || []) {
      if (!/^`\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/i.test(lit)) continue;
      for (const m of lit.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"/g)) {
        const name = m[1];
        if (allColumns.has(name) || ALIASES.has(name)) continue;
        if (!unknown.has(name)) unknown.set(name, new Set());
        unknown.get(name).add(path.relative(ROOT, file));
      }
    }
  }
  assert(
    unknown.size === 0,
    [...unknown.entries()].map(([n, files]) => `"${n}" in ${[...files].join(", ")}`).join("; ")
  );
});

/* ------------------------------------------------------------------- auth */

console.log("\nauth");
await check("admin user + session round-trip, with the live-row re-read", async () => {
  await db.query(
    `INSERT INTO admin_users (email, "passwordHash", name, role)
     VALUES ($1,$2,$3,'owner')`,
    ["owner@example.com", "$2a$12$abcdefghijklmnopqrstuv", "رحيق"]
  );
  const { rows: users } = await db.query(`SELECT id FROM admin_users WHERE email = $1`, [
    "owner@example.com",
  ]);
  const id = users[0].id;
  const token = "a".repeat(64);
  await db.query(
    `INSERT INTO admin_sessions (token, "adminId", "expiresAt") VALUES ($1,$2, now() + interval '30 days')`,
    [token, id]
  );
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u."isActive", u."totpSecret",
            u."lastLoginAt", u."createdAt", s."expiresAt"
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s."adminId"
      WHERE s.token = $1`,
    [token]
  );
  assert(rows.length === 1, "session join returned nothing");
  assert(rows[0].isActive === true, "isActive not readable as camelCase");
});

await check("disabling an account and dropping its sessions", async () => {
  const { rows } = await db.query(
    `UPDATE admin_users SET "isActive" = FALSE WHERE email = $1 RETURNING id`,
    ["owner@example.com"]
  );
  await db.query(`DELETE FROM admin_sessions WHERE "adminId" = $1`, [rows[0].id]);
  const { rows: left } = await db.query(`SELECT count(*)::int AS n FROM admin_sessions`);
  assert(left[0].n === 0, "sessions survived the disable");
  await db.query(`UPDATE admin_users SET "isActive" = TRUE WHERE email = $1`, [
    "owner@example.com",
  ]);
});

await check("role is constrained to owner|editor", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO admin_users (email,"passwordHash",name,role) VALUES ('x@y.z','h','n','superadmin')`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "an unknown role was accepted");
});

await check("updatedAt trigger fires on update", async () => {
  const { rows: before } = await db.query(
    `SELECT "updatedAt" FROM admin_users WHERE email = 'owner@example.com'`
  );
  await db.query(`SELECT pg_sleep(0.02)`);
  await db.query(`UPDATE admin_users SET name = 'رحيق كنجو' WHERE email = 'owner@example.com'`);
  const { rows: after } = await db.query(
    `SELECT "updatedAt" FROM admin_users WHERE email = 'owner@example.com'`
  );
  assert(
    new Date(after[0].updatedAt).getTime() > new Date(before[0].updatedAt).getTime(),
    "updatedAt did not move"
  );
});

/* --------------------------------------------------------------- articles */

console.log("\narticles");
const ownerId = (await db.query(`SELECT id FROM admin_users WHERE email='owner@example.com'`))
  .rows[0].id;

await check("create, publish, and the public visibility filter", async () => {
  await db.query(
    `INSERT INTO articles (slug,"titleAr","bodyAr",tags,"readingMinutes",status,"publishedAt","authorId")
     VALUES ('live','مقال منشور','نص', $1, 3, 'published', now() - interval '1 day', $2)`,
    [JSON.stringify(["كتابة"]), ownerId]
  );
  await db.query(
    `INSERT INTO articles (slug,"titleAr","bodyAr",tags,status,"authorId")
     VALUES ('hidden','مسودة','نص', '[]'::jsonb, 'draft', $1)`,
    [ownerId]
  );
  const { rows } = await db.query(
    `SELECT slug FROM articles
      WHERE status = 'published' AND "publishedAt" IS NOT NULL AND "publishedAt" <= now()`
  );
  assert(rows.length === 1 && rows[0].slug === "live", "a draft leaked into the public set");
});

await check("scheduled articles promote themselves once the time passes", async () => {
  await db.query(
    `INSERT INTO articles (slug,"titleAr","bodyAr",status,"scheduledAt","authorId")
     VALUES ('due','مجدول','نص','draft', now() - interval '1 minute', $1)`,
    [ownerId]
  );
  await db.query(
    `INSERT INTO articles (slug,"titleAr","bodyAr",status,"scheduledAt","authorId")
     VALUES ('later','لاحقًا','نص','draft', now() + interval '2 days', $1)`,
    [ownerId]
  );
  const { rows } = await db.query(
    `UPDATE articles
        SET status = 'published',
            "publishedAt" = COALESCE("publishedAt", "scheduledAt"),
            "scheduledAt" = NULL
      WHERE "scheduledAt" IS NOT NULL AND "scheduledAt" <= now() AND status <> 'published'
      RETURNING slug`
  );
  assert(rows.length === 1 && rows[0].slug === "due", `promoted ${rows.map((r) => r.slug)}`);
  const { rows: later } = await db.query(
    `SELECT status FROM articles WHERE slug = 'later'`
  );
  assert(later[0].status === "draft", "a future article was published early");
});

await check("bulkStatus keeps the original publish date", async () => {
  const { rows: before } = await db.query(
    `SELECT id, "publishedAt" FROM articles WHERE slug = 'live'`
  );
  const bulk = `UPDATE articles
        SET status = $2::text,
            "publishedAt" = CASE WHEN $2::text = 'published' AND "publishedAt" IS NULL THEN now() ELSE "publishedAt" END,
            "scheduledAt" = CASE WHEN $2::text = 'published' THEN NULL ELSE "scheduledAt" END
      WHERE id = ANY($1::int[])`;
  await db.query(bulk, [[before[0].id], "draft"]);
  await db.query(bulk, [[before[0].id], "published"]);
  const { rows: after } = await db.query(
    `SELECT "publishedAt" FROM articles WHERE slug = 'live'`
  );
  assert(
    new Date(after[0].publishedAt).getTime() === new Date(before[0].publishedAt).getTime(),
    "re-publishing moved the article to the top of the blog"
  );
});

await check("slug is unique", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO articles (slug,"titleAr","bodyAr") VALUES ('live','مكرر','x')`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "two articles took the same slug");
});

/* ----------------------------------------------------------- page content */

console.log("\npage content");
await check("upsert overrides, and clearing removes the row", async () => {
  const up = async (v) =>
    db.query(
      `INSERT INTO page_content ("pageKey","sectionKey","contentKey","valueAr","valueEn","contentType")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("pageKey","sectionKey","contentKey") DO UPDATE
         SET "valueAr" = EXCLUDED."valueAr",
             "valueEn" = EXCLUDED."valueEn",
             "contentType" = EXCLUDED."contentType"`,
      ["home", "hero", "title", v, null, "richtext"]
    );
  await up("عنوان أول");
  await up("عنوان ثانٍ");
  const { rows } = await db.query(
    `SELECT "valueAr" FROM page_content WHERE "pageKey"='home' AND "sectionKey"='hero' AND "contentKey"='title'`
  );
  assert(rows.length === 1, `expected one row, got ${rows.length}`);
  assert(rows[0].valueAr === "عنوان ثانٍ", "the second write did not win");
  await db.query(
    `DELETE FROM page_content WHERE "pageKey"=$1 AND "sectionKey"=$2 AND "contentKey"=$3`,
    ["home", "hero", "title"]
  );
  const { rows: gone } = await db.query(`SELECT count(*)::int AS n FROM page_content`);
  assert(gone[0].n === 0, "clearing left a row behind");
});

await check("contentType is constrained", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO page_content ("pageKey","sectionKey","contentKey","contentType")
       VALUES ('home','a','b','video')`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "an unknown contentType was accepted");
});

/* ------------------------------------------------------------ collections */

console.log("\ncollections");
await check("reorder rewrites displayOrder in the order given", async () => {
  for (const [i, q] of ["أ", "ب", "ج"].entries()) {
    await db.query(
      `INSERT INTO testimonials ("quoteAr","authorName","displayOrder") VALUES ($1,$2,$3)`,
      [q, `شخص ${i}`, i]
    );
  }
  const { rows } = await db.query(`SELECT id FROM testimonials ORDER BY "displayOrder"`);
  const reversed = rows.map((r) => r.id).reverse();
  for (let i = 0; i < reversed.length; i++) {
    await db.query(`UPDATE testimonials SET "displayOrder" = $1 WHERE id = $2`, [i, reversed[i]]);
  }
  const { rows: after } = await db.query(
    `SELECT id FROM testimonials ORDER BY "displayOrder" ASC, id ASC`
  );
  assert(
    JSON.stringify(after.map((r) => r.id)) === JSON.stringify(reversed),
    "reorder did not take"
  );
});

await check("process steps renumber themselves to match the drag order", async () => {
  for (const [i, t] of ["أفهم", "أستخرج", "أحدد", "أكتب"].entries()) {
    await db.query(
      `INSERT INTO process_steps ("stepNumber","titleAr","displayOrder") VALUES ($1,$2,$3)`,
      [99, t, 3 - i] // deliberately wrong numbers, reversed order
    );
  }
  await db.query(
    `UPDATE process_steps s SET "stepNumber" = r.rn
       FROM (SELECT id, row_number() OVER (ORDER BY "displayOrder", id) AS rn FROM process_steps) r
      WHERE s.id = r.id AND s."stepNumber" <> r.rn`
  );
  const { rows } = await db.query(
    `SELECT "titleAr", "stepNumber" FROM process_steps ORDER BY "displayOrder"`
  );
  assert(
    JSON.stringify(rows.map((r) => r.stepNumber)) === JSON.stringify([1, 2, 3, 4]),
    `got ${rows.map((r) => r.stepNumber).join(",")}`
  );
  assert(rows[0].titleAr === "أكتب", "renumbering did not follow displayOrder");
});

/* ------------------------------------------------------------- enquiries */

console.log("\nenquiries");
await check("status filter, counts, and the private notes field", async () => {
  await db.query(
    `INSERT INTO enquiries (name,email,message,source,status) VALUES
      ('أحمد','a@example.com','رسالة','contact','new'),
      ('سارة','s@example.com','رسالة أخرى','linkedin','replied')`
  );
  const { rows: counts } = await db.query(
    `SELECT status, count(*)::text AS n FROM enquiries GROUP BY status`
  );
  const map = Object.fromEntries(counts.map((c) => [c.status, Number(c.n)]));
  assert(map.new === 1 && map.replied === 1, JSON.stringify(map));
  await db.query(`UPDATE enquiries SET notes = $2 WHERE email = $1`, [
    "a@example.com",
    "اتصلت يوم الأحد",
  ]);
  const { rows } = await db.query(`SELECT notes FROM enquiries WHERE email='a@example.com'`);
  assert(rows[0].notes === "اتصلت يوم الأحد", "notes did not save");
});

await check("enquiry status is constrained", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO enquiries (name,email,message,status) VALUES ('x','x@y.z','m','done')`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "an unknown enquiry status was accepted");
});

/* ------------------------------------------------------------ newsletter */

console.log("\nnewsletter");
await check("re-subscribing revives the existing row instead of creating one", async () => {
  const sub = () =>
    db.query(
      `INSERT INTO newsletter_subscribers (email, name, source, "confirmedAt")
       VALUES ($1,$2,$3, now())
       ON CONFLICT (email) DO UPDATE SET "isActive" = TRUE, "unsubscribedAt" = NULL`,
      ["reader@example.com", "قارئ", "blog-subscribe"]
    );
  await sub();
  await db.query(
    `UPDATE newsletter_subscribers SET "isActive" = FALSE, "unsubscribedAt" = now()
      WHERE email = 'reader@example.com'`
  );
  await sub();
  const { rows } = await db.query(
    `SELECT count(*)::int AS n, bool_and("isActive") AS active, count("unsubscribedAt")::int AS unsub
       FROM newsletter_subscribers`
  );
  assert(rows[0].n === 1, `${rows[0].n} rows for one address`);
  assert(rows[0].active === true, "re-subscribe did not reactivate");
  assert(rows[0].unsub === 0, "unsubscribedAt was not cleared");
});

await check("slugAvailable's optional exceptId parameter", async () => {
  const { rows } = await db.query(
    `SELECT id FROM articles WHERE slug = $1 AND ($2::int IS NULL OR id <> $2::int)`,
    ["live", null]
  );
  assert(rows.length === 1, "a null exceptId should not filter anything out");
  const { rows: excluded } = await db.query(
    `SELECT id FROM articles WHERE slug = $1 AND ($2::int IS NULL OR id <> $2::int)`,
    ["live", rows[0].id]
  );
  assert(excluded.length === 0, "exceptId did not exclude the article itself");
});

await check("newsletter setActive with a reused boolean parameter", async () => {
  const { rows } = await db.query(
    `SELECT id FROM newsletter_subscribers LIMIT 1`
  );
  await db.query(
    `UPDATE newsletter_subscribers
        SET "isActive" = $2::boolean,
            "unsubscribedAt" = CASE WHEN $2::boolean THEN NULL ELSE now() END
      WHERE id = $1`,
    [rows[0].id, false]
  );
  const { rows: after } = await db.query(
    `SELECT "isActive", "unsubscribedAt" FROM newsletter_subscribers WHERE id = $1`,
    [rows[0].id]
  );
  assert(after[0].isActive === false && after[0].unsubscribedAt !== null, "setActive did not stamp");
});

await check("a public re-subscribe cannot undo an unsubscribe", async () => {
  const publicSubscribe = () =>
    db.query(
      `INSERT INTO newsletter_subscribers (email, name, source, "confirmedAt")
       VALUES ($1,$2,$3, now())
       ON CONFLICT (email) DO UPDATE
         SET "isActive" = TRUE
       WHERE newsletter_subscribers."unsubscribedAt" IS NULL`,
      ["optout@example.com", "قارئ", "blog-subscribe"]
    );
  await publicSubscribe();
  await db.query(
    `UPDATE newsletter_subscribers SET "isActive" = FALSE, "unsubscribedAt" = now()
      WHERE email = 'optout@example.com'`
  );
  await publicSubscribe();
  const { rows } = await db.query(
    `SELECT "isActive", "unsubscribedAt" FROM newsletter_subscribers WHERE email='optout@example.com'`
  );
  assert(rows.length === 1, "the row was duplicated");
  assert(rows[0].isActive === false, "a public form reversed someone's unsubscribe");
  assert(rows[0].unsubscribedAt !== null, "unsubscribedAt was cleared");

  // The operator can still re-activate from the dashboard.
  const { rows: target } = await db.query(
    `SELECT id FROM newsletter_subscribers WHERE email = 'optout@example.com'`
  );
  await db.query(
    `UPDATE newsletter_subscribers
        SET "isActive" = $2::boolean,
            "unsubscribedAt" = CASE WHEN $2::boolean THEN NULL ELSE now() END
      WHERE id = $1`,
    [target[0].id, true]
  );
  const { rows: after } = await db.query(
    `SELECT "isActive" FROM newsletter_subscribers WHERE email='optout@example.com'`
  );
  assert(after[0].isActive === true, "the operator could not re-activate");
});

await check("site settings feed the published snapshot", async () => {
  for (const [k, v] of [["footerTagline", "كاتبة محتوى"], ["contactEmail", "hello@example.com"]]) {
    await db.query(
      `INSERT INTO site_settings ("settingKey","settingValue","settingType")
       VALUES ($1,$2,'text')
       ON CONFLICT ("settingKey") DO UPDATE SET "settingValue" = EXCLUDED."settingValue"`,
      [k, v]
    );
  }
  const { rows } = await db.query(
    `SELECT "settingKey", "settingValue" FROM site_settings ORDER BY "settingKey"`
  );
  const byKey = Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue]));
  assert(byKey.footerTagline === "كاتبة محتوى", JSON.stringify(byKey));
  assert(byKey.contactEmail === "hello@example.com", JSON.stringify(byKey));
});

/* ----------------------------------------------------------------- media */

console.log("\nmedia");
await check("a key outside uploads/ is refused by the database itself", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO media_assets ("storageKey",url,"fileName","mimeType","sizeBytes")
       VALUES ('photo.jpg','/x','photo.jpg','image/jpeg',10)`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "a key without the uploads/ prefix was stored");
});

await check("bytes are stored beside the metadata and cascade on delete", async () => {
  await db.query(
    `INSERT INTO media_assets ("storageKey",url,"fileName","mimeType","sizeBytes",width,height)
     VALUES ('uploads/a.png','/api/media/uploads/a.png','a.png','image/png',12,4,3)`
  );
  await db.query(`INSERT INTO media_blobs ("storageKey", bytes) VALUES ($1,$2)`, [
    "uploads/a.png",
    new Uint8Array([1, 2, 3, 4]),
  ]);
  const { rows } = await db.query(
    `SELECT b.bytes, a."mimeType" FROM media_blobs b
       JOIN media_assets a ON a."storageKey" = b."storageKey"
      WHERE b."storageKey" = $1`,
    ["uploads/a.png"]
  );
  assert(rows.length === 1 && rows[0].mimeType === "image/png", "media join failed");
  await db.query(`DELETE FROM media_assets WHERE "storageKey" = 'uploads/a.png'`);
  const { rows: blobs } = await db.query(`SELECT count(*)::int AS n FROM media_blobs`);
  assert(blobs[0].n === 0, "the blob outlived its metadata row");
});

/* ------------------------------------------------------------ error logs */

console.log("\nerror log");
await check("the same fingerprint bumps a counter instead of adding rows", async () => {
  const write = () =>
    db.query(
      `INSERT INTO error_logs (fingerprint, message, stack, path, "userAgent")
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (fingerprint) DO UPDATE
         SET hits = error_logs.hits + 1, "lastSeenAt" = now(), "isResolved" = FALSE`,
      ["f".repeat(64), "boom", null, "/x", null]
    );
  await write();
  await write();
  await write();
  const { rows } = await db.query(`SELECT count(*)::int AS n, max(hits)::int AS hits FROM error_logs`);
  assert(rows[0].n === 1 && rows[0].hits === 3, `${rows[0].n} rows, ${rows[0].hits} hits`);
});

/* ------------------------------------------------------------- analytics */

console.log("\nanalytics");
await check("ingest a pageview with event_data", async () => {
  await db.query(
    `INSERT INTO events
       (session_id, visitor_id, type, path, referrer_host, device, browser, os, country, city,
        event_name, utm_source, utm_medium, utm_campaign, duration, event_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    ["s1", "v1", "pageview", "/blog/live/", "linkedin.com", "mobile", "Safari", "iOS",
     "Jordan", "Amman", null, "linkedin", "social", "launch", 42, JSON.stringify({ variant: "a" })]
  );
  await db.query(
    `INSERT INTO events (session_id, visitor_id, type, path, device, event_name)
     VALUES ('s1','v1','event','/contact/','mobile','cta_click')`
  );
  await db.query(
    `INSERT INTO events (session_id, visitor_id, type, path, device)
     VALUES ('s2','v2','pageview','/blog/live/','desktop')`
  );
  const { rows } = await db.query(`SELECT count(*)::int AS n FROM events`);
  assert(rows[0].n === 3, `${rows[0].n} events`);
});

await check("the overview aggregates all run", async () => {
  const where = `ts > now() - ($1::int * interval '1 day')`;
  const params = [30];
  const queries = [
    `SELECT count(*) FILTER (WHERE type='pageview')::text AS "pageViews",
            count(DISTINCT visitor_id)::text AS visitors,
            count(DISTINCT session_id)::text AS sessions,
            count(*) FILTER (WHERE type='event')::text AS events
       FROM events WHERE ${where}`,
    `SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS d,
            count(*) FILTER (WHERE type='pageview')::text AS views,
            count(DISTINCT session_id)::text AS sessions
       FROM events WHERE ${where} GROUP BY 1 ORDER BY 1`,
    `SELECT coalesce(path,'/') AS k, count(*)::text AS n FROM events
      WHERE ${where} AND type='pageview' GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`,
    `SELECT referrer_host AS k, count(*)::text AS n FROM events
      WHERE ${where} AND referrer_host IS NOT NULL AND referrer_host <> ''
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`,
    `SELECT coalesce(device,'unknown') AS k, count(DISTINCT session_id)::text AS n
       FROM events WHERE ${where} GROUP BY 1 ORDER BY count(DISTINCT session_id) DESC`,
    `SELECT coalesce(browser,'Other') AS k, count(DISTINCT session_id)::text AS n
       FROM events WHERE ${where} GROUP BY 1 ORDER BY count(DISTINCT session_id) DESC LIMIT 8`,
    `SELECT trim(both ', ' from concat_ws(', ', nullif(city,''), country)) AS k,
            count(DISTINCT visitor_id)::text AS n
       FROM events WHERE ${where} AND country IS NOT NULL AND country <> 'Unknown'
       GROUP BY 1 ORDER BY count(DISTINCT visitor_id) DESC LIMIT 8`,
    `SELECT event_name AS k, count(*)::text AS n FROM events
      WHERE ${where} AND type='event' AND event_name IS NOT NULL
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`,
    `SELECT utm_source AS k, count(*)::text AS n FROM events
      WHERE ${where} AND utm_source IS NOT NULL AND utm_source <> ''
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`,
    `SELECT session_id AS "sessionId",
            max(device) AS device, max(browser) AS browser,
            trim(both ', ' from concat_ws(', ', nullif(max(city),''), max(country))) AS location,
            (array_agg(path ORDER BY ts) FILTER (WHERE type='pageview'))[1] AS "firstPath",
            count(*) FILTER (WHERE type='pageview')::text AS pages,
            to_char(max(ts),'YYYY-MM-DD HH24:MI') AS "lastSeen"
       FROM events WHERE ${where} GROUP BY session_id ORDER BY max(ts) DESC LIMIT 15`,
  ];
  for (const [i, sql] of queries.entries()) {
    try {
      await db.query(sql, params);
    } catch (e) {
      throw new Error(`overview query #${i + 1}: ${e.message}`);
    }
  }
  const { rows } = await db.query(queries[0], params);
  assert(rows[0].pageViews === "2", `pageViews = ${rows[0].pageViews}`);
  assert(rows[0].sessions === "2", `sessions = ${rows[0].sessions}`);
});

await check("article performance matches only article URLs", async () => {
  await db.query(
    `INSERT INTO events (session_id, visitor_id, type, path)
     VALUES ('s3','v3','pageview','/blog/'), ('s3','v3','pageview','/blog/live/x/')`
  );
  const { rows } = await db.query(
    `SELECT regexp_replace(path, '^/blog/([^/?#]+)/?.*$', '\\1') AS slug,
            count(*)::text AS reads,
            count(DISTINCT visitor_id)::text AS readers,
            round(avg(NULLIF(duration,0)))::text AS "avgSeconds"
       FROM events
      WHERE ts > now() - ($1::int * interval '1 day')
        AND type = 'pageview'
        AND path ~ '^/blog/[^/?#]+/?$'
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 50`,
    [30]
  );
  assert(rows.length === 1, `matched ${rows.length} groups: ${JSON.stringify(rows)}`);
  assert(rows[0].slug === "live", `slug = ${rows[0].slug}`);
  assert(rows[0].reads === "2", `reads = ${rows[0].reads}`);
});

/* ------------------------------------------------------------------- seo */

console.log("\nseo & settings");
await check("seo upsert is per page and idempotent", async () => {
  const up = (title) =>
    db.query(
      `INSERT INTO seo_settings
         ("pageKey","metaTitleAr","metaTitleEn","metaDescriptionAr","metaDescriptionEn","ogImage","noIndex")
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, FALSE))
       ON CONFLICT ("pageKey") DO UPDATE SET
         "metaTitleAr" = EXCLUDED."metaTitleAr",
         "metaTitleEn" = EXCLUDED."metaTitleEn",
         "metaDescriptionAr" = EXCLUDED."metaDescriptionAr",
         "metaDescriptionEn" = EXCLUDED."metaDescriptionEn",
         "ogImage" = EXCLUDED."ogImage",
         "noIndex" = EXCLUDED."noIndex"`,
      ["home", title, null, "وصف", null, null, false]
    );
  await up("عنوان");
  await up("عنوان محدَّث");
  const { rows } = await db.query(`SELECT "metaTitleAr" FROM seo_settings WHERE "pageKey"='home'`);
  assert(rows.length === 1 && rows[0].metaTitleAr === "عنوان محدَّث", JSON.stringify(rows));
});

await check("site settings upsert by key", async () => {
  for (const v of ["a@b.c", "raheeq@example.com"]) {
    await db.query(
      `INSERT INTO site_settings ("settingKey","settingValue","settingType")
       VALUES ($1,$2,$3)
       ON CONFLICT ("settingKey") DO UPDATE
         SET "settingValue" = EXCLUDED."settingValue", "settingType" = EXCLUDED."settingType"`,
      ["contactEmail", v, "text"]
    );
  }
  const { rows } = await db.query(
    `SELECT "settingValue" FROM site_settings WHERE "settingKey" = 'contactEmail'`
  );
  assert(rows.length === 1, `upsert produced ${rows.length} rows for one key`);
  assert(rows[0].settingValue === "raheeq@example.com", JSON.stringify(rows));
});

await check("settingType is constrained", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO site_settings ("settingKey","settingValue","settingType") VALUES ('x','y','blob')`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "an unknown settingType was accepted");
});

/* ---------------------------------------------------------------- publish */

console.log("\npublish");
await check("the publish snapshot query set runs", async () => {
  const queries = [
    `SELECT slug, "titleAr", "titleEn", "excerptAr", "bodyAr", "coverImage", tags, "publishedAt"
       FROM articles
      WHERE status = 'published' AND "publishedAt" IS NOT NULL AND "publishedAt" <= now()
      ORDER BY "publishedAt" DESC`,
    `SELECT "pageKey","sectionKey","contentKey","valueAr" FROM page_content`,
    `SELECT "quoteAr","authorName","authorTitleAr",company,"authorPhoto","sourceUrl"
       FROM testimonials WHERE "isVisible" ORDER BY "displayOrder", id`,
    `SELECT "stepNumber","titleAr","descriptionAr",icon
       FROM process_steps WHERE "isVisible" ORDER BY "displayOrder", id`,
    `SELECT slug,"titleAr","summaryAr",icon,"coverImage"
       FROM services WHERE "isActive" ORDER BY "displayOrder", id`,
    `SELECT "questionAr","answerAr" FROM faq_items WHERE "isVisible" ORDER BY "displayOrder", id`,
    `SELECT "labelAr",value,suffix,icon FROM statistics WHERE "isVisible" ORDER BY "displayOrder", id`,
    `SELECT "pageKey","metaTitleAr","metaDescriptionAr","ogImage","noIndex" FROM seo_settings`,
  ];
  for (const [i, sql] of queries.entries()) {
    try {
      await db.query(sql);
    } catch (e) {
      throw new Error(`publish query #${i + 1}: ${e.message}`);
    }
  }
});

/* ----------------------------------------------------------------- report */

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}
console.log("schema and queries verified against a real Postgres.\n");
