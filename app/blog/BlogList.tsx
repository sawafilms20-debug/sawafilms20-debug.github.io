"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchManifest, formatDate, type BlogMeta } from "@/lib/blogClient";

export default function BlogList() {
  const [posts, setPosts] = useState<BlogMeta[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchManifest()
      .then(setPosts)
      .catch(() => setFailed(true));
  }, []);

  if (failed)
    return <p className="page-lead">تعذّر تحميل المقالات — حاول تحديث الصفحة.</p>;
  if (posts === null) return <p className="page-lead">جارٍ تحميل المقالات…</p>;
  if (posts.length === 0) return <p className="page-lead">لا توجد مقالات بعد. عودوا قريبًا.</p>;

  return (
    <div className="blog-grid">
      {posts.map((post, i) => (
        <Link
          key={post.slug}
          href={`/blog/p/?s=${post.slug}`}
          className={`post-card${i === 0 ? " featured" : ""}`}
          dir={post.lang === "en" ? "ltr" : undefined}
        >
          <div className="post-meta">
            <span className={`lang-chip ${post.lang}`}>
              {post.lang === "en" ? "English" : "عربي"}
            </span>
            <span>{formatDate(post.date, post.lang)}</span>
          </div>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <div className="post-foot">
            <span className="read-more">
              {post.lang === "en" ? "Read article →" : "اقرأ المقال ←"}
            </span>
            <span className="post-tags">
              {post.tags.map((t) => (
                <i key={t}>{t}</i>
              ))}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
