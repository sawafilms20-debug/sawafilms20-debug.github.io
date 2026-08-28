import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, adminFromToken } from "@/lib/auth";
import { hasDb, migrate, tx } from "@/lib/db";
import { originOk, corsHeaders } from "@/lib/net";
import { rateLimit } from "@/lib/rateLimit";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, mediaUrl, safeStorageKey } from "@/lib/media";
import { imageSize } from "@/lib/imageSize";

/* Multipart upload. Separate from the RPC endpoint because that one speaks
   JSON; everything else about it — auth, origin check, rate limit — is the
   same and is repeated here deliberately rather than skipped. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));
  if (!originOk(req)) {
    return NextResponse.json({ error: "طلب من مصدر غير مسموح." }, { status: 403, headers: cors });
  }
  if (!hasDb()) {
    return NextResponse.json({ error: "قاعدة البيانات غير متصلة." }, { status: 503, headers: cors });
  }
  await migrate();

  const admin = await adminFromToken(req.cookies.get(COOKIE_NAME)?.value);
  if (!admin) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401, headers: cors });
  }
  const limited = rateLimit(`upload:u${admin.id}`, 60, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "رفع كثير. حاولي بعد قليل." }, { status: 429, headers: cors });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "لم يصل الملف." }, { status: 400, headers: cors });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يصل الملف." }, { status: 400, headers: cors });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `الحجم الأقصى ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} ميغابايت.` },
      { status: 413, headers: cors }
    );
  }

  const mime = file.type;
  if (!ALLOWED_MIME[mime]) {
    return NextResponse.json(
      { error: "نوع الملف غير مسموح. الصور وملفات PDF فقط." },
      { status: 415, headers: cors }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storageKey = safeStorageKey(file.name, mime);
  const dims = imageSize(buf, mime);

  // Metadata and bytes go in together. Written as two autocommit statements, a
  // failure on the second leaves a library entry whose URL can never resolve —
  // and which the operator can then place on a live page.
  const row = await tx(async (c) => {
    const inserted = await c.query<{ id: number }>(
      `INSERT INTO media_assets
         ("storageKey", url, "fileName", "mimeType", "sizeBytes", width, height,
          "altAr", "uploadedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        storageKey,
        mediaUrl(storageKey),
        file.name.slice(0, 255) || "file",
        mime,
        buf.byteLength,
        dims?.width ?? null,
        dims?.height ?? null,
        (form.get("altAr") as string | null)?.slice(0, 500) || null,
        admin.id,
      ]
    );
    await c.query(`INSERT INTO media_blobs ("storageKey", bytes) VALUES ($1,$2)`, [
      storageKey,
      buf,
    ]);
    return inserted.rows[0];
  });

  return NextResponse.json(
    {
      data: {
        id: row?.id,
        storageKey,
        url: mediaUrl(storageKey),
        fileName: file.name,
        mimeType: mime,
        sizeBytes: buf.byteLength,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
      },
    },
    { headers: cors }
  );
}
