/* One transliteration, used on both sides of the wire.

   The dashboard shows the slug it is about to create, and the server writes
   it. When those disagree the writer sees one URL and gets another, so there
   is exactly one implementation and both import it. */

export function slugify(title: string): string {
  const map: Record<string, string> = {
    ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h",
    خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d",
    ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m",
    ن: "n", ه: "h", و: "w", ي: "y", ى: "a", ة: "a", ء: "", ئ: "", ؤ: "",
  };
  const out = Array.from(title.toLowerCase())
    .map((ch) => (map[ch] !== undefined ? map[ch] : /[a-z0-9]/.test(ch) ? ch : " "))
    .join("")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return out || `post-${new Date().toISOString().slice(0, 10)}`;
}
/** `title`, `title-2`, `title-3`… — the first form not already spoken for.
 *
 *  Two LinkedIn posts opening on the same hook is normal, and a slug clash is
 *  a 409 in the middle of pasting rather than something to make her solve. */
export function nextFreeSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) {
    // Room for the suffix, so a 60-char slug does not overflow the column.
    const candidate = `${base.slice(0, 60 - String(n).length - 1)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 50)}-${taken.size + 1}`;
}
