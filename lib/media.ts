import crypto from "crypto";

/* Upload policy, in one place so every write path shares it.

   image/svg+xml is not on the list and must never be added. The serving route
   echoes the stored content type, so an SVG upload is a script that runs on
   this origin, with this origin's cookies. */

export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Every key lives under this prefix, and the serving route refuses anything
 *  outside it. */
export const KEY_PREFIX = "uploads/";

export function safeStorageKey(originalName: string, mime: string): string {
  const ext = ALLOWED_MIME[mime] || "bin";
  const stem =
    (originalName || "file")
      .replace(/\.[^.]*$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "file";
  const rand = crypto.randomBytes(4).toString("hex");
  return `${KEY_PREFIX}${Date.now().toString(36)}-${rand}-${stem}.${ext}`;
}

/** Rejects traversal and anything outside the prefix. A catch-all route
 *  segment is caller-controlled: "uploads/../../etc/passwd" arrives as a
 *  perfectly ordinary string. */
export function isSafeKey(key: string): boolean {
  if (!key.startsWith(KEY_PREFIX)) return false;
  if (key.includes("..") || key.includes("//") || key.includes("\\")) return false;
  if (key.length > 500) return false;
  return /^uploads\/[A-Za-z0-9._-]+$/.test(key);
}

/** Absolute origin the public static site must use to reach uploaded files —
 *  the site is served from GitHub Pages, the API from Railway. */
export function apiOrigin(): string {
  return (
    process.env.PUBLIC_API_ORIGIN?.replace(/\/+$/, "") ||
    "https://rak-production.up.railway.app"
  );
}

export function mediaUrl(storageKey: string): string {
  return `${apiOrigin()}/api/media/${storageKey}`;
}

/* What the bytes actually are, regardless of what the upload claimed.

   `file.type` in a multipart body is just a string the client chose. The
   serving route echoes the stored content type back, so a file saved as
   image/png that is really HTML or SVG becomes script on this origin the
   moment a browser is persuaded to treat it as such. nosniff and the sandbox
   CSP already stand in the way; this closes the door at the point of entry so
   the wrong bytes are never stored in the first place.

   Returns null when the bytes match nothing on the allowlist. */
export function sniffMime(buf: Buffer): string | null {
  const at = (i: number, sig: number[]) => sig.every((b, k) => buf[i + k] === b);
  const ascii = (i: number, str: string) =>
    [...str].every((c, k) => buf[i + k] === c.charCodeAt(0));

  if (buf.length < 12) return null;
  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  // ISO-BMFF: the brand sits in the ftyp box, and avif files often declare
  // their brand in the compatible list rather than the major one.
  if (ascii(4, "ftyp")) {
    const head = buf.subarray(8, Math.min(buf.length, 64)).toString("latin1");
    if (/avif|avis/.test(head)) return "image/avif";
  }
  if (ascii(0, "%PDF-")) return "application/pdf";
  return null;
}
