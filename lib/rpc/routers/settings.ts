import { z } from "zod";
import { adminProcedure, errors, ownerProcedure, type Router } from "../core";
import { dbq, one } from "@/lib/db";
import { PAGES } from "@/lib/pageRegistry";
import { hashPassword, listAdmins, destroyAllSessions } from "@/lib/auth";

/* SEO, global site settings, and the admin roster. */

const seoCols = `id, "pageKey", "metaTitleAr", "metaTitleEn", "metaDescriptionAr",
  "metaDescriptionEn", "ogImage", "noIndex", "updatedAt"`;

/** The only page keys the SEO editor offers. Every one of these is read by a
 *  real page at publish time — an editor that accepts a key nothing consumes
 *  shows a success message and changes nothing. */
export const SEO_PAGE_KEYS = PAGES.map((p) => p.key);

export const seoRouter: Router = {
  list: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const rows = await dbq<Record<string, unknown>>(
        `SELECT ${seoCols} FROM seo_settings ORDER BY "pageKey"`
      );
      const byKey = new Map(rows.map((r) => [r.pageKey as string, r]));
      return {
        items: PAGES.map((p) => ({
          pageKey: p.key,
          label: p.label,
          route: p.route,
          row: byKey.get(p.key) ?? null,
        })),
      };
    },
  }),

  get: adminProcedure({
    input: z.object({ pageKey: z.string().max(100) }),
    handler: async ({ pageKey }) => {
      if (!SEO_PAGE_KEYS.includes(pageKey)) throw errors.badRequest("صفحة غير معروفة.");
      return (
        (await one(`SELECT ${seoCols} FROM seo_settings WHERE "pageKey" = $1`, [pageKey])) ?? null
      );
    },
  }),

  upsert: adminProcedure({
    input: z.object({
      pageKey: z.string().max(100),
      metaTitleAr: z.string().max(200).nullable().optional(),
      metaTitleEn: z.string().max(200).nullable().optional(),
      metaDescriptionAr: z.string().max(2000).nullable().optional(),
      metaDescriptionEn: z.string().max(2000).nullable().optional(),
      ogImage: z.string().max(500).nullable().optional(),
      noIndex: z.boolean().optional(),
    }),
    handler: async (input) => {
      if (!SEO_PAGE_KEYS.includes(input.pageKey)) throw errors.badRequest("صفحة غير معروفة.");
      const row = await one(
        `INSERT INTO seo_settings
           ("pageKey","metaTitleAr","metaTitleEn","metaDescriptionAr","metaDescriptionEn","ogImage","noIndex")
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, FALSE))
         ON CONFLICT ("pageKey") DO UPDATE SET
           "metaTitleAr" = EXCLUDED."metaTitleAr",
           "metaTitleEn" = EXCLUDED."metaTitleEn",
           "metaDescriptionAr" = EXCLUDED."metaDescriptionAr",
           "metaDescriptionEn" = EXCLUDED."metaDescriptionEn",
           "ogImage" = EXCLUDED."ogImage",
           "noIndex" = EXCLUDED."noIndex"
         RETURNING ${seoCols}`,
        [
          input.pageKey,
          input.metaTitleAr ?? null,
          input.metaTitleEn ?? null,
          input.metaDescriptionAr ?? null,
          input.metaDescriptionEn ?? null,
          input.ogImage ?? null,
          input.noIndex ?? false,
        ]
      );
      return row;
    },
  }),
};

/* ------------------------------------------------------------ site settings */

export const SITE_SETTING_KEYS = [
  { key: "logo", label: "الشعار", type: "image" as const },
  { key: "contactEmail", label: "البريد الإلكتروني", type: "text" as const },
  { key: "linkedinUrl", label: "رابط LinkedIn", type: "url" as const },
  { key: "whatsapp", label: "رقم واتساب", type: "text" as const },
  { key: "footerTagline", label: "سطر التذييل", type: "text" as const },
  { key: "footerLine", label: "جملة التذييل الختامية", type: "text" as const },
  { key: "ogImage", label: "صورة المشاركة الافتراضية", type: "image" as const },
];

export const siteSettingsRouter: Router = {
  list: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const rows = await dbq<{ settingKey: string; settingValue: string | null; settingType: string }>(
        `SELECT "settingKey", "settingValue", "settingType" FROM site_settings`
      );
      const byKey = new Map(rows.map((r) => [r.settingKey, r]));
      return {
        items: SITE_SETTING_KEYS.map((s) => ({
          ...s,
          value: byKey.get(s.key)?.settingValue ?? null,
        })),
      };
    },
  }),

  upsert: adminProcedure({
    input: z.object({
      settingKey: z.string().max(100),
      settingValue: z.string().max(20000).nullable(),
      settingType: z.enum(["text", "image", "color", "url", "json"]).optional(),
    }),
    handler: async (input) => {
      const known = SITE_SETTING_KEYS.find((s) => s.key === input.settingKey);
      if (!known) throw errors.badRequest("إعداد غير معروف.");
      await dbq(
        `INSERT INTO site_settings ("settingKey","settingValue","settingType")
         VALUES ($1,$2,$3)
         ON CONFLICT ("settingKey") DO UPDATE
           SET "settingValue" = EXCLUDED."settingValue",
               "settingType"  = EXCLUDED."settingType"`,
        [input.settingKey, input.settingValue, input.settingType ?? known.type]
      );
      return { ok: true };
    },
  }),
};

/* ------------------------------------------------------------- admin users */

export const adminUsersRouter: Router = {
  list: ownerProcedure({
    input: z.object({}).optional(),
    handler: async () => ({ items: await listAdmins() }),
  }),

  create: ownerProcedure({
    input: z.object({
      email: z.string().trim().toLowerCase().email().max(320),
      name: z.string().trim().min(1).max(255),
      password: z.string().min(8).max(200),
      role: z.enum(["owner", "editor"]).optional().default("editor"),
    }),
    handler: async (input) => {
      const clash = await one(`SELECT id FROM admin_users WHERE email = $1`, [input.email]);
      if (clash) throw errors.conflict("هذا البريد مستخدم بالفعل.");
      const row = await one(
        `INSERT INTO admin_users (email, "passwordHash", name, role)
         VALUES ($1,$2,$3,$4)
         RETURNING id, email, name, role, "isActive", "lastLoginAt", "createdAt"`,
        [input.email, await hashPassword(input.password), input.name, input.role]
      );
      return row;
    },
  }),

  update: ownerProcedure({
    input: z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(255).optional(),
      role: z.enum(["owner", "editor"]).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).max(200).optional(),
    }),
    handler: async (input, ctx) => {
      if (input.id === ctx.admin.id && input.isActive === false) {
        throw errors.badRequest("لا يمكنك تعطيل حسابك أنت.");
      }
      if (input.id === ctx.admin.id && input.role === "editor") {
        const owners = await one<{ n: string }>(
          `SELECT count(*)::text AS n FROM admin_users WHERE role = 'owner' AND "isActive"`
        );
        if (Number(owners?.n || 0) <= 1) throw errors.badRequest("لا بد من مالك واحد على الأقل.");
      }
      const sets: string[] = [];
      const params: unknown[] = [input.id];
      const push = (col: string, v: unknown) => {
        params.push(v);
        sets.push(`"${col}" = $${params.length}`);
      };
      if (input.name !== undefined) push("name", input.name);
      if (input.role !== undefined) push("role", input.role);
      if (input.isActive !== undefined) push("isActive", input.isActive);
      if (input.password !== undefined) push("passwordHash", await hashPassword(input.password));
      if (!sets.length) throw errors.badRequest("لا يوجد ما يُحفَظ.");

      const row = await one(
        `UPDATE admin_users SET ${sets.join(", ")} WHERE id = $1
         RETURNING id, email, name, role, "isActive", "lastLoginAt", "createdAt"`,
        params
      );
      if (!row) throw errors.notFound();
      // A disabled account, or one whose password changed, loses access now —
      // not whenever its token happens to expire.
      if (input.isActive === false || input.password !== undefined) {
        await destroyAllSessions(input.id);
      }
      return row;
    },
  }),

  delete: ownerProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }, ctx) => {
      if (id === ctx.admin.id) throw errors.badRequest("لا يمكنك حذف حسابك أنت.");
      const rows = await dbq(`DELETE FROM admin_users WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw errors.notFound();
      return { ok: true };
    },
  }),
};
