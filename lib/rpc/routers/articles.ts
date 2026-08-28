import { z } from "zod";
import { adminProcedure, errors, pageSlice, type Router } from "../core";
import { dbq, one } from "@/lib/db";

/* The blog.

   Two rules the public side depends on and this router has to keep true:
   - A published article is `status = 'published' AND publishedAt <= now()`.
     Status alone is not enough once scheduling exists.
   - A draft is invisible without an admin session. Guessing a slug must not
     be enough to read unpublished writing. */

const slugRx = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const articleInput = {
  slug: z.string().trim().min(1).max(255).regex(slugRx, "الرابط يقبل حروفًا لاتينية صغيرة وأرقامًا وشرطات فقط."),
  titleAr: z.string().trim().min(1).max(500),
  titleEn: z.string().trim().max(500).nullable().optional(),
  excerptAr: z.string().max(2000).nullable().optional(),
  excerptEn: z.string().max(2000).nullable().optional(),
  bodyAr: z.string().max(200000),
  bodyEn: z.string().max(200000).nullable().optional(),
  coverImage: z.string().max(500).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  status: z.enum(["draft", "published"]).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
};

const COLS = `id, slug, "titleAr", "titleEn", "excerptAr", "excerptEn", "bodyAr", "bodyEn",
  "coverImage", category, tags, "readingMinutes", status, "publishedAt", "scheduledAt",
  "authorId", "createdAt", "updatedAt"`;

const LIST_COLS = `id, slug, "titleAr", "titleEn", "excerptAr", "coverImage", category, tags,
  "readingMinutes", status, "publishedAt", "scheduledAt", "createdAt", "updatedAt"`;

export function readingMinutes(text: string): number {
  const words = (text || "").trim().match(/[\p{L}\p{N}]+/gu)?.length || 0;
  return Math.max(1, Math.round(words / 180));
}

/** Promotes anything whose scheduled time has arrived. Called before every
 *  read so a scheduled post goes live without a cron running. */
export async function promoteScheduled(): Promise<number> {
  const rows = await dbq<{ id: number }>(
    `UPDATE articles
        SET status = 'published',
            "publishedAt" = COALESCE("publishedAt", "scheduledAt"),
            "scheduledAt" = NULL
      WHERE "scheduledAt" IS NOT NULL
        AND "scheduledAt" <= now()
        AND status <> 'published'
      RETURNING id`
  );
  return rows.length;
}

export const articlesRouter: Router = {
  list: adminProcedure({
    input: z.object({
      status: z.enum(["draft", "published", "scheduled", "all"]).optional().default("all"),
      search: z.string().max(200).optional(),
      page: z.number().int().min(1).optional().default(1),
      perPage: z.number().int().min(1).max(100).optional().default(20),
    }),
    handler: async (input) => {
      await promoteScheduled();
      const { limit, offset, page, perPage } = pageSlice(input);
      const where: string[] = [];
      const params: unknown[] = [];
      if (input.status === "draft") where.push(`status = 'draft' AND "scheduledAt" IS NULL`);
      else if (input.status === "published") where.push(`status = 'published'`);
      else if (input.status === "scheduled") where.push(`"scheduledAt" IS NOT NULL`);
      if (input.search) {
        params.push(`%${input.search}%`);
        where.push(`("titleAr" ILIKE $${params.length} OR "titleEn" ILIKE $${params.length}
                     OR slug ILIKE $${params.length})`);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const items = await dbq(
        `SELECT ${LIST_COLS} FROM articles ${clause}
          ORDER BY COALESCE("publishedAt", "scheduledAt", "createdAt") DESC, id DESC
          LIMIT ${limit} OFFSET ${offset}`,
        params
      );
      const total = await one<{ n: string }>(
        `SELECT count(*)::text AS n FROM articles ${clause}`,
        params
      );
      return { items, total: Number(total?.n || 0), page, perPage };
    },
  }),

  get: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const row = await one(`SELECT ${COLS} FROM articles WHERE id = $1`, [id]);
      if (!row) throw errors.notFound("المقال غير موجود.");
      return row;
    },
  }),

  create: adminProcedure({
    input: z.object(articleInput),
    handler: async (input, ctx) => {
      const clash = await one(`SELECT id FROM articles WHERE slug = $1`, [input.slug]);
      if (clash) throw errors.conflict("هذا الرابط مستخدم في مقال آخر.");
      const publishedAt =
        input.status === "published" ? input.publishedAt || new Date().toISOString() : input.publishedAt ?? null;
      const row = await one(
        `INSERT INTO articles
           (slug, "titleAr", "titleEn", "excerptAr", "excerptEn", "bodyAr", "bodyEn",
            "coverImage", category, tags, "readingMinutes", status, "publishedAt",
            "scheduledAt", "authorId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING ${COLS}`,
        [
          input.slug,
          input.titleAr,
          input.titleEn ?? null,
          input.excerptAr ?? null,
          input.excerptEn ?? null,
          input.bodyAr,
          input.bodyEn ?? null,
          input.coverImage ?? null,
          input.category ?? null,
          JSON.stringify(input.tags ?? []),
          readingMinutes(input.bodyAr),
          input.status ?? "draft",
          publishedAt,
          input.scheduledAt ?? null,
          ctx.admin.id,
        ]
      );
      return row;
    },
  }),

  update: adminProcedure({
    input: z.object({
      id: z.number().int().positive(),
      ...Object.fromEntries(
        Object.entries(articleInput).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])
      ),
    }),
    handler: async (input) => {
      const data = input as Record<string, unknown> & { id: number };
      const current = await one<{ slug: string; status: string; publishedAt: string | null }>(
        `SELECT slug, status, "publishedAt" FROM articles WHERE id = $1`,
        [data.id]
      );
      if (!current) throw errors.notFound("المقال غير موجود.");

      if (typeof data.slug === "string" && data.slug !== current.slug) {
        const clash = await one(`SELECT id FROM articles WHERE slug = $1 AND id <> $2`, [
          data.slug,
          data.id,
        ]);
        if (clash) throw errors.conflict("هذا الرابط مستخدم في مقال آخر.");
      }

      const sets: string[] = [];
      const params: unknown[] = [data.id];
      const push = (col: string, value: unknown) => {
        params.push(value);
        sets.push(`"${col}" = $${params.length}`);
      };

      for (const key of Object.keys(articleInput)) {
        if (data[key] === undefined) continue;
        if (key === "tags") push("tags", JSON.stringify(data.tags ?? []));
        else push(key, data[key] ?? null);
      }
      if (typeof data.bodyAr === "string") push("readingMinutes", readingMinutes(data.bodyAr));

      // Publishing for the first time stamps the date; unpublishing keeps it,
      // so re-publishing does not silently move the article to the top.
      if (data.status === "published" && !current.publishedAt && data.publishedAt === undefined) {
        push("publishedAt", new Date().toISOString());
      }
      if (data.status === "published" && data.scheduledAt === undefined) {
        push("scheduledAt", null);
      }
      if (!sets.length) throw errors.badRequest("لا يوجد ما يُحفَظ.");

      const row = await one(
        `UPDATE articles SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLS}`,
        params
      );
      return row;
    },
  }),

  delete: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const rows = await dbq(`DELETE FROM articles WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw errors.notFound("المقال غير موجود.");
      return { ok: true };
    },
  }),

  bulkStatus: adminProcedure({
    input: z.object({
      ids: z.array(z.number().int().positive()).min(1).max(200),
      status: z.enum(["draft", "published"]),
    }),
    handler: async ({ ids, status }) => {
      const rows = await dbq<{ id: number }>(
        `UPDATE articles
            SET status = $2,
                "publishedAt" = CASE
                  WHEN $2 = 'published' AND "publishedAt" IS NULL THEN now()
                  ELSE "publishedAt" END,
                "scheduledAt" = CASE WHEN $2 = 'published' THEN NULL ELSE "scheduledAt" END
          WHERE id = ANY($1::int[])
          RETURNING id`,
        [ids, status]
      );
      return { updated: rows.length };
    },
  }),

  bulkDelete: adminProcedure({
    input: z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) }),
    handler: async ({ ids }) => {
      const rows = await dbq<{ id: number }>(
        `DELETE FROM articles WHERE id = ANY($1::int[]) RETURNING id`,
        [ids]
      );
      return { deleted: rows.length };
    },
  }),

  duplicate: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }, ctx) => {
      const src = await one<Record<string, unknown>>(
        `SELECT ${COLS} FROM articles WHERE id = $1`,
        [id]
      );
      if (!src) throw errors.notFound("المقال غير موجود.");
      let slug = `${src.slug}-copy`;
      for (let i = 2; await one(`SELECT id FROM articles WHERE slug = $1`, [slug]); i++) {
        slug = `${src.slug}-copy-${i}`;
      }
      const row = await one(
        `INSERT INTO articles
           (slug, "titleAr", "titleEn", "excerptAr", "excerptEn", "bodyAr", "bodyEn",
            "coverImage", category, tags, "readingMinutes", status, "authorId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12)
         RETURNING ${COLS}`,
        [
          slug,
          `${src.titleAr} (نسخة)`,
          src.titleEn ?? null,
          src.excerptAr ?? null,
          src.excerptEn ?? null,
          src.bodyAr ?? "",
          src.bodyEn ?? null,
          src.coverImage ?? null,
          src.category ?? null,
          JSON.stringify(src.tags ?? []),
          src.readingMinutes ?? null,
          ctx.admin.id,
        ]
      );
      return row;
    },
  }),

  slugAvailable: adminProcedure({
    input: z.object({ slug: z.string().max(255), exceptId: z.number().int().optional() }),
    handler: async ({ slug, exceptId }) => {
      if (!slugRx.test(slug)) return { available: false, reason: "format" as const };
      const row = await one(
        `SELECT id FROM articles WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)`,
        [slug, exceptId ?? null]
      );
      return { available: !row, reason: row ? ("taken" as const) : null };
    },
  }),
};
