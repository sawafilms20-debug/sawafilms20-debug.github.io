import crypto from "crypto";

// Single-admin session cookie. The signing key is derived from server-only
// secrets (never shipped to the browser), so the cookie can't be forged
// without them and no extra env var is needed.

export const COOKIE_NAME = "rk_admin";
const MESSAGE = "rk-admin-session-v1";

function signingKey(): string {
  return `${process.env.GITHUB_TOKEN || ""}|${process.env.ADMIN_PASSWORD || ""}`;
}

export function sessionValue(): string {
  return crypto.createHmac("sha256", signingKey()).update(MESSAGE).digest("hex");
}

export function isValidSession(cookieVal: string | undefined): boolean {
  if (!cookieVal) return false;
  const expected = sessionValue();
  const a = Buffer.from(cookieVal);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
