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

const NAV = `<nav><div class="nav-in"><a class="mark" href="/"><img src="/logo-raheeq.webp" alt="رحيق" width="360" height="470"/></a><div class="nav-links" id="nav-menu"><a href="/linkedin/">LinkedIn</a><a href="/articles/">المقالات</a><a href="/scripts/">سكريبتات الفيديو</a><a href="/about/">عني</a></div><div class="nav-end"><a class="nav-cta" href="/contact/">تواصل معي</a><button type="button" class="nav-burger" aria-label="فتح القائمة" aria-expanded="false" aria-controls="nav-menu" onclick="var n=this.closest('nav');n.classList.toggle('nav-open');this.setAttribute('aria-expanded',n.classList.contains('nav-open'))"><svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg></button></div></div></nav>`;

const LINKEDIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>`;
const MAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

const FOOT = `<footer class="foot foot2"><div class="wrap"><div class="foot-brand"><img class="foot-logo" src="/logo-raheeq.webp" alt="${BRAND}" width="360" height="470" loading="lazy"/><span class="foot-tag">كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب</span></div><nav class="foot-nav" aria-label="روابط الموقع"><a href="/linkedin/">LinkedIn</a><a href="/articles/">المقالات</a><a href="/scripts/">سكريبتات الفيديو</a><a href="/about/">عني</a><a href="/contact/">تواصل معي</a><a href="/blog/">المدونة</a></nav><div class="foot-social"><a href="https://www.linkedin.com/in/raheekkanjo/" target="_blank" rel="noopener" aria-label="حساب رحيق على LinkedIn">${LINKEDIN_SVG}</a><a href="mailto:raheeqkanjo@gmail.com" aria-label="راسلني عبر البريد الإلكتروني">${MAIL_SVG}</a></div><p class="foot-line">أحوّل خبرتك إلى محتوى يحمل صوتك ويصنع حضورك.</p><p class="foot-copy">© ${new Date().getFullYear()} ${BRAND}</p></div></footer>`;

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
<link rel="stylesheet" href="/site-extra.css"/>
<link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" sizes="any"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3"/>
<meta name="apple-mobile-web-app-title" content="${BRAND}"/>
<meta name="theme-color" content="#f7f2e9"/>
<link rel="alternate" type="application/rss+xml" title="${BRAND}" href="/rss.xml"/>
${o.head}
</head>
<body>
<a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>
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

  const head = `<title>${esc(p.title)} | ${BRAND}</title>
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

  const body = `<main id="main" class="wrap">
<article class="article">
  <header class="article-head" dir="${dir}">
    <a href="/blog/" class="back-link">${p.lang === "en" ? "Back to blog" : "العودة إلى المدونة"}</a>
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
    <h3>لديك فكرة تستحق أن تتحول إلى محتوى؟</h3>
    <p>احكِ لي عن خبرتك، المشروع والجمهور الذي تريد الوصول إليه</p>
    <a class="btn btn-gold" href="/contact/">تواصل معي</a>
  </aside>
</article>
</main>`;

  return shell({ lang: p.lang, head, body, shell: sh });
}

export function renderBlogIndex(posts: Post[], sh: Shell) {
  const head = `<title>خلينا نحكي محتوى | ${BRAND}</title>
<meta name="description" content="مدونتي هي مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب بأبسط طريقة ممكنة."/>
<link rel="canonical" href="${SITE}/blog/"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="خلينا نحكي محتوى | ${BRAND}"/>
<meta property="og:description" content="مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب."/>
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
    <span class="read-more">${p.lang === "en" ? "Read article" : "اقرأ المقال"}</span>
    <span class="post-tags">${p.tags.map((t) => `<i>${esc(t)}</i>`).join("")}</span>
  </div>
</a>`
    )
    .join("\n");

  const body = `<main id="main" class="wrap page">
<h1 class="page-title">خلينا نحكي <em>محتوى</em></h1>
<p class="page-lead">مدونتي هي مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب بأبسط طريقة ممكنة</p>
<div class="blog-grid">
${posts.length ? cards : "<p class='page-lead'>لا توجد مقالات بعد.</p>"}
</div>
<section class="subscribe">
  <h2>اشترك وخلينا نحكي محتوى</h2>
  <form class="sub-form" id="sub-form" novalidate>
    <label class="sub-field" for="sub-email"><span>بريدك الإلكتروني</span>
      <input id="sub-email" name="email" type="email" dir="ltr" autocomplete="email" required/>
    </label>
    <button class="btn btn-gold" type="submit">اشترك</button>
    <p class="sub-status" role="status" aria-live="polite"></p>
  </form>
</section>
<script>
(function(){
  var f=document.getElementById('sub-form');if(!f)return;
  var st=f.querySelector('.sub-status'),btn=f.querySelector('button');
  var api=(location.hostname==='raheeqkanjo.com'||location.hostname==='www.raheeqkanjo.com')
    ? 'https://rak-production.up.railway.app/api/leads' : '/api/leads';
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var email=(f.email.value||'').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){st.textContent='الرجاء إدخال بريد إلكتروني صحيح';return;}
    btn.disabled=true;btn.textContent='جارٍ الاشتراك…';st.textContent='';
    fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:'مشترك في المدونة',email:email,message:'طلب اشتراك في المدونة',source:'blog-subscribe'})})
      .then(function(r){
        if(r.ok){f.reset();btn.textContent='تم الاشتراك ✓';st.textContent='وصلني اشتراكك، سأكتب لك قريبًا';}
        else{btn.disabled=false;btn.textContent='اشترك';st.textContent='تعذّر الاشتراك، حاول مرة أخرى';}
      })
      .catch(function(){btn.disabled=false;btn.textContent='اشترك';st.textContent='تعذّر الاشتراك، تحقق من اتصالك';});
  });
})();
</script>
</main>`;

  return shell({ lang: "ar", head, body, shell: sh });
}

export function renderSitemap(posts: Post[]) {
  const urls = [
    { loc: `${SITE}/`, pri: "1.0" },
    { loc: `${SITE}/linkedin/`, pri: "0.9" },
    { loc: `${SITE}/articles/`, pri: "0.9" },
    { loc: `${SITE}/scripts/`, pri: "0.9" },
    { loc: `${SITE}/about/`, pri: "0.8" },
    { loc: `${SITE}/contact/`, pri: "0.8" },
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
  <title>${BRAND} | المدونة</title>
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
