import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "المدونة — رحيق كنجو",
  description:
    "مقالات في صنعة المحتوى: الكتابة التسويقية، السرد القصصي، الغوست رايتنغ، واستراتيجيات المحتوى للخبراء والشركات العربية.",
};

export default function BlogPage() {
  const posts = getPosts();

  return (
    <>
      <SiteNav solid />
      <main className="wrap page-head">
        <div className="ch-head">
          <span className="slug">المدونة</span>
          <h1 className="ch-title">
            مقالات في <em>صنعة المحتوى</em>
          </h1>
          <p className="page-lead">
            من دفتر الحرفة: عن الكتابة التسويقية، والسرد الذي يبيع، وبناء العلامات
            الشخصية بالمحتوى.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="page-lead">لا توجد مقالات بعد. عودوا قريبًا.</p>
        ) : (
          <div className="blog-grid">
            {posts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={`post-card${i === 0 ? " featured" : ""}`}
                dir={post.lang === "en" ? "ltr" : undefined}
              >
                <div className="post-meta">
                  <span className={`lang-chip ${post.lang}`}>
                    {post.lang === "en" ? "English" : "عربي"}
                  </span>
                  <span>{post.dateFormatted}</span>
                  <span>{post.readingLabel}</span>
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
        )}
      </main>
      <SiteFooter />
    </>
  );
}
