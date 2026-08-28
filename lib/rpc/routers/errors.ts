import { z } from "zod";
import { adminProcedure, errors as err, pageSlice, type Router } from "../core";
import { dbq, one } from "@/lib/db";

const COLS = `id, fingerprint, message, stack, path, "userAgent", hits,
  "isResolved", "firstSeenAt", "lastSeenAt"`;

export const errorsRouter: Router = {
  list: adminProcedure({
    input: z.object({
      resolved: z.boolean().optional(),
      page: z.number().int().min(1).optional().default(1),
      perPage: z.number().int().min(1).max(100).optional().default(25),
    }),
    handler: async (input) => {
      const { limit, offset, page, perPage } = pageSlice(input);
      const params: unknown[] = [];
      let clause = "";
      if (typeof input.resolved === "boolean") {
        params.push(input.resolved);
        clause = `WHERE "isResolved" = $1`;
      }
      const items = await dbq(
        `SELECT ${COLS} FROM error_logs ${clause}
          ORDER BY "lastSeenAt" DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      );
      const total = await one<{ n: string }>(
        `SELECT count(*)::text AS n FROM error_logs ${clause}`,
        params
      );
      return { items, total: Number(total?.n || 0), page, perPage };
    },
  }),

  counts: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const row = await one<{ open: string; resolved: string; hits: string }>(
        `SELECT
           count(*) FILTER (WHERE NOT "isResolved")::text AS open,
           count(*) FILTER (WHERE "isResolved")::text     AS resolved,
           COALESCE(sum(hits) FILTER (WHERE NOT "isResolved"), 0)::text AS hits
         FROM error_logs`
      );
      return {
        open: Number(row?.open || 0),
        resolved: Number(row?.resolved || 0),
        hits: Number(row?.hits || 0),
      };
    },
  }),

  setResolved: adminProcedure({
    input: z.object({ id: z.number().int().positive(), isResolved: z.boolean() }),
    handler: async ({ id, isResolved }) => {
      const row = await one(
        `UPDATE error_logs SET "isResolved" = $2 WHERE id = $1 RETURNING ${COLS}`,
        [id, isResolved]
      );
      if (!row) throw err.notFound();
      return row;
    },
  }),

  delete: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const rows = await dbq(`DELETE FROM error_logs WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw err.notFound();
      return { ok: true };
    },
  }),

  clearResolved: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const rows = await dbq<{ id: number }>(
        `DELETE FROM error_logs WHERE "isResolved" RETURNING id`
      );
      return { deleted: rows.length };
    },
  }),
};
