import { z } from "zod";
import { adminProcedure, type Router } from "../core";
import { dbq, one } from "@/lib/db";
import { promoteScheduled } from "./articles";

/* The landing screen. A summary, not a wall of identical stat cards: the one
   number that needs action (unanswered enquiries) is returned separately so
   the UI can give it the visual weight. */

export const dashboardRouter: Router = {
  summary: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      await promoteScheduled();

      const [traffic, articles, enquiries, series, recent, scheduled, errorRow] =
        await Promise.all([
          one<{ views: string; visitors: string }>(
            `SELECT count(*) FILTER (WHERE type='pageview')::text AS views,
                    count(DISTINCT visitor_id)::text AS visitors
               FROM events WHERE ts > now() - interval '30 days'`
          ),
          one<{ published: string; drafts: string }>(
            `SELECT count(*) FILTER (WHERE status='published')::text AS published,
                    count(*) FILTER (WHERE status='draft')::text     AS drafts
               FROM articles`
          ),
          one<{ awaiting: string; total: string }>(
            `SELECT count(*) FILTER (WHERE status IN ('new','read'))::text AS awaiting,
                    count(*)::text AS total
               FROM enquiries`
          ),
          dbq<{ d: string; n: string }>(
            `SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS d,
                    count(*) FILTER (WHERE type='pageview')::text AS n
               FROM events WHERE ts > now() - interval '30 days'
              GROUP BY 1 ORDER BY 1`
          ),
          dbq(
            `SELECT id, name, email, message, status, "createdAt"
               FROM enquiries ORDER BY "createdAt" DESC LIMIT 6`
          ),
          dbq(
            `SELECT id, slug, "titleAr", "scheduledAt"
               FROM articles WHERE "scheduledAt" IS NOT NULL AND status <> 'published'
              ORDER BY "scheduledAt" ASC LIMIT 6`
          ),
          one<{ n: string }>(
            `SELECT count(*)::text AS n FROM error_logs WHERE NOT "isResolved"`
          ),
        ]);

      return {
        views30d: Number(traffic?.views || 0),
        visitors30d: Number(traffic?.visitors || 0),
        published: Number(articles?.published || 0),
        drafts: Number(articles?.drafts || 0),
        enquiriesAwaiting: Number(enquiries?.awaiting || 0),
        enquiriesTotal: Number(enquiries?.total || 0),
        openErrors: Number(errorRow?.n || 0),
        series,
        recentEnquiries: recent,
        scheduledArticles: scheduled,
      };
    },
  }),
};
