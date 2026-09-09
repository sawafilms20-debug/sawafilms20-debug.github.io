/* One definition of a usable email address, on both sides of the wire.
 *
 * "Valid" here does not mean RFC 5322 — that grammar admits addresses no mail
 * server would route and is famously unreadable. It means: an address she has
 * a real chance of replying to. Nothing here touches the network; a syntax
 * check cannot prove a mailbox exists, and pretending otherwise would be worse
 * than not checking.
 *
 * The browser's own type="email" is weaker than it looks: the HTML spec's
 * grammar accepts `homam@gmail` with no dot at all. That is the single most
 * common way a broken address reaches an inbox, so it is checked here. */

const LOCAL = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*";
const LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
// At least one dot, and a TLD of two or more letters — no `user@localhost`,
// no `user@gmail`, no trailing dot.
const EMAIL = new RegExp(`^${LOCAL}@(?:${LABEL}\\.)+[A-Za-z]{2,}$`);

export function isValidEmail(value: string): boolean {
  const v = (value || "").trim();
  // 254 is the longest an address may be in an SMTP envelope; 64 the local part.
  if (!v || v.length > 254) return false;
  const at = v.lastIndexOf("@");
  if (at < 1 || v.length - at - 1 > 253 || at > 64) return false;
  if (v.includes("..")) return false;
  return EMAIL.test(v);
}

/* ------------------------------------------------------------ near misses */

/* A malformed address is the rare failure. The common one is a real address
   with a typo in a domain everybody knows — and no syntax check will ever
   catch `gmial.com`, because it is perfectly well-formed. */
const COMMON_DOMAINS = [
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
  "msn.com", "mail.com", "zoho.com", "yandex.com", "gmx.com",
];

/** Edit distance counting a swap of two neighbouring letters as ONE edit.
 *
 *  Plain Levenshtein scores `gmial` against `gmail` as two edits and so misses
 *  the most common Gmail typo there is — but nobody makes two independent
 *  mistakes there, they hit the keys in the wrong order once. Transposition
 *  has to be a single step or the whole suggestion is useless.
 *
 *  Bounded: anything past `max` edits gives up early. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  // Three rows, because a transposition looks back two positions.
  let twoAgo: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, twoAgo[j - 2] + 1);
      }
      row[j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    twoAgo = prev;
    prev = row;
  }
  return prev[b.length];
}

/**
 * The address she probably meant, or null.
 *
 * Only ever a suggestion: `@gmail.co` is a real domain in Colombia and
 * `@yaho.com` might be somebody's company. This proposes; it never corrects,
 * and never blocks sending.
 */
export function suggestEmail(value: string): string | null {
  const v = (value || "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;

  let best: { domain: string; distance: number } | null = null;
  for (const candidate of COMMON_DOMAINS) {
    // One edit for short domains, two for longer ones — "gmailcom" is two
    // edits from "gmail.com" and unmistakably meant it.
    const max = candidate.length > 9 ? 2 : 1;
    const d = editDistance(domain, candidate, max);
    if (d <= max && (!best || d < best.distance)) best = { domain: candidate, distance: d };
  }
  return best ? `${local}@${best.domain}` : null;
}
