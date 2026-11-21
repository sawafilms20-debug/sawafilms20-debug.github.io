import type { Metadata } from "next";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Compass,
  HelpCircle,
  Map,
  MessagesSquare,
  PenTool,
  RefreshCw,
  Tags,
  Target,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Faq from "@/components/Faq";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  alternates: { canonical: "/linkedin/", types: { "application/rss+xml": [{ url: "/rss.xml", title: "رحيق كنجو" }] } },
  title: "كتابة محتوى LinkedIn وبناء العلامة الشخصية | رحيق كنجو",
  description:
    "كتابة محتوى LinkedIn وبناء العلامة الشخصية للخبراء: استراتيجية محتوى، كتابة منشورات بصوتك (Ghostwriting)، وتطوير حسابك على لينكدإن ليعكس خبرتك.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "رحيق كنجو",
    url: "/linkedin/",
    title: "خدمات LinkedIn للخبراء | رحيق كنجو",
    description:
      "استراتيجية محتوى، Ghostwriting، تطوير الحساب واستشارات LinkedIn للخبراء العرب.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "شعار رحيق كنجو وعبارة: كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب", type: "image/jpeg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "خدمات LinkedIn للخبراء | رحيق كنجو",
    description:
      "استراتيجية محتوى، Ghostwriting، تطوير الحساب واستشارات LinkedIn للخبراء العرب.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "شعار رحيق كنجو وعبارة: كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب", type: "image/jpeg" }],
  },
};

/* The blog guides this page links to, under their published titles. */
const GUIDES = [
  {
    slug: "linkedin-personal-brand-guide",
    title: "بناء العلامة الشخصية على لينكدإن: دليل الخبراء والمديرين",
  },
  {
    slug: "linkedin-content-writing",
    title: "كتابة محتوى لينكدإن: دليل عملي لمنشور يحمل خبرتك",
  },
  {
    slug: "linkedin-ghostwriting",
    title: "كاتب ظل لينكدإن (Ghostwriting): ما هو، وكيف يبقى صوتك صوتك",
  },
  {
    slug: "linkedin-profile-headline-about",
    title: "تحسين حساب لينكدإن: دليل Headline وAbout وExperience",
  },
];

export default function LinkedInPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap has-art">
        <img
          className="head-art"
          src="/art-network.svg"
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <h1 className="hero-title rv d1">
          خبرتك تظهر في عملك{" "}
          <br />
          <span className="hl-gold">يجب أن يعكسها حسابك على LinkedIn</span>
        </h1>
        <p className="page-lead rv d2">
          الشخص الذي يجلس معك قد يفهم قيمتك خلال اجتماع واحد{" "}
          <br />
          أما الشخص الذي يصل إلى حسابك لأول مرة، فيبني صورته من المحتوى الذي يراه أمامه
        </p>
        <p className="page-lead strong rv d3">
          <b className="kw">بناء العلامة الشخصية على LinkedIn</b>: حساب ومحتوى يوضحان
          خبرتك ويمنحان الناس أسبابًا أكثر لتذكّر اسمك
        </p>
      </header>

      <main id="main">
        <section className="chapter wrap">
          <div className="ch-head rv">
            <h2 className="ch-title">
              أبدأ من <em>سؤال واحد</em>
            </h2>
            <p className="page-lead strong q">بماذا تريد أن يعرفك السوق؟</p>
            <p className="page-lead">من هنا أحدد:</p>
          </div>
          <ul className="icon-list cols2">
            <li className="rv">
              <span className="ic-chip">
                <Users />
              </span>
              جمهورك
            </li>
            <li className="rv d1">
              <span className="ic-chip">
                <Target />
              </span>
              تموضعك
            </li>
            <li className="rv d2">
              <span className="ic-chip">
                <Tags />
              </span>
              الموضوعات التي تريد أن ترتبط باسمك
            </li>
            <li className="rv d3">
              <span className="ic-chip">
                <Compass />
              </span>
              الزوايا التي تعبّر عن طريقة تفكيرك
            </li>
          </ul>
          <p className="list-close rv d4">ثم أبني المحتوى حولها</p>
        </section>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <h2 className="ch-title">
              خبرتك هي <em>بنك الأفكار</em>
            </h2>
            <p className="page-lead">فكرة المحتوى قد تبدأ من:</p>
          </div>
          <ul className="icon-list cols2">
            <li className="rv">
              <span className="ic-chip">
                <HelpCircle />
              </span>
              سؤال عميل
            </li>
            <li className="rv d1">
              <span className="ic-chip">
                <Wrench />
              </span>
              مشكلة حللتها
            </li>
            <li className="rv d2">
              <span className="ic-chip">
                <RefreshCw />
              </span>
              موقف غيّر رأيك
            </li>
            <li className="rv d3">
              <span className="ic-chip">
                <AlertTriangle />
              </span>
              خطأ تراه في السوق
            </li>
            <li className="rv d4">
              <span className="ic-chip">
                <Briefcase />
              </span>
              تجربة صنعت طريقة عملك
            </li>
          </ul>
          <p className="list-close rv d4">
            أنا أساعدك على التقاط هذه الأفكار وتحويلها إلى محتوى مستمر، وبعضها يستحق
            مساحة أكبر في <Link href="/articles/">مقال على موقعك</Link> أو في{" "}
            <Link href="/scripts/">سكريبت فيديو</Link>
          </p>
        </section>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <h2 className="ch-title">
              خدمات كتابة محتوى <em>LinkedIn</em>
            </h2>
          </div>
          <div className="svc-grid">
            <div className="svc-card rv">
              <span className="ic-chip">
                <Map />
              </span>
              <h3>استراتيجية المحتوى</h3>
              <p>تموضع، جمهور، محاور وزوايا</p>
            </div>
            <div className="svc-card rv d1">
              <span className="ic-chip">
                <PenTool />
              </span>
              <h3>Ghostwriting</h3>
              <p>استخراج الأفكار وكتابة المنشورات بصوتك</p>
            </div>
            <div className="svc-card rv d2">
              <span className="ic-chip">
                <UserRound />
              </span>
              <h3>تطوير الحساب</h3>
              <p>Headline · About · Experience · الغلاف · الكلمات المفتاحية</p>
            </div>
            <div className="svc-card rv d3">
              <span className="ic-chip">
                <MessagesSquare />
              </span>
              <h3>الاستشارات</h3>
              <p>جلسة مركزة لمراجعة الحساب وتحديد الخطوات القادمة</p>
            </div>
          </div>
        </section>

        {/* Guides from the blog. Each selector in lib/pageRegistry.ts must
            keep matching exactly one element, so this section reuses none of
            the classes they address (.ch-title, .icon-list, .page-lead,
            .svc-grid). No .rv either: like the FAQ, it is visible without JS.
            Plain <a>, not <Link>: Link drops the trailing slash (this config
            has no trailingSlash), and the blog posts are generated pages, not
            routes of this app, so there is nothing for it to prefetch. */}
        <section className="chapter wrap" aria-labelledby="guides-title">
          <div className="ch-head">
            <h2 className="page-title" id="guides-title">
              أدلة مجانية من <em>المدونة</em>
            </h2>
            <ul className="channels">
              {GUIDES.map((g) => (
                <li key={g.slug}>
                  <a href={`/blog/${g.slug}/`}>
                    <span className="ic-chip">
                      <BookOpen />
                    </span>
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Faq page="linkedin" />

        <section className="contact wrap">
          <h2 className="rv">
            أريد أن تقرأ المنشور وتقول:{" "}
            <br />
            <em>هذه فكرتي فعلًا</em>
          </h2>
          <div className="contact-ctas rv d1">
            <a className="btn btn-gold" href="/contact/">
              ابدأ العمل على حسابك
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FX />
      <JsonLd page="linkedin" meta={metadata} />
    </>
  );
}
