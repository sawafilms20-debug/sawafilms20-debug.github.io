"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SITE_URL } from "./config";
import { rpc, RpcError } from "./rpc";
import { ToastProvider, useConfirm, Dialog } from "./ui";
import type { Counts, SectionId } from "./types";
import {
  IconArticles,
  IconBug,
  IconClose,
  IconDashboard,
  IconExport,
  IconEye,
  IconEyeOff,
  IconLeads,
  IconLogout,
  IconMedia,
  IconMenu,
  IconNewsletter,
  IconPages,
  IconPlus,
  IconPublish,
  IconSeo,
  IconServices,
  IconSettings,
  IconSteps,
  IconTestimonials,
  IconUsers,
  IconView,
} from "./icons";

import DashboardHome from "./sections/DashboardHome";
import ArticlesSection from "./sections/ArticlesSection";
import PageTextSection from "./sections/PageTextSection";
import ServicesSection from "./sections/ServicesSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import ProcessStepsSection from "./sections/ProcessStepsSection";
import MediaSection from "./sections/MediaSection";
import EnquiriesSection from "./sections/EnquiriesSection";
import NewsletterSection from "./sections/NewsletterSection";
import SeoSection from "./sections/SeoSection";
import SiteSettingsSection from "./sections/SiteSettingsSection";
import AdminUsersSection from "./sections/AdminUsersSection";
import AccountSection from "./sections/AccountSection";
import ErrorLogSection from "./sections/ErrorLogSection";

type NavItem = {
  id: SectionId;
  label: string;
  english: string;
  Icon: typeof IconDashboard;
  ownerOnly?: boolean;
};

type NavGroup = { label: string | null; items: NavItem[] };

/* Twelve destinations, three headings, nothing folded away.

   It was eighteen, in collapsible groups, and the owner could not find her own
   blog in it. Four of those screens have been merged or dropped rather than
   renamed: the traffic «نظرة عامة» said the same thing as this dashboard and is
   now part of it, «الأسئلة الشائعة» and «الأرقام» edited data that no page on
   the site renders, and the error log belongs to whoever maintains the site.

   The blog is called المدونة here because that is what it is called in the
   site's own navigation. «المقالات» is the name of a service she sells. */
const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ id: "dashboard", label: "لوحة التحكم", english: "Dashboard", Icon: IconDashboard }],
  },
  {
    label: "موقعك",
    items: [
      { id: "articles", label: "المدونة", english: "Blog", Icon: IconArticles },
      { id: "pageText", label: "نصوص الصفحات", english: "Page text", Icon: IconPages },
      { id: "services", label: "الخدمات", english: "Services", Icon: IconServices },
      { id: "testimonials", label: "التوصيات", english: "Testimonials", Icon: IconTestimonials },
      { id: "processSteps", label: "خطوات العمل", english: "Process steps", Icon: IconSteps },
      { id: "media", label: "الصور", english: "Images", Icon: IconMedia },
    ],
  },
  {
    label: "من يتواصل معك",
    items: [
      { id: "enquiries", label: "الرسائل", english: "Enquiries", Icon: IconLeads },
      { id: "newsletter", label: "المشتركون", english: "Subscribers", Icon: IconNewsletter },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { id: "seo", label: "ظهورك في جوجل", english: "SEO", Icon: IconSeo },
      { id: "siteSettings", label: "إعدادات الموقع", english: "Site settings", Icon: IconSettings },
      { id: "account", label: "حسابي", english: "My account", Icon: IconUsers },
    ],
  },
];

/* Off the sidebar, still addressable. The quick search is where a maintainer
   looks for it and the owner never does. */
const HIDDEN: NavItem[] = [
  { id: "errorLog", label: "سجل الأخطاء", english: "Error log", Icon: IconBug },
];

const TITLES: Record<SectionId, { h: string; sub: string }> = {
  dashboard: { h: "لوحة التحكم", sub: "زوّار موقعك، ورسائلك، وما ينتظر النشر." },
  articles: { h: "المدونة", sub: "اكتبي مقالًا جديدًا، أو عدّلي مقالًا منشورًا." },
  pageText: { h: "نصوص الصفحات", sub: "كل نص مكتوب على الموقع، قابل للتعديل من هنا." },
  services: { h: "الخدمات", sub: "الخدمات التي تظهر على الصفحة الرئيسية." },
  testimonials: { h: "التوصيات", sub: "توصيات العملاء، بالترتيب الذي تظهر به." },
  processSteps: { h: "خطوات العمل", sub: "قسم «كيف أعمل؟» على الصفحة الرئيسية." },
  media: { h: "الصور", sub: "الصور المرفوعة، جاهزة لإعادة الاستخدام." },
  enquiries: { h: "الرسائل", sub: "رسائل نموذج التواصل، من الوصول حتى الرد." },
  newsletter: { h: "المشتركون", sub: "المشتركون في نشرتك البريدية." },
  seo: { h: "ظهورك في جوجل", sub: "عنوان ووصف وصورة كل صفحة في نتائج البحث." },
  siteSettings: { h: "إعدادات الموقع", sub: "الشعار، روابط التواصل، وبيانات الاتصال." },
  account: { h: "حسابي", sub: "كلمة المرور، التحقق بخطوتين، ومن يدخل إلى اللوحة." },
  errorLog: { h: "سجل الأخطاء", sub: "أخطاء وقعت على الموقع المنشور." },
};

type Me = {
  user: { id: number; email: string; name: string; role: "owner" | "editor"; twoFactor: boolean } | null;
  dbConnected: boolean;
};

/* A deep link, so the phone can hold a shortcut to one screen.
   /admin#linkedin        → the LinkedIn queue
   /admin#linkedin-paste  → the queue with the paste box already open */
const HASH_ROUTES: Record<string, SectionId> = {
  "#linkedin": "articles",
  "#linkedin-paste": "articles",
  "#blog": "articles",
  "#messages": "enquiries",
};

/** Read once, at load. Later navigation is by the sidebar, not the URL. */
function initialHash(): string {
  if (typeof window === "undefined") return "";
  return HASH_ROUTES[window.location.hash] ? window.location.hash : "";
}

export default function AdminApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [hash] = useState(initialHash);
  const [section, setSection] = useState<SectionId>(
    () => HASH_ROUTES[initialHash()] ?? "dashboard"
  );
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: "ok" | "bad" }[]>([]);
  const [counts, setCounts] = useState<Counts>({
    articles: 0,
    drafts: 0,
    enquiriesAwaiting: 0,
    openErrors: 0,
  });
  const [newNonce, setNewNonce] = useState(0);
  const [pendingNew, setPendingNew] = useState<SectionId | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const toastId = useRef(0);
  const { confirm, confirmElement } = useConfirm();

  const toast = useCallback((message: string, kind: "ok" | "bad" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    if (kind === "ok") {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const s = await rpc.dashboard.summary<{
        published: number;
        drafts: number;
        enquiriesAwaiting: number;
        openErrors: number;
      }>();
      setCounts({
        articles: s.published,
        drafts: s.drafts,
        enquiriesAwaiting: s.enquiriesAwaiting,
        openErrors: s.openErrors,
      });
    } catch {
      /* badges are decoration; a failure here must not blank the dashboard */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    rpc.auth
      .me<Me>()
      .then((r) => {
        if (cancelled) return;
        setMe(r);
        if (r.user) refreshCounts();
      })
      .catch(() => {
        if (!cancelled) setMe({ user: null, dbConnected: true });
      });
    return () => {
      cancelled = true;
    };
  }, [refreshCounts]);

  // Cmd/Ctrl+K opens the palette from anywhere, including inside a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (pendingNew && section === pendingNew) {
      setNewNonce((n) => n + 1);
      setPendingNew(null);
    }
  }, [pendingNew, section]);

  const goTo = useCallback((s: SectionId) => {
    setSection(s);
    setDrawerOpen(false);
    setPaletteOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  const role = me?.user?.role ?? "editor";

  const visibleNav = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.ownerOnly || role === "owner"),
      })).filter((g) => g.items.length),
    [role]
  );

  /* Publish asks the server what it WOULD write before writing anything, so the
     operator confirms a real number rather than a promise — and so a site with
     Markdown articles that were never imported cannot be published into a
     half-migrated state. */
  const publishNow = async () => {
    setPublishing(true);
    try {
      const plan = await rpc.publish.preview<{
        articles: number;
        overrides: number;
        unimported: string[];
      }>();

      if (plan.unimported.length) {
        const importFirst = await confirm(
          `هناك ${plan.unimported.length} مقالًا قديمًا لم يُستورد بعد إلى قاعدة البيانات. ` +
            "النشر قبل استيرادها سيخفيها عن فهرس المدونة. أستوردها الآن؟",
          { confirmLabel: "استوردي ثم انشري", danger: false }
        );
        if (!importFirst) return;
        const imported = await rpc.publish.importLegacy<{ articles: number; enquiries: number }>();
        toast(`استُوردت ${imported.articles} مقالة و${imported.enquiries} رسالة ✓`);
      } else {
        const ok = await confirm(
          `سيُنشر ${plan.articles} مقالًا و${plan.overrides} تعديلًا نصيًا على الموقع المباشر. المتابعة؟`,
          { confirmLabel: "انشري الآن", danger: false }
        );
        if (!ok) return;
      }

      const r = await rpc.publish.run<{ articles: number; overrides: number }>();
      toast(`تم النشر — ${r.articles} مقال، ${r.overrides} تعديل نصّي ✓`);
      refreshCounts();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر النشر.", "bad");
    } finally {
      setPublishing(false);
    }
  };

  const logout = async () => {
    try {
      await rpc.auth.logout();
    } catch {
      /* the cookie is cleared by the response either way */
    }
    setMe({ user: null, dbConnected: true });
    setSection("dashboard");
  };

  if (me === null) {
    return (
      <div className="adm-shell">
        <p className="adm-muted">جارٍ الفتح…</p>
      </div>
    );
  }

  if (!me.user) {
    return <LoginScreen onSignedIn={(m) => { setMe(m); refreshCounts(); }} dbConnected={me.dbConnected} />;
  }

  const t = TITLES[section];

  const badgeFor = (id: SectionId): { n: number; kind: "urgent" | "count" } | null => {
    if (id === "enquiries" && counts.enquiriesAwaiting) {
      return { n: counts.enquiriesAwaiting, kind: "urgent" };
    }
    if (id === "articles" && counts.articles + counts.drafts) {
      return { n: counts.articles + counts.drafts, kind: "count" };
    }
    if (id === "errorLog" && counts.openErrors) return { n: counts.openErrors, kind: "urgent" };
    return null;
  };

  const sectionProps = {
    toast,
    confirm,
    goTo,
    newNonce,
    onCountsChanged: refreshCounts,
    role,
    // Consumed on the section's first render; the sidebar takes over after.
    intent: hash ? hash.slice(1) : null,
  };

  const newButton: Partial<Record<SectionId, string>> = {
    dashboard: "مقال جديد",
    articles: "مقال جديد",
    services: "خدمة جديدة",
    testimonials: "توصية جديدة",
    processSteps: "خطوة جديدة",
    media: "رفع صورة",
  };

  return (
    <ToastProvider value={toast}>
      <div className={`adm-app ${drawerOpen ? "drawer-open" : ""}`}>
        <aside className="adm-side">
          <div className="adm-side-top">
            <div className="adm-brand">
              <b>لوحة</b> <span>رحيق</span>
            </div>
            <button
              className="adm-icon-btn adm-drawer-close"
              onClick={() => setDrawerOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <IconClose />
            </button>
          </div>

          <nav className="adm-nav" aria-label="أقسام لوحة التحكم">
            {visibleNav.map((group) => (
              <div className="adm-nav-group" key={group.label || "_"}>
                {group.label && <p className="adm-nav-group-head">{group.label}</p>}
                {group.items.map((n) => {
                  const b = badgeFor(n.id);
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
                      {b && <span className={`adm-nav-badge ${b.kind}`}>{b.n}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="adm-side-foot">
            <button className="adm-side-link" onClick={() => setPaletteOpen(true)}>
              <IconExport /> بحث سريع <kbd>⌘K</kbd>
            </button>
            <a className="adm-side-link" href={SITE_URL} target="_blank" rel="noopener">
              <IconView /> عرض الموقع
            </a>
            <button className="adm-side-link" onClick={logout}>
              <IconLogout /> خروج
            </button>
            <p className="adm-side-who">
              {me.user.name}
              <small>{me.user.role === "owner" ? "مالكة الموقع" : "محرِّرة"}</small>
            </p>
          </div>
        </aside>

        {drawerOpen && (
          <div
            className="adm-drawer-scrim"
            role="presentation"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <main className="adm-main">
          <header className="adm-main-head">
            <button
              className="adm-icon-btn adm-burger"
              onClick={() => setDrawerOpen(true)}
              aria-label="فتح القائمة"
            >
              <IconMenu />
            </button>
            <div className="adm-main-head-text">
              <h1>{t.h}</h1>
              <p className="adm-muted">{t.sub}</p>
            </div>
            <div className="adm-main-head-actions">
              <button className="btn btn-ghost" onClick={publishNow} disabled={publishing}>
                <IconPublish /> {publishing ? "جارٍ النشر…" : "نشر على الموقع"}
              </button>
              {newButton[section] && (
                <button
                  className="btn btn-gold"
                  onClick={() => {
                    if (section === "dashboard") {
                      goTo("articles");
                      setPendingNew("articles");
                    } else {
                      setNewNonce((n) => n + 1);
                    }
                  }}
                >
                  <IconPlus /> {newButton[section]}
                </button>
              )}
            </div>
          </header>

          <div className="adm-section">
            {section === "dashboard" && <DashboardHome {...sectionProps} />}
            {section === "articles" && <ArticlesSection {...sectionProps} />}
            {section === "pageText" && <PageTextSection {...sectionProps} />}
            {section === "services" && <ServicesSection {...sectionProps} />}
            {section === "testimonials" && <TestimonialsSection {...sectionProps} />}
            {section === "processSteps" && <ProcessStepsSection {...sectionProps} />}
            {section === "media" && <MediaSection {...sectionProps} />}
            {section === "enquiries" && <EnquiriesSection {...sectionProps} />}
            {section === "newsletter" && <NewsletterSection {...sectionProps} />}
            {section === "seo" && <SeoSection {...sectionProps} />}
            {section === "siteSettings" && <SiteSettingsSection {...sectionProps} />}
            {section === "account" && (
              <>
                <AccountSection {...sectionProps} />
                {role === "owner" && <AdminUsersSection {...sectionProps} />}
              </>
            )}
            {section === "errorLog" && <ErrorLogSection {...sectionProps} />}
          </div>
        </main>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          groups={visibleNav}
          extras={HIDDEN}
          onPick={goTo}
        />

        <div className="adm-toasts">
          {toasts.map((x) => (
            <div key={x.id} className={`adm-toast ${x.kind}`} role={x.kind === "bad" ? "alert" : "status"}>
              <span>{x.message}</span>
              <button
                className="adm-toast-x"
                onClick={() => setToasts((t) => t.filter((y) => y.id !== x.id))}
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {confirmElement}
      </div>
    </ToastProvider>
  );
}

/* --------------------------------------------------------------- palette */

function CommandPalette({
  open,
  onClose,
  groups,
  extras,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  groups: { label: string | null; items: NavItem[] }[];
  /** Sections that exist but are not on the sidebar: found only by name. */
  extras: NavItem[];
  onPick: (id: SectionId) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // Matches Arabic label and English name alike, so either spelling finds it.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    const match = (i: NavItem) =>
      i.label.toLowerCase().includes(q) || i.english.toLowerCase().includes(q);
    return [...all, ...extras].filter(match);
  }, [all, extras, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  return (
    <Dialog open={open} onClose={onClose} title="الانتقال إلى…" width={520}>
      <input
        className="adm-palette-input"
        value={query}
        placeholder="اكتبي اسم القسم بالعربية أو بالإنجليزية…"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            onPick(results[active].id);
          }
        }}
      />
      <ul className="adm-palette-list">
        {results.map((r, i) => (
          <li key={r.id}>
            <button
              className={i === active ? "active" : ""}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(r.id)}
            >
              <span className="adm-nav-icon">
                <r.Icon />
              </span>
              {r.label}
              <small>{r.english}</small>
            </button>
          </li>
        ))}
        {!results.length && <li className="adm-muted adm-palette-none">لا نتائج</li>}
      </ul>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- login */

function LoginScreen({
  onSignedIn,
  dbConnected,
}: {
  onSignedIn: (me: Me) => void;
  dbConnected: boolean;
}) {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setErr("");
    setBusy(true);
    try {
      const r = await rpc.auth.login<{ ok: boolean; needsTotp: boolean }>({
        password,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(totp.trim() ? { totpCode: totp.trim() } : {}),
      });
      if (!r.ok && r.needsTotp) {
        setNeedsTotp(true);
        setErr("");
        return;
      }
      const me = await rpc.auth.me<Me>();
      onSignedIn(me);
    } catch (e2) {
      setErr(e2 instanceof RpcError ? e2.message : "تعذّر تسجيل الدخول.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-shell">
      <form className="adm-login" onSubmit={submit}>
        <span className="slug">لوحة التحكم</span>
        <h1>مرحبًا رحيق 👋</h1>

        {!dbConnected && (
          <p className="adm-err" role="alert">
            قاعدة البيانات غير متصلة. أضيفي Postgres إلى مشروع Railway ثم أعيدي المحاولة.
          </p>
        )}

        <label htmlFor="adm-pw">أدخلي كلمة المرور للدخول إلى لوحة التحكم:</label>
        <div className="adm-pw-wrap">
          <input
            id="adm-pw"
            type={showPw ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            placeholder="كلمة المرور…"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {needsTotp && (
          <label className="adm-field" htmlFor="adm-totp">
            <span className="adm-field-label">رمز التحقق من تطبيق المصادقة</span>
            <input
              id="adm-totp"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          </label>
        )}

        <details className="adm-login-more">
          <summary>الدخول ببريد مختلف</summary>
          <input
            dir="ltr"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="البريد الإلكتروني"
          />
        </details>

        <button className="btn btn-gold" type="submit" disabled={!password.trim() || busy}>
          {busy ? "جارٍ الدخول…" : needsTotp ? "تأكيد" : "دخول"}
        </button>
        {err && (
          <p className="adm-err" role="alert">
            {err}
          </p>
        )}
        <p className="adm-muted" style={{ marginTop: 14, fontSize: 13 }}>
          نسيتِ كلمة المرور؟ اطلبيها ممن يدير الموقع.
        </p>
      </form>
    </div>
  );
}
