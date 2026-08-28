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
