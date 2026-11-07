import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SubscribeForm from "@/components/SubscribeForm";
import BlogList from "./BlogList";

export const metadata: Metadata = {
  alternates: { canonical: "/blog/", types: { "application/rss+xml": [{ url: "/rss.xml", title: "رحيق كنجو" }] } },
  title: "خلينا نحكي محتوى | رحيق كنجو",
  description:
    "مدونتي هي مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب بأبسط طريقة ممكنة.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "رحيق كنجو",
    url: "/blog/",
    title: "خلينا نحكي محتوى | رحيق كنجو",
    description:
      "مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "شعار رحيق كنجو وعبارة: كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب", type: "image/jpeg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "خلينا نحكي محتوى | رحيق كنجو",
    description:
      "مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "شعار رحيق كنجو وعبارة: كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب", type: "image/jpeg" }],
  },
};


export default function BlogPage() {
  return (
    <>
      <SiteNav solid />
      <main id="main" className="wrap page-head">
        <div className="ch-head">
          <p className="slug">مدونتي</p>
          <h1 className="ch-title">
            خلينا نحكي <em>محتوى</em>
          </h1>
          <p className="page-lead">
            مدونتي هي مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي
            للخبراء العرب بأبسط طريقة ممكنة
          </p>
        </div>
        <BlogList />
        <section className="subscribe">
          <h2>اشترك وخلينا نحكي محتوى</h2>
          <SubscribeForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
