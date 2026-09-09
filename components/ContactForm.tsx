"use client";

import { useState } from "react";
import { isValidEmail, suggestEmail } from "@/lib/email";

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
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (String(fd.get("website") || "")) return; // honeypot

    // the fields carry required and type="email", and the form no longer sets
    // noValidate, so the browser blocks an incomplete submit and points at the
    // offending field itself. No banner needed.
    const name = String(fd.get("name") || "").trim();
    const message = String(fd.get("message") || "").trim();

    /* type="email" alone is not enough: the HTML grammar accepts an address
       with no dot in it, so `homam@gmail` reaches the server and comes back
       as a generic failure after the send. Refuse it here, next to the field. */
    const value = email.trim();
    if (!isValidEmail(value)) {
      setEmailError("هذا البريد غير مكتمل — تأكدي من كتابته كاملًا، مثل name@example.com");
      document.getElementById("cf-email")?.focus();
      return;
    }
    setEmailError("");

    setStatus("sending");
    setError("");
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: value, message, source: "contact-page" }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        form.reset();
        setEmail("");
        setSuggestion(null);
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
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="cf-row">
        <label className="cf-field" htmlFor="cf-name">
          <span>الاسم</span>
          <input id="cf-name" className="cf-in" name="name" autoComplete="name" required />
        </label>
        <label className="cf-field" htmlFor="cf-email">
          <span>البريد الإلكتروني</span>
          <input
            id="cf-email"
            className={`cf-in ${emailError ? "cf-in-bad" : ""}`}
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError || suggestion ? "cf-email-note" : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
              setSuggestion(null);
            }}
            /* Checked on leaving the field, never while she is still typing —
               every address is invalid halfway through. */
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (!v) return;
              if (!isValidEmail(v)) {
                setEmailError("هذا البريد غير مكتمل — مثل name@example.com");
                return;
              }
              // Well-formed, but probably mistyped: `gmial.com` passes every
              // syntax check there is.
              setSuggestion(suggestEmail(v));
            }}
          />
          {(emailError || suggestion) && (
            <small className="cf-note" id="cf-email-note" role="alert">
              {emailError || (
                <>
                  هل تقصدين{" "}
                  <button
                    type="button"
                    className="cf-fix"
                    onClick={() => {
                      setEmail(suggestion!);
                      setSuggestion(null);
                    }}
                  >
                    <span dir="ltr">{suggestion}</span>
                  </button>
                  ؟
                </>
              )}
            </small>
          )}
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
        className="cf-hp"
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
