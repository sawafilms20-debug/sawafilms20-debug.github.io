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

/* Letters of any script, not just ASCII. An address with an Arabic local part
   is legal (RFC 6531) and the big providers accept it — and on a site whose
   readers are Arabic, refusing one is the expensive direction to be wrong in:
   a false rejection is a customer who cannot send at all. */
const LOCAL_CHAR = "[\\p{L}\\p{N}!#$%&'*+/=?^_`{|}~-]";
const LOCAL = `${LOCAL_CHAR}+(?:\\.${LOCAL_CHAR}+)*`;
// Any script, because this site's readers are Arabic and an Arabic domain is
// a real domain — it just reaches the wire as punycode.
const LABEL = "[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?";
/* The suffix, where the dot-less addresses are actually caught. Two forms:
   ordinary letters (.com, .marketing, .مصر) or a punycode label, which carries
   digits and hyphens — `xn--kgbechtv` is ".الجزائر", and an earlier
   letters-only rule refused every address at an Arabic domain. */
const TLD = "(?:xn--[A-Za-z0-9-]{2,}|\\p{L}{2,})";
// At least one dot — no `user@localhost`, no `user@gmail`, no trailing dot.
/** The pattern's source, so a page that cannot import this module can still
 *  use the same rule. The blog's subscribe form is generated HTML with an
 *  inline script; it carried its own looser copy until this was exported. */
export const EMAIL_PATTERN = `^${LOCAL}@(?:${LABEL}\\.)+${TLD}$`;
const EMAIL = new RegExp(EMAIL_PATTERN, "u");

export function isValidEmail(value: string): boolean {
  const v = (value || "").trim();
  // 254 is the longest an address may be in an SMTP envelope; 64 the local part.
  if (!v || new TextEncoder().encode(v).length > 254) return false;
  const at = v.lastIndexOf("@");
  // The SMTP limits are in bytes, and a non-ASCII address spends several per
  // character — measuring in JS string units would let a long Arabic local
  // part through as "short".
  const bytes = (x: string) => new TextEncoder().encode(x).length;
  if (at < 1) return false;
  if (bytes(v.slice(0, at)) > 64 || bytes(v.slice(at + 1)) > 253) return false;
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

/* Real mail domains that sit one edit from a listed provider. Without this,
   a Yahoo customer typing their own ymail.com address is asked whether they
   meant gmail.com — the suggester cannot tell a typo from a smaller rival. */
const NEVER_CORRECT = new Set([
  "ymail.com", "rocketmail.com", "email.com", "mailo.com", "foxmail.com",
  "protonmail.ch", "pm.me", "gmx.de", "gmx.net", "gmx.at", "mail.ru",
  "yandex.ru", "inbox.ru", "list.ru", "bk.ru", "qq.com", "163.com", "126.com",
  "web.de", "t-online.de", "free.fr", "orange.fr", "libero.it", "seznam.cz",
  "naver.com", "daum.net", "hanmail.net", "zoho.eu", "icloud.co",
]);

/** The two labels a domain ends with — "mail.com" out of "a.mail.com". */
const tld = (d: string) => d.slice(d.lastIndexOf("."));

/**
 * The address she probably meant, or null.
 *
 * Only ever a suggestion: it proposes, never corrects, and never blocks
 * sending. But a suggestion that fires on a real address is still noise, so
 * the shape of the edit has to look like a typo and not like a different
 * company:
 *
 *   - ONE edit, never two. `foxmail.com` is two from `hotmail.com` and is a
 *     real Chinese provider, not a slip.
 *   - Never the first letter. `ymail.com` → `gmail.com` is one substitution
 *     and completely wrong; nobody's finger lands on g instead of y, and the
 *     first character is the one people are surest of.
 *   - Never the suffix alone. `protonmail.ch` and `mail.ru` are their own
 *     services, not misspellings of the .com.
 */
export function suggestEmail(value: string): string | null {
  const v = (value || "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (!domain || COMMON_DOMAINS.includes(domain) || NEVER_CORRECT.has(domain)) return null;

  for (const candidate of COMMON_DOMAINS) {
    if (editDistance(domain, candidate, 1) > 1) continue;
    // A different first letter is a different provider, not a slip.
    if (domain[0] !== candidate[0]) continue;
    // Same name, different suffix: a real service somewhere else, not a typo.
    if (tld(domain) !== tld(candidate) && domain.split(".")[0] === candidate.split(".")[0]) {
      continue;
    }
    return `${local}@${candidate}`;
  }
  return null;
}
