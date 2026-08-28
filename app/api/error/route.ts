import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { recordError } from "@/lib/errorLog";
import { clientIp, corsHeaders } from "@/lib/net";
import { rateLimit } from "@/lib/rateLimit";

/* Runtime errors reported by the published site.

   Writable by anyone, so: a hard cap on every field, a rate limit keyed on the
   caller's address as our own edge reported it, and a 204 whatever happens —
   an error reporter that can itself return an error is a loop. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req.headers.get("origin"));
  if (!hasDb()) return new NextResponse(null, { status: 204, headers });

  const ip = clientIp(req);
  if (!rateLimit(`err:${ip}`, 20, 10 * 60 * 1000).ok) {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";
    if (!message) return new NextResponse(null, { status: 204, headers });
    await recordError(
      message,
      typeof body.stack === "string" ? body.stack.slice(0, 4000) : undefined,
      typeof body.path === "string" ? body.path.slice(0, 500) : undefined,
      req.headers.get("user-agent") || undefined
    );
  } catch {
    /* a malformed report is not worth a response body */
  }
  return new NextResponse(null, { status: 204, headers });
}
