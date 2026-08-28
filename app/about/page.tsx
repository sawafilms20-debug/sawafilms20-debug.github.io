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
    "أريد أن يصل محتواك إلى المستوى نفسه الذي وصلت إليه خبرتك. أنا رحيق كنجو، كاتبة محتوى تسويقي أعمل مع الخبراء العرب منذ سبع سنوات.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "عني | رحيق كنجو",
    description:
      "أريد أن يصل محتواك إلى المستوى نفسه الذي وصلت إليه خبرتك.",
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
              أريد أن يصل محتواك
              <br />
              <span className="hl-gold">
                إلى المستوى نفسه
                <br />
                الذي وصلت إليه خبرتك
              </span>
            </h1>
            <p className="page-lead strong rv d3">أنا رحيق كنجو، كاتبة محتوى تسويقي</p>
          </div>

          <div className="portrait rv d2">
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

        {/* ======== THE STORY, IN HER OWN QUESTIONS ======== */}
        <section className="chapter wrap" id="story">
          <div className="qa-list">
            <article className="qa rv">
              <h2 className="qa-q">من أنا؟ ولماذا اخترت أن أكتب للخبراء؟</h2>
              <p>
                بدأت علاقتي بالكتابة قبل سبع سنوات بكتابة النصوص الأدبية والقصص القصيرة
              </p>
              <p>
                كنت أتعلم كيف تبدأ الحكاية، وأين تضع التفصيل الذي يجعل القارئ يسير مع
                الأحداث، وكيف تستطيع جملة واحدة أن تقرّبه من شخص أو فكرة وتؤثر به
              </p>
              <p className="qa-quote">
                أحترم مشاعر القارئ كما تحترم عقله
              </p>
              <p>
                هذا مبدأ لا أتنازل عنه في الكتابة: التأثير يجب أن يكون صادقًا في مضمونه
                ونبيلًا في هدفه
              </p>
              <p>
                بعدها دخلت عالم المقالات، ثم أمضيت ثلاث سنوات في كتابة السكريبتات، وهناك
                أصبحت أتعامل مع الانتباه بطريقة أدق
              </p>
              <ul className="q-list">
                <li>ماذا تقول أولًا؟</li>
                <li>كيف تنتقل بين الأفكار؟</li>
                <li>ومتى يحتاج المشاهد إلى قصة أو مثال أو سؤال؟</li>
              </ul>
              <p>
                وخلال العامين الأخيرين، أخذت كل ما تعلمته معي إلى LinkedIn وبناء العلامات
                الشخصية، وهنا وجدت النوع من العمل الذي أحب أن أستمر فيه
              </p>
            </article>

            <article className="qa rv">
              <h2 className="qa-q">لماذا الخبراء تحديدًا؟</h2>
              <p>
                لأنني كثيرًا ما أرى شخصًا أمضى عشر أو خمس عشرة سنة في مجاله، ثم أفتح
                محتواه فلا أجد كل هذه السنوات فيه
              </p>
              <ul className="seed-list">
                <li>يعرف كيف يحل مشكلات معقدة</li>
                <li>يرى تفاصيل في السوق لا يراها المبتدئ</li>
                <li>ولديه مواقف صنعت آراءه وطريقته الخاصة في العمل</li>
              </ul>
              <p>
                ومع ذلك، قد يتردد طويلًا قبل أن يشارك ما يعرفه، أو يعتمد على الذكاء
                الاصطناعي ليكتب عنه، فتخرج خبرته بصياغة يستطيع شخص بدأ المجال بالأمس أن
                ينشر مثلها
              </p>
              <p className="qa-close">
                هذه المسافة بين حجم الخبرة وما يظهر منها للناس هي أكثر ما يثير اهتمامي في
                عملي
              </p>
            </article>

            <article className="qa rv">
              <h2 className="qa-q">ماذا أبحث عنه عندما أتحدث مع خبير؟</h2>
              <p>
                غالبًا تبدأ أفضل الأفكار من شيء لم يدخل الاجتماع على أنه «فكرة محتوى» أصلًا
              </p>
              <ul className="seed-list">
                <li>قد يحكي لي عن موقف حدث مع عميل قبل سنوات</li>
                <li>أو يقول جملة عن السوق ثم ينتقل مباشرة إلى موضوع آخر</li>
                <li>
                  أو يشرح مشكلة بطريقة تبدو له بديهية لأنه تعامل معها عشرات المرات
                </li>
              </ul>
              <p>
                هنا تبدأ مهمتي: أستمع لما وراء الكلام، وأسأل، وأربط التفاصيل ببعضها، حتى
                نصل إلى الفكرة التي تعكس فعلًا طريقة تفكيره وخبرته
              </p>
              <p className="qa-close">
                ثم أقرر معه الشكل الذي يخدمها: قصة، رأي، تحليل، مقال، سكريبت أو منشور
              </p>
            </article>

            <article className="qa rv">
              <h2 className="qa-q">أين يدخل السرد القصصي في طريقتي؟</h2>
              <p>
                أنا بدأت ككاتبة قصص، لذلك بقي السرد جزءًا من الطريقة التي أرى بها المحتوى
              </p>
              <p className="qa-quote">القصة هي أقصر طريق إلى قلب القارئ</p>
              <p>
                أستخدمها عندما تساعد الخبير على نقل تجربة، أو تجعل فكرة معقدة أقرب، أو
                تسمح للقارئ أن يرى الموقف بدل أن يقرأ خلاصة عنه فقط
              </p>
              <p>وفي أفكار أخرى، أختار التحليل أو الرأي المباشر أو الشرح</p>
            </article>

            <article className="qa rv">
              <h2 className="qa-q">لماذا أنا؟</h2>
              <p>لأن طريقتي بدأت من الكتابة نفسها ثم توسعت إلى الاستراتيجية</p>
              <p>
                خلال سبع سنوات، انتقلت من القصص إلى المقالات، ومن المقالات إلى ثلاثة
                أعوام من كتابة السكريبت، ثم إلى LinkedIn واستراتيجية المحتوى
              </p>
              <p>
                لهذا عندما أعمل على محتوى خبير، أفكر في أكثر من مستوى في الوقت نفسه
              </p>
              <ul className="q-list">
                <li>كيف أجد الفكرة؟</li>
                <li>كيف أحافظ على صوته؟</li>
                <li>كيف أبني النص؟</li>
                <li>كيف أحافظ على انتباه القارئ؟</li>
                <li>كيف تخدم هذه القطعة الصورة الأكبر التي يريد بناءها عن نفسه؟</li>
              </ul>
              <p>
                ودراستي في هندسة الطاقات المتجددة أضافت جانبًا آخر إلى شخصيتي ككاتبة: أحب
                الدخول إلى المجالات المتخصصة، وفهم طريقة عملها، وطرح الأسئلة حتى أفهم
                الفكرة من داخلها قبل أن أكتبها
              </p>
              <p className="qa-close">
                أنا أبدأ من الخبرة، أبحث عن صوت صاحبها، ثم أستخدم الكتابة والاستراتيجية
                لأجعل هذا المستوى من المعرفة ظاهرًا في المحتوى
              </p>
            </article>

            <article className="qa rv">
              <h2 className="qa-q">وما النتيجة التي أريد الوصول إليها معك؟</h2>
              <p>أحب اللحظة التي يبدأ فيها الناس بربط اسم الخبير بموضوع محدد</p>
              <p className="qa-close">
                حين يصبح رأيه مطلوبًا، ويعرف الجمهور طريقة تفكيره قبل أن يتحدث معه، ويصبح
                محتواه امتدادًا طبيعيًا للمكانة التي صنعها خلال سنوات عمله
              </p>
            </article>
          </div>
        </section>

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
