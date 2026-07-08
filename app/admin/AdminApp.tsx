"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_URL } from "./config";
import { gh, readJson, loadPosts, PROJECTS_PATH, LEADS_PATH } from "./lib";
import DashboardHome from "./sections/DashboardHome";
import AnalyticsSection from "./sections/AnalyticsSection";
import BlogSection from "./sections/BlogSection";
import ProjectsSection from "./sections/ProjectsSection";
import LeadsSection from "./sections/LeadsSection";

type Section = "dashboard" | "analytics" | "blog" | "projects" | "leads";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "الرئيسية", icon: "▦" },
  { id: "analytics", label: "التحليلات", icon: "▤" },
  { id: "blog", label: "المقالات", icon: "✎" },
  { id: "projects", label: "المشاريع", icon: "◳" },
  { id: "leads", label: "الرسائل", icon: "✉" },
];

const TITLES: Record<Section, { h: string; sub: string }> = {
  dashboard: { h: "الرئيسية", sub: "كل ما على موقعك، في مكان واحد." },
  analytics: { h: "التحليلات", sub: "من يزور موقعك، من أين، وكيف يتفاعل." },
  blog: { h: "المقالات", sub: "اكتبي وانشري وعدّلي مقالات مدوّنتك." },
  projects: { h: "المشاريع", sub: "أعمالك ومشاريعك التي تظهر على الموقع." },
  leads: { h: "الرسائل", sub: "رسائل نموذج التواصل من زوّار موقعك." },
};

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await gh("");
        if (!cancelled) setAuthed(true);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // clear transient messages when switching sections
  const goTo = useCallback((s: Section) => {
    setSection(s);
    setMsg("");
    setErr("");
  }, []);

  const login = async () => {
    const password = pwInput.trim();
    if (!password) return;
    setErr("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذّر تسجيل الدخول.");
      setPwInput("");
      setAuthed(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "تعذّر تسجيل الدخول.");
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    setPwInput("");
    setAuthed(false);
    setSection("dashboard");
  };

  const exportContent = async () => {
    setErr("");
    try {
      const [posts, projects, leads] = await Promise.all([
        loadPosts().catch(() => []),
        readJson(PROJECTS_PATH, []).then((r) => r.data),
        readJson(LEADS_PATH, []).then((r) => r.data),
      ]);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), posts, projects, leads }, null, 2)],
        { type: "application/json" }
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `raheeq-content-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: unknown) {
      setErr(`تعذّر التصدير — ${e instanceof Error ? e.message : e}`);
    }
  };

  if (authed === null) {
    return (
      <div className="adm-shell">
        <p className="adm-muted">جارٍ الفتح…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="adm-shell">
        <div className="adm-login">
          <span className="slug">لوحة التحكم</span>
          <h1>مرحبًا رحيق 👋</h1>
          <p>أدخلي كلمة المرور للدخول إلى لوحة التحكم:</p>
          <input
            type="password"
            dir="ltr"
            placeholder="كلمة المرور…"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          <button className="btn btn-gold" disabled={!pwInput.trim() || loggingIn} onClick={login}>
            {loggingIn ? "جارٍ الدخول…" : "دخول"}
          </button>
          {err && <p className="adm-err">{err}</p>}
          <p className="adm-muted" style={{ marginTop: 14, fontSize: 13 }}>
            نسيتِ كلمة المرور؟ اطلبيها ممن يدير الموقع.
          </p>
        </div>
      </div>
    );
  }

  const t = TITLES[section];

  return (
    <div className="adm-app">
      <aside className="adm-side">
        <div className="adm-brand">
          <b>لوحة</b> <span>رحيق</span>
        </div>
        <div className="adm-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`adm-nav-item ${section === n.id ? "active" : ""}`}
              onClick={() => goTo(n.id)}
            >
              <span className="adm-nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
        <div className="adm-side-foot">
          <button className="adm-side-link" onClick={exportContent}>
            ⭳ تصدير المحتوى
          </button>
          <a className="adm-side-link" href={SITE_URL} target="_blank" rel="noopener">
            ⤢ عرض الموقع
          </a>
          <button className="adm-side-link" onClick={logout}>
            ⏻ خروج
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-main-head">
          <div>
            <h1>{t.h}</h1>
            <p className="adm-muted">{t.sub}</p>
          </div>
        </header>

        {msg && <p className="adm-ok">{msg}</p>}
        {err && <p className="adm-err">{err}</p>}

        {section === "dashboard" && <DashboardHome onErr={setErr} goTo={goTo} />}
        {section === "analytics" && <AnalyticsSection />}
        {section === "blog" && <BlogSection onMsg={setMsg} onErr={setErr} />}
        {section === "projects" && <ProjectsSection onMsg={setMsg} onErr={setErr} />}
        {section === "leads" && <LeadsSection onMsg={setMsg} onErr={setErr} />}
      </main>
    </div>
  );
}
