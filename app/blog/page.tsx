import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import BlogList from "./BlogList";

export const metadata: Metadata = {
  title: "المدونة — رحيق كنجو",
  description:
    "مقالات في صنعة المحتوى: الكتابة التسويقية، السرد القصصي، الغوست رايتنغ، واستراتيجيات المحتوى للخبراء والشركات العربية.",
};

export default function BlogPage() {
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
        <BlogList />
      </main>
      <SiteFooter />
    </>
  );
}
