"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";
import { fetchPost, formatDate, readingLabel } from "@/lib/blogClient";

type Loaded = {
  title: string;
  date: string;
  lang: "ar" | "en";
  tags: string[];
  html: string;
  words: number;
  cover?: string;
};

export default function PostView() {
  const params = useSearchParams();
  const slug = params.get("s") || "";
  const [post, setPost] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!slug) {
      setFailed(true);
      return;
    }
    fetchPost(slug)
      .then(({ meta, body }) => {
        setPost({
          title: meta.title,
          date: meta.date,
          lang: meta.lang,
          tags: meta.tags,
          html: marked.parse(body) as string,
          words: body.split(/\s+/).length,
          cover: meta.cover,
        });
        document.title = `${meta.title} — رحيق كنجو`;
      })
      .catch(() => setFailed(true));
  }, [slug]);

  if (failed)
    return (
      <div className="article">
        <Link href="/blog" className="back-link">
          → المدونة
        </Link>
        <p className="page-lead">لم نعثر على هذا المقال.</p>
      </div>
    );

  if (!post)
    return (
      <div className="article">
        <p className="page-lead">جارٍ تحميل المقال…</p>
      </div>
    );

  return (
    <article className="article">
      <header className="article-head" dir={post.lang === "en" ? "ltr" : undefined}>
        <Link href="/blog" className="back-link">
          {post.lang === "en" ? "← Blog" : "→ المدونة"}
        </Link>
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span className={`lang-chip ${post.lang}`}>
            {post.lang === "en" ? "English" : "عربي"}
          </span>
          <span>{formatDate(post.date, post.lang)}</span>
          <span>{readingLabel(post.words, post.lang)}</span>
          {post.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </header>
      {post.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="article-cover" src={post.cover} alt={post.title} />
      )}
      <div
        className="prose"
        dir={post.lang === "en" ? "ltr" : undefined}
        lang={post.lang}
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
      <aside className="article-cta">
        <h3>خبرتك تستحق محتوى بهذا المستوى؟</h3>
        <p>استشارة مجانية لمدة 30 دقيقة نناقش فيها هدفك وجمهورك، وتخرج منها بخطوة واضحة.</p>
        <a
          className="btn btn-gold"
          href="mailto:raheeqkanjo@gmail.com?subject=%D8%B7%D9%84%D8%A8%20%D8%A7%D8%B3%D8%AA%D8%B4%D8%A7%D8%B1%D8%A9%20%D9%85%D8%AC%D8%A7%D9%86%D9%8A%D8%A9"
        >
          احجز استشارتك المجانية
        </a>
      </aside>
    </article>
  );
}
