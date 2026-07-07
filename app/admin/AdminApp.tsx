"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { GH_OWNER, GH_REPO, GH_BRANCH, BLOG_DIR, SITE_URL } from "./config";

/* ---------- types ---------- */

type PostFile = {
  name: string;
  slug: string;
  sha: string;
  title: string;
  date: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string[];
  body: string;
};

type Draft = {
  slug: string;
  title: string;
  date: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string;
  body: string;
  sha?: string; // present when editing an existing post
};

type DeployState = {
  status: string;
  conclusion: string | null;
  url: string;
} | null;

/* Workflow installed automatically on first login (self-bootstrapping pipeline) */
const WORKFLOW_PATH = ".github/workflows/deploy.yml";
const WORKFLOW_YML = `name: Build & Deploy Site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

/* ---------- utf-8 safe base64 ---------- */

function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64decode(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ---------- frontmatter ---------- */

function parsePost(name: string, sha: string, raw: string): PostFile {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm = m ? m[1] : "";
  const body = m ? m[2].replace(/^\n+/, "") : raw;
  const get = (key: string) => {
    const r = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, "m"));
    return r ? r[1].trim() : "";
  };
  const tagsRaw = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  const tags = tagsRaw
    ? tagsRaw[1]
        .split(",")
        .map((t) => t.trim().replace(/^"|"$/g, ""))
        .filter(Boolean)
    : [];
  return {
    name,
    slug: name.replace(/\.md$/, ""),
    sha,
    title: get("title") || name,
    date: get("date") || "",
    lang: get("lang") === "en" ? "en" : "ar",
    excerpt: get("excerpt"),
    tags,
    body,
  };
}

function buildMarkdown(d: Draft): string {
  const tags = d.tags
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(", ");
  return `---
title: "${d.title.replace(/"/g, "'")}"
date: "${d.date}"
lang: "${d.lang}"
excerpt: "${d.excerpt.replace(/"/g, "'")}"
tags: [${tags}]
---

${d.body.trim()}
`;
}

function slugify(title: string): string {
  const latin = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return latin;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDraft = (): Draft => ({
  slug: "",
  title: "",
  date: today(),
  lang: "ar",
  excerpt: "",
  tags: "",
  body: "",
});

/* ---------- component ---------- */

export default function AdminApp() {
  const [token, setToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostFile[]>([]);
  const [view, setView] = useState<"list" | "edit">("list");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [deploy, setDeploy] = useState<DeployState>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(init.headers || {}),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${body.message || res.statusText}`);
      }
      return res.json();
    },
    [token]
  );

  /* ----- auth bootstrap ----- */

  useEffect(() => {
    const saved = localStorage.getItem("rk-admin-token") || "";
    if (saved) {
      setToken(saved);
    } else {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api("");
        if (cancelled) return;
        localStorage.setItem("rk-admin-token", token);
        setAuthed(true);
      } catch {
        if (cancelled) return;
        localStorage.removeItem("rk-admin-token");
        setAuthed(false);
        setErr("الرمز غير صالح أو لا يملك صلاحية على المستودع.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, api]);

  /* ----- data loading ----- */

  const loadPosts = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const list: { name: string; sha: string }[] = await api(
        `contents/${BLOG_DIR}?ref=${GH_BRANCH}`
      );
      const files = list.filter(
        (f) => f.name.endsWith(".md") && f.name.toLowerCase() !== "readme.md"
      );
      const loaded = await Promise.all(
        files.map(async (f) => {
          const data = await api(`contents/${BLOG_DIR}/${f.name}?ref=${GH_BRANCH}`);
          return parsePost(f.name, data.sha, b64decode(data.content));
        })
      );
      loaded.sort((a, b) => (a.date < b.date ? 1 : -1));
      setPosts(loaded);
    } catch (e: unknown) {
      setErr(`تعذّر تحميل المقالات — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }, [api]);

  const loadDeploy = useCallback(async () => {
    try {
      const data = await api(`actions/runs?per_page=1&branch=${GH_BRANCH}`);
      const run = data.workflow_runs?.[0];
      if (run)
        setDeploy({ status: run.status, conclusion: run.conclusion, url: run.html_url });
    } catch {
      /* non-fatal */
    }
  }, [api]);

  // check whether the auto-publish pipeline is installed
  const checkSetup = useCallback(async () => {
    try {
      await api(`contents/${WORKFLOW_PATH}?ref=${GH_BRANCH}`);
      setNeedsSetup(false);
    } catch {
      setNeedsSetup(true);
    }
  }, [api]);

  const runSetup = async () => {
    setBusy(true);
    setErr("");
    try {
      await api(`contents/${WORKFLOW_PATH}`, {
        method: "PUT",
        body: JSON.stringify({
          message: "Install auto-deploy pipeline",
          content: b64encode(WORKFLOW_YML),
          branch: GH_BRANCH,
        }),
      });
      try {
        await api("pages", {
          method: "PUT",
          body: JSON.stringify({ build_type: "workflow" }),
        });
      } catch {
        /* already set, or Pages permission missing — non-fatal */
      }
      setNeedsSetup(false);
      setMsg("تم تفعيل النشر التلقائي ✓ — الموقع يُبنى الآن لأول مرة (~3 دقائق).");
      setTimeout(loadDeploy, 5000);
    } catch (e: unknown) {
      setErr(
        `تعذّر التفعيل — ${e instanceof Error ? e.message : e}. تأكدي أن الرمز يملك صلاحية Workflows: Read and write.`
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (authed) {
      loadPosts();
      loadDeploy();
      checkSetup();
    }
  }, [authed, loadPosts, loadDeploy, checkSetup]);

  // poll deploy status while a build is running
  useEffect(() => {
    if (!authed || !deploy || deploy.status === "completed") return;
    const t = setInterval(loadDeploy, 15000);
    return () => clearInterval(t);
  }, [authed, deploy, loadDeploy]);

  /* ----- actions ----- */

  const openNew = () => {
    setDraft(emptyDraft());
    setShowPreview(false);
    setMsg("");
    setErr("");
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
      sha: p.sha,
    });
    setShowPreview(false);
    setMsg("");
    setErr("");
    setView("edit");
  };

  const save = async () => {
    setErr("");
    if (!draft.title.trim()) return setErr("العنوان مطلوب.");
    if (!draft.body.trim()) return setErr("محتوى المقال مطلوب.");
    let slug = draft.slug.trim();
    if (!slug) {
      slug = slugify(draft.title) || `post-${today().replace(/-/g, "")}`;
    }
    if (!/^[a-z0-9-]+$/.test(slug))
      return setErr("الرابط (slug) يجب أن يكون أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.");
    setBusy(true);
    try {
      const content = b64encode(buildMarkdown({ ...draft, slug }));
      await api(`contents/${BLOG_DIR}/${slug}.md`, {
        method: "PUT",
        body: JSON.stringify({
          message: draft.sha ? `Update post: ${slug}` : `New post: ${slug}`,
          content,
          branch: GH_BRANCH,
          ...(draft.sha ? { sha: draft.sha } : {}),
        }),
      });
      setMsg("تم الحفظ ✓ — الموقع يُبنى الآن وسيتحدّث خلال دقيقتين تقريبًا.");
      setView("list");
      await loadPosts();
      setTimeout(loadDeploy, 4000);
    } catch (e: unknown) {
      setErr(`تعذّر الحفظ — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: PostFile) => {
    if (!confirm(`حذف «${p.title}» نهائيًا؟`)) return;
    setBusy(true);
    setErr("");
    try {
      await api(`contents/${BLOG_DIR}/${p.name}`, {
        method: "DELETE",
        body: JSON.stringify({
          message: `Delete post: ${p.slug}`,
          sha: p.sha,
          branch: GH_BRANCH,
        }),
      });
      setMsg("تم الحذف ✓ — الموقع يُبنى الآن.");
      await loadPosts();
      setTimeout(loadDeploy, 4000);
    } catch (e: unknown) {
      setErr(`تعذّر الحذف — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("rk-admin-token");
    setToken("");
    setTokenInput("");
    setAuthed(false);
  };

  const previewHtml = useMemo(
    () => (showPreview ? (marked.parse(draft.body || "") as string) : ""),
    [showPreview, draft.body]
  );

  /* ----- render ----- */

  if (authed === null) {
    return (
      <div className="adm-shell">
        <p className="adm-muted">جارٍ التحقق…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="adm-shell">
        <div className="adm-login">
          <span className="slug">لوحة التحكم</span>
          <h1>مرحبًا رحيق 👋</h1>
          <p>
            للدخول تحتاجين <b>رمز وصول GitHub</b> (يُنشأ مرة واحدة ويبقى محفوظًا على هذا
            الجهاز):
          </p>
          <ol>
            <li>
              افتحي{" "}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener"
              >
                github.com/settings/personal-access-tokens/new
              </a>
            </li>
            <li>
              Repository access ← <b>Only select repositories</b> ← اختاري{" "}
              <code>
                {GH_OWNER}/{GH_REPO}
              </code>
            </li>
            <li>
              Permissions ← <b>Contents: Read and write</b> · <b>Workflows: Read and
              write</b> · <b>Pages: Read and write</b> · <b>Actions: Read-only</b>
            </li>
            <li>Generate token ← انسخي الرمز والصقيه هنا</li>
          </ol>
          <input
            type="password"
            dir="ltr"
            placeholder="github_pat_…"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <button
            className="btn btn-gold"
            disabled={!tokenInput.trim()}
            onClick={() => {
              setErr("");
              setAuthed(null);
              setToken(tokenInput.trim());
            }}
          >
            دخول
          </button>
          {err && <p className="adm-err">{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="adm-shell">
      <header className="adm-head">
        <div>
          <span className="slug">لوحة التحكم</span>
          <h1>مدونة رحيق</h1>
        </div>
        <div className="adm-head-actions">
          {deploy && (
            <a className={`adm-deploy ${deploy.conclusion || deploy.status}`} href={deploy.url} target="_blank" rel="noopener">
              {deploy.status !== "completed"
                ? "⏳ الموقع يُبنى الآن…"
                : deploy.conclusion === "success"
                  ? "✓ آخر نشر ناجح"
                  : "⚠ آخر نشر فشل"}
            </a>
          )}
          <a className="adm-link" href={SITE_URL} target="_blank" rel="noopener">
            عرض الموقع ↗
          </a>
          <button className="adm-link" onClick={logout}>
            خروج
          </button>
        </div>
      </header>

      {msg && <p className="adm-ok">{msg}</p>}
      {err && <p className="adm-err">{err}</p>}

      {needsSetup && (
        <div className="adm-setup">
          <b>خطوة أخيرة لمرة واحدة:</b> تفعيل النشر التلقائي حتى يتحدّث الموقع وحده بعد
          كل حفظ.
          <button className="btn btn-gold" onClick={runSetup} disabled={busy}>
            {busy ? "جارٍ التفعيل…" : "تفعيل النشر التلقائي"}
          </button>
        </div>
      )}

      {view === "list" && (
        <>
          <div className="adm-toolbar">
            <button className="btn btn-gold" onClick={openNew}>
              + مقال جديد
            </button>
            <button className="adm-link" onClick={loadPosts} disabled={busy}>
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
                      <span className={`adm-lang ${p.lang}`}>
                        {p.lang === "en" ? "EN" : "ع"}
                      </span>{" "}
                      {p.date} · /blog/{p.slug}
                    </small>
                  </div>
                  <div className="adm-row-actions">
                    <a href={`${SITE_URL}/blog/${p.slug}/`} target="_blank" rel="noopener">
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
      )}

      {view === "edit" && (
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
          </div>
          <label>
            المقتطف (يظهر في صفحة المدونة ونتائج البحث)
            <textarea
              rows={2}
              dir="auto"
              value={draft.excerpt}
              onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
            />
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
              {busy ? "جارٍ الحفظ…" : "حفظ ونشر"}
            </button>
            <button className="adm-link" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "إخفاء المعاينة" : "معاينة"}
            </button>
            <button className="adm-link" onClick={() => setView("list")}>
              رجوع
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
