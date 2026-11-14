import { FAQ } from "./faq";
/* One entity graph for the whole site, with stable @ids reused on every page.
   Every Next page emits it through components/JsonLd.tsx and the generated blog
   pages through lib/siteGen.ts, so search engines see the same Person, WebSite,
   business and Service nodes wherever they land, plus that page's own WebPage
   and BreadcrumbList. Only facts shown on the site belong here: no ratings,
   no reviews, no address. Plain TypeScript only (no enums), because
   scripts/regen-blog.mjs loads this file through Node's type stripping. */

export const SITE_URL = "https://raheeqkanjo.com";
const HOME = `${SITE_URL}/`;
const NAME = "رحيق كنجو";
const EMAIL = "raheeqkanjo@gmail.com";
const LINKEDIN = "https://www.linkedin.com/in/raheekkanjo/";

export const ID = {
  person: `${SITE_URL}/#person`,
  personImage: `${SITE_URL}/#personimage`,
  website: `${SITE_URL}/#website`,
  business: `${SITE_URL}/#business`,
  logo: `${SITE_URL}/#logo`,
  blog: `${SITE_URL}/blog/#blog`,
  serviceLinkedIn: `${SITE_URL}/linkedin/#service`,
  serviceArticles: `${SITE_URL}/articles/#service`,
  serviceScripts: `${SITE_URL}/scripts/#service`,
};

type Node = Record<string, unknown>;
const ref = (id: string) => ({ "@id": id });

/* Served online: the Arab world, Gulf countries first. Places only, never an office. */
const GCC: [string, string, string][] = [
  ["السعودية", "Saudi Arabia", "SA"],
  ["الإمارات العربية المتحدة", "United Arab Emirates", "AE"],
  ["قطر", "Qatar", "QA"],
  ["الكويت", "Kuwait", "KW"],
  ["البحرين", "Bahrain", "BH"],
  ["عُمان", "Oman", "OM"],
];
const AREA_SERVED: Node[] = [
  { "@type": "Place", name: "العالم العربي", alternateName: "Arab world" },
  ...GCC.map(([ar, en, code]) => ({ "@type": "Country", name: ar, alternateName: en, identifier: code })),
];

/* The service is ordered through the site's contact page; no premises. */
const CHANNEL = {
  "@type": "ServiceChannel",
  name: "عبر الإنترنت",
  serviceUrl: `${SITE_URL}/contact/`,
};

const AUDIENCE = { "@type": "Audience", audienceType: "الخبراء العرب" };

/* Names and lists below are the ones printed on each service page. */
const SERVICES: Node[] = [
  {
    "@type": "Service",
    "@id": ID.serviceLinkedIn,
    name: "بناء علامتك الشخصية على LinkedIn",
    serviceType: "محتوى LinkedIn وبناء العلامة الشخصية",
    description: "استراتيجية محتوى، Ghostwriting، تطوير الحساب واستشارات LinkedIn للخبراء العرب.",
    url: `${SITE_URL}/linkedin/`,
    offerList: ["استراتيجية المحتوى", "Ghostwriting", "تطوير الحساب", "الاستشارات"],
  },
  {
    "@type": "Service",
    "@id": ID.serviceArticles,
    name: "خدمة كتابة المقالات",
    serviceType: "كتابة المقالات",
    description: "مقالات تحمل معرفة الخبراء وصوتهم: مقالات متخصصة، Thought Leadership، رأي وتحليل، وSEO.",
    url: `${SITE_URL}/articles/`,
    offerList: [
      "مقالات متخصصة",
      "Thought Leadership",
      "مقالات رأي وتحليل",
      "مقالات SEO",
      "مقالات مبنية على دراسات وتقارير",
    ],
  },
  {
    "@type": "Service",
    "@id": ID.serviceScripts,
    name: "خدمة كتابة سيناريو الفيديو",
    serviceType: "كتابة سكريبتات الفيديو",
    description:
      "سكريبتات فيديو تبدأ من هوك مدروس وترتب الرحلة حتى آخر ثانية: فيديوهات قصيرة وتعليمية وYouTube.",
    url: `${SITE_URL}/scripts/`,
    offerList: ["فيديوهات قصيرة", "فيديوهات تعليمية", "محتوى معرفي وتحليلي", "YouTube", "حلقات مبنية على البحث"],
  },
].map(({ offerList, ...s }) => ({
  ...s,
  provider: ref(ID.person),
  brand: ref(ID.business),
  areaServed: AREA_SERVED,
  availableChannel: CHANNEL,
  audience: AUDIENCE,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: s.name,
    itemListElement: (offerList as string[]).map((n) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: n },
    })),
  },
}));

/* The certificates on /about/ (#certs), with the issuer the caption names. */
const CREDENTIALS: Node[] = [
  {
    "@type": "EducationalOccupationalCredential",
    name: "صناعة وكتابة المحتوى التسويقي والإعلاني",
    alternateName: "البرنامج التدريبي الشامل في صناعة وكتابة المحتوى التسويقي والإعلاني",
    credentialCategory: "certificate",
    recognizedBy: { "@type": "Organization", name: "أكاديمية رامي بدره" },
    timeRequired: "PT45H",
    dateCreated: "2025",
    image: `${SITE_URL}/cert-rami-badrah.jpg`,
  },
  {
    "@type": "EducationalOccupationalCredential",
    name: "The Art of Storytelling",
    credentialCategory: "certificate",
    recognizedBy: { "@type": "EducationalOrganization", name: "IESE Business School", url: "https://www.iese.edu/" },
    provider: { "@type": "Organization", name: "Coursera", url: "https://www.coursera.org/" },
    dateCreated: "2026",
    image: `${SITE_URL}/cert-iese-storytelling.jpg`,
  },
  {
    "@type": "EducationalOccupationalCredential",
    name: "Search Engine Optimization",
    credentialCategory: "certificate",
    recognizedBy: {
      "@type": "EducationalOrganization",
      name: "منصة إدراك",
      alternateName: "Edraak",
      url: "https://www.edraak.org/",
    },
    dateCreated: "2023",
    image: `${SITE_URL}/cert-edraak-seo.jpg`,
  },
];

const PERSON: Node = {
  "@type": "Person",
  "@id": ID.person,
  name: NAME,
  alternateName: ["Raheeq Kanjo", "Raheek Kanjo"],
  jobTitle: ["كاتبة محتوى تسويقي", "Marketing Content Writer & Content Strategist"],
  description: "كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب: محتوى LinkedIn وبناء العلامة الشخصية، مقالات المواقع، وسكريبتات الفيديو.",
  url: HOME,
  image: {
    "@type": "ImageObject",
    "@id": ID.personImage,
    url: `${SITE_URL}/raheeq-about.webp`,
    contentUrl: `${SITE_URL}/raheeq-about.webp`,
    width: 900,
    height: 1205,
    caption: NAME,
    inLanguage: "ar",
  },
  email: EMAIL,
  sameAs: [LINKEDIN],
  knowsLanguage: ["ar", "en"],
  knowsAbout: [
    "كتابة المحتوى التسويقي",
    "استراتيجية المحتوى",
    "بناء العلامة الشخصية",
    "LinkedIn",
    "Ghostwriting",
    "كتابة المقالات",
    "Thought Leadership",
    "تحسين محركات البحث (SEO)",
    "كتابة سكريبتات الفيديو",
    "السرد القصصي",
  ],
  hasCredential: CREDENTIALS,
  award: [
    "شهادة تقدير من Light Initiative وSyrian Youth Assembly عن تسجيل 300 صفحة صوتيًا لدعم الطلاب المكفوفين (2022)",
  ],
};

const BUSINESS: Node = {
  "@type": "Organization",
  "@id": ID.business,
  name: NAME,
  alternateName: "Raheeq Kanjo",
  description:
    "كتابة المحتوى التسويقي واستراتيجيات المحتوى للخبراء العرب: LinkedIn وبناء العلامة الشخصية، المقالات، وسكريبتات الفيديو.",
  url: HOME,
  email: EMAIL,
  logo: {
    "@type": "ImageObject",
    "@id": ID.logo,
    url: `${SITE_URL}/logo-raheeq.webp`,
    contentUrl: `${SITE_URL}/logo-raheeq.webp`,
    width: 360,
    height: 470,
    caption: NAME,
  },
  image: ref(ID.logo),
  founder: ref(ID.person),
  areaServed: AREA_SERVED,
  knowsLanguage: ["ar", "en"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: EMAIL,
    url: `${SITE_URL}/contact/`,
    areaServed: AREA_SERVED,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "خدمات",
    itemListElement: [ID.serviceLinkedIn, ID.serviceArticles, ID.serviceScripts].map((id) => ({
      "@type": "Offer",
      itemOffered: ref(id),
    })),
  },
};

const WEBSITE: Node = {
  "@type": "WebSite",
  "@id": ID.website,
  url: HOME,
  name: NAME,
  alternateName: ["Raheeq Kanjo", "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب"],
  inLanguage: "ar",
  publisher: ref(ID.person),
  about: ref(ID.person),
};

/** The nodes every page carries. */
export function siteNodes(): Node[] {
  return [WEBSITE, PERSON, BUSINESS, ...SERVICES];
}

/** Short author/publisher stub: the @id joins it to the full Person node,
 *  the name keeps it readable to parsers that do not follow references. */
export const personRef = () => ({ "@type": "Person", "@id": ID.person, name: NAME, url: HOME });

export type Crumb = { name: string; url: string };
const HOME_CRUMB: Crumb = { name: "الرئيسية", url: HOME };

export function breadcrumbNode(pageUrl: string, trail: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [HOME_CRUMB, ...trail].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function webPageNode(o: {
  url: string;
  type?: string | string[];
  name: string;
  description?: string;
  lang?: string;
  hasCrumbs?: boolean;
  extra?: Node;
}): Node {
  return {
    "@type": o.type ?? "WebPage",
    "@id": `${o.url}#webpage`,
    url: o.url,
    name: o.name,
    ...(o.description ? { description: o.description } : {}),
    inLanguage: o.lang ?? "ar",
    isPartOf: ref(ID.website),
    ...(o.hasCrumbs ? { breadcrumb: ref(`${o.url}#breadcrumb`) } : {}),
    ...(o.extra ?? {}),
  };
}

export const graph = (nodes: Node[]) => ({ "@context": "https://schema.org", "@graph": nodes });

/* "<" escaped so a "</script" inside a title cannot close the element early. */
export const toJsonLdString = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/* ---- Next app pages ---- */

export type PageKey = "home" | "about" | "contact" | "linkedin" | "articles" | "scripts" | "blog";

const PAGES: Record<PageKey, { path: string; type: string | string[]; crumb?: string; name: string; extra: Node }> = {
  home: {
    path: "/",
    type: "WebPage",
    name: "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب",
    extra: { about: ref(ID.person), mainEntity: ref(ID.business) },
  },
  about: {
    path: "/about/",
    type: ["AboutPage", "ProfilePage"],
    crumb: "عني",
    name: "عني | رحيق كنجو",
    extra: { about: ref(ID.person), mainEntity: ref(ID.person), primaryImageOfPage: ref(ID.personImage) },
  },
  contact: {
    path: "/contact/",
    type: "ContactPage",
    crumb: "تواصل معي",
    name: "تواصل معي | رحيق كنجو",
    extra: { about: ref(ID.person), mainEntity: ref(ID.business) },
  },
  linkedin: {
    path: "/linkedin/",
    type: "WebPage",
    crumb: "بناء علامتك الشخصية على LinkedIn",
    name: "خدمات LinkedIn للخبراء | رحيق كنجو",
    extra: { about: ref(ID.serviceLinkedIn), mainEntity: ref(ID.serviceLinkedIn) },
  },
  articles: {
    path: "/articles/",
    type: "WebPage",
    crumb: "خدمة كتابة المقالات",
    name: "كتابة المقالات | رحيق كنجو",
    extra: { about: ref(ID.serviceArticles), mainEntity: ref(ID.serviceArticles) },
  },
  scripts: {
    path: "/scripts/",
    type: "WebPage",
    crumb: "خدمة كتابة سيناريو الفيديو",
    name: "كتابة سكريبتات الفيديو | رحيق كنجو",
    extra: { about: ref(ID.serviceScripts), mainEntity: ref(ID.serviceScripts) },
  },
  blog: {
    path: "/blog/",
    type: "CollectionPage",
    crumb: "المدونة",
    name: "خلينا نحكي محتوى | رحيق كنجو",
    extra: { about: ref(ID.person), mainEntity: ref(ID.blog) },
  },
};

/** Full graph for one Next page. name/description come from the page's own
 *  metadata when it has them, so the markup follows whatever the page says. */
export function pageGraph(key: PageKey, meta: { name?: string; description?: string } = {}) {
  const p = PAGES[key];
  const url = `${SITE_URL}${p.path}`;
  const nodes: Node[] = [
    ...siteNodes(),
    webPageNode({
      url,
      type: p.type,
      name: meta.name || p.name,
      description: meta.description,
      hasCrumbs: Boolean(p.crumb),
      extra: p.extra,
    }),
  ];
  if (p.crumb) nodes.push(breadcrumbNode(url, [{ name: p.crumb, url }]));
  if (key === "blog") nodes.push(blogNode());
  // The same questions the page shows in its FAQ section (components/Faq.tsx),
  // word for word — FAQPage markup must match visible text.
  const faq = FAQ[key];
  if (faq?.length) {
    nodes.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      inLanguage: "ar",
      isPartOf: ref(`${url}#webpage`),
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return graph(nodes);
}

export function blogNode(posts: { title: string; slug: string; date: string; lang: string }[] = []): Node {
  return {
    "@type": "Blog",
    "@id": ID.blog,
    name: "خلينا نحكي محتوى",
    description: "مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب.",
    url: `${SITE_URL}/blog/`,
    inLanguage: "ar",
    isPartOf: ref(ID.website),
    author: personRef(),
    publisher: ref(ID.person),
    ...(posts.length
      ? {
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            "@id": `${SITE_URL}/blog/${p.slug}/#article`,
            headline: p.title,
            url: `${SITE_URL}/blog/${p.slug}/`,
            datePublished: p.date,
            inLanguage: p.lang,
            author: ref(ID.person),
          })),
        }
      : {}),
  };
}
