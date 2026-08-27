import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  BarChart3,
  CheckCheck,
  FileText,
  Globe,
  LayoutList,
  Lightbulb,
  PenLine,
  Quote,
  Search,
} from "lucide-react";
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "كتابة المقالات | رحيق كنجو",
  description:
    "أعمل مع الخبراء على تحويل معرفتهم وآرائهم إلى مقالات واضحة وعميقة تحمل أسماءهم: مقالات متخصصة، Thought Leadership، رأي وتحليل، وSEO.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "كتابة المقالات | رحيق كنجو",
    description:
      "مقالات تحمل معرفة الخبراء وصوتهم: مقالات متخصصة، Thought Leadership، رأي وتحليل، وSEO.",
    images: ["/og-image.jpg"],
  },
};

export default function ArticlesPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap">
        <span className="slug rv">مدونات الموقع</span>
        <h1 className="hero-title rv d1">بعض الأفكار تحتاج مساحة أكبر</h1>
        <p className="page-lead rv d2">
          رأي يحتاج حجة
          <br />
          تجربة تحتاج سياقًا
          <br />
          موضوع يحتاج بحثًا
          <br />
          أو معرفة تستحق أن تتحول إلى مرجع يمكن الرجوع إليه
        </p>
        <p className="page-lead strong rv d3">
          أعمل مع الخبراء على تحويل هذه المادة إلى مقالات تحمل معرفتهم وصوتهم
        </p>
      </header>

      <main>
        <div className="method-band">
          <div className="wrap">
            <div className="ch-head rv">
              <span className="slug">طريقة العمل</span>
              <h2 className="ch-title">
                كيف أبني <em>المقال</em>؟
              </h2>
            </div>
            <div className="steps five">
              <div className="step rv">
                <span className="ic-chip step-ic">
                  <Lightbulb />
                </span>
                <div className="step-num">01</div>
                <h3>الفكرة</h3>
                <p>نحدد السؤال ووجهة النظر</p>
              </div>
              <div className="step rv d1">
                <span className="ic-chip step-ic">
                  <Search />
                </span>
                <div className="step-num">02</div>
                <h3>البحث</h3>
                <p>أراجع المصادر والتقارير والبيانات التي يحتاجها الموضوع</p>
              </div>
              <div className="step rv d2">
                <span className="ic-chip step-ic">
                  <LayoutList />
                </span>
                <div className="step-num">03</div>
                <h3>الهيكل</h3>
                <p>أرتب الأفكار حول رحلة القارئ</p>
              </div>
              <div className="step rv d3">
                <span className="ic-chip step-ic">
                  <PenLine />
                </span>
                <div className="step-num">04</div>
                <h3>الكتابة</h3>
                <p>أدمج خبرتك مع المادة البحثية في نص واضح ومتماسك</p>
              </div>
              <div className="step rv d4">
                <span className="ic-chip step-ic">
                  <CheckCheck />
                </span>
                <div className="step-num">05</div>
                <h3>المراجعة</h3>
                <p>الدقة، اللغة، المصادر وSEO عند الحاجة</p>
              </div>
            </div>
          </div>
        </div>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <span className="slug">أنواع المقالات</span>
            <h2 className="ch-title">
              <em>أكتب</em>
            </h2>
          </div>
          <ul className="icon-list cols2">
            <li className="rv">
              <span className="ic-chip">
                <FileText />
              </span>
              مقالات متخصصة
            </li>
            <li className="rv d1">
              <span className="ic-chip">
                <Award />
              </span>
              Thought Leadership
            </li>
            <li className="rv d2">
              <span className="ic-chip">
                <Quote />
              </span>
              مقالات رأي وتحليل
            </li>
            <li className="rv d3">
              <span className="ic-chip">
                <Globe />
              </span>
              مقالات SEO
            </li>
            <li className="rv d4">
              <span className="ic-chip">
                <BarChart3 />
              </span>
              مقالات مبنية على دراسات وتقارير
            </li>
          </ul>
        </section>

        <section className="contact wrap">
          <h2 className="rv">
            لديك معرفة تستحق أن تصبح <em>مرجعًا</em>؟
          </h2>
          <div className="contact-ctas rv d1">
            <Link className="btn btn-gold" href="/contact">
              ناقش فكرة مقالك
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FX />
    </>
  );
}
