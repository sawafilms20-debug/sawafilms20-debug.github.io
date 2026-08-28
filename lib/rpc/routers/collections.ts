import { z } from "zod";
import { collectionRouter, optText, type CollectionSpec } from "../collection";
import { dbq } from "@/lib/db";
import type { Router } from "../core";

/* The five ordered content lists. Arabic is required, English optional —
   everywhere, without exception. */

const req = (max: number) => z.string().trim().min(1).max(max);
const long = z.string().max(60000).nullable().optional().transform((v) => (v ? v : null));

export const servicesSpec: CollectionSpec = {
  table: "services",
  orderColumn: "displayOrder",
  visibleColumn: "isActive",
  fields: [
    { column: "slug", zod: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/) },
    { column: "titleAr", zod: req(255) },
    { column: "titleEn", zod: optText(255) },
    { column: "summaryAr", zod: long },
    { column: "summaryEn", zod: long },
    { column: "bodyAr", zod: long },
    { column: "bodyEn", zod: long },
    { column: "icon", zod: optText(100) },
    { column: "coverImage", zod: optText(500) },
    { column: "priceNote", zod: optText(255) },
    { column: "displayOrder", zod: z.number().int() },
    { column: "isActive", zod: z.boolean() },
  ],
};

export const testimonialsSpec: CollectionSpec = {
  table: "testimonials",
  orderColumn: "displayOrder",
  visibleColumn: "isVisible",
  fields: [
    { column: "quoteAr", zod: req(4000) },
    { column: "quoteEn", zod: long },
    // A person's name is not translated. Some of these are Latin script, some
    // Arabic — store whichever the person actually uses.
    { column: "authorName", zod: req(255) },
    { column: "authorTitleAr", zod: optText(255) },
    { column: "authorTitleEn", zod: optText(255) },
    { column: "company", zod: optText(255) },
    { column: "authorPhoto", zod: optText(500) },
    { column: "sourceUrl", zod: optText(500) },
    { column: "displayOrder", zod: z.number().int() },
    { column: "isVisible", zod: z.boolean() },
  ],
};

export const processStepsSpec: CollectionSpec = {
  table: "process_steps",
  orderColumn: "displayOrder",
  visibleColumn: "isVisible",
  fields: [
    { column: "stepNumber", zod: z.number().int().min(1).max(99) },
    { column: "titleAr", zod: req(255) },
    { column: "titleEn", zod: optText(255) },
    { column: "descriptionAr", zod: long },
    { column: "descriptionEn", zod: long },
    { column: "icon", zod: optText(100) },
    { column: "displayOrder", zod: z.number().int() },
    { column: "isVisible", zod: z.boolean() },
  ],
  // The numbers shown on the page (01, 02, …) must follow the order the
  // operator dragged them into, or reordering renumbers nothing.
  afterWrite: async () => {
    await dbq(
      `UPDATE process_steps s SET "stepNumber" = r.rn
         FROM (SELECT id, row_number() OVER (ORDER BY "displayOrder", id) AS rn
                 FROM process_steps) r
        WHERE s.id = r.id AND s."stepNumber" <> r.rn`
    );
  },
};

export const faqSpec: CollectionSpec = {
  table: "faq_items",
  orderColumn: "displayOrder",
  visibleColumn: "isVisible",
  fields: [
    { column: "questionAr", zod: req(1000) },
    { column: "questionEn", zod: long },
    { column: "answerAr", zod: req(8000) },
    { column: "answerEn", zod: long },
    { column: "category", zod: optText(100) },
    { column: "displayOrder", zod: z.number().int() },
    { column: "isVisible", zod: z.boolean() },
  ],
};

export const statisticsSpec: CollectionSpec = {
  table: "statistics",
  orderColumn: "displayOrder",
  visibleColumn: "isVisible",
  fields: [
    { column: "labelAr", zod: req(255) },
    { column: "labelEn", zod: optText(255) },
    { column: "value", zod: req(50) },
    { column: "suffix", zod: optText(20) },
    { column: "icon", zod: optText(100) },
    { column: "displayOrder", zod: z.number().int() },
    { column: "isVisible", zod: z.boolean() },
  ],
};

export const servicesRouter: Router = collectionRouter(servicesSpec);
export const testimonialsRouter: Router = collectionRouter(testimonialsSpec);
export const processStepsRouter: Router = collectionRouter(processStepsSpec);
export const faqRouter: Router = collectionRouter(faqSpec);
export const statisticsRouter: Router = collectionRouter(statisticsSpec);
