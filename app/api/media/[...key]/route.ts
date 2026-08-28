import { NextRequest, NextResponse } from "next/server";
import { dbq } from "@/lib/db";
import { ALLOWED_MIME, isSafeKey } from "@/lib/media";

/* Serves an uploaded file.

   Two guards, both about the fact that the key arrives from the URL:
   - isSafeKey rejects anything outside the uploads/ prefix and anything with
     a traversal sequence in it. A catch-all segment is caller-controlled.
   - The content type is re-checked against the allowlist before it is echoed
     back. image/svg+xml is not on that list and must never be: the browser
     would execute it as script on this origin. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const storageKey = (key || []).join("/");

  if (!isSafeKey(storageKey)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rows = await dbq<{ bytes: Buffer; mimeType: string; fileName: string }>(
    `SELECT b.bytes, a."mimeType", a."fileName"
       FROM media_blobs b JOIN media_assets a ON a."storageKey" = b."storageKey"
      WHERE b."storageKey" = $1`,
    [storageKey]
  );
  const row = rows[0];
  if (!row) return new NextResponse("Not found", { status: 404 });
  if (!ALLOWED_MIME[row.mimeType]) return new NextResponse("Not found", { status: 404 });

  const body = new Uint8Array(row.bytes);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(body.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // The key carries a random component, so a stored file never changes
      // under the same URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
