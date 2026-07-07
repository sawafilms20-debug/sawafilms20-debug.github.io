import FX from "./fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const MAIL = "mailto:raheeqkanjo@gmail.com";
const MAIL_INTRO = `${MAIL}?subject=${encodeURIComponent("طلب استشارة مجانية")}`;
const LINKEDIN = "https://www.linkedin.com/in/raheekkanjo/";

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* ======== HERO ======== */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-text">
              <p className="hero-aud rv d1">للخبراء وروّاد الأعمال والشركات العربية</p>
              <h1 className="name rv d1">
                خبرتك تستحق{" "}
                <span className="ink">
                  أن تُسمَع
                  <svg viewBox="0 0 300 20" preserveAspectRatio="none">
                    <path d="M4 14 C 60 4, 140 18, 296 8" />
                  </svg>
                </span>
              </h1>
              <div className="type-row rv d2">
                <span className="pre">أنا رحيق كنجو،</span>
                <span id="typed"></span>
                <span className="caret"></span>
              </div>
              <p className="hero-p rv d3">
                أحوّل خبرتك إلى حضورٍ يبني الثقة ويجذب العملاء: <b>نظام محتوى متكامل</b>{" "}
                يبدأ من تموضعك في السوق، ويمرّ باستراتيجية مدروسة، وينتهي بنصوصٍ تُكتب
                بصوتك أنت. النتائج موثّقة: <b>أكثر من مليوني مشاهدة</b>، و<b>12+ علامة</b>{" "}
                تنمو أسبوعيًا بمحتوى أقوده.
              </p>
              <div className="hero-ctas rv d4">
                <a className="btn btn-gold" href={MAIL_INTRO}>
                  احجز استشارتك المجانية
                </a>
                <a className="btn btn-ghost" href={LINKEDIN} target="_blank" rel="noopener">
                  اقرأ محتواي على لينكدإن
                </a>
              </div>
              <p className="hero-note rv d4">
                استشارة لمدة 30 دقيقة، بلا أي التزام: تخرج منها بخطوة واضحة حتى لو لم
                نعمل معًا.
              </p>
            </div>

            <div className="portrait rv d2">
              <svg className="scribble" viewBox="0 0 120 90">
                <path d="M8 70 C 30 20, 55 15, 60 45 C 64 70, 85 65, 112 22" />
              </svg>
              <div className="stage">
                <img
                  src="/raheeq-cutout.webp"
                  alt="رحيق كنجو — شريكة المحتوى للخبراء والشركات"
                  width={965}
                  height={1340}
                  fetchPriority="high"
                />
              </div>
              <div className="stamp">
                <span>
                  7+ سنوات
                  <br />
                  من الحبر
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track" id="mq"></div>
        </div>
      </header>

      <main>
        {/* ======== PAIN MIRROR ======== */}
        <section className="chapter wrap">
          <div className="pain">
            <span className="slug rv">قبل أن نبدأ</span>
            <h2 className="ch-title rv d1">
              خبرتك كبيرة… لكن <em>من يراها</em>؟
            </h2>
            <img
              className="pain-art rv d2"
              src="/art-book.webp"
              alt=""
              aria-hidden="true"
              loading="lazy"
              width={764}
              height={390}
            />
            <div className="pain-list">
              <p className="pain-item rv d1">
                تعرف قيمة ما تقدّمه، لكن حضورك الرقمي لا يعكس مستواك الحقيقي
              </p>
              <p className="pain-item rv d2">
                تنشر بلا خطة واضحة، فيضيع صوتك بين آلاف المنشورات المتشابهة
              </p>
              <p className="pain-item rv d3">
                جرّبت أكثر من كاتب، فحصلت على نصوص صحيحة لغويًا… لكنها لا تشبهك
              </p>
            </div>
            <p className="pain-pivot rv d4">
              المشكلة ليست في خبرتك.
              <br />
              المشكلة في الطريقة التي تُحكى بها.
            </p>
          </div>
        </section>

        {/* ======== WHY ME ======== */}
        <section className="chapter wrap" id="why">
          <div className="ch-head rv">
            <span className="slug">النتائج</span>
            <h2 className="ch-title">
              أرقام موثّقة، لا <em>وعود</em>
            </h2>
          </div>
          <p className="why-lead rv d1">
            أنت لا تشتري كلمات، أنت تشتري <b>نتائج</b>. هذا ما يحصل عليه عملائي:
          </p>
          <div className="proof-grid">
            <div className="pcard span2 rv">
              <div className="big">
                <span className="count" data-to="2">
                  0
                </span>
                M+<small>مشاهدة عبر 8+ حملات</small>
              </div>
              <h3>سيناريوهات تُشاهَد حتى آخر ثانية</h3>
              <p>
                من الهوك الأول إلى اللقطة الأخيرة: حملات إعلانية كُتبت لتُكمل، لا لتُتخطى.
                هذا الفرق بين نصٍّ يملأ جدول النشر ونصٍّ يبقى في ذاكرة المشاهد.
              </p>
            </div>
            <div className="pcard rv d1">
              <div className="big">
                <span className="count" data-to="20">
                  0
                </span>
                K
              </div>
              <h3>محتوى يتصدّر، لا يمرّ مرور الكرام</h3>
              <p>
                ظهور للمنشور الواحد. حساب عميل واحد تصدّر ثلاث مرات في أسبوع واحد بهوكات
                مدروسة ومواضيع تفتح النقاش.
              </p>
            </div>
            <div className="pcard rv">
              <div className="big">
                <span className="count" data-to="12">
                  0
                </span>
                +
              </div>
              <h3>أكتب بصوتك أنت، لا بصوتي</h3>
              <p>
                غوست رايتنغ يلتقط أسلوبك وقناعاتك: علامات شخصية لخبراء وروّاد أعمال عرب
                أقود محتواها الآن، وتنمو كل أسبوع.
              </p>
            </div>
            <div className="pcard rv d1">
              <div className="big">
                <span className="count" data-to="500">
                  0
                </span>
                K
              </div>
              <h3>قصص تبيع دون أن تشبه الإعلانات</h3>
              <p>
                مشاهدة لمشروع سردي واحد. سرد قصصي يدخل من القلب: القارئ يتذكّر، يتفاعل،
                ويقاوم الإقناع بشكل أقل.
              </p>
            </div>
            <div className="pcard rv d2">
              <div className="big">
                <span className="count" data-to="7">
                  0
                </span>
                +
              </div>
              <h3>خطة قبل الحبر</h3>
              <p>
                سنوات من الخبرة أعرف فيها لماذا ننشر قبل أن أكتب ماذا ننشر: استراتيجية
                كاملة، لا منشورات متفرقة.
              </p>
              <div className="ptags">
                <span>لينكدإن</span>
                <span>يوتيوب</span>
                <span>بودكاست</span>
                <span>حملات فيديو</span>
              </div>
            </div>
          </div>
          <div className="trusted rv d1">
            عملت مع:
            <span>EXEED Digitals</span>
            <span>LILAC Marketing</span>
            <span>مجتمع مسافة</span>
            <span>منصات تعليمية وثقافية</span>
          </div>
        </section>

        {/* ======== OFFERS ======== */}
        <section className="chapter wrap" id="services">
          <div className="ch-head rv">
            <span className="slug">العروض</span>
            <h2 className="ch-title">
              كيف نعمل <em>معًا</em>؟
            </h2>
          </div>
          <div className="offers rv d1">
            <div className="offer">
              <div className="offer-num">٠١</div>
              <img
                className="offer-art"
                src="/art-pen.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={560}
                height={464}
              />
              <h3>شريكة محتواك الشخصية</h3>
              <p className="offer-for">
                للخبراء وروّاد الأعمال الذين يملكون الخبرة ولا يملكون الوقت
              </p>
              <p>حضور شهري كامل على لينكدإن يُدار نيابة عنك، بصوتك أنت.</p>
              <ul>
                <li>جلسة تموضع وصياغة رسالتك في السوق</li>
                <li>خطة محتوى شهرية بمنشورات أسبوعية</li>
                <li>غوست رايتنغ كامل بأسلوبك ولهجتك</li>
                <li>قراءة أسبوعية للأرقام وتطوير مستمر</li>
              </ul>
              <div className="offer-cta">
                <a href={`${MAIL}?subject=${encodeURIComponent("شريكة المحتوى")}`}>
                  اطلب تفاصيل العرض
                </a>
              </div>
            </div>
            <div className="offer">
              <div className="offer-num">٠٢</div>
              <img
                className="offer-art"
                src="/art-script.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={560}
                height={544}
              />
              <h3>سيناريو يصنع الأثر</h3>
              <p className="offer-for">للوكالات وصنّاع الفيديو والبودكاست</p>
              <p>نصوص مرئية ومسموعة تُكتب لتُشاهَد حتى النهاية، لا لتملأ جدول النشر.</p>
              <ul>
                <li>سيناريوهات إعلانية وتوعوية ووثائقية</li>
                <li>بحث معمّق قبل كل نص</li>
                <li>هوك وبناء درامي يشدّ المشاهد حتى النهاية</li>
                <li>نصوص بودكاست بإيقاع مدروس</li>
              </ul>
              <div className="offer-cta">
                <a href={`${MAIL}?subject=${encodeURIComponent("سيناريو")}`}>
                  اطلب تفاصيل العرض
                </a>
              </div>
            </div>
            <div className="offer">
              <div className="offer-num">٠٣</div>
              <img
                className="offer-art"
                src="/art-system.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={560}
                height={614}
              />
              <h3>نظام المحتوى المؤسسي</h3>
              <p className="offer-for">للشركات التي تريد حضورًا دائمًا، لا حملة عابرة</p>
              <p>صوت علامة موحّد ومنظومة محتوى تعمل داخل شركتك.</p>
              <ul>
                <li>استراتيجية محتوى وهوية صوت العلامة</li>
                <li>قيادة وتدريب فريق المحتوى الداخلي</li>
                <li>منظومة نشر عبر المنصات</li>
                <li>تقارير أداء شهرية بلغة القرارات</li>
              </ul>
              <div className="offer-cta">
                <a href={`${MAIL}?subject=${encodeURIComponent("المحتوى المؤسسي")}`}>
                  اطلب تفاصيل العرض
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ======== METHOD ======== */}
        <div className="method-band" id="method">
          <div className="wrap">
            <div className="ch-head rv">
              <span className="slug">المنهجية</span>
              <h2 className="ch-title">
                كيف أعمل؟ <em>بنظام</em>، لا بالإلهام وحده
              </h2>
            </div>
            <div className="steps">
              <div className="step rv">
                <div className="step-num">الخطوة ١</div>
                <h3>الإصغاء قبل الحبر</h3>
                <p>جلسة معمّقة أفهم فيها خبرتك، وجمهورك، وما الذي تريد أن تُعرف به.</p>
              </div>
              <div className="step rv d1">
                <div className="step-num">الخطوة ٢</div>
                <h3>التموضع والخريطة</h3>
                <p>نصوغ رسالتك في جملة واحدة، ونبني منها خريطة موضوعات لا تنضب.</p>
              </div>
              <div className="step rv d2">
                <div className="step-num">الخطوة ٣</div>
                <h3>الكتابة بصوتك</h3>
                <p>نصوص تشبهك: أسلوبك ولهجتك وقناعاتك، بصنعة كاتبة محترفة.</p>
              </div>
              <div className="step rv d3">
                <div className="step-num">الخطوة ٤</div>
                <h3>القياس والتحسين</h3>
                <p>نقرأ الأرقام أسبوعيًا: نضاعف ما ينجح، ونتخلى عمّا لا يخدم هدفك.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ======== STUDIO PHOTOS ======== */}
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

        {/* ======== NOTES ======== */}
        <section className="chapter wrap" id="notes">
          <div className="ch-head rv">
            <span className="slug">من دفتري</span>
            <h2 className="ch-title">
              هكذا <em>أفكّر</em> في الحرفة
            </h2>
          </div>
          <div className="notes">
            <blockquote className="note rv">
              <q>الأدب ليس إكسسوارات للنصوص التسويقية. الأدب هو أقصر طريق إلى قلب القارئ.</q>
              <footer>عن الكتابة التسويقية</footer>
            </blockquote>
            <blockquote className="note rv d1">
              <q>البديهي عندك.. ممكن يكون اكتشافًا عند غيرك. خبرتك بكل هالسنين ما بتستحق توثيق؟</q>
              <footer>عن صناعة المحتوى للخبراء</footer>
            </blockquote>
            <blockquote className="note rv d2">
              <q>الكورسات بتعطيك الخريطة، بس ما بتعطيك المهارة ولا النَفَس الإبداعي.</q>
              <footer>عن حرفة الكتابة</footer>
            </blockquote>
          </div>
          <div className="notes-cta rv d3">
            <a
              className="btn btn-ghost"
              href="https://www.linkedin.com/in/raheekkanjo/recent-activity/all/"
              target="_blank"
              rel="noopener"
            >
              اقرأ المزيد على لينكدإن ←
            </a>
          </div>
        </section>

        {/* ======== CONTACT ======== */}
        <section className="contact wrap" id="contact">
          <span className="slug rv">التواصل</span>
          <img
            className="contact-art rv d1"
            src="/art-seal.webp"
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={444}
            height={377}
          />
          <h2 className="rv d1">
            لنكتب الفصل القادم من <em>حضورك</em>
          </h2>
          <p className="rv d2">
            استشارة مجانية لمدة 30 دقيقة: أفهم فيها هدفك، وأخبرك بصراحة إن كنتُ الشخص
            المناسب له، وتخرج منها بخطوة واضحة في الحالتين.
          </p>
          <div className="contact-ctas rv d3">
            <a className="btn btn-gold" href={MAIL_INTRO}>
              احجز استشارتك المجانية
            </a>
            <a className="btn btn-ghost" href={LINKEDIN} target="_blank" rel="noopener">
              أو راسلني على لينكدإن
            </a>
          </div>
          <div className="next rv d4">
            <div>
              <b>
                <i>١</i>رسالتك تصلني
              </b>
              <small>أردّ عليك خلال 24 ساعة كحدّ أقصى</small>
            </div>
            <div>
              <b>
                <i>٢</i>مكالمة استشارية
              </b>
              <small>30 دقيقة نناقش فيها هدفك وجمهورك</small>
            </div>
            <div>
              <b>
                <i>٣</i>خطة مقترحة
              </b>
              <small>تصلك خطة واضحة بالنطاق والخطوات</small>
            </div>
          </div>
          <img
            className="signoff rv"
            src="/logo-raheeq.webp"
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={717}
            height={379}
          />
        </section>
      </main>

      <SiteFooter />

      <FX />
    </>
  );
}
