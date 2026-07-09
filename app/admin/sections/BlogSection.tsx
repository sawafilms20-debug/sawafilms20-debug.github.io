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
  uploadImage,
} from "../lib";
import { IconSearch, IconRefresh, IconImage } from "../icons";

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
  const [uploading, setUploading] = useState(false);
  const saveRef = useRef<() => void>(() => {});
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLInputElement>(null);

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
      cover: p.cover || "",
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
      slug = slugify(draft.title) || `post-${today().replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
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

  /* ---- markdown editor helpers ---- */
  const surround = (before: string, after = "", placeholder = "") => {
    const ta = bodyRef.current;
    if (!ta) return;
    const s = ta.selectionStart,
      en = ta.selectionEnd;
    const val = draft.body;
    const sel = val.slice(s, en) || placeholder;
    setDraft((d) => ({ ...d, body: val.slice(0, s) + before + sel + after + val.slice(en) }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = s + before.length;
      ta.setSelectionRange(pos, pos + sel.length);
    });
  };
  const prefixLine = (prefix: string) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const val = draft.body;
    const lineStart = val.lastIndexOf("\n", s - 1) + 1;
    setDraft((d) => ({ ...d, body: val.slice(0, lineStart) + prefix + val.slice(lineStart) }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  };

  const doUpload = async (file: File, into: "cover" | "body") => {
    if (!file.type.startsWith("image/")) return onErr("الملف ليس صورة.");
    if (file.size > 8 * 1024 * 1024) return onErr("الصورة كبيرة جدًا (الحد 8MB).");
    setUploading(true);
    onErr("");
    try {
      const url = await uploadImage(file);
      if (into === "cover") setDraft((d) => ({ ...d, cover: url }));
      else surround(`![](${url})\n`, "", "");
      onMsg("تم رفع الصورة ✓");
    } catch (e: unknown) {
      onErr(`تعذّر رفع الصورة — ${e instanceof Error ? e.message : e}`);
    } finally {
      setUploading(false);
    }
  };

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
      return p.title.toLowerCase().includes(needle) || p.tags.join(" ").toLowerCase().includes(needle);
    });
  }, [posts, q, filter]);

  if (view === "edit") {
    return (
      <div className="adm-editor">
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0], "cover")}
        />
        <input
          ref={bodyInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0], "body")}
        />

        {/* cover image (optional) */}
        <div className="adm-cover">
          {draft.cover ? (
            <div className="adm-cover-has">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.cover} alt="غلاف" />
              <div className="adm-cover-actions">
                <button className="adm-link" onClick={() => coverInput.current?.click()} disabled={uploading}>
                  تغيير
                </button>
                <button className="adm-link adm-danger" onClick={() => setDraft((d) => ({ ...d, cover: "" }))}>
                  إزالة
                </button>
              </div>
            </div>
          ) : (
            <button className="adm-cover-add" onClick={() => coverInput.current?.click()} disabled={uploading}>
              <IconImage /> {uploading ? "جارٍ الرفع…" : "أضيفي صورة غلاف (اختياري)"}
            </button>
          )}
        </div>

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

        <div>
          <span className="adm-label-row">
            <span className="adm-field-label">المحتوى</span>
            <small className="adm-muted">{stats.words} كلمة · ~{stats.minutes} دقيقة قراءة</small>
          </span>
          <div className="adm-md-bar" role="toolbar" aria-label="تنسيق">
            <button type="button" className="adm-md-btn" title="غامق" onClick={() => surround("**", "**", "نص غامق")}><b>B</b></button>
            <button type="button" className="adm-md-btn" title="مائل" onClick={() => surround("*", "*", "نص")}><i>I</i></button>
            <span className="adm-md-sep" />
            <button type="button" className="adm-md-btn" title="عنوان" onClick={() => prefixLine("## ")}>H2</button>
            <button type="button" className="adm-md-btn" title="عنوان فرعي" onClick={() => prefixLine("### ")}>H3</button>
            <button type="button" className="adm-md-btn" title="اقتباس" onClick={() => prefixLine("> ")}>”</button>
            <button type="button" className="adm-md-btn" title="قائمة" onClick={() => prefixLine("- ")}>•</button>
            <button type="button" className="adm-md-btn" title="رابط" onClick={() => surround("[", "](https://)", "النص")}>🔗</button>
            <span className="adm-md-sep" />
            <button type="button" className="adm-md-btn adm-md-img" title="إدراج صورة" onClick={() => bodyInput.current?.click()} disabled={uploading}>
              <IconImage /> {uploading ? "…" : "صورة"}
            </button>
          </div>
          <textarea
            ref={bodyRef}
            className="adm-body"
            rows={16}
            dir="auto"
            value={draft.body}
            placeholder="اكتبي بصيغة Markdown… العناوين بـ ## والغامق بـ ** والصور عبر زر «صورة»."
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
        </div>

        {showPreview && (
          <div
            className="prose adm-preview"
            dir={draft.lang === "en" ? "ltr" : "rtl"}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}

        <div className="adm-toolbar">
          <button className="btn btn-gold" onClick={save} disabled={busy || uploading}>
            {busy ? "جارٍ الحفظ…" : draft.status === "draft" ? "حفظ كمسودة" : "حفظ ونشر"}
          </button>
          <button className="adm-link" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "إخفاء المعاينة" : "معاينة"}
          </button>
          <button className="adm-link" onClick={() => setView("list")}>رجوع</button>
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
          <input value={q} dir="auto" placeholder="بحث في العناوين والوسوم…" onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="adm-chips">
          {([
            ["all", "الكل"],
            ["published", "منشور"],
            ["draft", "مسودة"],
            ["ar", "ع"],
            ["en", "EN"],
          ] as [Filter, string][]).map(([f, label]) => (
            <button key={f} className={`adm-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
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
              {p.cover && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="adm-row-thumb" src={p.cover} alt="" />
              )}
              <div className="adm-row-main">
                <b>{p.title}</b>
                <small>
                  <span className={`adm-badge ${p.status}`}>{p.status === "draft" ? "مسودة" : "منشور"}</span>{" "}
                  <span className={`adm-lang ${p.lang}`}>{p.lang === "en" ? "EN" : "ع"}</span> {p.date}
                </small>
              </div>
              <div className="adm-row-actions">
                {p.status !== "draft" && (
                  <a href={`${SITE_URL}/blog/p/?s=${p.slug}`} target="_blank" rel="noopener">عرض</a>
                )}
                <button onClick={() => openEdit(p)}>تعديل</button>
                <button className="adm-danger" onClick={() => remove(p)}>حذف</button>
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
