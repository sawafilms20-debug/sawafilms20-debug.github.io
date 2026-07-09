"use client";

import { GH_OWNER, GH_REPO, GH_BRANCH, BLOG_DIR } from "./config";

/* ---------- shared types ---------- */

export type PostFile = {
  name: string;
  slug: string;
  sha: string;
  title: string;
  date: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string[];
  body: string;
  status: "published" | "draft";
  cover: string;
};

export type Draft = {
  slug: string;
  title: string;
  date: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string;
  body: string;
  status: "published" | "draft";
  cover: string;
  sha?: string;
};

export type Project = {
  slug: string;
  title: string;
  desc: string;
  url: string;
  tags: string[];
  featured: boolean;
  date: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string;
  date: string;
  read: boolean;
};

export const PROJECTS_PATH = "content/projects.json";
export const LEADS_PATH = "content/leads.json";

/* ---------- utf-8 safe base64 ---------- */

export function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64decode(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ---------- markdown frontmatter ---------- */

export function parsePost(name: string, sha: string, raw: string): PostFile {
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
  const status = get("status") === "draft" ? "draft" : "published";
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
    status,
    cover: get("cover"),
  };
}

const oneLine = (s: string) =>
  s.replace(/[\r\n]+/g, " ").replace(/"/g, "'").trim();

export function buildMarkdown(d: Draft): string {
  const tags = d.tags
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, "'")}"`)
    .join(", ");
  const coverLine = d.cover?.trim() ? `\ncover: "${oneLine(d.cover)}"` : "";
  return `---
title: "${oneLine(d.title)}"
date: "${d.date}"
lang: "${d.lang}"
status: "${d.status}"
excerpt: "${oneLine(d.excerpt)}"${coverLine}
tags: [${tags}]
---

${d.body.trim()}
`;
}

/* words + reading time for the editor */
export function wordStats(text: string) {
  const words = (text.trim().match(/[\p{L}\p{N}]+/gu) || []).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}

/* friendly Arabic relative time */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "الآن";
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d === 1) return "أمس";
  if (d < 7) return `قبل ${d} أيام`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export const today = () => new Date().toISOString().slice(0, 10);

export const emptyDraft = (): Draft => ({
  slug: "",
  title: "",
  date: today(),
  lang: "ar",
  excerpt: "",
  tags: "",
  body: "",
  status: "published",
  cover: "",
});

/* raw.githubusercontent URL for a repo path (public repo → instantly live) */
export const rawUrl = (path: string) =>
  `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${path}`;

/* upload an image file into the repo, return its public raw URL */
export async function uploadImage(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
  const name = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const path = `${BLOG_DIR}/images/${name}`;
  await gh(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message: `Upload image ${name}`, content: b64, branch: GH_BRANCH }),
  });
  return rawUrl(path);
}

/* ---------- authenticated GitHub client (server proxy) ---------- */

export async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api/gh/${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${res.status}: ${body.message || res.statusText}`);
  }
  return res.json();
}

/* Read a JSON file from the repo; returns { data, sha } or { data:fallback, sha:undefined }. */
export async function readJson<T>(
  path: string,
  fallback: T
): Promise<{ data: T; sha?: string }> {
  try {
    const r = await gh(`contents/${path}?ref=${GH_BRANCH}`);
    return { data: JSON.parse(b64decode(r.content)) as T, sha: r.sha };
  } catch (e) {
    // Only a genuine "file doesn't exist yet" (404) is a safe empty. Any other
    // failure (network, 5xx, auth) must propagate — otherwise a failed read
    // followed by a write would overwrite real content with the fallback.
    if (e instanceof Error && /^404\b/.test(e.message)) return { data: fallback };
    throw e;
  }
}

/* Write a JSON file to the repo (create or update). */
export async function writeJson(
  path: string,
  value: unknown,
  sha: string | undefined,
  message: string
) {
  await gh(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: b64encode(JSON.stringify(value, null, 2)),
      branch: GH_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}

/* ---------- blog helpers ---------- */

export async function loadPosts(): Promise<PostFile[]> {
  const list: { name: string; sha: string }[] = await gh(
    `contents/${BLOG_DIR}?ref=${GH_BRANCH}`
  );
  const files = list.filter(
    (f) => f.name.endsWith(".md") && f.name.toLowerCase() !== "readme.md"
  );
  const loaded = await Promise.all(
    files.map(async (f) => {
      const data = await gh(`contents/${BLOG_DIR}/${f.name}?ref=${GH_BRANCH}`);
      return parsePost(f.name, data.sha, b64decode(data.content));
    })
  );
  loaded.sort((a, b) => (a.date < b.date ? 1 : -1));
  return loaded;
}

export async function writeManifest(list: PostFile[]) {
  const manifest = list
    .filter((p) => p.status !== "draft")
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      lang: p.lang,
      excerpt: p.excerpt,
      tags: p.tags,
      ...(p.cover ? { cover: p.cover } : {}),
    }));
  let sha: string | undefined;
  try {
    const cur = await gh(`contents/${BLOG_DIR}/index.json?ref=${GH_BRANCH}`);
    sha = cur.sha;
  } catch {
    /* first time */
  }
  await gh(`contents/${BLOG_DIR}/index.json`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Update blog index",
      content: b64encode(JSON.stringify(manifest, null, 2)),
      branch: GH_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}
