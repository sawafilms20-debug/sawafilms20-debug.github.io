"use client";

import { useState } from "react";

/* Blog subscribe. Reuses the existing leads endpoint (the same inbox the contact
   form writes to), so a subscriber shows up in the admin with source
   "blog-subscribe" — no new backend, no third-party service. */

const RAILWAY = "https://rak-production.up.railway.app/api/leads";

function endpoint(): string {
  const h = window.location.hostname;
  return h === "raheeqkanjo.com" || h === "www.raheeqkanjo.com" ? RAILWAY : "/api/leads";
}

export default function SubscribeForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("الرجاء إدخال بريد إلكتروني صحيح");
      setStatus("err");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "مشترك في المدونة",
          email,
          message: "طلب اشتراك في المدونة",
          source: "blog-subscribe",
        }),
      });
      if (res.ok) {
        form.reset();
        setStatus("ok");
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error || "تعذّر الاشتراك، حاول مرة أخرى");
        setStatus("err");
      }
    } catch {
      setError("تعذّر الاشتراك، تحقق من اتصالك بالإنترنت");
      setStatus("err");
    }
  }

  return (
    <form className="sub-form" noValidate onSubmit={onSubmit}>
      <label className="sub-field" htmlFor="sub-email">
        <span>بريدك الإلكتروني</span>
        <input id="sub-email" name="email" type="email" dir="ltr" autoComplete="email" required />
      </label>
      <button className="btn btn-gold" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "جارٍ الاشتراك…" : status === "ok" ? "تم الاشتراك ✓" : "اشترك"}
      </button>
      <p className="sub-status" role="status" aria-live="polite">
        {status === "ok" ? "وصلني اشتراكك، سأكتب لك قريبًا" : status === "err" ? error : ""}
      </p>
    </form>
  );
}
