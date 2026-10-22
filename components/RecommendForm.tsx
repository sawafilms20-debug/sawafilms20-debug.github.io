"use client";

import { useEffect, useRef, useState } from "react";
import { isValidEmail, suggestEmail } from "@/lib/email";

/* The recommendation form, reached through the link she sends.

   Everything a person writes here goes to her dashboard and waits; nothing is
   published from this page.

   Two ways in, chosen when the page opens. The full one posts to
   /api/recommend, with the photo, into the review queue. That endpoint only
   exists once the dashboard server has been deployed with it — and the page,
   being static, can go live before that. Until then the form asks for a
   LinkedIn profile link in place of the photo and sends through the contact
   endpoint every deployed server already has, so recommendations land in her
   messages instead of being lost. The page switches to the full form by
   itself the first time the new endpoint answers. */

const RAILWAY = "https://rak-production.up.railway.app";

function api(path: string): string {
  const h = window.location.hostname;
  return (h === "raheeqkanjo.com" || h === "www.raheeqkanjo.com" ? RAILWAY : "") + path;
}

/** Is the review-queue endpoint deployed? Its public sibling answers 200 when it is. */
async function hasQueue(): Promise<boolean> {
  try {
    const r = await fetch(api("/api/testimonials"), { cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

// Mirrors RECOMMEND_LIMITS in lib/recommend.ts, which the server enforces.
const LIMITS = { name: 120, title: 160, textMin: 20, text: 1500 };
const PHOTO_SIDE = 512;

/* A phone photo is several megabytes and carries the GPS position it was taken
   at. Redrawing it on a canvas as a small square JPEG fixes both: the upload is
   tens of kilobytes, and only pixels survive the trip — no metadata. */
async function squarePhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("decode");
    const out = Math.min(PHOTO_SIDE, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    // Centre crop: faces are rarely at the edge of a portrait.
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out
    );
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob) throw new Error("encode");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function RecommendForm() {
  const [mode, setMode] = useState<"full" | "messages" | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hasQueue().then((ok) => setMode(ok ? "full" : "messages"));
  }, []);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  async function onPhoto(file: File | undefined) {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("اختر صورة — JPG أو PNG.");
      return;
    }
    try {
      setPhoto(await squarePhoto(file));
    } catch {
      setPhotoError("تعذّرت قراءة هذه الصورة. جرّب صورة بصيغة JPG أو PNG.");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (String(fd.get("website") || "")) return;

    const value = email.trim();
    if (!isValidEmail(value)) {
      setEmailError("هذا البريد غير مكتمل — مثل name@example.com");
      document.getElementById("rf-email")?.focus();
      return;
    }
    if (text.trim().length < LIMITS.textMin) {
      setError("التوصية قصيرة جدًا — جملة أو جملتان على الأقل.");
      setStatus("err");
      document.getElementById("rf-text")?.focus();
      return;
    }

    const name = String(fd.get("name") || "").trim();
    const title = String(fd.get("title") || "").trim();
    const profile = String(fd.get("profile") || "").trim();

    let req: RequestInit;
    let url: string;
    if (mode === "full") {
      const body = new FormData();
      body.set("name", name);
      body.set("title", title);
      body.set("text", text.trim());
      body.set("email", value);
      body.set("consent", fd.get("consent") ? "yes" : "");
      if (photo) body.set("photo", photo, "photo.jpg");
      // multipart without custom headers: a simple request, so no preflight
      url = api("/api/recommend");
      req = { method: "POST", body };
    } else {
      /* Into her messages, laid out so it reads as what it is. The consent
         is stated in the message because there is no other field to hold it. */
      const head = [
        "توصية للموقع",
        `الاسم: ${name}`,
        `المسمّى الوظيفي: ${title}`,
        ...(profile ? [`LinkedIn: ${profile}`] : []),
        "وافق على نشرها باسمه ومسمّاه الوظيفي وصورته: نعم",
      ];
      const message = `${head.join("\n")}\n\n${text.trim()}`;
      url = api("/api/leads");
      req = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: value,
          message,
          source: "recommendation",
          serviceInterest: title.slice(0, 100),
        }),
      };
    }

    setStatus("sending");
    setError("");
    try {
      const res = await fetch(url, req);
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setStatus("ok");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(j.error || "تعذّر الإرسال، الرجاء المحاولة مرة أخرى.");
        setStatus("err");
      }
    } catch {
      setError("تعذّر الإرسال، تحقق من اتصالك بالإنترنت.");
      setStatus("err");
    }
  }

  if (mode === null) return null;

  if (status === "ok") {
    return (
      <div className="rf-done" role="status">
        <h2>وصلت توصيتك — شكرًا من القلب</h2>
      </div>
    );
  }

  const left = LIMITS.text - text.length;

  return (
    <form className="contact-form rf-form" onSubmit={onSubmit}>
      <div className="cf-row">
        <label className="cf-field" htmlFor="rf-name">
          <span>
            الاسم الكامل <i className="rf-en">Full name</i>
          </span>
          <input
            id="rf-name"
            className="cf-in"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={LIMITS.name}
          />
        </label>
        <label className="cf-field" htmlFor="rf-title">
          <span>
            المسمّى الوظيفي <i className="rf-en">Position</i>
          </span>
          <input
            id="rf-title"
            className="cf-in"
            name="title"
            autoComplete="organization-title"
            placeholder="مثال: مديرة تسويق · شركة كذا"
            required
            maxLength={LIMITS.title}
          />
        </label>
      </div>

      <label className="cf-field" htmlFor="rf-text">
        <span>
          التوصية <i className="rf-en">Your recommendation</i>
        </span>
        <textarea
          id="rf-text"
          className="cf-in"
          name="text"
          rows={6}
          /* auto, so an English recommendation reads left to right — but only
             once there is text: an empty auto field is left-to-right, which
             puts the caret of someone starting in Arabic on the wrong side. */
          dir={text.trim() ? "auto" : "rtl"}
          required
          maxLength={LIMITS.text}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {left < 200 && (
          <small className="rf-count" aria-live="polite">
            {left} حرفًا متبقيًا
          </small>
        )}
      </label>

      <label className="cf-field" htmlFor="rf-email">
        <span>
          البريد الإلكتروني <i className="rf-en">Email</i>
        </span>
        <input
          id="rf-email"
          className={`cf-in ${emailError ? "cf-in-bad" : ""}`}
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby="rf-email-note"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError("");
            setSuggestion(null);
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (!v) return;
            if (!isValidEmail(v)) {
              setEmailError("هذا البريد غير مكتمل — مثل name@example.com");
              return;
            }
            setSuggestion(suggestEmail(v));
          }}
        />
        <small className="cf-note rf-hint" id="rf-email-note" role={emailError ? "alert" : undefined}>
          {emailError ||
            (suggestion ? (
              <>
                هل تقصد{" "}
                <button
                  type="button"
                  className="cf-fix"
                  onClick={() => {
                    setEmail(suggestion);
                    setSuggestion(null);
                  }}
                >
                  <span dir="ltr">{suggestion}</span>
                </button>
                ؟
              </>
            ) : (
              "لن يظهر على الموقع — فقط لتتمكن رحيق من شكرك."
            ))}
        </small>
      </label>

      {mode === "messages" ? (
        <label className="cf-field" htmlFor="rf-profile">
          <span>
            رابط حسابك على LinkedIn <i className="rf-en">LinkedIn profile</i>{" "}
            <em className="rf-opt">اختياري</em>
          </span>
          <input
            id="rf-profile"
            className="cf-in"
            name="profile"
            type="url"
            dir="ltr"
            inputMode="url"
            maxLength={300}
            placeholder="https://www.linkedin.com/in/…"
          />
          <small className="rf-hint">تؤخذ منه صورتك لتظهر بجانب التوصية.</small>
        </label>
      ) : (
      <div className="cf-field">
        <span>
          صورتك الشخصية <i className="rf-en">Profile photo</i>{" "}
          <em className="rf-opt">اختيارية</em>
        </span>
        <div className="rf-photo">
          {preview ? (
            <img src={preview} alt="صورتك كما ستظهر" width={72} height={72} />
          ) : (
            <span className="rf-photo-empty" aria-hidden="true" />
          )}
          <div className="rf-photo-actions">
            <button
              type="button"
              className="rf-photo-btn"
              onClick={() => fileInput.current?.click()}
            >
              {photo ? "اختر صورة أخرى" : "اختر صورة"}
            </button>
            {photo && (
              <button
                type="button"
                className="rf-photo-remove"
                onClick={() => {
                  setPhoto(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                إزالة
              </button>
            )}
            <small className="rf-hint">تُقصّ مربعًا حول المنتصف، كما في LinkedIn.</small>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </div>
        {photoError && (
          <small className="cf-note" role="alert">
            {photoError}
          </small>
        )}
      </div>
      )}

      <label className="rf-consent">
        <input type="checkbox" name="consent" required />
        <span>أوافق على نشر هذه التوصية باسمي ومسمّاي الوظيفي وصورتي على موقع رحيق كنجو.</span>
      </label>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="cf-hp"
      />
      <button className="btn btn-gold cf-send" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "جارٍ الإرسال…" : "أرسل التوصية"}
      </button>
      <p className="cf-status err" role="status" aria-live="polite">
        {status === "err" ? error : ""}
      </p>
    </form>
  );
}
