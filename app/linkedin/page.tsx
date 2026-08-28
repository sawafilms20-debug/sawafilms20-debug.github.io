import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
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
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "خدمات LinkedIn للخبراء | رحيق كنجو",
  description:
    "استراتيجية محتوى، Ghostwriting، تطوير الحساب واستشارات LinkedIn: أساعدك على بناء حساب ومحتوى يوضح خبرتك ويمنح الناس أسبابًا أكثر لتذكّر اسمك.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "خدمات LinkedIn للخبراء | رحيق كنجو",
    description:
      "استراتيجية محتوى، Ghostwriting، تطوير الحساب واستشارات LinkedIn للخبراء العرب.",
    images: ["/og-image.jpg"],
  },
};

export default function LinkedInPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap">
        <h1 className="hero-title rv d1">
          خبرتك تظهر في عملك
          <br />
          <span className="hl-gold">يجب أن يعكسها حسابك على LinkedIn</span>
        </h1>
        <p className="page-lead rv d2">
          الشخص الذي يجلس معك قد يفهم قيمتك خلال اجتماع واحد
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
              نبدأ من <em>سؤال واحد</em>
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
          <p className="list-close rv d4">ثم نبني المحتوى حولها</p>
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
            أنا أساعدك على التقاط هذه الأفكار وتحويلها إلى محتوى مستمر
          </p>
        </section>

        <section className="chapter wrap">
          <div className="ch-head rv">
            <h2 className="ch-title">
              خدمات <em>LinkedIn</em>
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

        <section className="contact wrap">
          <h2 className="rv">
            أريد أن تقرأ المنشور وتقول:
            <br />
            <em>هذه فكرتي فعلًا</em>
          </h2>
          <div className="contact-ctas rv d1">
            <Link className="btn btn-gold" href="/contact">
              ابدأ العمل على حسابك
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FX />
    </>
  );
}
