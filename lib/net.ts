import type { NextRequest } from "next/server";

/* Network-edge helpers: who is calling, and are they allowed to.

   Both of these get gotten wrong in the same two ways every time:
   - `x-forwarded-for.split(",")[0]` is caller-supplied. Anyone can prepend a
     random value and reset a limiter keyed on it. The only trustworthy entry is
     the one OUR proxy appended, counted from the RIGHT.
   - Skipping the Origin check on POST lets any third-party page drive an
     authenticated mutation with the operator's cookie attached. */

/** Origins allowed to call the API from a browser. */
export const SITE_ORIGINS = [
  "https://raheeqkanjo.com",
  "https://www.raheeqkanjo.com",
  "https://rak-production.up.railway.app",
];

function extraOrigins(): string[] {
  return (process.env.EXTRA_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function allowedOrigins(): string[] {
  const list = [...SITE_ORIGINS, ...extraOrigins()];
  if (process.env.NODE_ENV !== "production") {
    list.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  return list;
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins().includes(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = isAllowedOrigin(origin) ? origin! : SITE_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400",
  };
}

/* How many proxies sit in front of this process and append to
   x-forwarded-for. On Railway that is 1 (its edge). Everything to the LEFT of
   that entry was supplied by the caller and is worthless for rate limiting. */
function trustedProxyCount(): number {
  const n = Number(process.env.TRUSTED_PROXY_COUNT);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function clientIp(req: Request | NextRequest): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const parts = xff
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) {
    // count from the right: parts[len - hops] is the address our own edge saw
    const idx = Math.max(0, parts.length - trustedProxyCount());
    const ip = parts[idx];
    if (ip) return ip;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** CSRF guard: a non-safe request must come from an origin we published. */
export function originOk(req: Request | NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin) return isAllowedOrigin(origin);
  // No Origin header at all: a same-origin non-browser client (curl, a health
  // probe). Browsers always send Origin on cross-site POSTs, so this is safe.
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "none") return false;
  return true;
}
