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
import Sunflowers from "@/components/Sunflowers";

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
            <h1 className="hero-title hero-title-xl rv d1">
              أنا رحيق كنجو
              <br />
              <span className="hl-gold">كاتبة واستراتيجية محتوى أعمل مع الخبراء</span>
            </h1>
            <p className="page-lead rv d2">
              أكثر ما يجذبني في عملي هو اكتشاف الأفكار التي يعرفها صاحب الخبرة جيدًا،
              لكنه لم يحوّلها بعد إلى محتوى يستطيع الناس الوصول إليه
            </p>
            <ul className="seed-list rv d3">
              <li>قد تظهر في حديث</li>
              <li>في موقف من السوق</li>
              <li>في تجربة قديمة</li>
              <li>أو في جملة يعتبرها الخبير عادية، بينما تحمل خلفها سنوات من المعرفة</li>
            </ul>
            <p className="page-lead strong rv d4">
              دوري أن ألتقط هذه المادة وأمنحها الشكل الذي يناسبها
            </p>
          </div>

          <div className="portrait portrait-free rv d2">
            <Sunflowers />
            <div className="stage stage-photo">
              <img
                src="/raheeq-about.webp"
                alt="رحيق كنجو، كاتبة واستراتيجية محتوى للخبراء"
                width={900}
                height={1205}
                fetchPriority="high"
              />
            </div>
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
                    سكريبت فيديو
                  </Link>
                </li>
              </ul>
          </div>
        </div>
      </header>

      <main id="main">
        <div className="method-band">
          <div className="wrap">
            <div className="ch-head rv">
              <h2 className="ch-title"><em>طريقتي</em></h2>
            </div>
            <ol className="roadmap">
              <li className="rm-step rv">
                <span className="rm-label">أستمع حتى أفهم</span>
                <span className="rm-node">١</span>
              </li>
              <li className="rm-step rv d1">
                <span className="rm-label">أسأل حتى أصل إلى الفكرة</span>
                <span className="rm-node">٢</span>
              </li>
              <li className="rm-step rv d2">
                <span className="rm-label">أبحث حتى تحمل الكتابة مادة قوية</span>
                <span className="rm-node">٣</span>
              </li>
              <li className="rm-step rv d3">
                <span className="rm-label">أرتب حتى يصبح المعنى واضحًا</span>
                <span className="rm-node">٤</span>
              </li>
              <li className="rm-step rv d4">
                <span className="rm-label">ثم أكتب بصوت صاحب الخبرة</span>
                <span className="rm-node">٥</span>
              </li>
            </ol>
          </div>
        </div>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <h2 className="ch-title">
              أعمل <em>مع</em>
            </h2>
          </div>
          <ul className="tag-row rv d1">
              <li>
                <span className="tag-ic">
                  <Briefcase />
                </span>
                خبراء ومديرين
              </li>
              <li>
                <span className="tag-ic">
                  <Rocket />
                </span>
                رواد أعمال
              </li>
              <li>
                <span className="tag-ic">
                  <Sparkles />
                </span>
                علامات شخصية
              </li>
              <li>
                <span className="tag-ic">
                  <Building2 />
                </span>
                شركات وفرق محتوى
              </li>
          </ul>
          <p className="list-close rv d2">وعلى مشاريع تشمل</p>
          <ul className="tag-row rv d1">
              <li>
                <span className="tag-ic">
                  <LinkedInIcon />
                </span>
                LinkedIn
              </li>
              <li>
                <span className="tag-ic">
                  <PenTool />
                </span>
                Ghostwriting
              </li>
              <li>
                <span className="tag-ic">
                  <FileText />
                </span>
                المقالات والمحتوى البحثي
              </li>
              <li>
                <span className="tag-ic">
                  <Clapperboard />
                </span>
                سكريبتات الفيديو
              </li>
          </ul>
        </section>

        <section className="chapter wrap" id="certs">
          <div className="ch-head rv">
            <h2 className="ch-title">
              تعلّم <em>مستمر</em>
            </h2>
          </div>
          <div className="certs-grid">
            <a className="cert-card rv" href="/cert-rami-badrah.jpg" target="_blank" rel="noopener">
              <img
                src="/cert-rami-badrah.jpg"
                alt="شهادة إتمام البرنامج التدريبي الشامل في صناعة وكتابة المحتوى التسويقي والإعلاني من أكاديمية رامي بدره"
                loading="lazy"
                width={1920}
                height={1368}
              />
              <span className="cert-cap">
                <b>صناعة وكتابة المحتوى التسويقي والإعلاني</b>
                <small>أكاديمية رامي بدره، 45 ساعة تدريبية، 2025</small>
              </span>
            </a>
            <a className="cert-card rv d1" href="/cert-iese-storytelling.jpg" target="_blank" rel="noopener">
              <img
                src="/cert-iese-storytelling.jpg"
                alt="شهادة The Art of Storytelling من IESE Business School عبر Coursera"
                loading="lazy"
                width={604}
                height={473}
              />
              <span className="cert-cap">
                <b>The Art of Storytelling</b>
                <small>IESE Business School عبر Coursera، 2026</small>
              </span>
            </a>
            <a className="cert-card rv d2" href="/cert-edraak-seo.jpg" target="_blank" rel="noopener">
              <img
                src="/cert-edraak-seo.jpg"
                alt="شهادة إتمام Search Engine Optimization من منصة إدراك"
                loading="lazy"
                width={1043}
                height={720}
              />
              <span className="cert-cap">
                <b>Search Engine Optimization</b>
                <small>منصة إدراك، 2023</small>
              </span>
            </a>
            <a className="cert-card rv d3" href="/cert-light-initiative.jpg" target="_blank" rel="noopener">
              <img
                src="/cert-light-initiative.jpg"
                alt="شهادة تقدير عن تسجيل 300 صفحة صوتيًا لدعم الطلاب المكفوفين من Light Initiative وSyrian Youth Assembly"
                loading="lazy"
                width={674}
                height={498}
              />
              <span className="cert-cap">
                <b>شهادة تقدير: تسجيل 300 صفحة صوتيًا لدعم الطلاب المكفوفين</b>
                <small>Light Initiative وSyrian Youth Assembly، 2022</small>
              </span>
            </a>
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
