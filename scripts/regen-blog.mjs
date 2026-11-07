/* Rebuilds the generated blog files in docs/ from the pages already published.
 *
 * The blog pages, the blog index, sitemap.xml, rss.xml and robots.txt are
 * normally written by the dashboard's publish button, from the articles in the
 * database. When a change to their templates (lib/siteGen.ts) has to reach the
 * live site without that path — the dashboard server not yet redeployed, or no
 * database to read — this re-renders them with the current templates, taking
 * each article's content from its own published page. The published HTML is
 * the authoritative copy here: it is what the last publish wrote from the
 * database.
 *
 * What it reads back from each page: title, description, date, language,
 * tags, cover and the article body. The body is cut between the markers the
 * template now writes (<!--rk:body--> … <!--/rk:body-->), or, on a page
 * written by an older template, between the prose div and the CTA after it.
 *
 *   node --import ./scripts/ts-paths.mjs scripts/regen-blog.mjs          # write
 *   node --import ./scripts/ts-paths.mjs scripts/regen-blog.mjs --check  # exit 1 if stale
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderPostPage,
  renderBlogIndex,
  renderSitemap,
  renderRss,
  ROBOTS,
} from "../lib/siteGen.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// RK_DOCS points it at a copy, for trying a template change without touching docs/.
const DOCS = process.env.RK_DOCS ? path.resolve(process.env.RK_DOCS) : path.join(ROOT, "docs");
const BLOG = path.join(DOCS, "blog");
const CHECK = process.argv.includes("--check");

const decode = (s) =>
  String(s ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const attr = (html, re) => {
  const m = html.match(re);
  return m ? decode(m[1]) : "";
};

function shellFrom(indexHtml) {
  const cssHrefs = [
    ...indexHtml.matchAll(/<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+\.css)"/g),
  ].map((m) => m[1]);
  if (!cssHrefs.length) throw new Error("docs/index.html links no /_next stylesheet");
  return {
    cssHrefs: [...new Set(cssHrefs)],
    htmlClass: indexHtml.match(/<html[^>]*class="([^"]*)"/)?.[1] || "",
  };
}

function bodyOf(html, slug) {
  const marked = html.match(/<!--rk:body-->([\s\S]*?)<!--\/rk:body-->/);
  if (marked) return marked[1];
  // A page from before the markers: the prose div is followed by the CTA aside.
  const open = html.match(/<div class="prose"[^>]*>/);
  if (!open) throw new Error(`${slug}: no article body found`);
  const start = open.index + open[0].length;
  const end = html.indexOf('</div>\n  <aside class="article-cta">', start);
  if (end < 0) throw new Error(`${slug}: cannot find where the article body ends`);
  return html.slice(start, end);
}

function readPost(slug) {
  const html = fs.readFileSync(path.join(BLOG, slug, "index.html"), "utf8");
  const head = html.match(/<header class="article-head"[\s\S]*?<\/header>/)?.[0] || "";
  const title = attr(head, /<h1>([\s\S]*?)<\/h1>/) || attr(html, /<meta property="og:title" content="([^"]*)"/);
  if (!title) throw new Error(`${slug}: no title`);
  const date = attr(html, /<meta property="article:published_time" content="([^"]*)"/);
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) throw new Error(`${slug}: no publish date`);
  const lang = attr(html, /<div class="prose"[^>]*\blang="(ar|en)"/) === "en" ? "en" : "ar";
  const tags = [...head.matchAll(/<span class="tag">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]));
  const cover = attr(html, /<img class="article-cover" src="([^"]*)"/) || undefined;
  return {
    slug,
    title,
    date: date.slice(0, 10),
    lang,
    excerpt: attr(html, /<meta name="description" content="([^"]*)"/),
    tags,
    cover,
    body: "",
    html: bodyOf(html, slug),
    status: "published",
  };
}

const slugs = fs
  .readdirSync(BLOG, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "p" && fs.existsSync(path.join(BLOG, d.name, "index.html")))
  .map((d) => d.name);

// Newest first, as the publish query orders them.
const posts = slugs.map(readPost).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const shell = shellFrom(fs.readFileSync(path.join(DOCS, "index.html"), "utf8"));

const out = new Map();
for (const p of posts) out.set(path.join(BLOG, p.slug, "index.html"), renderPostPage(p, shell));
out.set(path.join(BLOG, "index.html"), renderBlogIndex(posts, shell));
out.set(path.join(DOCS, "sitemap.xml"), renderSitemap(posts));
out.set(path.join(DOCS, "rss.xml"), renderRss(posts));
out.set(path.join(DOCS, "robots.txt"), ROBOTS);

let stale = 0;
for (const [file, content] of out) {
  const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (before === content) continue;
  stale++;
  const rel = path.relative(path.dirname(DOCS), file);
  if (CHECK) console.log(`  stale  ${rel}`);
  else {
    fs.writeFileSync(file, content);
    console.log(`  wrote  ${rel}  ${Buffer.byteLength(content)}b`);
  }
}

console.log(
  `${posts.length} post(s): ${posts.map((p) => p.slug).join(", ")}. ` +
    (stale ? `${stale} file(s) ${CHECK ? "out of date" : "updated"}.` : "everything already current.")
);
if (CHECK && stale) process.exit(1);
