import Link from "next/link";
import {
  Clapperboard,
  Compass,
  Eye,
  FileText,
  HelpCircle,
  Lightbulb,
  Milestone,
  PenLine,
  Target,
  Wrench,
} from "lucide-react";
import FX from "./fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Projects from "@/components/Projects";
import { LinkedInIcon } from "@/components/icons";

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* ======== HERO ======== */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-text">
              <h1 className="hero-title rv d1">
                لأن الناس لا ترى سنوات خبرتك الطويلة
                <br />
                ترى ما اخترت أن تشاركه منها
              </h1>
              <p className="hero-choice rv d2">لذلك أنا موجودة هنا من أجل هذا الاختيار</p>
              <p className="hero-sub rv d3">
                رحيق كنجو كاتبة محتوى تسويقي أعمل مع الخبراء العرب على تحويل معرفتهم
                وتجاربهم وآرائهم إلى محتوى يحمل صوتهم ويقرّبهم من الجمهور الذي يريدون
                الوصول إليه
              </p>
              <ul className="channels rv d3">
                <li>
                  <Link href="/linkedin">
                    <span className="ic-chip">
                      <LinkedInIcon />
                    </span>
                    على LinkedIn
                  </Link>
                </li>
                <li>
                  <Link href="/articles">
                    <span className="ic-chip">
                      <FileText />
                    </span>
                    في مدونات الموقع
                  </Link>
                </li>
                <li>
                  <Link href="/scripts">
                    <span className="ic-chip">
                      <Clapperboard />
                    </span>
                    وفي سكريبتات الفيديو
                  </Link>
                </li>
              </ul>
              <p className="hero-find rv d4">
                أبحث عن الفكرة التي تستحق أن تظهر، وأجد لها الزاوية والصوت والشكل المناسب
              </p>
              <div className="hero-ctas rv d4">
                <a className="btn btn-gold" href="#process">
                  اكتشف كيف نعمل معًا
                </a>
              </div>
            </div>

            <div className="portrait rv d2">
              <svg className="scribble" viewBox="0 0 120 90">
                <path d="M8 70 C 30 20, 55 15, 60 45 C 64 70, 85 65, 112 22" />
              </svg>
              <div className="stage">
                <img
                  src="/raheeq-cutout.webp"
                  alt="رحيق كنجو، كاتبة محتوى تسويقي للخبراء العرب"
                  width={965}
                  height={1340}
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ======== PROBLEM ======== */}
        <section className="chapter wrap">
          <div className="pain">
            <span className="slug rv">قبل أن نبدأ</span>
            <h2 className="ch-title rv d1">
              لديك الكثير لتقوله .. لكن <em>لا تعرف من أين تبدأ</em>
            </h2>
            <p className="pain-intro rv d2">
              بعد سنوات من العمل، تصبح لديك معرفة يصعب اختصارها في تعريف مهني
            </p>
            <ul className="icon-list pain-points">
              <li className="rv d1">
                <span className="ic-chip">
                  <Milestone />
                </span>
                مواقف صنعت رأيك
              </li>
              <li className="rv d2">
                <span className="ic-chip">
                  <Wrench />
                </span>
                مشكلات تعرف جذورها بسرعة
              </li>
              <li className="rv d3">
                <span className="ic-chip">
                  <HelpCircle />
                </span>
                أسئلة تسمعها باستمرار
              </li>
              <li className="rv d4">
                <span className="ic-chip">
                  <Eye />
                </span>
                وتفاصيل يلتقطها صاحب الخبرة قبل غيره
              </li>
            </ul>
            <p className="pain-pivot rv d4">هذه هي المادة التي أبني منها المحتوى معك</p>
          </div>
        </section>

        {/* ======== SERVICES ======== */}
        <section className="chapter wrap" id="services">
          <div className="ch-head rv">
            <span className="slug">الخدمات</span>
            <h2 className="ch-title">
              كيف <em>أساعدك</em>؟
            </h2>
          </div>
          <div className="offers rv d1">
            <div className="offer">
              <span className="ic-chip svc-ic">
                <LinkedInIcon />
              </span>
              <img
                className="offer-art"
                src="/art-pen.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={560}
                height={464}
              />
              <h3>LinkedIn</h3>
              <p>
                أبني حضورًا يعكس خبرتك
                <br />
                من التموضع واستخراج الأفكار إلى كتابة المحتوى وتطوير الحساب
              </p>
              <div className="offer-cta">
                <Link href="/linkedin">خدمات LinkedIn</Link>
              </div>
            </div>
            <div className="offer">
              <span className="ic-chip svc-ic">
                <FileText />
              </span>
              <img
                className="offer-art"
                src="/art-book.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={764}
                height={390}
              />
              <h3>مدونات الموقع</h3>
              <p>أحوّل معرفتك ورأيك إلى مقالات واضحة وعميقة تحمل اسمك ووجهة نظرك</p>
              <div className="offer-cta">
                <Link href="/articles">كتابة المقالات</Link>
              </div>
            </div>
            <div className="offer">
              <span className="ic-chip svc-ic">
                <Clapperboard />
              </span>
              <img
                className="offer-art"
                src="/art-script.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={560}
                height={544}
              />
              <h3>سكريبتات الفيديو</h3>
              <p>
                من الفكرة إلى فيديو يعرف كيف يبدأ، كيف يتحرك، وكيف يحافظ على انتباه
                المشاهد
              </p>
              <div className="offer-cta">
                <Link href="/scripts">كتابة السكريبت</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======== VOICE ======== */}
        <div className="voice-band">
          <div className="wrap">
            <div className="ch-head rv">
              <span className="slug">أكتب من صوتك</span>
            </div>
            <p className="voice-lines rv d1">
              قد يتحدث كثيرون عن الموضوع نفسه
              <br />
              الفرق يظهر في الزاوية
              <br />
              في المثال
              <br />
              في السؤال
              <br />
              وفي التفاصيل التي صنعتها تجربتك
            </p>
            <p className="voice-close rv d2">لهذا أستمع، أسأل، وأبحث قبل أن أكتب</p>
          </div>
        </div>

        {/* ======== TESTIMONIALS ======== */}
        <section className="chapter wrap" id="testimonials">
          <div className="ch-head rv">
            <span className="slug">التوصيات</span>
            <h2 className="ch-title">
              توصيات ممن <em>عملت معهم</em>
            </h2>
          </div>
          <div className="notes">
            <blockquote className="note rv">
              <q>
                تستمع جيدًا وتحاول أن تفهم الشخص وطريقة تفكيره قبل أن تبدأ بالعمل وتحافظ
                على صوته وأسلوبه.
              </q>
              <footer>
                <span className="note-who" dir="ltr">
                  <b>Fouad Hasan</b>
                  <small>CFO</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv d1">
              <q>باحثة ممتازة. تطرح الأسئلة الصحيحة، وتلتقط التفاصيل المهمة.</q>
              <footer>
                <span className="note-who">
                  <b>أسماء الخالدي</b>
                  <small>مستشارة LinkedIn للخبراء العرب</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv d2">
              <q>تملك حسًا واضحًا في فهم العلامة وصوتها.</q>
              <footer>
                <span className="note-who" dir="ltr">
                  <b>Rami Badrah</b>
                  <small>Marketing Content &amp; UX Consultant</small>
                </span>
              </footer>
            </blockquote>
          </div>
        </section>

        {/* admin-managed projects (renders nothing when the list is empty) */}
        <Projects />

        {/* ======== PROCESS ======== */}
        <div className="method-band" id="process">
          <div className="wrap">
            <div className="ch-head rv">
              <span className="slug">طريقة العمل</span>
              <h2 className="ch-title">
                كيف نعمل <em>معًا</em>؟
              </h2>
            </div>
            <div className="steps">
              <div className="step rv">
                <span className="ic-chip step-ic">
                  <Compass />
                </span>
                <div className="step-num">01</div>
                <h3>نفهم الاتجاه</h3>
                <p>من جمهورك؟ وبماذا تريد أن يعرفك؟</p>
              </div>
              <div className="step rv d1">
                <span className="ic-chip step-ic">
                  <Lightbulb />
                </span>
                <div className="step-num">02</div>
                <h3>نستخرج المادة</h3>
                <p>الأفكار، التجارب، القصص والآراء الموجودة داخل خبرتك</p>
              </div>
              <div className="step rv d2">
                <span className="ic-chip step-ic">
                  <Target />
                </span>
                <div className="step-num">03</div>
                <h3>نبني الزاوية</h3>
                <p>نحدد الفكرة التي تستحق الظهور والطريقة الأنسب لتقديمها</p>
              </div>
              <div className="step rv d3">
                <span className="ic-chip step-ic">
                  <PenLine />
                </span>
                <div className="step-num">04</div>
                <h3>نكتب</h3>
                <p>منشور، مقال أو سكريبت يحمل صوتك ويخدم هدفك</p>
              </div>
            </div>
            <div className="band-cta rv d4">
              <Link className="btn btn-gold" href="/contact">
                ابدأ مشروعك
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />

      <FX />
    </>
  );
}
