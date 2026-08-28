/* Fixed-window rate limiting, in process memory.

   In-memory is the right size for a single-instance Railway deployment: it is
   a guard against noisy abuse, not a distributed quota. The important part is
   the KEY — it must be something the caller cannot rotate at will. Keying a
   contact-form limiter on the submitted email address, for instance, defeats
   it entirely: the attacker picks the email. */

type Bucket = { hits: number[]; };
const BUCKETS = new Map<string, Bucket>();
const MAX_KEYS = 20000;

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const b = BUCKETS.get(key) || { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) {
    BUCKETS.set(key, b);
    const oldest = b.hits[0];
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
  }
  b.hits.push(now);
  BUCKETS.set(key, b);
  if (BUCKETS.size > MAX_KEYS) {
    // crude eviction: drop everything rather than grow without bound
    for (const [k, v] of BUCKETS) {
      if (!v.hits.some((t) => now - t < windowMs)) BUCKETS.delete(k);
    }
    if (BUCKETS.size > MAX_KEYS) BUCKETS.clear();
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Clear a key early — used after a successful login so one typo does not
 *  count against the operator for the rest of the window. */
export function rateLimitReset(key: string): void {
  BUCKETS.delete(key);
}
