import crypto from "crypto";
import { dbq, one } from "./db";
import { SITE_ORIGINS } from "./net";

/* The recommendation link.
 *
 * One link, sent to many people. Its key is the only thing standing between
 * the form and anyone who stumbles on /recommend/, so it is random, compared
 * in constant time, and replaceable: if a link is passed around further than
 * she meant, a new one makes the old one stop working without touching any
 * recommendation already received.
 *
 * Kept in site_settings because it is one value with no history. It is not one
 * of SITE_SETTING_KEYS, so it never reaches the public content snapshot. */

const SETTING = "recommendInviteToken";

/** What the form accepts. The page reads the same numbers, so the browser
 *  refuses exactly what the server would. */
export const RECOMMEND_LIMITS = {
  name: 120,
  title: 160,
  textMin: 20,
  text: 1500,
  photoBytes: 5 * 1024 * 1024,
} as const;

function newToken(): string {
  // 18 bytes → 24 url-safe characters. Unguessable, and short enough to paste.
  return crypto.randomBytes(18).toString("base64url");
}

export async function inviteToken(): Promise<string> {
  const row = await one<{ settingValue: string | null }>(
    `SELECT "settingValue" FROM site_settings WHERE "settingKey" = $1`,
    [SETTING]
  );
  if (row?.settingValue) return row.settingValue;
  return rotateInviteToken();
}

export async function rotateInviteToken(): Promise<string> {
  const token = newToken();
  await dbq(
    `INSERT INTO site_settings ("settingKey","settingValue","settingType")
     VALUES ($1,$2,'text')
     ON CONFLICT ("settingKey") DO UPDATE SET "settingValue" = EXCLUDED."settingValue"`,
    [SETTING, token]
  );
  return token;
}

export function inviteUrl(token: string): string {
  return `${SITE_ORIGINS[0]}/recommend/?k=${encodeURIComponent(token)}`;
}

/** Constant-time: a plain `===` leaks how many leading characters matched. */
export async function inviteTokenMatches(given: string): Promise<boolean> {
  const row = await one<{ settingValue: string | null }>(
    `SELECT "settingValue" FROM site_settings WHERE "settingKey" = $1`,
    [SETTING]
  );
  const want = row?.settingValue;
  if (!want || !given) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
