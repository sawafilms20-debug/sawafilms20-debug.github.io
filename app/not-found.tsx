import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة | رحيق كنجو",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteNav solid />
      <main id="main" className="wrap nf">
        <img
          src="/art-book.webp"
          alt=""
          aria-hidden="true"
          width={764}
          height={390}
          className="nf-art"
        />
        <h1 className="hero-title">هذه الصفحة غير موجودة</h1>
        <p className="page-lead">ربما تغيّر الرابط، أو كُتب بشكل غير صحيح</p>
        <div className="contact-ctas nf-ctas">
          <a className="btn btn-gold" href="/">
            العودة إلى الرئيسية
          </a>
          <a className="btn btn-ghost" href="/contact/">
            تواصل معي
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
