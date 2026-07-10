import { marked } from "marked";

/* Server-side generator for real, crawlable blog pages.
   Produces per-post HTML (unique title/description/OG/JSON-LD + the article text
   baked in), a static blog index, sitemap, RSS and robots.txt — all written into
   docs/ so GitHub Pages serves them. Reuses the site's own stylesheet + font
   classes so the output is visually identical to the rest of the site. */

export const SITE = "https://raheeqkanjo.com";
const BRAND = "رحيق كنجو";

export type Post = {
  slug: string;
  title: string;
  date: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string[];
  cover?: string;
  body: string;
  status?: string;
};

export type Shell = { cssHref: string; htmlClass: string };

export const esc = (s: string) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function fmtDate(iso: string, lang: "ar" | "en") {
  try {
    return new Intl.DateTimeFormat(lang === "en" ? "en" : "ar", { dateStyle: "long" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export function readingLabel(words: number, lang: "ar" | "en") {
  const m = Math.max(1, Math.round(words / 180));
  if (lang === "en") return `${m} min read`;
  if (m === 1) return "دقيقة قراءة واحدة";
  if (m === 2) return "دقيقتا قراءة";
  if (m <= 10) return `${m} دقائق قراءة`;
  return `${m} دقيقة قراءة`;
}

const NAV = `<nav><div class="nav-in"><a class="mark" href="/"><img src="/logo-raheeq.webp" alt="رحيق" width="717" height="379"/></a><div class="nav-links"><a href="/#why">النتائج</a><a href="/#services">كيف نعمل معًا</a><a href="/blog/">المدونة</a><a class="nav-cta" href="/#contact">تواصل معي</a></div></div></nav>`;

const FOOT = `<footer class="foot"><div class="wrap">${BRAND} © ${new Date().getFullYear()} · كُتب هذا الموقع <b>بحبرٍ ذهبي</b> وشغفٍ بالحكاية.<div class="foot-links"><a href="https://www.linkedin.com/in/raheekkanjo/" target="_blank" rel="noopener">لينكدإن</a><a href="mailto:raheeqkanjo@gmail.com">raheeqkanjo@gmail.com</a></div></div></footer>`;

function shell(o: {
  lang: "ar" | "en";
  head: string;
  body: string;
  shell: Shell;
}) {
  const dir = o.lang === "en" ? "ltr" : "rtl";
  return `<!DOCTYPE html>
<html lang="${o.lang}" dir="${dir}" class="${o.shell.htmlClass}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="${o.shell.cssHref}"/>
<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any"/>
<link rel="alternate" type="application/rss+xml" title="${BRAND}" href="/rss.xml"/>
${o.head}
</head>
<body>
${NAV}
${o.body}
${FOOT}
<script defer src="/track.js"></script>
</body>
</html>`;
}

export function renderPostPage(p: Post, sh: Shell) {
  const url = `${SITE}/blog/${p.slug}/`;
  const html = marked.parse(p.body) as string;
  const words = p.body.split(/\s+/).filter(Boolean).length;
  const image = p.cover ? (p.cover.startsWith("http") ? p.cover : SITE + p.cover) : `${SITE}/og-image.jpg`;
  const desc = p.excerpt || p.title;
  const dir = p.lang === "en" ? "ltr" : "rtl";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: desc,
    image,
    datePublished: p.date,
    dateModified: p.date,
    inLanguage: p.lang,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Person", name: "Raheek Kanjo", alternateName: BRAND, url: SITE },
    publisher: { "@type": "Person", name: BRAND, url: SITE },
    keywords: p.tags.join(", "),
  };

  const head = `<title>${esc(p.title)} — ${BRAND}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(p.title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:locale" content="${p.lang === "en" ? "en_US" : "ar_AR"}"/>
<meta property="article:published_time" content="${esc(p.date)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(p.title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  const body = `<main class="wrap">
<article class="article">
  <header class="article-head" dir="${dir}">
    <a href="/blog/" class="back-link">${p.lang === "en" ? "← Blog" : "→ المدونة"}</a>
    <h1>${esc(p.title)}</h1>
    <div class="post-meta">
      <span class="lang-chip ${p.lang}">${p.lang === "en" ? "English" : "عربي"}</span>
      <span>${esc(fmtDate(p.date, p.lang))}</span>
      <span>${esc(readingLabel(words, p.lang))}</span>
      ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
    </div>
  </header>
  ${p.cover ? `<img class="article-cover" src="${esc(p.cover)}" alt="${esc(p.title)}"/>` : ""}
  <div class="prose" dir="${dir}" lang="${p.lang}">${html}</div>
  <aside class="article-cta">
    <h3>خبرتك تستحق محتوى بهذا المستوى؟</h3>
    <p>استشارة مجانية لمدة 30 دقيقة نناقش فيها هدفك وجمهورك، وتخرج منها بخطوة واضحة.</p>
    <a class="btn btn-gold" href="/#contact">احجز استشارتك المجانية</a>
  </aside>
</article>
</main>`;

  return shell({ lang: p.lang, head, body, shell: sh });
}

export function renderBlogIndex(posts: Post[], sh: Shell) {
  const head = `<title>المدونة — ${BRAND}</title>
<meta name="description" content="مقالات عن الكتابة، السرد، واستراتيجية المحتوى — بقلم ${BRAND}."/>
<link rel="canonical" href="${SITE}/blog/"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="المدونة — ${BRAND}"/>
<meta property="og:description" content="مقالات عن الكتابة، السرد، واستراتيجية المحتوى."/>
<meta property="og:url" content="${SITE}/blog/"/>
<meta property="og:image" content="${SITE}/og-image.jpg"/>`;

  const cards = posts
    .map(
      (p, i) => `<a href="/blog/${p.slug}/" class="post-card${i === 0 ? " featured" : ""}"${
        p.lang === "en" ? ' dir="ltr"' : ""
      }>
  <div class="post-meta">
    <span class="lang-chip ${p.lang}">${p.lang === "en" ? "English" : "عربي"}</span>
    <span>${esc(fmtDate(p.date, p.lang))}</span>
  </div>
  <h2>${esc(p.title)}</h2>
  <p>${esc(p.excerpt)}</p>
  <div class="post-foot">
    <span class="read-more">${p.lang === "en" ? "Read article →" : "اقرأ المقال ←"}</span>
    <span class="post-tags">${p.tags.map((t) => `<i>${esc(t)}</i>`).join("")}</span>
  </div>
</a>`
    )
    .join("\n");

  const body = `<main class="wrap page">
<span class="slug">المدونة</span>
<h1 class="page-title">مقالات عن الكتابة والسرد</h1>
<p class="page-lead">أكتب هنا عمّا تعلّمته من سنواتٍ في صناعة المحتوى العربي.</p>
<div class="blog-grid">
${posts.length ? cards : "<p class='page-lead'>لا توجد مقالات بعد.</p>"}
</div>
</main>`;

  return shell({ lang: "ar", head, body, shell: sh });
}

export function renderSitemap(posts: Post[]) {
  const urls = [
    { loc: `${SITE}/`, pri: "1.0" },
    { loc: `${SITE}/blog/`, pri: "0.8" },
    ...posts.map((p) => ({ loc: `${SITE}/blog/${p.slug}/`, pri: "0.7", lastmod: p.date })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${
        "lastmod" in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""
      }<priority>${u.pri}</priority></url>`
  )
  .join("\n")}
</urlset>`;
}

export function renderRss(posts: Post[]) {
  const items = posts
    .map(
      (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}/blog/${p.slug}/</link>
    <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${esc(p.excerpt)}</description>
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${BRAND} — المدونة</title>
  <link>${SITE}/blog/</link>
  <description>مقالات عن الكتابة، السرد، واستراتيجية المحتوى.</description>
  <language>ar</language>
${items}
</channel></rss>`;
}

export const ROBOTS = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE}/sitemap.xml`;
