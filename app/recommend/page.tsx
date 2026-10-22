import type { Metadata } from "next";
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import RecommendForm from "@/components/RecommendForm";

/* Reached only through the link she sends. Kept out of search and out of the
   sitemap: a page that only works with a key in its URL is a dead end for
   anyone who arrives from Google. */
export const metadata: Metadata = {
  title: "اكتب توصية | رحيق كنجو",
  description: "شاركني تجربتك في العمل معي.",
  robots: { index: false, follow: false },
};

export default function RecommendPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap contact-head rf-head">
        <h1 className="hero-title rv d1">شاركني تجربتك في العمل معي</h1>
      </header>

      <main id="main" className="wrap contact-main rf-main">
        <RecommendForm />
      </main>

      <SiteFooter />
      <FX />
    </>
  );
}
