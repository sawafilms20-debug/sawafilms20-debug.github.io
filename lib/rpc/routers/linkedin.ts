import { z } from "zod";
import crypto from "crypto";
import { adminProcedure, errors, type Router } from "../core";
import { dbq, one, tx } from "@/lib/db";
import { linkedInToArticle, parseSharesCsv } from "@/lib/linkedin";
import { nextFreeSlug, slugify } from "@/lib/slug";

/* The LinkedIn inbox.
 *
 * There is no procedure here that reads LinkedIn, and there cannot be one.
 * Retrieving a member's own posts needs the r_member_social scope, which
 * LinkedIn grants to approved partners only, and an unauthenticated fetch of a
 * profile's activity page answers HTTP 999 behind an auth wall. So the posts
 * arrive the two ways a person can actually get her own writing out of
 * LinkedIn: pasted one at a time, or read from the Shares.csv in the data
 * archive LinkedIn will export on request.
 *
 * Both land in the same queue, and the queue is what the dashboard shows. */

const COLS = `id, "externalId", "postUrl", "postedAt", text, "sharedUrl",
              "mediaUrl", visibility, source, status, "articleId",
              "createdAt", "updatedAt"`;

/** Identity for a post, so the same one never arrives twice.
 *
 *  The permalink when LinkedIn gave us one — it is stable and unique. Pasted
 *  text has no permalink, so the text itself is the identity: pasting the same
 *  post again updates nothing rather than filling the queue with copies. */
function externalIdFor(text: string, url: string | null): string {
  if (url) return `url:${url.slice(0, 240)}`;
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return `sha:${crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 40)}`;
}

/** LinkedIn writes ISO in newer exports and "YYYY-MM-DD HH:MM" in older ones. */
function parseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = String(value).trim().replace(" ", "T");
  const d = new Date(cleaned.length <= 10 ? `${cleaned}T00:00:00Z` : cleaned);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https?:\/\//i.test(v), "الرابط يجب أن يبدأ بـ http")
  .transform((v) => v || null)
  .nullable()
  .optional();

/** Inserts one post, or does nothing if it is already in the queue. */
async function insertPost(row: {
  text: string;
  url: string | null;
  postedAt: string | null;
  sharedUrl: string | null;
  mediaUrl: string | null;
  visibility: string | null;
  source: "paste" | "archive";
}): Promise<boolean> {
  const inserted = await one<{ id: number }>(
    `INSERT INTO linkedin_posts
       ("externalId","postUrl","postedAt",text,"sharedUrl","mediaUrl",visibility,source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT ("externalId") DO NOTHING
     RETURNING id`,
    [
      externalIdFor(row.text, row.url),
      row.url,
      row.postedAt,
      row.text,
      row.sharedUrl,
      row.mediaUrl,
      row.visibility,
      row.source,
    ]
  );
  return !!inserted;
}

export const linkedinRouter: Router = {
  /** The queue, newest post first. */
  list: adminProcedure({
    input: z
      .object({
        status: z.enum(["new", "converted", "dismissed", "all"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .optional(),
    handler: async (input) => {
      const status = input?.status ?? "new";
      const limit = input?.limit ?? 50;
      const where = status === "all" ? "TRUE" : `status = $1::text`;
      const params: unknown[] = status === "all" ? [] : [status];
      params.push(limit);

      const items = await dbq(
        `SELECT ${COLS}
           FROM linkedin_posts
          WHERE ${where}
          ORDER BY "postedAt" DESC NULLS LAST, id DESC
          LIMIT $${params.length}`,
        params
      );

      // Rendered as a badge on the tab, so it has to count the whole queue and
      // not just the page that was returned.
      const counts = await one<{ neu: string; converted: string; dismissed: string }>(
        `SELECT count(*) FILTER (WHERE status='new')::text       AS neu,
                count(*) FILTER (WHERE status='converted')::text AS converted,
                count(*) FILTER (WHERE status='dismissed')::text AS dismissed
           FROM linkedin_posts`
      );

      return {
        items,
        counts: {
          new: Number(counts?.neu || 0),
          converted: Number(counts?.converted || 0),
          dismissed: Number(counts?.dismissed || 0),
        },
      };
    },
  }),

  /** One post, pasted. The fast path, and the only one that works minutes
   *  after publishing on LinkedIn. */
  addPaste: adminProcedure({
    rateLimit: { max: 60, windowMs: 10 * 60 * 1000 },
    input: z.object({
      text: z.string().trim().min(1, "الصقي نص المنشور.").max(30000),
      postUrl: httpUrl,
      postedAt: z.string().trim().max(40).optional().nullable(),
    }),
    handler: async (input) => {
      const url = input.postUrl ?? null;
      const added = await insertPost({
        text: input.text,
        url,
        postedAt: parseDate(input.postedAt) ?? new Date().toISOString(),
        sharedUrl: null,
        mediaUrl: null,
        visibility: null,
        source: "paste",
      });

      if (!added) {
        // Not an error: she pasted something already in the queue. Say which,
        // so she can go and find it rather than pasting again.
        const existing = await one(
          `SELECT ${COLS} FROM linkedin_posts WHERE "externalId" = $1`,
          [externalIdFor(input.text, url)]
        );
        return { added: false, item: existing };
      }

      const item = await one(
        `SELECT ${COLS} FROM linkedin_posts WHERE "externalId" = $1`,
        [externalIdFor(input.text, url)]
      );
      return { added: true, item };
    },
  }),

  /** Paste, and it is a draft article — no queue, no second step.
   *
   *  This is the whole ask: copy the post, and find it in the blog as a draft
   *  to edit and publish. The queue still exists, but for the archive import,
   *  where turning two hundred LinkedIn posts into two hundred drafts would
   *  bury the blog rather than fill it. */
  pasteAsDraft: adminProcedure({
    rateLimit: { max: 60, windowMs: 10 * 60 * 1000 },
    input: z.object({
      text: z.string().trim().min(1, "الصقي نص المنشور.").max(30000),
      postUrl: httpUrl,
    }),
    handler: async (input, ctx) => {
      const url = input.postUrl ?? null;
      const externalId = externalIdFor(input.text, url);

      /* Pasting the same post twice must not make a second draft — it should
         hand back the one already made, so the second paste is a way of
         finding it rather than of duplicating it. */
      const seen = await one<{ articleId: number | null }>(
        `SELECT "articleId" FROM linkedin_posts WHERE "externalId" = $1`,
        [externalId]
      );
      if (seen?.articleId) {
        const existing = await one<{ id: number; slug: string; titleAr: string }>(
          `SELECT id, slug, "titleAr" FROM articles WHERE id = $1`,
          [seen.articleId]
        );
        if (existing) return { article: existing, created: false };
      }

      const draft = linkedInToArticle(input.text);
      const titleAr = draft.titleAr || "مسودة من LinkedIn";
      const base = slugify(titleAr);
      // Every slug that could collide, in one query rather than a retry loop.
      const taken = new Set(
        (
          await dbq<{ slug: string }>(
            `SELECT slug FROM articles WHERE slug = $1::text OR slug LIKE $1::text || '-%'`,
            [base]
          )
        ).map((r) => r.slug)
      );
      const slug = nextFreeSlug(base, taken);
      const words = draft.bodyAr.trim().match(/[\p{L}\p{N}]+/gu)?.length ?? 0;

      return tx(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO articles
             (slug,"titleAr","excerptAr","bodyAr",tags,"readingMinutes",status,"authorId")
           VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)
           RETURNING id, slug, "titleAr"`,
          [
            slug,
            titleAr,
            draft.excerptAr || null,
            draft.bodyAr,
            JSON.stringify(draft.tags),
            Math.max(1, Math.round(words / 180)),
            ctx.admin.id,
          ]
        );
        const article = rows[0] as { id: number; slug: string; titleAr: string };

        /* The LinkedIn row is kept even though it is converted on arrival: it
           is what makes the same post pasted again find this draft instead of
           making another, and it records where the words came from. */
        await client.query(
          `INSERT INTO linkedin_posts
             ("externalId","postUrl","postedAt",text,source,status,"articleId")
           VALUES ($1,$2,now(),$3,'paste','converted',$4)
           ON CONFLICT ("externalId")
           DO UPDATE SET status = 'converted', "articleId" = EXCLUDED."articleId"`,
          [externalId, url, input.text, article.id]
        );
        return { article, created: true };
      });
    },
  }),

  /** Shares.csv out of the LinkedIn data archive: the whole posting history,
   *  in one upload, by the only route LinkedIn sanctions. */
  importArchive: adminProcedure({
    rateLimit: { max: 10, windowMs: 10 * 60 * 1000 },
    input: z.object({
      csv: z.string().min(1).max(1_500_000, "الملف كبير جدًا — أرسليه على دفعات."),
    }),
    handler: async (input) => {
      const rows = parseSharesCsv(input.csv);
      if (!rows.length) {
        throw errors.badRequest(
          "لم أجد منشورات في هذا الملف. تأكدي أنه Shares.csv من أرشيف LinkedIn."
        );
      }

      let added = 0;
      for (const r of rows) {
        const ok = await insertPost({
          text: r.text,
          url: r.url,
          postedAt: parseDate(r.date),
          sharedUrl: r.sharedUrl,
          mediaUrl: r.mediaUrl,
          visibility: r.visibility,
          source: "archive",
        });
        if (ok) added++;
      }
      // `found` and `added` differ by exactly the posts already in the queue,
      // which is the number worth showing when she re-uploads a newer archive.
      return { found: rows.length, added, skipped: rows.length - added };
    },
  }),

  /** What this post would look like as an article, without writing anything. */
  preview: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const row = await one<{ text: string }>(
        `SELECT text FROM linkedin_posts WHERE id = $1`,
        [id]
      );
      if (!row) throw errors.notFound();
      return linkedInToArticle(row.text);
    },
  }),

  /** Creates the draft article and marks the post converted — one transaction,
   *  so a failure part-way cannot leave a post marked converted with no
   *  article to show for it. */
  convert: adminProcedure({
    input: z.object({
      id: z.number().int().positive(),
      slug: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الرابط يقبل حروفًا لاتينية صغيرة وأرقامًا وشرطات فقط."),
      titleAr: z.string().trim().min(1).max(500),
      excerptAr: z.string().trim().max(2000).optional().nullable(),
      bodyAr: z.string().max(200000),
      tags: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
    }),
    handler: async (input, ctx) => {
      const post = await one<{ id: number; status: string; postedAt: string | null }>(
        `SELECT id, status, "postedAt" FROM linkedin_posts WHERE id = $1`,
        [input.id]
      );
      if (!post) throw errors.notFound();
      if (post.status === "converted") {
        throw errors.conflict("هذا المنشور تحوّل إلى مقال بالفعل.");
      }
      if (await one(`SELECT id FROM articles WHERE slug = $1`, [input.slug])) {
        throw errors.conflict("هذا الرابط مستخدم في مقال آخر.");
      }

      const words = input.bodyAr.trim().match(/[\p{L}\p{N}]+/gu)?.length ?? 0;

      return tx(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO articles
             (slug,"titleAr","excerptAr","bodyAr",tags,"readingMinutes",status,"authorId")
           VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)
           RETURNING id, slug, "titleAr"`,
          [
            input.slug,
            input.titleAr,
            input.excerptAr || null,
            input.bodyAr,
            JSON.stringify(input.tags ?? []),
            Math.max(1, Math.round(words / 180)),
            ctx.admin.id,
          ]
        );
        const article = rows[0] as { id: number; slug: string; titleAr: string };
        await client.query(
          `UPDATE linkedin_posts SET status = 'converted', "articleId" = $2 WHERE id = $1`,
          [input.id, article.id]
        );
        // A draft, never published: the whole point is that she edits it first.
        return { article };
      });
    },
  }),

  /** Out of the queue, but not deleted — she can bring it back. */
  setStatus: adminProcedure({
    input: z.object({
      id: z.number().int().positive(),
      status: z.enum(["new", "dismissed"]),
    }),
    handler: async ({ id, status }) => {
      const row = await one(
        `UPDATE linkedin_posts SET status = $2::text
          WHERE id = $1 AND status <> 'converted'
          RETURNING ${COLS}`,
        [id, status]
      );
      if (row) return row;
      // The guard is in the WHERE clause, so a refusal and a missing row look
      // identical from here. Ask which it was: "not found" is the wrong thing
      // to read about a post that is sitting on the screen in front of you.
      const existing = await one<{ status: string }>(
        `SELECT status FROM linkedin_posts WHERE id = $1`,
        [id]
      );
      if (!existing) throw errors.notFound();
      throw errors.conflict(
        "هذا المنشور صار مقالًا — احذفي المقال أولًا إن أردتِ إخراجه من القائمة."
      );
    },
  }),

  remove: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const rows = await dbq(`DELETE FROM linkedin_posts WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw errors.notFound();
      return { deleted: true };
    },
  }),
};
