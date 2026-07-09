"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_URL } from "./config";
import {
  type PostFile,
  type Project,
  type Lead,
  gh,
  readJson,
  loadPosts,
  PROJECTS_PATH,
  LEADS_PATH,
} from "./lib";
import {
  IconDashboard,
  IconAnalytics,
  IconBlog,
  IconProjects,
  IconLeads,
  IconPlus,
  IconView,
  IconExport,
  IconLogout,
  IconEye,
  IconEyeOff,
} from "./icons";
import DashboardHome from "./sections/DashboardHome";
import AnalyticsSection from "./sections/AnalyticsSection";
import BlogSection from "./sections/BlogSection";
import ProjectsSection from "./sections/ProjectsSection";
import LeadsSection from "./sections/LeadsSection";

type Section = "dashboard" | "analytics" | "blog" | "projects" | "leads";

const NAV: { id: Section; label: string; Icon: typeof IconDashboard }[] = [
  { id: "dashboard", label: "الرئيسية", Icon: IconDashboard },
  { id: "analytics", label: "التحليلات", Icon: IconAnalytics },
  { id: "blog", label: "المقالات", Icon: IconBlog },
  { id: "projects", label: "المشاريع", Icon: IconProjects },
  { id: "leads", label: "الرسائل", Icon: IconLeads },
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
  const [showPw, setShowPw] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [counts, setCounts] = useState({ posts: 0, drafts: 0, projects: 0, unread: 0 });
  const [newNonce, setNewNonce] = useState(0);
  const [confirmState, setConfirmState] =
    useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback(
    (message: string) => new Promise<boolean>((resolve) => setConfirmState({ message, resolve })),
    []
  );

  const refreshCounts = useCallback(async () => {
    try {
      const [posts, projects, leads] = await Promise.all([
        loadPosts().catch(() => [] as PostFile[]),
        readJson<Project[]>(PROJECTS_PATH, []).then((r) => r.data).catch(() => []),
        readJson<Lead[]>(LEADS_PATH, []).then((r) => r.data).catch(() => []),
      ]);
      setCounts({
        posts: posts.filter((p) => p.status !== "draft").length,
        drafts: posts.filter((p) => p.status === "draft").length,
        projects: Array.isArray(projects) ? projects.length : 0,
        unread: Array.isArray(leads) ? leads.filter((l) => !l.read).length : 0,
      });
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await gh("");
        if (!cancelled) {
          setAuthed(true);
          refreshCounts();
        }
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCounts]);

  // auto-dismiss success toasts
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 3800);
    return () => clearTimeout(t);
  }, [msg]);

  const goTo = useCallback((s: Section) => {
    setSection(s);
    setErr("");
  }, []);

  const startNew = (target: "blog" | "projects") => {
    setSection(target);
    setErr("");
    setNewNonce((n) => n + 1);
  };

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
      refreshCounts();
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `raheeq-content-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMsg("تم تصدير المحتوى ✓");
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
        <form
          className="adm-login"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <span className="slug">لوحة التحكم</span>
          <h1>مرحبًا رحيق 👋</h1>
          <label htmlFor="adm-pw">أدخلي كلمة المرور للدخول إلى لوحة التحكم:</label>
          <div className="adm-pw-wrap">
            <input
              id="adm-pw"
              type={showPw ? "text" : "password"}
              dir="ltr"
              autoComplete="current-password"
              placeholder="كلمة المرور…"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
            />
            <button
              type="button"
              className="adm-pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={showPw}
            >
              {showPw ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          <button className="btn btn-gold" type="submit" disabled={!pwInput.trim() || loggingIn}>
            {loggingIn ? "جارٍ الدخول…" : "دخول"}
          </button>
          {err && <p className="adm-err" role="alert">{err}</p>}
          <p className="adm-muted" style={{ marginTop: 14, fontSize: 13 }}>
            نسيتِ كلمة المرور؟ اطلبيها ممن يدير الموقع.
          </p>
        </form>
      </div>
    );
  }

  const t = TITLES[section];
  const badge = (s: Section) => {
    if (s === "leads" && counts.unread) return { n: counts.unread, kind: "unread" };
    if (s === "blog" && counts.posts + counts.drafts) return { n: counts.posts + counts.drafts, kind: "count" };
    if (s === "projects" && counts.projects) return { n: counts.projects, kind: "count" };
    return null;
  };

  return (
    <div className="adm-app">
      <aside className="adm-side">
        <div className="adm-brand">
          <b>لوحة</b> <span>رحيق</span>
        </div>
        <div className="adm-nav" role="navigation" aria-label="أقسام لوحة التحكم">
          {NAV.map((n) => {
            const b = badge(n.id);
            return (
              <button
                key={n.id}
                className={`adm-nav-item ${section === n.id ? "active" : ""}`}
                aria-current={section === n.id ? "page" : undefined}
                onClick={() => goTo(n.id)}
              >
                <span className="adm-nav-icon">
                  <n.Icon />
                </span>
                <span className="adm-nav-label">{n.label}</span>
                {b && (
                  <span className={`adm-nav-badge ${b.kind}`}>
                    {b.n}
                    <span className="adm-sr">
                      {b.kind === "unread" ? " رسالة غير مقروءة" : ""}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="adm-side-foot">
          <button className="adm-side-link" onClick={exportContent}>
            <IconExport /> تصدير المحتوى
          </button>
          <a className="adm-side-link" href={SITE_URL} target="_blank" rel="noopener">
            <IconView /> عرض الموقع
          </a>
          <button className="adm-side-link" onClick={logout}>
            <IconLogout /> خروج
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-main-head">
          <div>
            <h1>{t.h}</h1>
            <p className="adm-muted">{t.sub}</p>
          </div>
          {(section === "dashboard" || section === "blog") && (
            <button className="btn btn-gold adm-head-cta" onClick={() => startNew("blog")}>
              <IconPlus /> مقال جديد
            </button>
          )}
          {section === "projects" && (
            <button className="btn btn-gold adm-head-cta" onClick={() => startNew("projects")}>
              <IconPlus /> مشروع جديد
            </button>
          )}
        </header>

        {section === "dashboard" && (
          <DashboardHome onErr={setErr} goTo={goTo} counts={counts} />
        )}
        {section === "analytics" && <AnalyticsSection />}
        {section === "blog" && (
          <BlogSection
            onMsg={setMsg}
            onErr={setErr}
            confirm={confirm}
            onChange={refreshCounts}
            newNonce={newNonce}
          />
        )}
        {section === "projects" && (
          <ProjectsSection
            onMsg={setMsg}
            onErr={setErr}
            confirm={confirm}
            onChange={refreshCounts}
            newNonce={newNonce}
          />
        )}
        {section === "leads" && (
          <LeadsSection onMsg={setMsg} onErr={setErr} confirm={confirm} onChange={refreshCounts} />
        )}
      </main>

      {/* toasts */}
      <div className="adm-toasts">
        {msg && (
          <div className="adm-toast ok" role="status">
            {msg}
          </div>
        )}
        {err && (
          <div className="adm-toast bad" role="alert">
            <span>{err}</span>
            <button className="adm-toast-x" onClick={() => setErr("")} aria-label="إغلاق">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* branded confirm */}
      {confirmState && (
        <div className="adm-modal-overlay" role="dialog" aria-modal="true">
          <div className="adm-modal">
            <p>{confirmState.message}</p>
            <div className="adm-modal-actions">
              <button
                className="btn btn-gold"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
              >
                تأكيد
              </button>
              <button
                className="adm-link"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
