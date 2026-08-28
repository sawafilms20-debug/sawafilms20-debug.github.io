import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ROUTERS } from "@/lib/rpc";
import { RpcError, errors, type Ctx } from "@/lib/rpc/core";
import { COOKIE_NAME, adminFromToken } from "@/lib/auth";
import { hasDb, migrate } from "@/lib/db";
import { clientIp, corsHeaders, originOk } from "@/lib/net";
import { rateLimit, rateLimitReset } from "@/lib/rateLimit";
import { recordError } from "@/lib/errorLog";

/* The single entry point for the dashboard.
   POST /api/rk/<router>/<procedure> with a JSON body.

   Auth, the CSRF origin check, rate limiting, validation and the error shape
   are all decided here, once — so no individual procedure can forget one. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous for JSON — an article body is the largest thing sent here. */
const MAX_BODY_BYTES = 2_000_000;

/** A ceiling for anyone who has not signed in, so the public procedures cannot
 *  be used as a free amplifier. Signed-in work is limited per procedure. */
const ANON_CALLS_PER_10_MIN = 60;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  // A third-party page must not be able to drive a mutation with the
  // operator's cookie riding along.
  if (!originOk(req)) {
    return NextResponse.json(
      { error: { code: "BAD_ORIGIN", message: "طلب من مصدر غير مسموح." } },
      { status: 403, headers: cors }
    );
  }

  const { path } = await params;
  const [routerName, procedureName, ...rest] = path || [];
  if (!routerName || !procedureName || rest.length) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "إجراء غير معروف." } },
      { status: 404, headers: cors }
    );
  }

  const router = ROUTERS[routerName];
  const procedure = router?.[procedureName];
  if (!procedure) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "إجراء غير معروف." } },
      { status: 404, headers: cors }
    );
  }

  const ip = clientIp(req);

  try {
    if (hasDb()) await migrate();

    // The admin row is re-read here on EVERY call, so a disabled or deleted
    // account loses access immediately rather than when its token expires.
    const admin = hasDb() ? await adminFromToken(req.cookies.get(COOKIE_NAME)?.value) : null;

    if (procedure.auth !== "public" && !admin) throw errors.unauthorized();
    if (procedure.auth === "owner" && admin?.role !== "owner") throw errors.forbidden();
    if (procedure.auth !== "public" && !hasDb()) throw errors.noDb();

    if (!admin) {
      const anon = rateLimit(`anon:${ip}`, ANON_CALLS_PER_10_MIN, 10 * 60 * 1000);
      if (!anon.ok) {
        return NextResponse.json(
          { error: { code: "TOO_MANY", message: "محاولات كثيرة. حاولي بعد قليل." } },
          { status: 429, headers: { ...cors, "Retry-After": String(anon.retryAfterSec) } }
        );
      }
    }

    if (procedure.rateLimit) {
      const scope = procedure.rateLimit.scope || `${routerName}.${procedureName}`;
      // Signed-in callers are limited per account, anonymous ones per address.
      const key = admin ? `${scope}:u${admin.id}` : `${scope}:ip:${ip}`;
      const verdict = rateLimit(key, procedure.rateLimit.max, procedure.rateLimit.windowMs);
      if (!verdict.ok) {
        return NextResponse.json(
          { error: { code: "TOO_MANY", message: "محاولات كثيرة. حاولي بعد قليل." } },
          {
            status: 429,
            headers: { ...cors, "Retry-After": String(verdict.retryAfterSec) },
          }
        );
      }
    }

    // Check the declared length BEFORE reading. Reading first and measuring
    // afterwards means the process has already buffered whatever was sent.
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) throw errors.badRequest("الطلب كبير جدًا.");

    let body: unknown = undefined;
    const text = await req.text();
    if (text) {
      // A chunked request has no content-length, so measure again.
      if (text.length > MAX_BODY_BYTES) throw errors.badRequest("الطلب كبير جدًا.");
      try {
        body = JSON.parse(text);
      } catch {
        throw errors.badRequest("صيغة الطلب غير صحيحة.");
      }
    }

    const input = procedure.input ? procedure.input.parse(body ?? {}) : body;

    const ctx: Ctx = { req, ip, admin, cookies: [] };
    const data = await procedure.handler(input as never, ctx);

    // A successful sign-in should not leave the operator's own typo counting
    // against her for the rest of the window.
    if (routerName === "auth" && procedureName === "login") {
      const ok = (data as { ok?: boolean } | null)?.ok;
      if (ok) rateLimitReset(`login:ip:${ip}`);
    }

    const res = NextResponse.json({ data }, { headers: cors });
    for (const c of ctx.cookies) res.cookies.set(c);
    return res;
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      const message = first?.message && !/^Invalid|Required/.test(first.message)
        ? first.message
        : `تحققي من الحقل: ${first?.path?.join(".") || "?"}`;
      return NextResponse.json(
        { error: { code: "VALIDATION", message, issues: e.issues } },
        { status: 400, headers: cors }
      );
    }
    if (e instanceof RpcError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status, headers: cors }
      );
    }
    const message = e instanceof Error ? e.message : "خطأ غير متوقع";
    await recordError(message, e instanceof Error ? e.stack : undefined, `${routerName}.${procedureName}`);

    // A signed-in operator gets the real message — she is the one who has to
    // act on it. Anyone else gets nothing: driver and API errors name hosts,
    // schemas and tokens. The detail is in the error log either way.
    const signedIn = hasDb() && !!(await adminFromToken(req.cookies.get(COOKIE_NAME)?.value).catch(() => null));
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: signedIn ? message : "حدث خطأ غير متوقع.",
        },
      },
      { status: 500, headers: cors }
    );
  }
}
