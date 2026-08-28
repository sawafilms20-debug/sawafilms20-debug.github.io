import { z } from "zod";
import { adminProcedure, errors, pageSlice, type Router } from "../core";
import { dbq, one } from "@/lib/db";

const COLS = `id, name, email, phone, "serviceInterest", message, source,
  "utmSource", "utmCampaign", status, notes, "createdAt", "updatedAt"`;

export const enquiriesRouter: Router = {
  list: adminProcedure({
    input: z.object({
      status: z.enum(["new", "read", "replied", "archived", "all"]).optional().default("all"),
      search: z.string().max(200).optional(),
      page: z.number().int().min(1).optional().default(1),
      perPage: z.number().int().min(1).max(100).optional().default(25),
    }),
    handler: async (input) => {
      const { limit, offset, page, perPage } = pageSlice(input);
      const where: string[] = [];
      const params: unknown[] = [];
      if (input.status !== "all") {
        params.push(input.status);
        where.push(`status = $${params.length}`);
      }
      if (input.search) {
        params.push(`%${input.search}%`);
        where.push(
          `(name ILIKE $${params.length} OR email ILIKE $${params.length} OR message ILIKE $${params.length})`
        );
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const items = await dbq(
        `SELECT ${COLS} FROM enquiries ${clause}
          ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      );
      const total = await one<{ n: string }>(
        `SELECT count(*)::text AS n FROM enquiries ${clause}`,
        params
      );
      const counts = await dbq<{ status: string; n: string }>(
        `SELECT status, count(*)::text AS n FROM enquiries GROUP BY status`
      );
      return {
        items,
        total: Number(total?.n || 0),
        page,
        perPage,
        counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
      };
    },
  }),

  get: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const row = await one(`SELECT ${COLS} FROM enquiries WHERE id = $1`, [id]);
      if (!row) throw errors.notFound("الرسالة غير موجودة.");
      return row;
    },
  }),

  setStatus: adminProcedure({
    input: z.object({
      id: z.number().int().positive(),
      status: z.enum(["new", "read", "replied", "archived"]),
    }),
    handler: async ({ id, status }) => {
      const row = await one(
        `UPDATE enquiries SET status = $2 WHERE id = $1 RETURNING ${COLS}`,
        [id, status]
      );
      if (!row) throw errors.notFound("الرسالة غير موجودة.");
      return row;
    },
  }),

  bulkStatus: adminProcedure({
    input: z.object({
      ids: z.array(z.number().int().positive()).min(1).max(200),
      status: z.enum(["new", "read", "replied", "archived"]),
    }),
    handler: async ({ ids, status }) => {
      const rows = await dbq<{ id: number }>(
        `UPDATE enquiries SET status = $2 WHERE id = ANY($1::int[]) RETURNING id`,
        [ids, status]
      );
      return { updated: rows.length };
    },
  }),

  setNotes: adminProcedure({
    input: z.object({ id: z.number().int().positive(), notes: z.string().max(10000) }),
    handler: async ({ id, notes }) => {
      const row = await one(
        `UPDATE enquiries SET notes = $2 WHERE id = $1 RETURNING ${COLS}`,
        [id, notes]
      );
      if (!row) throw errors.notFound("الرسالة غير موجودة.");
      return row;
    },
  }),

  delete: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      const rows = await dbq(`DELETE FROM enquiries WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw errors.notFound("الرسالة غير موجودة.");
      return { ok: true };
    },
  }),

  exportCsv: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => {
      const rows = await dbq<Record<string, unknown>>(
        `SELECT ${COLS} FROM enquiries ORDER BY "createdAt" DESC`
      );
      return { csv: toCsv(rows), count: rows.length };
    },
  }),
};

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\r\n");
}
