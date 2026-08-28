import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  Compass,
  GraduationCap,
  Magnet,
  Route,
  Search,
  Smartphone,
  Users,
} from "lucide-react";
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { YouTubeIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "كتابة سكريبتات الفيديو | رحيق كنجو",
  description:
    "أحوّل خبرتك إلى فيديو يمنح المشاهد سببًا للاستمرار من أول ثانية إلى النهاية: فيديوهات قصيرة وتعليمية، محتوى معرفي وتحليلي، وYouTube.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "كتابة سكريبتات الفيديو | رحيق كنجو",
    description:
      "سكريبتات فيديو تبدأ من هوك مدروس وترتب الرحلة حتى آخر ثانية: فيديوهات قصيرة وتعليمية وYouTube.",
    images: ["/og-image.jpg"],
  },
};

export default function ScriptsPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap">
        <h1 className="hero-title rv d1">
          لديك المعرفة
          <br />
          والمشاهد لديه زر التمرير
          <br />
          بين الاثنين يوجد السكريبت
        </h1>
        <p className="page-lead strong rv d2">
          أحوّل خبرتك إلى فيديو يمنح المشاهد سببًا للاستمرار من أول ثانية إلى النهاية
        </p>
      </header>

      <main id="main">
        <div className="method-band">
          <div className="wrap">
            <div className="ch-head rv">
              <h2 className="ch-title">
                كيف أبني <em>السكريبت</em>؟
              </h2>
            </div>
            <div className="steps five">
              <div className="step rv">
                <span className="ic-chip step-ic">
                  <Users />
                </span>
                <div className="step-num">01</div>
                <h3>أفهم الجمهور</h3>
                <p className="q">ما الذي يهمه؟ وما الذي يعرفه مسبقًا؟</p>
              </div>
              <div className="step rv d1">
                <span className="ic-chip step-ic">
                  <Search />
                </span>
                <div className="step-num">02</div>
                <h3>أبحث</h3>
                <p>أجمع المادة التي يحتاجها الموضوع</p>
              </div>
              <div className="step rv d2">
                <span className="ic-chip step-ic">
                  <Compass />
                </span>
                <div className="step-num">03</div>
                <h3>أجد الزاوية</h3>
                <p>أحدد المدخل الذي يعطي الفكرة قيمتها</p>
              </div>
              <div className="step rv d3">
                <span className="ic-chip step-ic">
                  <Magnet />
                </span>
                <div className="step-num">04</div>
                <h3>أبني الهوك</h3>
                <p>أبدأ من نقطة تخلق فضولًا أو حاجة</p>
              </div>
              <div className="step rv d4">
                <span className="ic-chip step-ic">
                  <Route />
                </span>
                <div className="step-num">05</div>
                <h3>أرتب الرحلة</h3>
                <p>كل معلومة تأتي في الوقت الذي يحتاجها المشاهد</p>
              </div>
            </div>
          </div>
        </div>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <h2 className="ch-title">
              أكتب <em>سكريبتات</em>
            </h2>
          </div>
          <ul className="icon-list cols2">
            <li className="rv">
              <span className="ic-chip">
                <Smartphone />
              </span>
              فيديوهات قصيرة
            </li>
            <li className="rv d1">
              <span className="ic-chip">
                <GraduationCap />
              </span>
              فيديوهات تعليمية
            </li>
            <li className="rv d2">
              <span className="ic-chip">
                <Brain />
              </span>
              محتوى معرفي وتحليلي
            </li>
            <li className="rv d3">
              <span className="ic-chip">
                <YouTubeIcon />
              </span>
              YouTube
            </li>
            <li className="rv d4">
              <span className="ic-chip">
                <BookOpen />
              </span>
              حلقات مبنية على البحث
            </li>
          </ul>
        </section>

        <section className="contact wrap">
          <h2 className="rv">
            فيديو يعرف كيف يبدأ، وكيف <em>يحافظ على المشاهد</em>
          </h2>
          <div className="contact-ctas rv d1">
            <Link className="btn btn-gold" href="/contact">
              ناقش فكرة الفيديو
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FX />
    </>
  );
}
