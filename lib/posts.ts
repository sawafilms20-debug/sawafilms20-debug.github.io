import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  dateFormatted: string;
  lang: "ar" | "en";
  excerpt: string;
  tags: string[];
  readingMinutes: number;
  readingLabel: string;
};

export type Post = PostMeta & { html: string };

const formatDate = (iso: string, lang: "ar" | "en") =>
  new Intl.DateTimeFormat(lang === "en" ? "en" : "ar", { dateStyle: "long" }).format(
    new Date(iso)
  );

const readingTime = (text: string) =>
  Math.max(1, Math.round(text.split(/\s+/).length / 180));

const readingLabel = (m: number, lang: "ar" | "en") => {
  if (lang === "en") return `${m} min read`;
  if (m === 1) return "دقيقة قراءة واحدة";
  if (m === 2) return "دقيقتا قراءة";
  if (m <= 10) return `${m} دقائق قراءة`;
  return `${m} دقيقة قراءة`;
};

function parseFile(filename: string): { meta: PostMeta; body: string } {
  const slug = filename.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const lang: "ar" | "en" = data.lang === "en" ? "en" : "ar";
  const iso = data.date ? String(data.date) : "1970-01-01";
  return {
    meta: {
      slug,
      title: data.title ?? slug,
      date: iso,
      dateFormatted: formatDate(iso, lang),
      lang,
      excerpt: data.excerpt ?? "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      readingMinutes: readingTime(content),
      readingLabel: readingLabel(readingTime(content), lang),
    },
    body: content,
  };
}

export function getPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .map((f) => parseFile(f).meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  const file = `${slug}.md`;
  if (!fs.existsSync(path.join(BLOG_DIR, file))) return null;
  const { meta, body } = parseFile(file);
  return { ...meta, html: marked.parse(body) as string };
}
