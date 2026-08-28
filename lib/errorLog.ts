import crypto from "crypto";
import { hasDb, dbq } from "./db";

/* Runtime errors, deduplicated.

   One broken page otherwise writes thousands of identical rows, and the log
   becomes unreadable at exactly the moment it matters. Same fingerprint means
   the same defect: bump the counter and the last-seen time. */

function fingerprint(message: string, path?: string): string {
  const normalised = message
    .replace(/\b\d+\b/g, "#")
    .replace(/0x[0-9a-f]+/gi, "#")
    .slice(0, 300);
  return crypto.createHash("sha256").update(`${path || ""}|${normalised}`).digest("hex").slice(0, 64);
}

export async function recordError(
  message: string,
  stack?: string,
  path?: string,
  userAgent?: string
): Promise<void> {
  if (!hasDb()) return;
  try {
    await dbq(
      `INSERT INTO error_logs (fingerprint, message, stack, path, "userAgent")
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (fingerprint) DO UPDATE
         SET hits = error_logs.hits + 1,
             "lastSeenAt" = now(),
             "isResolved" = FALSE`,
      [
        fingerprint(message, path),
        message.slice(0, 4000),
        stack?.slice(0, 8000) ?? null,
        path?.slice(0, 500) ?? null,
        userAgent?.slice(0, 500) ?? null,
      ]
    );
  } catch {
    /* logging a failure must never become a second failure */
  }
}
