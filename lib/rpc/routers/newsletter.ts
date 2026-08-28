import { z } from "zod";
import { adminProcedure, errors, pageSlice, type Router } from "../core";
import { dbq, one } from "@/lib/db";
import { toCsv } from "./enquiries";

const COLS = `id, email, name, "isActive", source, "confirmedAt", "unsubscribedAt", "createdAt"`;

export const newsletterRouter: Router = {
  list: adminProcedure({
    input: z.object({
      page: z.number().int().min(1).optional().default(1),
      perPage: z.number().int().min(1).max(100).optional().default(50),
      search: z.string().max(200).optional(),
    }),
    handler: async (input) => {
      const { limit, offset, page, perPage } = pageSlice(input);
      const params: unknown[] = [];
      let clause = "";
      if (input.search) {
        params.push(`%${input.search}%`);
        clause = `WHERE email ILIKE $1 OR name ILIKE $1`;
      }
      const items = await dbq(
        `SELECT ${COLS} FROM newsletter_subscribers ${clause}
          ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      );
      const total = await one<{ n: string }>(
        `SELECT count(*)::text AS n FROM newsletter_subscribers ${clause}`,
        params
      );
      const active = await one<{ n: string }>(
        `SELECT count(*)::text AS n FROM newsletter_subscribers WHERE "isActive"`
      );
      return {
        items,
        total: Number(total?.n || 0),
        active: Number(active?.n || 0),
        page,
        perPage,
      };
    },
  }),

  setActive: adminProcedure({
    input: z.object({ id: z.number().int().positive(), isActive: z.boolean() }),
    handler: async ({ id, isActive }) => {
      const row = await one(
        `UPDATE newsletter_subscribers
            SET "isActive" = $2::boolean,
                "unsubscribedAt" = CASE WHEN $2::boolean THEN NULL ELSE now() END
          WHERE id = $1 RETURNING ${COLS}`,
        [id, isActive]
      );
      if (!row) throw errors.notFound();
      return row;
    },
  }),

  exportCsv: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const rows = await dbq<Record<string, unknown>>(
        `SELECT ${COLS} FROM newsletter_subscribers ORDER BY "createdAt" DESC`
      );
      return { csv: toCsv(rows), count: rows.length };
    },
  }),

  delete: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const rows = await dbq(
        `DELETE FROM newsletter_subscribers WHERE id = $1 RETURNING id`,
        [id]
      );
      if (!rows.length) throw errors.notFound();
      return { ok: true };
    },
  }),
};
