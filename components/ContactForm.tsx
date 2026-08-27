"use client";

import { useState } from "react";

/* Native contact form: posts straight to the admin inbox (content/leads.json)
   through the Railway API. On the GitHub Pages domain it targets the Railway
   host (CORS-allowed); on Railway itself and in dev it stays same-origin. */

const RAILWAY_ENDPOINT = "https://rak-production.up.railway.app/api/leads";

function endpoint(): string {
  const h = window.location.hostname;
  return h === "raheeqkanjo.com" || h === "www.raheeqkanjo.com"
    ? RAILWAY_ENDPOINT
    : "/api/leads";
}

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (String(fd.get("website") || "")) return; // honeypot

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();
    if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("الرجاء تعبئة الاسم والبريد ورسالة صحيحة");
      setStatus("err");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, source: "contact-page" }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        form.reset();
        setStatus("ok");
      } else {
        setError(j.error || "تعذّر الإرسال، الرجاء المحاولة مرة أخرى");
        setStatus("err");
      }
    } catch {
      setError("تعذّر الإرسال، تحقق من اتصالك بالإنترنت");
      setStatus("err");
    }
  }

  return (
    <form className="contact-form" noValidate onSubmit={onSubmit}>
      <div className="cf-row">
        <label className="cf-field" htmlFor="cf-name">
          <span>الاسم</span>
          <input id="cf-name" className="cf-in" name="name" autoComplete="name" required />
        </label>
        <label className="cf-field" htmlFor="cf-email">
          <span>البريد الإلكتروني</span>
          <input
            id="cf-email"
            className="cf-in"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
          />
        </label>
      </div>
      <label className="cf-field" htmlFor="cf-message">
        <span>رسالتك</span>
        <textarea
          id="cf-message"
          className="cf-in"
          name="message"
          rows={5}
          placeholder="احكِ لي عن خبرتك، المشروع والجمهور الذي تريد الوصول إليه"
          required
        />
      </label>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: -9999, width: 1, height: 1 }}
      />
      <button className="btn btn-gold cf-send" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "جارٍ الإرسال…" : status === "ok" ? "تم الإرسال ✓" : "تواصل معي"}
      </button>
      <p className="cf-status" role="status" aria-live="polite">
        {status === "ok"
          ? "وصلتني رسالتك، سأرد عليك قريبًا"
          : status === "err"
            ? error
            : ""}
      </p>
    </form>
  );
}
