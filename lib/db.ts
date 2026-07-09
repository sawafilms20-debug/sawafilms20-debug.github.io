import { Pool } from "pg";

// Lazy Postgres pool. DATABASE_URL is auto-injected by Railway once a Postgres
// database is added to the project — no code change needed to "turn it on".

declare global {
  // eslint-disable-next-line no-var
  var _rkPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _rkSchema: Promise<void> | undefined;
}

export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

export function pool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!global._rkPool) {
    const url = process.env.DATABASE_URL;
    const internal = url.includes(".railway.internal") || url.includes("localhost");
    global._rkPool = new Pool({
      connectionString: url,
      ssl: internal ? undefined : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return global._rkPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT,
  referrer_host TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  event_name TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  duration INT
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`;

export function ensureSchema(): Promise<void> {
  if (!global._rkSchema) {
    global._rkSchema = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        global._rkSchema = undefined; // allow retry on next request
        throw e;
      });
  }
  return global._rkSchema;
}

export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool().query(text, params);
  return res.rows as T[];
}
