"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { SITE_URL, BLOG_DIR, GH_BRANCH } from "../config";
import {
  type PostFile,
  type Draft,
  gh,
  b64encode,
  buildMarkdown,
  slugify,
  today,
  emptyDraft,
  loadPosts,
  writeManifest,
  wordStats,
} from "../lib";
import { IconSearch, IconRefresh } from "../icons";

type Filter = "all" | "published" | "draft" | "ar" | "en";

export default function BlogSection({
  onMsg,
  onErr,
  confirm,
  onChange,
  newNonce,
}: {
  onMsg: (m: string) => void;
  onErr: (e: string) => void;
  confirm: (m: string) => Promise<boolean>;
  onChange: () => void;
  newNonce: number;
}) {
  const [posts, setPosts] = useState<PostFile[]>([]);
  const [view, setView] = useState<"list" | "edit">("list");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const saveRef = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setPosts(await loadPosts());
    } catch (e: unknown) {
      onErr(`تعذّر تحميل المقالات — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
      setLoaded(true);
    }
  }, [onErr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = useCallback(() => {
    setDraft(emptyDraft());
    setShowPreview(false);
    onErr("");
    setView("edit");
  }, [onErr]);

  // header "+ مقال جديد" trigger
  useEffect(() => {
    if (newNonce > 0) openNew();
  }, [newNonce, openNew]);

  const openEdit = (p: PostFile) => {
    setDraft({
      slug: p.slug,
      title: p.title,
      date: p.date,
      lang: p.lang,
      excerpt: p.excerpt,
      tags: p.tags.join("، "),
      body: p.body,
      status: p.status,
      sha: p.sha,
    });
    setShowPreview(false);
    onErr("");
    setView("edit");
  };

  const save = async () => {
    onErr("");
    if (!draft.title.trim()) return onErr("العنوان مطلوب.");
    if (!draft.body.trim()) return onErr("محتوى المقال مطلوب.");
    let slug = draft.slug.trim();
    if (!slug)
      slug =
        slugify(draft.title) ||
        `post-${today().replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    if (!/^[a-z0-9-]+$/.test(slug))
      return onErr("الرابط (slug) يجب أن يكون أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.");
    setBusy(true);
    try {
      await gh(`contents/${BLOG_DIR}/${slug}.md`, {
        method: "PUT",
        body: JSON.stringify({
          message: draft.sha ? `Update post: ${slug}` : `New post: ${slug}`,
          content: b64encode(buildMarkdown({ ...draft, slug })),
          branch: GH_BRANCH,
          ...(draft.sha ? { sha: draft.sha } : {}),
        }),
      });
      const fresh = await loadPosts();
      setPosts(fresh);
      await writeManifest(fresh);
      onChange();
      onMsg(draft.status === "draft" ? "تم الحفظ كمسودة ✓" : "تم النشر ✓ — سيظهر خلال دقيقة.");
      setView("list");
    } catch (e: unknown) {
      onErr(`تعذّر الحفظ — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };
  saveRef.current = save;

  const remove = async (p: PostFile) => {
    if (!(await confirm(`حذف «${p.title}» نهائيًا؟`))) return;
    setBusy(true);
    onErr("");
    try {
      await gh(`contents/${BLOG_DIR}/${p.name}`, {
        method: "DELETE",
        body: JSON.stringify({ message: `Delete post: ${p.slug}`, sha: p.sha, branch: GH_BRANCH }),
      });
      const fresh = await loadPosts();
      setPosts(fresh);
      await writeManifest(fresh);
      onChange();
      onMsg("تم الحذف ✓");
    } catch (e: unknown) {
      onErr(`تعذّر الحذف — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  // ⌘/Ctrl + S saves while editing
  useEffect(() => {
    if (view !== "edit") return;
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view]);

  const previewHtml = useMemo(
    () => (showPreview ? (marked.parse(draft.body || "") as string) : ""),
    [showPreview, draft.body]
  );
  const stats = useMemo(() => wordStats(draft.body), [draft.body]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter === "published" && p.status === "draft") return false;
      if (filter === "draft" && p.status !== "draft") return false;
      if (filter === "ar" && p.lang !== "ar") return false;
      if (filter === "en" && p.lang !== "en") return false;
      if (!needle) return true;
      return (
        p.title.toLowerCase().includes(needle) ||
        p.tags.join(" ").toLowerCase().includes(needle)
      );
    });
  }, [posts, q, filter]);

  if (view === "edit") {
    return (
      <div className="adm-editor">
        <div className="adm-grid">
          <label>
            العنوان
            <input
              value={draft.title}
              dir="auto"
              autoFocus
              onChange={(e) => {
                const title = e.target.value;
                setDraft((d) => ({ ...d, title, slug: d.sha ? d.slug : d.slug || slugify(title) }));
              }}
            />
          </label>
          <label>
            الرابط (slug) — إنجليزي
            <input
              value={draft.slug}
              dir="ltr"
              disabled={!!draft.sha}
              placeholder="my-article-name"
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            />
          </label>
          <label>
            التاريخ
            <input
              type="date"
              value={draft.date}
              dir="ltr"
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            />
          </label>
          <label>
            الحالة
            <select
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as "published" | "draft" }))}
            >
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
            </select>
          </label>
        </div>
        <div className="adm-grid adm-grid-2">
          <label>
            اللغة
            <select
              value={draft.lang}
              onChange={(e) => setDraft((d) => ({ ...d, lang: e.target.value as "ar" | "en" }))}
            >
              <option value="ar">عربي</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            الوسوم (مفصولة بفاصلة)
            <input
              value={draft.tags}
              dir="auto"
              placeholder="الكتابة التسويقية، السرد القصصي"
              onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
            />
          </label>
        </div>
        <label>
          المقتطف (يظهر في صفحة المدونة)
          <textarea
            rows={2}
            dir="auto"
            value={draft.excerpt}
            onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
          />
        </label>
        <label>
          <span className="adm-label-row">
            المحتوى (Markdown — العناوين بـ ## والغامق بـ **)
            <small className="adm-muted">{stats.words} كلمة · ~{stats.minutes} دقيقة قراءة</small>
          </span>
          <textarea
            rows={16}
            dir="auto"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
        </label>

        {showPreview && (
          <div
            className="prose adm-preview"
            dir={draft.lang === "en" ? "ltr" : "rtl"}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}

        <div className="adm-toolbar">
          <button className="btn btn-gold" onClick={save} disabled={busy}>
            {busy ? "جارٍ الحفظ…" : draft.status === "draft" ? "حفظ كمسودة" : "حفظ ونشر"}
          </button>
          <button className="adm-link" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "إخفاء المعاينة" : "معاينة"}
          </button>
          <button className="adm-link" onClick={() => setView("list")}>
            رجوع
          </button>
          <span className="adm-muted adm-hint">⌘S للحفظ</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="adm-toolbar adm-listbar">
        <div className="adm-search">
          <IconSearch />
          <input
            value={q}
            dir="auto"
            placeholder="بحث في العناوين والوسوم…"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="adm-chips">
          {([
            ["all", "الكل"],
            ["published", "منشور"],
            ["draft", "مسودة"],
            ["ar", "ع"],
            ["en", "EN"],
          ] as [Filter, string][]).map(([f, label]) => (
            <button
              key={f}
              className={`adm-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="adm-icon-btn" onClick={refresh} disabled={busy} aria-label="تحديث">
          <IconRefresh />
        </button>
      </div>

      {!loaded ? (
        <Skeleton />
      ) : (
        <div className="adm-table">
          {shown.map((p) => (
            <div className="adm-row" key={p.slug}>
              <div className="adm-row-main">
                <b>{p.title}</b>
                <small>
                  <span className={`adm-badge ${p.status}`}>
                    {p.status === "draft" ? "مسودة" : "منشور"}
                  </span>{" "}
                  <span className={`adm-lang ${p.lang}`}>{p.lang === "en" ? "EN" : "ع"}</span> {p.date}
                </small>
              </div>
              <div className="adm-row-actions">
                {p.status !== "draft" && (
                  <a href={`${SITE_URL}/blog/p/?s=${p.slug}`} target="_blank" rel="noopener">
                    عرض
                  </a>
                )}
                <button onClick={() => openEdit(p)}>تعديل</button>
                <button className="adm-danger" onClick={() => remove(p)}>
                  حذف
                </button>
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="adm-empty">
              <p>{posts.length === 0 ? "لا توجد مقالات بعد." : "لا نتائج مطابقة."}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="adm-table">
      {[0, 1, 2, 3].map((i) => (
        <div className="adm-row adm-skel-row" key={i}>
          <div className="adm-skel" style={{ width: "40%", height: 16 }} />
          <div className="adm-skel" style={{ width: 120, height: 14 }} />
        </div>
      ))}
    </div>
  );
}
