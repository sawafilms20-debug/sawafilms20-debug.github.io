import type { Metadata } from "next";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Clapperboard,
  FileText,
  PenTool,
  Rocket,
  Sparkles,
} from "lucide-react";
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { LinkedInIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "عني | رحيق كنجو",
  description:
    "أنا رحيق كنجو، كاتبة واستراتيجية محتوى أعمل مع الخبراء: ألتقط المادة التي يعرفها صاحب الخبرة جيدًا وأمنحها الشكل الذي يناسبها، منشورًا أو مقالًا أو سكريبت فيديو.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "عني | رحيق كنجو",
    description:
      "كاتبة واستراتيجية محتوى أعمل مع الخبراء: ألتقط المادة التي يعرفها صاحب الخبرة جيدًا وأمنحها الشكل الذي يناسبها.",
    images: ["/og-image.jpg"],
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap">
        <div className="hero-grid">
          <div className="hero-text">
            <span className="slug rv">عني</span>
            <h1 className="hero-title rv d1">
              أنا رحيق كنجو
              <br />
              كاتبة واستراتيجية محتوى أعمل مع الخبراء
            </h1>
            <p className="page-lead rv d2">
              أكثر ما يجذبني في عملي هو اكتشاف الأفكار التي يعرفها صاحب الخبرة جيدًا،
              لكنه لم يحوّلها بعد إلى محتوى يستطيع الناس الوصول إليه
            </p>
            <p className="page-lead rv d3">
              قد تظهر في حديث
              <br />
              في موقف من السوق
              <br />
              في تجربة قديمة
              <br />
              أو في جملة يعتبرها الخبير عادية، بينما تحمل خلفها سنوات من المعرفة
            </p>
            <p className="page-lead strong rv d3">
              دوري أن ألتقط هذه المادة وأمنحها الشكل الذي يناسبها
            </p>
            <ul className="channels rv d4">
              <li>
                <Link href="/linkedin">
                  <span className="ic-chip">
                    <LinkedInIcon />
                  </span>
                  منشور
                </Link>
              </li>
              <li>
                <Link href="/articles">
                  <span className="ic-chip">
                    <FileText />
                  </span>
                  مقال
                </Link>
              </li>
              <li>
                <Link href="/scripts">
                  <span className="ic-chip">
                    <Clapperboard />
                  </span>
                  أو سكريبت فيديو
                </Link>
              </li>
            </ul>
          </div>

          <div className="portrait rv d2">
            <div className="stage">
              <img
                src="/raheeq-cutout.webp"
                alt="رحيق كنجو، كاتبة واستراتيجية محتوى للخبراء"
                width={965}
                height={1340}
                fetchPriority="high"
              />
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="method-band">
          <div className="wrap">
            <div className="ch-head rv">
              <span className="slug">طريقتي</span>
            </div>
            <div className="method-lines">
              <p className="rv">أستمع حتى أفهم</p>
              <p className="rv d1">أسأل حتى أصل إلى الفكرة</p>
              <p className="rv d2">أبحث حتى تحمل الكتابة مادة قوية</p>
              <p className="rv d3">أرتب حتى يصبح المعنى واضحًا</p>
              <p className="rv d4">ثم أكتب بصوت صاحب الخبرة</p>
            </div>
          </div>
        </div>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <span className="slug">العملاء</span>
            <h2 className="ch-title">
              أعمل <em>مع</em>
            </h2>
          </div>
          <ul className="icon-list cols2">
            <li className="rv">
              <span className="ic-chip">
                <Briefcase />
              </span>
              خبراء ومديرين
            </li>
            <li className="rv d1">
              <span className="ic-chip">
                <Rocket />
              </span>
              رواد أعمال
            </li>
            <li className="rv d2">
              <span className="ic-chip">
                <Sparkles />
              </span>
              علامات شخصية
            </li>
            <li className="rv d3">
              <span className="ic-chip">
                <Building2 />
              </span>
              شركات وفرق محتوى
            </li>
          </ul>
          <p className="list-close rv d4">وعلى مشاريع تشمل:</p>
          <ul className="icon-list cols2">
            <li className="rv">
              <span className="ic-chip">
                <LinkedInIcon />
              </span>
              LinkedIn
            </li>
            <li className="rv d1">
              <span className="ic-chip">
                <PenTool />
              </span>
              Ghostwriting
            </li>
            <li className="rv d2">
              <span className="ic-chip">
                <FileText />
              </span>
              المقالات والمحتوى البحثي
            </li>
            <li className="rv d3">
              <span className="ic-chip">
                <Clapperboard />
              </span>
              سكريبتات الفيديو
            </li>
          </ul>
        </section>

        <section className="chapter wrap" id="studio">
          <div className="photo-strip">
            <figure className="polaroid rv">
              <img
                src="/photo-desk.webp"
                alt="دفتر مفتوح بخط عربي وقلم ذهبي وفنجان قهوة على مكتب الكاتبة"
                loading="lazy"
                width={760}
                height={1018}
              />
              <figcaption>حيث تبدأ الأفكار</figcaption>
            </figure>
            <figure className="polaroid rv d1">
              <img
                src="/photo-typewriter.webp"
                alt="آلة كاتبة كلاسيكية في ضوء ذهبي دافئ"
                loading="lazy"
                width={760}
                height={760}
              />
              <figcaption>قصص تُكتب لتبقى</figcaption>
            </figure>
            <figure className="polaroid rv d2">
              <img
                src="/photo-mic.webp"
                alt="ميكروفون استوديو وسماعات في إضاءة دافئة"
                loading="lazy"
                width={760}
                height={1018}
              />
              <figcaption>ومنها ما يُروى صوتًا</figcaption>
            </figure>
          </div>
        </section>

        <section className="contact wrap">
          <h2 className="rv">
            أفضل محتوى للخبير يبدأ من الشيء الذي <em>يعرفه فعلًا</em>
          </h2>
          <p className="rv d1">ثم يأتي دوري في إيجاد الطريقة التي تجعله يصل</p>
          <div className="contact-ctas rv d2">
            <Link className="btn btn-gold" href="/contact">
              ابدأ مشروعك
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FX />
    </>
  );
}
