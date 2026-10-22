/* The recommendation link: one plain public address, sent to many people.
 *
 * There was a secret key in it once. It was dropped so the page could start
 * collecting before the server that checks a key had been deployed — a link
 * sent to a client must keep working through that, and through any later
 * change. What protects her instead is that nothing submitted is public until
 * she approves it, plus the rate limit and honeypot on the endpoint. */

import { dbq } from "./db";
import { SITE_ORIGINS } from "./net";

/** What the form accepts. The page reads the same numbers, so the browser
 *  refuses exactly what the server would. */
export const RECOMMEND_LIMITS = {
  name: 120,
  title: 160,
  textMin: 20,
  text: 1500,
  photoBytes: 5 * 1024 * 1024,
} as const;

export const RECOMMEND_URL = `${SITE_ORIGINS[0]}/recommend/`;

/* ------------------------------------------------- the live public list */

/* What /api/testimonials serves. Cached for a few seconds because the home
   page asks on every visit; dropped whenever the dashboard changes a row so
   an approval shows on the very next load. */
const TTL_MS = 30_000;
let cache: { at: number; rows: unknown[] } | null = null;

export async function publicTestimonials(): Promise<unknown[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  // Only what the page renders. The submitter's email never leaves the dashboard.
  const rows = await dbq(
    `SELECT "quoteAr","authorName","authorTitleAr",company,"authorPhoto"
       FROM testimonials
      WHERE "isVisible" AND NOT "pendingReview"
      ORDER BY "displayOrder", id`
  );
  cache = { at: Date.now(), rows };
  return rows;
}

export function forgetPublicTestimonials(): void {
  cache = null;
}
