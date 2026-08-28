import { z } from "zod";
import matter from "gray-matter";
import { adminProcedure, errors, type Router } from "../core";
import { dbq, one } from "@/lib/db";
import { publish } from "@/lib/publish";
import { listDir, readRepoFile } from "@/lib/github";
import { readingMinutes } from "./articles";

export const publishRouter: Router = {
  /** What a publish would write, without touching the repository. */
  preview: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => publish(true),
  }),

  run: adminProcedure({
    // Publishing is a write to a public website; a stuck button should not be
    // able to fire it thirty times.
    rateLimit: { max: 12, windowMs: 10 * 60 * 1000, scope: "publish" },
    input: z.object({}).optional(),
    handler: async () => {
      if (!process.env.GITHUB_TOKEN) {
        throw errors.badRequest("GITHUB_TOKEN غير مضبوط على الخادم، فلا يمكن النشر.");
      }
      return publish(false);
    },
  }),

  /** One-time move of the markdown blog and the JSON inbox into the database.
   *  Safe to run twice: existing slugs and messages are skipped. */
  importLegacy: adminProcedure({
    input: z.object({}).optional(),
    handler: async (_input, ctx) => {
      const token = process.env.GITHUB_TOKEN;
      let articles = 0;
      let enquiries = 0;

      if (token) {
        const files = (await listDir(token, "content/blog")).filter(
          (f) => f.name.endsWith(".md") && f.name.toLowerCase() !== "readme.md"
        );
        for (const f of files) {
          const slug = f.name.replace(/\.md$/, "");
          if (await one(`SELECT id FROM articles WHERE slug = $1`, [slug])) continue;
          const raw = await readRepoFile(f.path);
          if (!raw) continue;
          const { data, content } = matter(raw);
          const d = data as Record<string, unknown>;
          const status = String(d.status || "published") === "draft" ? "draft" : "published";
          const date = d.date ? new Date(String(d.date)).toISOString() : new Date().toISOString();
          await dbq(
            `INSERT INTO articles
               (slug,"titleAr","excerptAr","bodyAr","coverImage",tags,"readingMinutes",
                status,"publishedAt","authorId")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (slug) DO NOTHING`,
            [
              slug,
              String(d.title || slug),
              d.excerpt ? String(d.excerpt) : null,
              content.trim(),
              d.cover ? String(d.cover) : null,
              JSON.stringify(Array.isArray(d.tags) ? d.tags.map(String) : []),
              readingMinutes(content),
              status,
              status === "published" ? date : null,
              ctx.admin.id,
            ]
          );
          articles++;
        }

        const leadsRaw = await readRepoFile("content/leads.json");
        if (leadsRaw) {
          let list: Array<Record<string, unknown>> = [];
          try {
            const parsed = JSON.parse(leadsRaw);
            if (Array.isArray(parsed)) list = parsed;
          } catch {
            /* a corrupt file is not worth failing the whole import over */
          }
          for (const lead of list) {
            const createdAt = lead.date ? new Date(String(lead.date)).toISOString() : null;
            const dupe = await one(
              `SELECT id FROM enquiries WHERE email = $1 AND message = $2`,
              [String(lead.email || ""), String(lead.message || "")]
            );
            if (dupe) continue;
            await dbq(
              `INSERT INTO enquiries (name,email,message,source,status,"createdAt")
               VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, now()))`,
              [
                String(lead.name || "—").slice(0, 200),
                String(lead.email || "").slice(0, 320),
                String(lead.message || "").slice(0, 8000),
                String(lead.source || "legacy").slice(0, 100),
                lead.read ? "read" : "new",
                createdAt,
              ]
            );
            enquiries++;
          }
        }
      }

      return { articles, enquiries, hadToken: !!token };
    },
  }),
};
