"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "../lib";

export default function BlogSection({
  onMsg,
  onErr,
}: {
  onMsg: (m: string) => void;
  onErr: (e: string) => void;
}) {
  const [posts, setPosts] = useState<PostFile[]>([]);
  const [view, setView] = useState<"list" | "edit">("list");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setPosts(await loadPosts());
    } catch (e: unknown) {
      onErr(`تعذّر تحميل المقالات — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }, [onErr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = () => {
    setDraft(emptyDraft());
    setShowPreview(false);
    onErr("");
    setView("edit");
  };

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
    if (!slug) slug = slugify(draft.title) || `post-${today().replace(/-/g, "")}`;
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
      onMsg(
        draft.status === "draft"
          ? "تم الحفظ كمسودة ✓"
          : "تم النشر ✓ — سيظهر على الموقع خلال دقيقة أو دقيقتين."
      );
      setView("list");
    } catch (e: unknown) {
      onErr(`تعذّر الحفظ — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: PostFile) => {
    if (!confirm(`حذف «${p.title}» نهائيًا؟`)) return;
    setBusy(true);
    onErr("");
    try {
      await gh(`contents/${BLOG_DIR}/${p.name}`, {
        method: "DELETE",
        body: JSON.stringify({
          message: `Delete post: ${p.slug}`,
          sha: p.sha,
          branch: GH_BRANCH,
        }),
      });
      const fresh = await loadPosts();
      setPosts(fresh);
      await writeManifest(fresh);
      onMsg("تم الحذف ✓");
    } catch (e: unknown) {
      onErr(`تعذّر الحذف — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const previewHtml = useMemo(
    () => (showPreview ? (marked.parse(draft.body || "") as string) : ""),
    [showPreview, draft.body]
  );

  if (view === "edit") {
    return (
      <div className="adm-editor">
        <div className="adm-grid">
          <label>
            العنوان
            <input
              value={draft.title}
              dir="auto"
              onChange={(e) => {
                const title = e.target.value;
                setDraft((d) => ({
                  ...d,
                  title,
                  slug: d.sha ? d.slug : d.slug || slugify(title),
                }));
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, status: e.target.value as "published" | "draft" }))
              }
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, lang: e.target.value as "ar" | "en" }))
              }
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
          المحتوى (Markdown — العناوين بـ ## والغامق بـ **)
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
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="adm-toolbar">
        <button className="btn btn-gold" onClick={openNew}>
          + مقال جديد
        </button>
        <button className="adm-link" onClick={refresh} disabled={busy}>
          تحديث
        </button>
      </div>
      {busy && posts.length === 0 ? (
        <p className="adm-muted">جارٍ التحميل…</p>
      ) : (
        <div className="adm-table">
          {posts.map((p) => (
            <div className="adm-row" key={p.slug}>
              <div className="adm-row-main">
                <b>{p.title}</b>
                <small>
                  <span className={`adm-badge ${p.status}`}>
                    {p.status === "draft" ? "مسودة" : "منشور"}
                  </span>{" "}
                  <span className={`adm-lang ${p.lang}`}>
                    {p.lang === "en" ? "EN" : "ع"}
                  </span>{" "}
                  {p.date}
                </small>
              </div>
              <div className="adm-row-actions">
                <a href={`${SITE_URL}/blog/p/?s=${p.slug}`} target="_blank" rel="noopener">
                  عرض
                </a>
                <button onClick={() => openEdit(p)}>تعديل</button>
                <button className="adm-danger" onClick={() => remove(p)}>
                  حذف
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="adm-muted">لا توجد مقالات بعد.</p>}
        </div>
      )}
    </>
  );
}
