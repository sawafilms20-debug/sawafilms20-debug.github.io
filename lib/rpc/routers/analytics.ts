import { z } from "zod";
import { adminProcedure, type Router } from "../core";
import { dbq, one } from "@/lib/db";

/* Traffic.

   The store is the single denormalised `events` table this site has been
   filling since launch: one row per pageview or event, with `type`
   discriminating. Splitting it into page_views/events/sessions would throw away
   the existing rows and buy nothing these queries need.

   `eventData` carries the shape of an interaction and never the person who
   performed it: tracking a contact submission with the visitor's name and email
   attached writes a second, un-retained copy of personal data. */

const rangeInput = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  days: z.number().int().min(1).max(730).optional(),
});

type Range = z.infer<typeof rangeInput>;

function windowClause(r: Range, params: unknown[]): string {
  if (r.from || r.to) {
    const parts: string[] = [];
    if (r.from) {
      params.push(r.from);
      parts.push(`ts >= $${params.length}`);
    }
    if (r.to) {
      params.push(r.to);
      parts.push(`ts <= $${params.length}`);
    }
    return parts.join(" AND ");
  }
  const days = r.days ?? 30;
  params.push(days);
  return `ts > now() - ($${params.length}::int * interval '1 day')`;
}

export const analyticsRouter: Router = {
  overview: adminProcedure({
    input: rangeInput.optional().default({}),
    handler: async (input) => {
      const params: unknown[] = [];
      const where = windowClause(input ?? {}, params);

      const [totals, series, pages, referrers, devices, browsers, locations, events, utm, sessions] =
        await Promise.all([
          dbq(
            `SELECT
               count(*) FILTER (WHERE type='pageview')::text AS "pageViews",
               count(DISTINCT visitor_id)::text              AS visitors,
               count(DISTINCT session_id)::text              AS sessions,
               count(*) FILTER (WHERE type='event')::text    AS events
             FROM events WHERE ${where}`,
            params
          ),
          dbq(
            `SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS d,
                    count(*) FILTER (WHERE type='pageview')::text AS views,
                    count(DISTINCT session_id)::text             AS sessions
             FROM events WHERE ${where} GROUP BY 1 ORDER BY 1`,
            params
          ),
          dbq(
            `SELECT coalesce(path,'/') AS k, count(*)::text AS n FROM events
              WHERE ${where} AND type='pageview' GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`,
            params
          ),
          dbq(
            `SELECT referrer_host AS k, count(*)::text AS n FROM events
              WHERE ${where} AND referrer_host IS NOT NULL AND referrer_host <> ''
              GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`,
            params
          ),
          dbq(
            `SELECT coalesce(device,'unknown') AS k, count(DISTINCT session_id)::text AS n
             FROM events WHERE ${where} GROUP BY 1 ORDER BY count(DISTINCT session_id) DESC`,
            params
          ),
          dbq(
            `SELECT coalesce(browser,'Other') AS k, count(DISTINCT session_id)::text AS n
             FROM events WHERE ${where} GROUP BY 1 ORDER BY count(DISTINCT session_id) DESC LIMIT 8`,
            params
          ),
          dbq(
            `SELECT trim(both ', ' from concat_ws(', ', nullif(city,''), country)) AS k,
                    count(DISTINCT visitor_id)::text AS n
             FROM events WHERE ${where} AND country IS NOT NULL AND country <> 'Unknown'
             GROUP BY 1 ORDER BY count(DISTINCT visitor_id) DESC LIMIT 8`,
            params
          ),
          dbq(
            `SELECT event_name AS k, count(*)::text AS n FROM events
              WHERE ${where} AND type='event' AND event_name IS NOT NULL
              GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`,
            params
          ),
          dbq(
            `SELECT utm_source AS k, count(*)::text AS n FROM events
              WHERE ${where} AND utm_source IS NOT NULL AND utm_source <> ''
              GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`,
            params
          ),
          dbq(
            `SELECT session_id AS "sessionId",
                    max(device) AS device, max(browser) AS browser,
                    trim(both ', ' from concat_ws(', ', nullif(max(city),''), max(country))) AS location,
                    (array_agg(path ORDER BY ts) FILTER (WHERE type='pageview'))[1] AS "firstPath",
                    count(*) FILTER (WHERE type='pageview')::text AS pages,
                    to_char(max(ts),'YYYY-MM-DD HH24:MI') AS "lastSeen"
             FROM events WHERE ${where} GROUP BY session_id ORDER BY max(ts) DESC LIMIT 15`,
            params
          ),
        ]);

      return {
        totals: totals[0] ?? {},
        series,
        pages,
        referrers,
        devices,
        browsers,
        locations,
        events,
        utm,
        sessions,
      };
    },
  }),

  articlePerformance: adminProcedure({
    input: rangeInput.optional().default({}),
    handler: async (input) => {
      const params: unknown[] = [];
      const where = windowClause(input ?? {}, params);
      // /blog/<slug>/ — the trailing segment is the article, and the listing
      // page itself is not an article.
      const rows = await dbq(
        `SELECT
            regexp_replace(path, '^/blog/([^/?#]+)/?.*$', '\\1') AS slug,
            count(*)::text                        AS reads,
            count(DISTINCT visitor_id)::text      AS readers,
            round(avg(NULLIF(duration,0)))::text  AS "avgSeconds"
         FROM events
         WHERE ${where}
           AND type = 'pageview'
           AND path ~ '^/blog/[^/?#]+/?$'
         GROUP BY 1
         ORDER BY count(*) DESC
         LIMIT 50`,
        params
      );

      const titles = await dbq<{ slug: string; titleAr: string; publishedAt: string | null }>(
        `SELECT slug, "titleAr", "publishedAt" FROM articles`
      );
      const bySlug = new Map(titles.map((t) => [t.slug, t]));
      return {
        items: rows.map((r) => {
          const slug = String((r as { slug: string }).slug);
          return { ...r, title: bySlug.get(slug)?.titleAr ?? slug };
        }),
      };
    },
  }),

  summary: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const row = await one<{ views: string; visitors: string }>(
        `SELECT count(*) FILTER (WHERE type='pageview')::text AS views,
                count(DISTINCT visitor_id)::text AS visitors
           FROM events WHERE ts > now() - interval '30 days'`
      );
      return { views: Number(row?.views || 0), visitors: Number(row?.visitors || 0) };
    },
  }),
};
