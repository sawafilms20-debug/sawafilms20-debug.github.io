import { PGlite } from '@electric-sql/pglite';
import { MIGRATIONS } from '@/lib/migrations';
export const db = new PGlite();
await db.waitReady;
await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(120) PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now());`);
for (const m of MIGRATIONS) { await db.exec(m.sql); }
export const SQL_LOG = [];
export async function dbq(sql, params = []) {
  SQL_LOG.push({ sql, params });
  const { rows } = await db.query(sql, params);
  return rows;
}
export async function one(sql, params = []) { return (await dbq(sql, params))[0] ?? null; }
export function hasDb() { return true; }
export async function migrate() {}
export function pool() { throw new Error('no pool'); }
export async function tx(fn) { return fn({ query: (s,p)=>db.query(s,p) }); }
