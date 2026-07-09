import { NextResponse } from "next/server";
import { hasDb, ensureSchema, q } from "@/lib/db";

// Public analytics ingest. The site's track.js posts pageviews + events here;
// the server enriches with device/browser/OS (from UA) and country/city (from IP),
// then stores a row. CORS-open to the site origins.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = [
  "https://raheeqkanjo.com",
  "https://www.raheeqkanjo.com",
  "https://rak-production.up.railway.app",
];
function cors(origin: string | null) {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

function parseUA(ua: string) {
  const s = ua.toLowerCase();
  const device = /mobile|iphone|android(?!.*tablet)/.test(s)
    ? "mobile"
    : /ipad|tablet/.test(s)
      ? "tablet"
      : "desktop";
  const browser = /edg\//.test(s)
    ? "Edge"
    : /samsungbrowser/.test(s)
      ? "Samsung"
      : /opr\/|opera/.test(s)
        ? "Opera"
        : /firefox|fxios/.test(s)
          ? "Firefox"
          : /chrome|crios/.test(s)
            ? "Chrome"
            : /safari/.test(s)
              ? "Safari"
              : "Other";
  const os = /windows/.test(s)
    ? "Windows"
    : /iphone|ipad|ios/.test(s)
      ? "iOS"
      : /mac os/.test(s)
        ? "macOS"
        : /android/.test(s)
          ? "Android"
          : /linux/.test(s)
            ? "Linux"
            : "Other";
  return { device, browser, os };
}

const geoCache = new Map<string, { country: string; city: string; at: number }>();
async function geo(ip: string): Promise<{ country: string; city: string }> {
  if (!ip || ip === "unknown" || /^(127\.|10\.|192\.168\.|::1|172\.(1[6-9]|2\d|3[01])\.)/.test(ip))
    return { country: "Unknown", city: "" };
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < 24 * 3600 * 1000) return cached;
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, {
      signal: AbortSignal.timeout(1500),
    });
    if (r.ok) {
      const j = await r.json();
      const val = { country: j.country || "Unknown", city: j.city || "", at: Date.now() };
      geoCache.set(ip, val);
      if (geoCache.size > 5000) geoCache.clear();
      return val;
    }
  } catch {
    /* ignore */
  }
  return { country: "Unknown", city: "" };
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v : "").slice(0, n) || null;

export async function POST(req: Request) {
  const headers = cors(req.headers.get("origin"));
  if (!hasDb()) return new NextResponse(null, { status: 204, headers }); // silently no-op until DB added

  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return new NextResponse(null, { status: 204, headers });
  }

  const type = b.type === "event" ? "event" : "pageview";
  const sid = clip(b.sid, 60) || "anon";
  const vid = clip(b.vid, 60) || "anon";
  const ua = req.headers.get("user-agent") || "";
  const { device, browser, os } = parseUA(ua);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";

  try {
    await ensureSchema();
    const { country, city } = await geo(ip);
    let host: string | null = null;
    const ref = clip(b.referrer, 300);
    if (ref) {
      try {
        host = new URL(ref).hostname.replace(/^www\./, "");
      } catch {
        host = null;
      }
    }
    await q(
      `INSERT INTO events
        (session_id, visitor_id, type, path, referrer_host, device, browser, os, country, city, event_name, utm_source, utm_medium, utm_campaign, duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        sid,
        vid,
        type,
        clip(b.path, 300),
        host,
        device,
        browser,
        os,
        country,
        city,
        clip(b.event_name, 80),
        clip(b.utm_source, 80),
        clip(b.utm_medium, 80),
        clip(b.utm_campaign, 80),
        typeof b.duration === "number" ? Math.min(b.duration, 86400) : null,
      ]
    );
  } catch {
    /* never break the visitor's page over analytics */
  }
  return new NextResponse(null, { status: 204, headers });
}
