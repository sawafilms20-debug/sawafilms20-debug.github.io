import { z } from "zod";
import { adminProcedure, errors, pageSlice, type Router } from "../core";
import { dbq, one } from "@/lib/db";

const COLS = `id, "storageKey", url, "fileName", "mimeType", "sizeBytes",
  width, height, "altAr", "altEn", "uploadedBy", "createdAt"`;

export const mediaRouter: Router = {
  list: adminProcedure({
    input: z.object({
      page: z.number().int().min(1).optional().default(1),
      perPage: z.number().int().min(1).max(100).optional().default(40),
      mimeType: z.string().max(100).optional(),
      search: z.string().max(200).optional(),
    }),
    handler: async (input) => {
      const { limit, offset, page, perPage } = pageSlice(input);
      const where: string[] = [];
      const params: unknown[] = [];
      if (input.mimeType) {
        params.push(input.mimeType);
        where.push(`"mimeType" = $${params.length}`);
      }
      if (input.search) {
        params.push(`%${input.search}%`);
        where.push(`("fileName" ILIKE $${params.length} OR "altAr" ILIKE $${params.length})`);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const items = await dbq(
        `SELECT ${COLS} FROM media_assets ${clause}
          ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      );
      const total = await one<{ n: string; bytes: string }>(
        `SELECT count(*)::text AS n, COALESCE(sum("sizeBytes"),0)::text AS bytes
           FROM media_assets ${clause}`,
        params
      );
      return {
        items,
        total: Number(total?.n || 0),
        totalBytes: Number(total?.bytes || 0),
        page,
        perPage,
      };
    },
  }),

  updateAlt: adminProcedure({
    input: z.object({
      id: z.number().int().positive(),
      altAr: z.string().max(500).nullable().optional(),
      altEn: z.string().max(500).nullable().optional(),
    }),
    handler: async (input) => {
      const row = await one(
        `UPDATE media_assets SET "altAr" = COALESCE($2, "altAr"), "altEn" = COALESCE($3, "altEn")
          WHERE id = $1 RETURNING ${COLS}`,
        [input.id, input.altAr ?? null, input.altEn ?? null]
      );
      if (!row) throw errors.notFound("الملف غير موجود.");
      return row;
    },
  }),

  delete: adminProcedure({
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => {
      // media_blobs cascades from the asset row
      const rows = await dbq(`DELETE FROM media_assets WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw errors.notFound("الملف غير موجود.");
      return { ok: true };
    },
  }),
};
