import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getPost, getPosts } from "@/lib/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — رحيق كنجو`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <>
      <SiteNav solid />
      <main className="wrap page-head">
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
              <span>{post.dateFormatted}</span>
              <span>{post.readingLabel}</span>
              {post.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          </header>
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
      </main>
      <SiteFooter />
    </>
  );
}
