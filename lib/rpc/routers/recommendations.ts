import { z } from "zod";
import { adminProcedure, errors, type Router } from "../core";
import { one, tx } from "@/lib/db";
import {
  forgetPublicTestimonials,
  inviteToken,
  inviteUrl,
  rotateInviteToken,
} from "@/lib/recommend";

/* Recommendations people send through the link.
 *
 * Listing and editing them is the testimonials collection — a submission is a
 * testimonial row with pendingReview set. What lives here is only what the
 * collection cannot do: hand out the link, and the two decisions about a
 * submission, which each change more than one column at once. */

const idInput = z.object({ id: z.number().int().positive() });

export const recommendationsRouter: Router = {
  invite: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => ({ url: inviteUrl(await inviteToken()) }),
  }),

  /** A new link. The old one stops working at once; nothing already received
   *  is affected. */
  rotateInvite: adminProcedure({
    input: z.object({}).optional(),
    handler: async () => ({ url: inviteUrl(await rotateInviteToken()) }),
  }),

  /** Put it on the site. It joins the end of the list, where she can drag it. */
  approve: adminProcedure({
    input: idInput,
    handler: async ({ id }) => {
      const row = await one(
        `UPDATE testimonials
            SET "pendingReview" = FALSE, "isVisible" = TRUE,
                "displayOrder" = (SELECT COALESCE(max("displayOrder"), -1) + 1
                                    FROM testimonials WHERE NOT "pendingReview")
          WHERE id = $1 AND "pendingReview"
          RETURNING id`,
        [id]
      );
      if (!row) throw errors.notFound();
      forgetPublicTestimonials();
      return { ok: true };
    },
  }),

  /** Turn it down. The row goes, and so does the photo they uploaded with it —
   *  a stranger's face has no business staying in her media library. */
  reject: adminProcedure({
    input: idInput,
    handler: async ({ id }) => {
      const gone = await tx(async (c) => {
        const r = await c.query<{ submittedPhotoKey: string | null }>(
          `DELETE FROM testimonials WHERE id = $1 AND "pendingReview"
           RETURNING "submittedPhotoKey"`,
          [id]
        );
        if (!r.rows.length) return false;
        const key = r.rows[0].submittedPhotoKey;
        if (key) {
          await c.query(`DELETE FROM media_blobs WHERE "storageKey" = $1`, [key]);
          await c.query(`DELETE FROM media_assets WHERE "storageKey" = $1`, [key]);
        }
        return true;
      });
      if (!gone) throw errors.notFound();
      return { ok: true };
    },
  }),
};
