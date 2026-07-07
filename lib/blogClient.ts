// Client-side blog loading: posts are read straight from the GitHub repo,
// so publishing from the admin needs no build step at all.

export const RAW_BASE =
  "https://raw.githubusercontent.com/sawafilms20-debug/sawafilms20-debug.github.io/main/content/blog";

export type BlogMeta = {
  slug: string;
  title: string;
  date: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string[];
};

export function formatDate(iso: string, lang: "ar" | "en"): string {
  try {
    return new Intl.DateTimeFormat(lang === "en" ? "en" : "ar", {
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function readingLabel(words: number, lang: "ar" | "en"): string {
  const m = Math.max(1, Math.round(words / 180));
  if (lang === "en") return `${m} min read`;
  if (m === 1) return "دقيقة قراءة واحدة";
  if (m === 2) return "دقيقتا قراءة";
  if (m <= 10) return `${m} دقائق قراءة`;
  return `${m} دقيقة قراءة`;
}

export async function fetchManifest(): Promise<BlogMeta[]> {
  const res = await fetch(`${RAW_BASE}/index.json?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(String(res.status));
  const list: BlogMeta[] = await res.json();
  return list
    .map((p) => ({ ...p, lang: p.lang === "en" ? ("en" as const) : ("ar" as const) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function parsePostFile(raw: string): { meta: Omit<BlogMeta, "slug">; body: string } {
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
    meta: {
      title: get("title"),
      date: get("date"),
      lang: get("lang") === "en" ? "en" : "ar",
      excerpt: get("excerpt"),
      tags,
    },
    body,
  };
}

export async function fetchPost(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("bad slug");
  const res = await fetch(`${RAW_BASE}/${slug}.md?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(String(res.status));
  return parsePostFile(await res.text());
}
