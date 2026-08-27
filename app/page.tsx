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
          <h1 className="hero-title hero-title-xl rv d1">
            <span className="line">لأن الناس لا ترى سنوات خبرتك الطويلة</span>
            <span className="line">ترى ما اخترت أن تشاركه منها</span>
          </h1>
          <p className="hero-choice rv d2">لذلك أنا موجودة هنا من أجل هذا <b className="choice-word">الاختيار</b></p>
          <div className="hero-grid">
            <div className="hero-text">
              <div className="type-row rv d3">
                <span className="pre">أنا رحيق كنجو،</span>
                <span id="typed"></span>
                <span className="caret"></span>
              </div>
              <p className="hero-sub rv d3">
                أعمل مع الخبراء العرب على تحويل معرفتهم وتجاربهم وآرائهم إلى محتوى يحمل
                صوتهم ويقرّبهم من الجمهور الذي يريدون الوصول إليه
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

      <main id="main">
        {/* ======== PROBLEM ======== */}
        <section className="chapter wrap">
          <div className="pain">
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
            <h2 className="ch-title">
              كيف <em>أساعدك</em>؟
            </h2>
          </div>
          <div className="offers rv d1">
            <Link className="offer" href="/linkedin" aria-label="خدمات LinkedIn">
              <img
                className="offer-art"
                src="/art-linkedin.png"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={900}
                height={900}
              />
              <h3>LinkedIn</h3>
              <p>
                أبني حضورًا يعكس خبرتك
                <br />
                من التموضع واستخراج الأفكار إلى كتابة المحتوى وتطوير الحساب
              </p>
              <div className="offer-cta">
                <span>خدمات LinkedIn</span>
              </div>
            </Link>
            <Link className="offer" href="/articles" aria-label="كتابة المقالات">
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
                <span>كتابة المقالات</span>
              </div>
            </Link>
            <Link className="offer" href="/scripts" aria-label="كتابة السكريبت">
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
                <span>كتابة السكريبت</span>
              </div>
            </Link>
          </div>
        </section>

        {/* ======== VOICE ======== */}
        <div className="voice-band">
          <div className="wrap">
            <div className="ch-head rv">
              <h2 className="ch-title">أكتب من <em>صوتك</em></h2>
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
            <h2 className="ch-title">
              <em>توصيات</em>
            </h2>
          </div>
          <div className="notes">
            <blockquote className="note rv">
              <q>
                تستمع جيدًا وتحاول أن تفهم الشخص وطريقة تفكيره قبل أن تبدأ بالعمل،
                وتحافظ على صوته وأسلوبه بدل أن تفرض عليه أسلوبًا جاهزًا.
              </q>
              <footer>
                <img
                  className="note-avatar"
                  src="/avatar-fouad.jpg"
                  alt=""
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <span className="note-who" dir="ltr">
                  <b>Fouad Hasan</b>
                  <small>CFO</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv d1">
              <q>
                باحثة ممتازة. تطرح الأسئلة الصحيحة، وتلتقط التفاصيل المهمة، ثم تقدّم
                حلولًا مدروسة تعكس صوت الحساب وشخصيته بصدق.
              </q>
              <footer>
                <img
                  className="note-avatar"
                  src="/avatar-asmaa.jpg"
                  alt=""
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <span className="note-who">
                  <b>أسماء الخالدي</b>
                  <small>مستشارة LinkedIn للخبراء العرب</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv d2">
              <q>
                تملك حسًا واضحًا في فهم العلامة وصوتها، وهو ما يظهر بصورة خاصة في
                كتابتها للعلامات الشخصية.
              </q>
              <footer>
                <img
                  className="note-avatar"
                  src="/avatar-rami.jpg"
                  alt=""
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <span className="note-who" dir="ltr">
                  <b>Rami Badrah</b>
                  <small>Marketing Content &amp; UX Consultant</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv">
              <q>
                إتقان. احترام وتقدير. تواجد دائمًا. إبداع بالبحث والكتابة. رحيق إضافة لا
                أندم عليها أبدًا لفريق EXEED.
              </q>
              <footer>
                <img
                  className="note-avatar"
                  src="/avatar-jandali.jpg"
                  alt=""
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <span className="note-who" dir="ltr">
                  <b>Mohamad Jandali</b>
                  <small>CEO · exeedin.com</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv d1" dir="ltr">
              <q>
                Well organized, result oriented and creative copywriter. I really
                recommend Raheek to be a cornerstone of any copywriting team.
              </q>
              <footer>
                <img
                  className="note-avatar"
                  src="/avatar-okko.jpg"
                  alt=""
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <span className="note-who">
                  <b>Mohammed Okko</b>
                  <small>CEO &amp; Founder · Digital Genuity</small>
                </span>
              </footer>
            </blockquote>
            <blockquote className="note rv d2">
              <q>
                استشارة تسويقية مركزة وقوية لبناء علامتي الشخصية وهوية حساب الشركة، مع
                استراتيجيات واضحة لزيادة المتابعين واستقطاب الجمهور. المعلومات جاءت
                عميقة وعملية.
              </q>
              <footer>
                <img
                  className="note-avatar"
                  src="/avatar-ali.jpg"
                  alt=""
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <span className="note-who" dir="ltr">
                  <b>Ali Hasan</b>
                  <small>OT/ICS Security Engineer</small>
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
