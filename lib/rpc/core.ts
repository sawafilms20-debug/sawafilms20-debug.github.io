import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import type { AdminUser } from "@/lib/auth";

/* A very small RPC layer: one POST endpoint, one router per domain, one
   procedure per operation. It exists so that authentication, the CSRF origin
   check, rate limiting, input validation and the error envelope are decided in
   exactly one place instead of being re-derived in forty route files — which is
   how three of them end up missing the auth check. */

export type CookieSpec = {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax" | "strict";
  secure: boolean;
  path: string;
  maxAge: number;
};

export type Ctx = {
  req: NextRequest;
  ip: string;
  /** Null for public procedures; guaranteed live and enabled otherwise. */
  admin: AdminUser | null;
  cookies: CookieSpec[];
};

export type AdminCtx = Ctx & { admin: AdminUser };

export type AuthLevel = "public" | "admin" | "owner";

export type RateLimitSpec = {
  max: number;
  windowMs: number;
  /** Extra key material. Never derive this from request BODY fields — the
   *  caller chooses those, so a limiter keyed on them limits nothing. */
  scope?: string;
};

export type Procedure<I = unknown, O = unknown> = {
  auth: AuthLevel;
  input?: ZodType<I>;
  rateLimit?: RateLimitSpec;
  /** Set on procedures whose result may be returned to an anonymous caller. */
  handler: (input: I, ctx: Ctx) => Promise<O>;
};

export type Router = Record<string, Procedure<never, unknown>>;

export function publicProcedure<I, O>(
  p: Omit<Procedure<I, O>, "auth">
): Procedure<I, O> {
  return { ...p, auth: "public" };
}

export function adminProcedure<I, O>(
  p: Omit<Procedure<I, O>, "auth" | "handler"> & {
    handler: (input: I, ctx: AdminCtx) => Promise<O>;
  }
): Procedure<I, O> {
  return { ...p, auth: "admin", handler: p.handler as Procedure<I, O>["handler"] };
}

export function ownerProcedure<I, O>(
  p: Omit<Procedure<I, O>, "auth" | "handler"> & {
    handler: (input: I, ctx: AdminCtx) => Promise<O>;
  }
): Procedure<I, O> {
  return { ...p, auth: "owner", handler: p.handler as Procedure<I, O>["handler"] };
}

/* --------------------------------------------------------------------errors */

export class RpcError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errors = {
  unauthorized: (m = "انتهت الجلسة. سجّلي الدخول من جديد.") =>
    new RpcError(401, "UNAUTHORIZED", m),
  forbidden: (m = "ليست لديك صلاحية لهذا الإجراء.") => new RpcError(403, "FORBIDDEN", m),
  notFound: (m = "العنصر غير موجود.") => new RpcError(404, "NOT_FOUND", m),
  badRequest: (m = "بيانات غير صالحة.") => new RpcError(400, "BAD_REQUEST", m),
  conflict: (m = "هناك عنصر بالاسم نفسه.") => new RpcError(409, "CONFLICT", m),
  tooMany: (m = "محاولات كثيرة. حاولي بعد قليل.") => new RpcError(429, "TOO_MANY", m),
  noDb: () =>
    new RpcError(
      503,
      "NO_DATABASE",
      "قاعدة البيانات غير متصلة بعد. أضيفي Postgres إلى مشروع Railway."
    ),
  server: (m = "حدث خطأ غير متوقع.") => new RpcError(500, "SERVER_ERROR", m),
};

/* ------------------------------------------------------------ shared inputs */

export type Paged = { page: number; perPage: number };

export function pageSlice(p: Paged) {
  const page = Math.max(1, Math.floor(p.page || 1));
  const perPage = Math.min(100, Math.max(1, Math.floor(p.perPage || 20)));
  return { limit: perPage, offset: (page - 1) * perPage, page, perPage };
}
