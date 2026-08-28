import { z } from "zod";
import {
  adminProcedure,
  errors,
  publicProcedure,
  type Router,
} from "../core";
import {
  SESSION_DAYS,
  bootstrapOwner,
  createSession,
  destroyAllSessions,
  destroySession,
  findByEmail,
  hashPassword,
  sessionCookie,
  touchLogin,
  verifyPassword,
} from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/auth";
import { dbq, hasDb } from "@/lib/db";
import { otpauthUrl, randomBase32, totpVerify } from "@/lib/totp";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(1).max(200);

/* A valid cost-12 bcrypt digest of a value nobody can supply, used only to give
   the "no such account" path the same work as a real one. Exactly 60 chars. */
const DUMMY_HASH = "$2a$12$" + "0".repeat(53);

export const authRouter: Router = {
  login: publicProcedure({
    // Keyed on IP inside the dispatcher — never on the submitted email, which
    // the caller picks and can rotate freely.
    rateLimit: { max: 10, windowMs: 10 * 60 * 1000, scope: "login" },
    input: z.object({
      email: email.optional(),
      password,
      totpCode: z.string().max(10).optional(),
    }),
    handler: async (input, ctx) => {
      if (!hasDb()) throw errors.noDb();
      await bootstrapOwner();

      const addr =
        input.email || (process.env.ADMIN_EMAIL || "raheeqkanjo@gmail.com").toLowerCase();
      const user = await findByEmail(addr);

      // Always run a real comparison, so a missing account and a wrong password
      // take the same time and the endpoint is not an account oracle. The
      // placeholder has to be a WELL-FORMED 60-character bcrypt hash: bcryptjs
      // returns false immediately for anything shorter, which turns the
      // no-account path into a sub-millisecond answer next to a 250ms one.
      const passwordOk = await verifyPassword(input.password, user?.passwordHash || DUMMY_HASH);

      if (!user || !passwordOk || !user.isActive) {
        throw errors.unauthorized("البريد أو كلمة المرور غير صحيحة.");
      }

      // Two-factor is asked for only AFTER the password verifies. Prompting
      // first would tell an attacker which addresses have accounts.
      if (user.totpSecret) {
        if (!input.totpCode) {
          return { ok: false as const, needsTotp: true as const };
        }
        if (!totpVerify(user.totpSecret, input.totpCode)) {
          throw errors.unauthorized("رمز التحقق غير صحيح.");
        }
      }

      const { token } = await createSession(user.id);
      await touchLogin(user.id);
      ctx.cookies.push(sessionCookie(token, SESSION_DAYS * 24 * 3600));
      return {
        ok: true as const,
        needsTotp: false as const,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    },
  }),

  logout: publicProcedure({
    input: z.object({}).optional(),
    handler: async (_input, ctx) => {
      await destroySession(ctx.req.cookies.get(COOKIE_NAME)?.value);
      ctx.cookies.push(sessionCookie("", 0));
      return { ok: true };
    },
  }),

  me: publicProcedure({
    input: z.object({}).optional(),
    handler: async (_input, ctx) => {
      if (!ctx.admin) return { user: null, dbConnected: hasDb() };
      return {
        user: {
          id: ctx.admin.id,
          email: ctx.admin.email,
          name: ctx.admin.name,
          role: ctx.admin.role,
          twoFactor: ctx.admin.twoFactor,
        },
        dbConnected: hasDb(),
      };
    },
  }),

  changePassword: adminProcedure({
    input: z.object({ current: password, next: z.string().min(8).max(200) }),
    handler: async (input, ctx) => {
      const row = await findByEmail(ctx.admin.email);
      if (!row || !(await verifyPassword(input.current, row.passwordHash))) {
        throw errors.unauthorized("كلمة المرور الحالية غير صحيحة.");
      }
      await dbq(`UPDATE admin_users SET "passwordHash" = $2 WHERE id = $1`, [
        ctx.admin.id,
        await hashPassword(input.next),
      ]);
      // every other device is signed out; the current one gets a fresh session
      await destroyAllSessions(ctx.admin.id);
      const { token } = await createSession(ctx.admin.id);
      ctx.cookies.push(sessionCookie(token, SESSION_DAYS * 24 * 3600));
      return { ok: true };
    },
  }),

  twoFactorStatus: adminProcedure({
    input: z.object({}).optional(),
    handler: async (_input, ctx) => ({ enabled: ctx.admin.twoFactor }),
  }),

  twoFactorSetup: adminProcedure({
    input: z.object({}).optional(),
    handler: async (_input, ctx) => {
      // The secret is returned but NOT stored until a valid code proves the
      // operator's authenticator actually holds it.
      const secret = randomBase32();
      return { secret, otpauth: otpauthUrl(secret, ctx.admin.email) };
    },
  }),

  twoFactorEnable: adminProcedure({
    input: z.object({ secret: z.string().min(16).max(64), code: z.string().max(10) }),
    handler: async (input, ctx) => {
      if (!totpVerify(input.secret, input.code)) {
        throw errors.badRequest("الرمز غير صحيح. جرّبي مرة أخرى.");
      }
      await dbq(`UPDATE admin_users SET "totpSecret" = $2 WHERE id = $1`, [
        ctx.admin.id,
        input.secret,
      ]);
      return { ok: true };
    },
  }),

  twoFactorDisable: adminProcedure({
    input: z.object({ password }),
    handler: async (input, ctx) => {
      const row = await findByEmail(ctx.admin.email);
      if (!row || !(await verifyPassword(input.password, row.passwordHash))) {
        throw errors.unauthorized("كلمة المرور غير صحيحة.");
      }
      await dbq(`UPDATE admin_users SET "totpSecret" = NULL WHERE id = $1`, [ctx.admin.id]);
      return { ok: true };
    },
  }),
};
