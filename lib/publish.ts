import fs from "fs";
import path from "path";
import { dbq } from "./db";
import { contentSnapshot } from "./rpc/routers/pageContent";
import { PAGES } from "./pageRegistry";
import {
  type Post,
  type Shell,
  renderPostPage,
  renderBlogIndex,
  renderSitemap,
  renderRss,
  ROBOTS,
} from "./siteGen";
import { commitTree, listDir, readRepoFile, type TreeEntry } from "./github";
import { esc } from "./siteGen";

/* Publishing.

   The public site is static HTML on GitHub Pages, so "publish" means: take
   what is in the database and write it into docs/, in one commit.

   Three kinds of change travel differently, on purpose:

   - Articles become real, crawlable pages, generated here.
   - SEO metadata is rewritten INTO the static <head>, because a title a crawler
     never executes JavaScript to see is not a title.
   - Body copy edited in "الصفحات" ships as docs/site-content.json and is applied
     by site-content.js on load. The built-in wording stays in the HTML, so the
     page is complete before that file is fetched — and complete if it never is. */

export type PublishResult = {
  commit: string | null;
  articles: number;
  overrides: number;
  files: { path: string; bytes: number; deleted: boolean }[];
  /** Things the operator should know before or after pressing publish. */
  warnings: string[];
  /** Slugs still living as Markdown that the database has never seen. While
   *  this is non-empty a publish would produce a half-migrated site, so the
   *  run is refused rather than half-done. */
  unimported: string[];
};

const SEO_COLS = `"pageKey","metaTitleAr","metaDescriptionAr","ogImage","noIndex"`;

type SeoRow = {
  pageKey: string;
  metaTitleAr: string | null;
  metaDescriptionAr: string | null;
  ogImage: string | null;
  noIndex: boolean;
};

/** Reuse the built site's own stylesheet + font-variable classes, so generated
 *  pages are visually identical to the hand-built ones. */
async function readShell(): Promise<Shell> {
  const html = (await readRepoFile("docs/index.html")) || localDocs("index.html") || "";
  // every /_next stylesheet the snapshot links, in document order
  const cssHrefs = [
    ...html.matchAll(/<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+\.css)"/g),
  ].map((m) => m[1]);
  return {
    cssHrefs: cssHrefs.length ? cssHrefs : ["/_next/static/css/ae743f717ea69337.css"],
    htmlClass: html.match(/<html[^>]*class="([^"]*)"/)?.[1] || "",
  };
}

function localDocs(rel: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "docs", rel), "utf8");
  } catch {
    return null;
  }
}

/* node-postgres hands back TIMESTAMPTZ as a Date, not a string. Assuming a
   string here is the kind of thing that typechecks and then throws
   ".slice is not a function" the first time anyone presses publish. */
function isoDay(value: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

async function publishedArticles(): Promise<Post[]> {
  const rows = await dbq<{
    slug: string;
    titleAr: string;
    titleEn: string | null;
    excerptAr: string | null;
    bodyAr: string;
    coverImage: string | null;
    tags: string[] | null;
    publishedAt: Date | string | null;
  }>(
    `SELECT slug, "titleAr", "titleEn", "excerptAr", "bodyAr", "coverImage", tags, "publishedAt"
       FROM articles
      WHERE status = 'published' AND "publishedAt" IS NOT NULL AND "publishedAt" <= now()
      ORDER BY "publishedAt" DESC`
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.titleAr,
    date: isoDay(r.publishedAt),
    lang: "ar" as const,
    excerpt: r.excerptAr || "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    cover: r.coverImage || undefined,
    body: r.bodyAr || "",
    status: "published",
  }));
}

/* ------------------------------------------------- SEO rewriting, in place */

/* The replacement is passed as a FUNCTION, not a string. As a string, `$&`,
   `$\'` and `` $` `` in the operator's own wording are replacement patterns and
   expand into the surrounding document — a meta title containing an apostrophe
   preceded by a dollar sign rewrites itself into garbage. */
function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, () => replacement) : html;
}

/** Rewrites <title>, the description, and the OG/Twitter mirrors of both, plus
 *  the robots directive. Everything else in the document is left alone. */
export function applySeoToHtml(html: string, seo: SeoRow): string {
  let out = html;
  if (seo.metaTitleAr) {
    const t = esc(seo.metaTitleAr);
    out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
    out = replaceTag(
      out,
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${t}"/>`
    );
    out = replaceTag(
      out,
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${t}"/>`
    );
  }
  if (seo.metaDescriptionAr) {
    const d = esc(seo.metaDescriptionAr);
    out = replaceTag(
      out,
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${d}"/>`
    );
    out = replaceTag(
      out,
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${d}"/>`
    );
    out = replaceTag(
      out,
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${d}"/>`
    );
  }
  if (seo.ogImage) {
    const i = esc(seo.ogImage);
    out = replaceTag(
      out,
      /<meta property="og:image" content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${i}"/>`
    );
    out = replaceTag(
      out,
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${i}"/>`
    );
  }
  const robots = seo.noIndex ? "noindex, nofollow" : "index, follow";
  if (/<meta name="robots" content="[^"]*"\s*\/?>/.test(out)) {
    out = out.replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${robots}"/>`
    );
  } else if (seo.noIndex) {
    out = out.replace(/<\/head>/, `<meta name="robots" content="${robots}"/></head>`);
  }
  return out;
}

/* --------------------------------------------------------------- the build */

export async function buildPublishTree(): Promise<{
  entries: TreeEntry[];
  articles: number;
  overrides: number;
  warnings: string[];
  unimported: string[];
}> {
  const token = process.env.GITHUB_TOKEN;
  const [posts, shell, snapshot, seoRows] = await Promise.all([
    publishedArticles(),
    readShell(),
    contentSnapshot(),
    dbq<SeoRow>(`SELECT ${SEO_COLS} FROM seo_settings`),
  ]);

  const entries: TreeEntry[] = [];

  // 1. article pages
  for (const p of posts) {
    entries.push({
      path: `docs/blog/${p.slug}/index.html`,
      mode: "100644",
      type: "blob",
      content: renderPostPage(p, shell),
    });
  }

  // 2. pages whose article was deleted or unpublished must stop being served —
  //    but a page whose Markdown source is still sitting in content/blog/ has
  //    simply not been imported into the database yet. Deleting those would
  //    take live articles off the website on the operator's first publish,
  //    which is not a thing a publish button should be able to do.
  const warnings: string[] = [];
  const unimported: string[] = [];
  if (token) {
    const existing = (await listDir(token, "docs/blog"))
      .filter((i) => i.type === "dir" && i.name !== "p")
      .map((i) => i.name);
    const legacy = new Set(
      (await listDir(token, "content/blog"))
        .filter((i) => i.name.endsWith(".md") && i.name.toLowerCase() !== "readme.md")
        .map((i) => i.name.replace(/\.md$/, ""))
    );
    const live = new Set(posts.map((p) => p.slug));
    // "Known" is every slug the database holds in ANY state. Comparing against
    // the PUBLISHED set instead would mark an imported-then-unpublished article
    // as un-imported, and since importLegacy skips slugs that already exist,
    // publishing would be blocked permanently with no way out.
    const known = new Set(
      (await dbq<{ slug: string }>(`SELECT slug FROM articles`)).map((r) => r.slug)
    );

    for (const slug of existing) {
      if (live.has(slug)) continue;
      if (legacy.has(slug) && !known.has(slug)) {
        unimported.push(slug);
        // leave the page exactly as it is
        continue;
      }
      entries.push({
        path: `docs/blog/${slug}/index.html`,
        mode: "100644",
        type: "blob",
        sha: null,
      });
    }

    for (const slug of legacy) {
      if (!known.has(slug) && !existing.includes(slug)) unimported.push(slug);
    }
  } else {
    warnings.push("GITHUB_TOKEN غير مضبوط، فلا يمكن معرفة ما هو منشور حاليًا.");
  }

  // 3. the blog index, feeds, robots
  entries.push({
    path: "docs/blog/index.html",
    mode: "100644",
    type: "blob",
    content: renderBlogIndex(posts, shell),
  });
  entries.push({
    path: "docs/sitemap.xml",
    mode: "100644",
    type: "blob",
    content: renderSitemap(posts),
  });
  entries.push({ path: "docs/rss.xml", mode: "100644", type: "blob", content: renderRss(posts) });
  entries.push({ path: "docs/robots.txt", mode: "100644", type: "blob", content: ROBOTS });

  // 4. the manifest the client-side blog list still reads
  entries.push({
    path: "content/blog/index.json",
    mode: "100644",
    type: "blob",
    content: JSON.stringify(
      posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        date: p.date,
        lang: p.lang,
        excerpt: p.excerpt,
        tags: p.tags,
        ...(p.cover ? { cover: p.cover } : {}),
      })),
      null,
      2
    ),
  });

  // 5. the content overlay + the script that applies it
  entries.push({
    path: "docs/site-content.json",
    mode: "100644",
    type: "blob",
    content: JSON.stringify(snapshot, null, 2),
  });
  const overlay = localDocs("site-content.js");
  if (overlay) {
    entries.push({
      path: "docs/site-content.js",
      mode: "100644",
      type: "blob",
      content: overlay,
    });
  }

  // 6. SEO, rewritten into each static page's <head>
  const bySeoKey = new Map(seoRows.map((r) => [r.pageKey, r]));
  const defaultOgImage =
    (
      await dbq<{ settingValue: string | null }>(
        `SELECT "settingValue" FROM site_settings WHERE "settingKey" = 'ogImage'`
      )
    )[0]?.settingValue || null;
  for (const page of PAGES) {
    const seo = bySeoKey.get(page.key);
    // Any row at all is enough. Skipping when every field is empty would mean
    // un-ticking "hide from search engines" never rewrites the page, leaving
    // the noindex tag on it for good.
    if (!seo) continue;
    if (page.key === "blog") continue; // regenerated above from renderBlogIndex

    // Read the page as it stands IN THE REPOSITORY. The copy in this container
    // is whatever was baked at build time; committing that over the live page
    // would silently roll back anything published since.
    const current = await readRepoFile(page.file);
    if (current === null) {
      warnings.push(`تعذّرت قراءة ${page.file} من المستودع، فلم تُحدَّث بيانات SEO لصفحة «${page.label}».`);
      continue;
    }
    const next = applySeoToHtml(current, {
      ...seo,
      ogImage: seo.ogImage || defaultOgImage,
    });
    if (next !== current) {
      entries.push({ path: page.file, mode: "100644", type: "blob", content: next });
    }
  }

  const overrides = Object.values(snapshot.pages).reduce((n, list) => n + list.length, 0);
  return { entries, articles: posts.length, overrides, warnings, unimported };
}

export async function publish(dryRun = false): Promise<PublishResult> {
  const { entries, articles, overrides, warnings, unimported } = await buildPublishTree();
  const files = entries.map((e) => ({
    path: e.path,
    bytes: e.content ? Buffer.byteLength(e.content) : 0,
    deleted: e.sha === null,
  }));
  if (dryRun) return { commit: null, articles, overrides, files, warnings, unimported };

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN غير مضبوط على الخادم.");
  if (unimported.length) {
    throw new Error(
      `لا يمكن النشر قبل استيراد المقالات القديمة: ${unimported
        .map((s2) => `«${s2}»`)
        .join("، ")}. النشر الآن سيحذفها من فهرس المدونة وخريطة الموقع.`
    );
  }
  const commit = await commitTree(
    token,
    entries,
    `Publish: ${articles} article page(s), ${overrides} content override(s)`
  );
  return { commit, articles, overrides, files, warnings, unimported };
}
