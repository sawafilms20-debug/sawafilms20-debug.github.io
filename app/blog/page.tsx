import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SubscribeForm from "@/components/SubscribeForm";
import BlogList from "./BlogList";

export const metadata: Metadata = {
  title: "خلينا نحكي محتوى | رحيق كنجو",
  description:
    "مدونتي هي مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب بأبسط طريقة ممكنة.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "خلينا نحكي محتوى | رحيق كنجو",
    description:
      "مساحة أكبر لأفكاري وتجاربي في المحتوى، القصص، وبناء الحضور الرقمي للخبراء العرب.",
    images: ["/og-image.jpg"],
  },
};

export default function BlogPage() {
  return (
    <>
      <SiteNav solid />
      <main id="main" className="wrap page-head">
        <div className="ch-head">
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
