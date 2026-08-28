import crypto from "crypto";
import bcrypt from "bcryptjs";
import { dbq, one, hasDb } from "./db";

/* Admin identity and sessions.

   Four things here are load-bearing:
   - bcrypt at cost 12. A single unsalted SHA-256 round is recoverable offline
     in minutes; that is not a hash, it is an encoding.
   - Sessions in the database. Held in process memory they evaporate on every
     deploy, signing the operator out while her cookie still looks valid.
   - `requireAdmin` re-reads the admin row on EVERY call. Verifying only the
     token means a disabled account keeps working until the token expires.
   - Constant-time comparison on anything secret. `===` on a hash leaks timing. */

export const COOKIE_NAME = "rk_sess";
export const SESSION_DAYS = 30;
export const BCRYPT_COST = 12;

export type AdminRole = "owner" | "editor";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  totpSecret: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type AdminRow = AdminUser & { passwordHash: string };

const PUBLIC_COLUMNS = `id, email, name, role, "isActive", "totpSecret", "lastLoginAt", "createdAt"`;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a || "");
  const bufB = Buffer.from(b || "");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/* ------------------------------------------------------------- bootstrapping */

/** Creates the owner account from ADMIN_PASSWORD the first time the dashboard
 *  runs against an empty database, so the deployment keeps working without a
 *  manual seeding step. Does nothing once any admin exists. */
export async function bootstrapOwner(): Promise<void> {
  if (!hasDb()) return;
  const existing = await one<{ n: string }>(`SELECT count(*)::text AS n FROM admin_users`);
  if (existing && Number(existing.n) > 0) return;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;
  const email = (process.env.ADMIN_EMAIL || "raheeqkanjo@gmail.com").toLowerCase();
  const name = process.env.ADMIN_NAME || "رحيق كنجو";
  await dbq(
    `INSERT INTO admin_users (email, "passwordHash", name, role, "isActive")
     VALUES ($1, $2, $3, 'owner', TRUE)
     ON CONFLICT (email) DO NOTHING`,
    [email, await hashPassword(password), name]
  );
}

/* ------------------------------------------------------------------ sessions */

export function newToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

export async function createSession(adminId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await dbq(
    `INSERT INTO admin_sessions (token, "adminId", "expiresAt") VALUES ($1, $2, $3)`,
    [token, adminId, expiresAt]
  );
  // opportunistic cleanup; cheap and keeps the table from growing forever
  await dbq(`DELETE FROM admin_sessions WHERE "expiresAt" < now()`).catch(() => {});
  return { token, expiresAt };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await dbq(`DELETE FROM admin_sessions WHERE token = $1`, [token]).catch(() => {});
}

export async function destroyAllSessions(adminId: number): Promise<void> {
  await dbq(`DELETE FROM admin_sessions WHERE "adminId" = $1`, [adminId]).catch(() => {});
}

/** Resolves a session cookie to a live, enabled admin — re-reading the row
 *  every time. Returns null for an unknown, expired, disabled or deleted
 *  account, and clears the session row in the disabled/deleted case. */
export async function adminFromToken(token: string | undefined): Promise<AdminUser | null> {
  if (!token || !hasDb()) return null;
  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  const row = await one<AdminRow & { expiresAt: string }>(
    `SELECT u.id, u.email, u.name, u.role, u."isActive", u."totpSecret",
            u."lastLoginAt", u."createdAt", s."expiresAt"
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s."adminId"
      WHERE s.token = $1`,
    [token]
  );
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    await destroySession(token);
    return null;
  }
  if (!row.isActive) {
    await destroyAllSessions(row.id);
    return null;
  }
  const { passwordHash: _ignored, ...user } = row as AdminRow;
  void _ignored;
  return user as AdminUser;
}

/* --------------------------------------------------------------------- users */

export async function findByEmail(email: string): Promise<AdminRow | null> {
  return one<AdminRow>(
    `SELECT ${PUBLIC_COLUMNS}, "passwordHash" FROM admin_users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
}

export async function listAdmins(): Promise<AdminUser[]> {
  return dbq<AdminUser>(`SELECT ${PUBLIC_COLUMNS} FROM admin_users ORDER BY id`);
}

export async function touchLogin(id: number): Promise<void> {
  await dbq(`UPDATE admin_users SET "lastLoginAt" = now() WHERE id = $1`, [id]);
}

export function sessionCookie(token: string, maxAgeSec: number) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    // sameSite 'lax' — never 'none'. 'none' attaches the cookie to cross-site
    // POSTs, which is exactly the request an attacker's page makes.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}
