import { z } from "zod";
import { dbq, one, tx } from "@/lib/db";
import { adminProcedure, errors, type Router } from "./core";

/* services, testimonials, processSteps, faq and statistics are the same screen
   five times: an ordered list of rows, each visible or not, each editable in
   Arabic with an optional English translation. One factory, five instances —
   so a fix to reordering is a fix everywhere, not in one of five places. */

export type FieldSpec = {
  /** Database column, camelCase, exactly as declared in the migration. */
  column: string;
  zod: z.ZodTypeAny;
  /** Written on create/update. Omit for computed columns. */
  writable?: boolean;
  /** Optional on create because the server supplies it (order, visibility). */
  serverDefaulted?: boolean;
};

export type CollectionSpec = {
  table: string;
  /** Column carrying the sort position. Every collection here has one. */
  orderColumn: string;
  /** Column carrying visibility, if the table has one. */
  visibleColumn?: string;
  fields: FieldSpec[];
  /** Extra work inside the create/update transaction, e.g. renumbering steps. */
  afterWrite?: () => Promise<void>;
};

const idInput = z.object({ id: z.number().int().positive() });

function columnList(spec: CollectionSpec): string {
  return ["id", ...spec.fields.map((f) => f.column), "createdAt", "updatedAt"]
    .map((c) => `"${c}"`)
    .join(", ");
}

function writable(spec: CollectionSpec): FieldSpec[] {
  return spec.fields.filter((f) => f.writable !== false);
}

/* On update every field is optional — that is what a partial edit means. On
   create the declared schema is enforced, minus the columns the server fills
   in itself. Using the partial shape for both let a create with a missing NOT
   NULL column past zod and into Postgres, where it surfaced as a 500 with raw
   driver text instead of a field-level message. */
function shape(spec: CollectionSpec, partial: boolean) {
  const obj: Record<string, z.ZodTypeAny> = {};
  for (const f of writable(spec)) {
    obj[f.column] = partial || f.serverDefaulted ? f.zod.optional() : f.zod;
  }
  return obj;
}

export function collectionRouter(spec: CollectionSpec): Router {
  const cols = columnList(spec);

  const list = adminProcedure({
    input: z
      .object({ includeHidden: z.boolean().optional() })
      .optional()
      .default({}),
    handler: async (input) => {
      const where =
        spec.visibleColumn && input?.includeHidden === false
          ? `WHERE "${spec.visibleColumn}" = TRUE`
          : "";
      const rows = await dbq(
        `SELECT ${cols} FROM ${spec.table} ${where}
          ORDER BY "${spec.orderColumn}" ASC, id ASC`
      );
      return { items: rows };
    },
  });

  const get = adminProcedure({
    input: idInput,
    handler: async ({ id }) => {
      const row = await one(`SELECT ${cols} FROM ${spec.table} WHERE id = $1`, [id]);
      if (!row) throw errors.notFound();
      return row;
    },
  });

  const create = adminProcedure({
    input: z.object(shape(spec, false)),
    handler: async (input) => {
      const fields = writable(spec).filter(
        (f) => (input as Record<string, unknown>)[f.column] !== undefined
      );
      // a new row lands at the end of the list, where the operator expects it
      const next = await one<{ n: number | null }>(
        `SELECT max("${spec.orderColumn}") AS n FROM ${spec.table}`
      );
      const order = (next?.n ?? -1) + 1;

      const names = [...fields.map((f) => `"${f.column}"`), `"${spec.orderColumn}"`];
      const values = [
        ...fields.map((f) => (input as Record<string, unknown>)[f.column]),
        order,
      ];
      // orderColumn may also be a declared field; keep only the computed one
      const seen = new Set<string>();
      const keptNames: string[] = [];
      const keptValues: unknown[] = [];
      for (let i = names.length - 1; i >= 0; i--) {
        if (seen.has(names[i])) continue;
        seen.add(names[i]);
        keptNames.unshift(names[i]);
        keptValues.unshift(values[i]);
      }
      const placeholders = keptNames.map((_, i) => `$${i + 1}`).join(", ");
      const row = await one(
        `INSERT INTO ${spec.table} (${keptNames.join(", ")}) VALUES (${placeholders})
         RETURNING ${cols}`,
        keptValues
      );
      await spec.afterWrite?.();
      return row;
    },
  });

  const update = adminProcedure({
    input: z.object({ id: z.number().int().positive(), ...shape(spec, true) }),
    handler: async (input) => {
      const data = input as Record<string, unknown>;
      const fields = writable(spec).filter((f) => data[f.column] !== undefined);
      if (!fields.length) throw errors.badRequest("لا يوجد ما يُحفَظ.");
      const sets = fields.map((f, i) => `"${f.column}" = $${i + 2}`).join(", ");
      const row = await one(
        `UPDATE ${spec.table} SET ${sets} WHERE id = $1 RETURNING ${cols}`,
        [data.id, ...fields.map((f) => data[f.column])]
      );
      if (!row) throw errors.notFound();
      await spec.afterWrite?.();
      return row;
    },
  });

  const del = adminProcedure({
    input: idInput,
    handler: async ({ id }) => {
      const rows = await dbq(`DELETE FROM ${spec.table} WHERE id = $1 RETURNING id`, [id]);
      if (!rows.length) throw errors.notFound();
      await spec.afterWrite?.();
      return { ok: true };
    },
  });

  const reorder = adminProcedure({
    input: z.object({ ids: z.array(z.number().int().positive()).max(500) }),
    handler: async ({ ids }) => {
      // The array's order IS the new order. One transaction, so a failure
      // halfway through cannot leave the list scrambled.
      await tx(async (c) => {
        for (let i = 0; i < ids.length; i++) {
          await c.query(
            `UPDATE ${spec.table} SET "${spec.orderColumn}" = $1 WHERE id = $2`,
            [i, ids[i]]
          );
        }
      });
      await spec.afterWrite?.();
      return { ok: true };
    },
  });

  const router: Router = {
    list: list,
    get: get,
    create: create,
    update: update,
    delete: del,
    reorder: reorder,
  };

  if (spec.visibleColumn) {
    router.setVisible = adminProcedure({
      input: z.object({ id: z.number().int().positive(), isVisible: z.boolean() }),
      handler: async ({ id, isVisible }) => {
        const row = await one(
          `UPDATE ${spec.table} SET "${spec.visibleColumn}" = $2 WHERE id = $1 RETURNING ${cols}`,
          [id, isVisible]
        );
        if (!row) throw errors.notFound();
        return row;
      },
    });
  }

  return router;
}

/* ------------------------------------------------------- shared field types */

export const arText = (max: number) => z.string().trim().min(1).max(max);
export const optText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));
export const optLong = z
  .string()
  .max(60000)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));
export const flag = z.boolean();
