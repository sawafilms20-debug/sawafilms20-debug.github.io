import { NextResponse } from "next/server";
import { hasDb, migrate, tx } from "@/lib/db";
import { clientIp, publicCorsHeaders as corsHeaders } from "@/lib/net";
import { rateLimit } from "@/lib/rateLimit";
import { recordError } from "@/lib/errorLog";
import { isValidEmail } from "@/lib/email";
import { mediaUrl, safeStorageKey, sniffMime } from "@/lib/media";
import { imageSize } from "@/lib/imageSize";
import { RECOMMEND_LIMITS as L, inviteTokenMatches } from "@/lib/recommend";

/* Where the recommendation form posts.

   Anyone holding the link can call this, and the link is sent to many people,
   so nothing that arrives here is shown to anyone until she approves it. The
   row lands hidden and marked pending; the dashboard is the only place it
   appears.

   The photo is the part that needs care. Only JPEG, PNG and WebP, decided by
   the bytes and not by what the upload claims, because the media route serves
   these files back from this origin. The page shrinks and re-encodes the photo
   before sending it, which also strips the GPS position a phone writes into
   every picture it takes — but the server does not rely on that. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BODY = L.photoBytes + 64_000;

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const clip = (v: FormDataEntryValue | null, n: number) =>
  (typeof v === "string" ? v : "").replace(/\u0000/g, "").trim().slice(0, n);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: cors });

  if (!rateLimit(`recommend:${clientIp(req)}`, 6, 60 * 60 * 1000).ok) {
    return fail("وصلَنا عدد كبير من المحاولات. حاول مرة أخرى بعد قليل.", 429);
  }
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) {
    return fail("الصورة كبيرة جدًا. اختر صورة أصغر من 5 ميغابايت.", 413);
  }
  if (!hasDb()) return fail("الخدمة غير متاحة الآن. حاول لاحقًا.", 503);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("لم تصل التوصية كاملة. حاول مرة أخرى.", 400);
  }

  // Honeypot: a field nobody can see. Answer as if it worked.
  if (clip(form.get("website"), 100)) {
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  await migrate();

  if (!(await inviteTokenMatches(clip(form.get("k"), 100)))) {
    return fail("هذا الرابط لم يعد يعمل. اطلب من رحيق رابطًا جديدًا.", 403);
  }

  const name = clip(form.get("name"), L.name);
  const title = clip(form.get("title"), L.title);
  const text = clip(form.get("text"), L.text + 1);
  const email = clip(form.get("email"), 320);
  const consent = clip(form.get("consent"), 10) === "yes";

  if (name.length < 2) return fail("اكتب اسمك الكامل.", 422);
  if (!title) return fail("اكتب مسمّاك الوظيفي.", 422);
  if (text.length < L.textMin) return fail("التوصية قصيرة جدًا — جملة أو جملتان على الأقل.", 422);
  if (text.length > L.text) return fail(`التوصية أطول من ${L.text} حرف.`, 422);
  if (!isValidEmail(email)) return fail("البريد الإلكتروني غير مكتمل.", 422);
  if (!consent) return fail("نحتاج موافقتك على نشر التوصية باسمك.", 422);

  let photo: { buf: Buffer; mime: string; name: string } | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > L.photoBytes) return fail("الصورة كبيرة جدًا. اختر صورة أصغر من 5 ميغابايت.", 413);
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniffMime(buf);
    if (!mime || !PHOTO_MIME.has(mime)) {
      return fail("الصورة يجب أن تكون JPG أو PNG أو WebP.", 415);
    }
    photo = { buf, mime, name: file.name || "photo" };
  }

  try {
    await tx(async (c) => {
      let photoKey: string | null = null;
      if (photo) {
        photoKey = safeStorageKey(`recommendation-${photo.name}`, photo.mime);
        const dims = imageSize(photo.buf, photo.mime);
        await c.query(
          `INSERT INTO media_assets
             ("storageKey", url, "fileName", "mimeType", "sizeBytes", width, height, "altAr")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            photoKey,
            mediaUrl(photoKey),
            photo.name.slice(0, 255),
            photo.mime,
            photo.buf.byteLength,
            dims?.width ?? null,
            dims?.height ?? null,
            `صورة ${name}`.slice(0, 500),
          ]
        );
        await c.query(`INSERT INTO media_blobs ("storageKey", bytes) VALUES ($1,$2)`, [
          photoKey,
          photo.buf,
        ]);
      }

      /* Sending it twice — after spotting a typo, or because the first attempt
         looked like it failed — replaces the one still waiting rather than
         queueing a second copy. An approved recommendation is never touched
         from here; only she can change what is on the site. */
      const prior = await c.query<{ id: number; submittedPhotoKey: string | null }>(
        `SELECT id, "submittedPhotoKey" FROM testimonials
          WHERE "pendingReview" AND lower("submitterEmail") = lower($1)
          ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [email]
      );
      const existing = prior.rows[0];

      if (existing) {
        await c.query(
          `UPDATE testimonials
              SET "quoteAr" = $2, "authorName" = $3, "authorTitleAr" = $4,
                  "submitterEmail" = $5, "submittedAt" = now(),
                  "authorPhoto"       = COALESCE($6, "authorPhoto"),
                  "submittedPhotoKey" = COALESCE($7, "submittedPhotoKey")
            WHERE id = $1`,
          [existing.id, text, name, title, email, photoKey ? mediaUrl(photoKey) : null, photoKey]
        );
        // The photo it replaced belonged to nobody else.
        if (photoKey && existing.submittedPhotoKey) {
          await c.query(`DELETE FROM media_blobs WHERE "storageKey" = $1`, [existing.submittedPhotoKey]);
          await c.query(`DELETE FROM media_assets WHERE "storageKey" = $1`, [existing.submittedPhotoKey]);
        }
      } else {
        await c.query(
          `INSERT INTO testimonials
             ("quoteAr","authorName","authorTitleAr","authorPhoto","displayOrder","isVisible",
              "pendingReview","submitterEmail","submittedAt","submittedPhotoKey")
           VALUES ($1,$2,$3,$4,
                   (SELECT COALESCE(max("displayOrder"), -1) + 1 FROM testimonials),
                   FALSE, TRUE, $5, now(), $6)`,
          [text, name, title, photoKey ? mediaUrl(photoKey) : null, email, photoKey]
        );
      }
    });
  } catch (e) {
    await recordError(
      e instanceof Error ? e.message : "recommendation insert failed",
      e instanceof Error ? e.stack : undefined,
      "/api/recommend"
    );
    return fail("تعذّر حفظ التوصية. حاول مرة أخرى.", 500);
  }

  return NextResponse.json({ ok: true }, { headers: cors });
}
