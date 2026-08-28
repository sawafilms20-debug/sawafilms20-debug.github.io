import { z } from "zod";
import { adminProcedure, errors, type Router } from "../core";
import { dbq, one } from "@/lib/db";
import { PAGES, findEntry, findPage, sectionLabel } from "@/lib/pageRegistry";

/* The mechanism behind "الصفحات": every string on the public site, offered for
   editing, with the site's own wording as the placeholder.

   A row is an OVERRIDE. No row means the page renders what it was built with.
   That is why nothing breaks when a row is missing, and why clearing a field
   is a real operation — it restores the original. */

const upsertInput = z.object({
  pageKey: z.string().max(100),
  sectionKey: z.string().max(100),
  contentKey: z.string().max(100),
  valueAr: z.string().max(20000).nullable(),
  valueEn: z.string().max(20000).nullable().optional(),
});

async function upsertOne(input: z.infer<typeof upsertInput>) {
  const spec = findEntry(input.pageKey, input.sectionKey, input.contentKey);
  // Only keys the site actually reads. An editor that accepts anything shows a
  // success message for edits that can never appear anywhere.
  if (!spec) throw errors.badRequest("هذا الحقل غير معروف على الموقع.");

  const ar = input.valueAr?.trim() ?? "";
  const en = input.valueEn?.trim() ?? "";

  // Emptying both fields removes the override rather than storing a blank —
  // otherwise "clear this" would publish an empty heading.
  if (!ar && !en) {
    await dbq(
      `DELETE FROM page_content
        WHERE "pageKey" = $1 AND "sectionKey" = $2 AND "contentKey" = $3`,
      [input.pageKey, input.sectionKey, input.contentKey]
    );
    return { cleared: true as const, pageKey: input.pageKey, sectionKey: input.sectionKey, contentKey: input.contentKey };
  }

  await dbq(
    `INSERT INTO page_content
       ("pageKey","sectionKey","contentKey","valueAr","valueEn","contentType")
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT ("pageKey","sectionKey","contentKey") DO UPDATE
       SET "valueAr" = EXCLUDED."valueAr",
           "valueEn" = EXCLUDED."valueEn",
           "contentType" = EXCLUDED."contentType"`,
    [
      input.pageKey,
      input.sectionKey,
      input.contentKey,
      ar || null,
      en || null,
      spec.contentType,
    ]
  );
  return { cleared: false as const, ...input };
}

export const pageContentRouter: Router = {
  /** The page list for the sidebar of the editor, with an override count each. */
  pages: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const counts = await dbq<{ pageKey: string; n: string }>(
        `SELECT "pageKey", count(*)::text AS n FROM page_content GROUP BY "pageKey"`
      );
      const byKey = new Map(counts.map((c) => [c.pageKey, Number(c.n)]));
      return {
        items: PAGES.filter((p) => p.entries.length > 0).map((p) => ({
          key: p.key,
          label: p.label,
          route: p.route,
          fields: p.entries.length,
          edited: byKey.get(p.key) || 0,
        })),
      };
    },
  }),

  listByPage: adminProcedure({
    input: z.object({ pageKey: z.string().max(100) }),
    handler: async ({ pageKey }) => {
      const page = findPage(pageKey);
      if (!page) throw errors.notFound("صفحة غير معروفة.");
      const rows = await dbq<{
        sectionKey: string;
        contentKey: string;
        valueAr: string | null;
        valueEn: string | null;
        updatedAt: string;
      }>(
        `SELECT "sectionKey","contentKey","valueAr","valueEn","updatedAt"
           FROM page_content WHERE "pageKey" = $1`,
        [pageKey]
      );
      const byKey = new Map(rows.map((r) => [`${r.sectionKey}.${r.contentKey}`, r]));

      const sections: {
        sectionKey: string;
        label: string;
        fields: Array<Record<string, unknown>>;
      }[] = [];
      for (const e of page.entries) {
        let group = sections.find((s) => s.sectionKey === e.sectionKey);
        if (!group) {
          group = { sectionKey: e.sectionKey, label: sectionLabel(e.sectionKey), fields: [] };
          sections.push(group);
        }
        const row = byKey.get(`${e.sectionKey}.${e.contentKey}`);
        group.fields.push({
          ...e,
          valueAr: row?.valueAr ?? null,
          valueEn: row?.valueEn ?? null,
          updatedAt: row?.updatedAt ?? null,
          overridden: !!row,
        });
      }
      return { page: { key: page.key, label: page.label, route: page.route }, sections };
    },
  }),

  upsert: adminProcedure({
    input: upsertInput,
    handler: async (input) => upsertOne(input),
  }),

  bulkUpsert: adminProcedure({
    input: z.object({ items: z.array(upsertInput).min(1).max(400) }),
    handler: async ({ items }) => {
      let saved = 0;
      let cleared = 0;
      for (const item of items) {
        const r = await upsertOne(item);
        if (r.cleared) cleared++;
        else saved++;
      }
      return { saved, cleared };
    },
  }),

  reset: adminProcedure({
    input: z.object({ pageKey: z.string().max(100) }),
    handler: async ({ pageKey }) => {
      if (!findPage(pageKey)) throw errors.notFound("صفحة غير معروفة.");
      const rows = await dbq(
        `DELETE FROM page_content WHERE "pageKey" = $1 RETURNING id`,
        [pageKey]
      );
      return { cleared: rows.length };
    },
  }),

  /** Everything the published overlay needs, in one object. Also used by the
   *  publish step to write docs/site-content.json. */
  snapshot: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => ({ content: await contentSnapshot() }),
  }),
};

export type ContentSnapshot = {
  generatedAt: string;
  pages: Record<
    string,
    Array<{ selector: string; type: string; value: string }>
  >;
  testimonials: unknown[];
  processSteps: unknown[];
  services: unknown[];
  faq: unknown[];
  statistics: unknown[];
};

/** Builds the JSON the public site fetches. Only overridden strings appear;
 *  everything else stays as built. */
export async function contentSnapshot(): Promise<ContentSnapshot> {
  const rows = await dbq<{
    pageKey: string;
    sectionKey: string;
    contentKey: string;
    valueAr: string | null;
  }>(`SELECT "pageKey","sectionKey","contentKey","valueAr" FROM page_content`);

  const pages: ContentSnapshot["pages"] = {};
  for (const r of rows) {
    const spec = findEntry(r.pageKey, r.sectionKey, r.contentKey);
    if (!spec || !r.valueAr) continue;
    (pages[r.pageKey] ||= []).push({
      selector: spec.selector,
      type: spec.contentType,
      value: r.valueAr,
    });
  }

  const [testimonials, processSteps, services, faq, statistics] = await Promise.all([
    dbq(`SELECT "quoteAr","authorName","authorTitleAr",company,"authorPhoto","sourceUrl"
           FROM testimonials WHERE "isVisible" ORDER BY "displayOrder", id`),
    dbq(`SELECT "stepNumber","titleAr","descriptionAr",icon
           FROM process_steps WHERE "isVisible" ORDER BY "displayOrder", id`),
    dbq(`SELECT slug,"titleAr","summaryAr",icon,"coverImage"
           FROM services WHERE "isActive" ORDER BY "displayOrder", id`),
    dbq(`SELECT "questionAr","answerAr" FROM faq_items WHERE "isVisible"
          ORDER BY "displayOrder", id`),
    dbq(`SELECT "labelAr",value,suffix,icon FROM statistics WHERE "isVisible"
          ORDER BY "displayOrder", id`),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    pages,
    testimonials,
    processSteps,
    services,
    faq,
    statistics,
  };
}

export async function pageContentCount(): Promise<number> {
  const row = await one<{ n: string }>(`SELECT count(*)::text AS n FROM page_content`);
  return Number(row?.n || 0);
}
