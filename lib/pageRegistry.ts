/* GENERATED-ish: the catalogue of every operator-editable string on the public
   site, extracted from the published HTML and hand-checked. This one file is
   the single source of truth for three things:

     - what the "الصفحات" editor offers, grouped by page and section
     - which page keys the SEO editor may write (every key here is consumed)
     - how public/site-content.js finds the element to swap on a live page

   `selector` must match exactly one element on that page. `contentType`
   decides what the overlay replaces:

     text     -> the element's trailing text node (so an inline icon survives)
     richtext -> the element's innerHTML
     url      -> the element's href
     image    -> the element's src

   When the markup of a page changes, re-check the selectors here. A selector
   that no longer matches is a no-op, never a crash: the site keeps rendering
   its built-in default, which is the whole point of the fallback rule. */

export type ContentType = "text" | "richtext" | "url" | "image";

export type ContentEntry = {
  sectionKey: string;
  contentKey: string;
  labelAr: string;
  selector: string;
  defaultText: string;
  contentType: ContentType;
};

export type PageSpec = {
  key: string;
  label: string;
  route: string;
  file: string;
  entries: ContentEntry[];
};

export const PAGES: PageSpec[] = [
  {
    key: "home",
    label: "الرئيسية",
    route: "/",
    file: "docs/index.html",
    entries: [
      { sectionKey: "hero", contentKey: "eyebrow", labelAr: "سطر التعريف قبل العنوان", selector: ".type-row .pre", defaultText: "أنا رحيق كنجو،", contentType: "text" },
      { sectionKey: "hero", contentKey: "title", labelAr: "العنوان الرئيسي", selector: ".hero-title", defaultText: "لأن الناس لا ترى سنوات خبرتك الطويلة.. <span class=\"hl-gold\">ترى ما اخترت أن تشاركه منها</span>", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "choiceLine", labelAr: "سطر «الاختيار»", selector: ".hero-choice", defaultText: "لذلك أنا موجودة هنا من أجل هذا <b class=\"choice-word\">الاختيار</b>", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "subtitle", labelAr: "الوصف تحت العنوان", selector: ".hero-sub", defaultText: "أعمل مع الخبراء العرب على تحويل معرفتهم إلى محتوى يحمل صوتهم ويصل إلى جمهورهم", contentType: "text" },
      { sectionKey: "hero", contentKey: "ctaLabel", labelAr: "نص زر الواجهة", selector: ".hero-ctas a", defaultText: "اكتشف كيف نعمل معًا", contentType: "text" },
      { sectionKey: "hero", contentKey: "portraitImage", labelAr: "صورة رحيق في الواجهة", selector: ".stage img", defaultText: "/raheeq-cutout.webp", contentType: "image" },
      { sectionKey: "hero", contentKey: "channelLinkedin", labelAr: "زر قناة LinkedIn", selector: ".channels li:nth-child(1) a", defaultText: "LinkedIn", contentType: "text" },
      { sectionKey: "hero", contentKey: "channelArticles", labelAr: "زر قناة المقالات", selector: ".channels li:nth-child(2) a", defaultText: "المقالات", contentType: "text" },
      { sectionKey: "hero", contentKey: "channelScripts", labelAr: "زر قناة السكريبت", selector: ".channels li:nth-child(3) a", defaultText: "السكريبت", contentType: "text" },
      { sectionKey: "pain", contentKey: "title", labelAr: "عنوان قسم «لديك الكثير لتقوله»", selector: ".pain .ch-title", defaultText: "لديك الكثير لتقوله .. لكن <em>لا تعرف من أين تبدأ</em>", contentType: "richtext" },
      { sectionKey: "pain", contentKey: "intro", labelAr: "تمهيد القسم", selector: ".pain-intro", defaultText: "بعد سنوات من العمل، تصبح لديك معرفة يصعب اختصارها في تعريف مهني", contentType: "text" },
      { sectionKey: "pain", contentKey: "point1", labelAr: "العنصر الأول في القائمة", selector: ".pain-points li:nth-child(1)", defaultText: "مواقف صنعت رأيك", contentType: "text" },
      { sectionKey: "pain", contentKey: "point2", labelAr: "العنصر الثاني في القائمة", selector: ".pain-points li:nth-child(2)", defaultText: "مشكلات تعرف جذورها بسرعة", contentType: "text" },
      { sectionKey: "pain", contentKey: "point3", labelAr: "العنصر الثالث في القائمة", selector: ".pain-points li:nth-child(3)", defaultText: "أسئلة تسمعها باستمرار", contentType: "text" },
      { sectionKey: "pain", contentKey: "point4", labelAr: "العنصر الرابع في القائمة", selector: ".pain-points li:nth-child(4)", defaultText: "وتفاصيل يلتقطها صاحب الخبرة قبل غيره", contentType: "text" },
      { sectionKey: "pain", contentKey: "pivot", labelAr: "الجملة الختامية لقسم «لديك الكثير لتقوله»", selector: ".pain-pivot", defaultText: "هذه هي المادة التي أبني منها المحتوى معك", contentType: "text" },
      { sectionKey: "services", contentKey: "title", labelAr: "عنوان قسم الخدمات", selector: "#services .ch-title", defaultText: "كيف <em>أساعدك</em>؟", contentType: "richtext" },
      { sectionKey: "voice", contentKey: "title", labelAr: "عنوان قسم «أكتب من صوتك»", selector: ".voice-band .ch-title", defaultText: "أكتب من <em>صوتك</em>", contentType: "richtext" },
      { sectionKey: "voice", contentKey: "lines", labelAr: "أسطر القسم", selector: ".voice-lines", defaultText: "قد يتحدث كثيرون عن الموضوع نفسه<br/>الفرق يظهر في الزاوية<br/>في المثال<br/>في السؤال<br/>وفي التفاصيل التي صنعتها تجربتك", contentType: "richtext" },
      { sectionKey: "voice", contentKey: "closing", labelAr: "الجملة الختامية لقسم «أكتب من صوتك»", selector: ".voice-close", defaultText: "لهذا أستمع، أسأل، وأبحث قبل أن أكتب", contentType: "text" },
      { sectionKey: "testimonials", contentKey: "title", labelAr: "عنوان قسم التوصيات", selector: "#testimonials .ch-title", defaultText: "<em>التوصيات</em>", contentType: "richtext" },
      { sectionKey: "process", contentKey: "title", labelAr: "عنوان قسم آلية العمل", selector: ".method-band .ch-title", defaultText: "كيف <em>أعمل</em>؟", contentType: "richtext" },
      { sectionKey: "process", contentKey: "ctaLabel", labelAr: "نص زر نهاية القسم", selector: ".band-cta a", defaultText: "ابدأ مشروعك", contentType: "text" },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    route: "/linkedin/",
    file: "docs/linkedin/index.html",
    entries: [
      { sectionKey: "hero", contentKey: "title", labelAr: "العنوان الرئيسي", selector: "header.page-head .hero-title", defaultText: "خبرتك تظهر في عملك<br/><span class=\"hl-gold\">يجب أن يعكسها حسابك على LinkedIn</span>", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "lead", labelAr: "الفقرة التمهيدية", selector: "header.page-head p.page-lead:nth-of-type(1)", defaultText: "الشخص الذي يجلس معك قد يفهم قيمتك خلال اجتماع واحد<br/>أما الشخص الذي يصل إلى حسابك لأول مرة، فيبني صورته من المحتوى الذي يراه أمامه", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "positioning", labelAr: "سطر تعريف الخدمة", selector: "header.page-head p.page-lead:nth-of-type(2)", defaultText: "<b class=\"kw\">بناء العلامة الشخصية على LinkedIn</b>: حساب ومحتوى يوضحان خبرتك ويمنحان الناس أسبابًا أكثر لتذكّر اسمك", contentType: "richtext" },
      { sectionKey: "question", contentKey: "title", labelAr: "عنوان قسم السؤال", selector: "section.chapter:nth-of-type(1) .ch-title", defaultText: "أبدأ من <em>سؤال واحد</em>", contentType: "richtext" },
      { sectionKey: "question", contentKey: "question", labelAr: "السؤال المحوري", selector: "section.chapter:nth-of-type(1) p.q", defaultText: "بماذا تريد أن يعرفك السوق؟", contentType: "text" },
      { sectionKey: "question", contentKey: "intro", labelAr: "تمهيد القائمة", selector: "section.chapter:nth-of-type(1) .ch-head p:nth-of-type(2)", defaultText: "من هنا أحدد:", contentType: "text" },
      { sectionKey: "question", contentKey: "item1", labelAr: "العنصر الأول (مع الأيقونة)", selector: "section.chapter:nth-of-type(1) .icon-list li:nth-child(1)", defaultText: "جمهورك", contentType: "text" },
      { sectionKey: "question", contentKey: "item2", labelAr: "العنصر الثاني (مع الأيقونة)", selector: "section.chapter:nth-of-type(1) .icon-list li:nth-child(2)", defaultText: "تموضعك", contentType: "text" },
      { sectionKey: "question", contentKey: "item3", labelAr: "العنصر الثالث (مع الأيقونة)", selector: "section.chapter:nth-of-type(1) .icon-list li:nth-child(3)", defaultText: "الموضوعات التي تريد أن ترتبط باسمك", contentType: "text" },
      { sectionKey: "question", contentKey: "item4", labelAr: "العنصر الرابع (مع الأيقونة)", selector: "section.chapter:nth-of-type(1) .icon-list li:nth-child(4)", defaultText: "الزوايا التي تعبّر عن طريقة تفكيرك", contentType: "text" },
      { sectionKey: "question", contentKey: "close", labelAr: "سطر ختام القسم", selector: "section.chapter:nth-of-type(1) .list-close", defaultText: "ثم أبني المحتوى حولها", contentType: "text" },
      { sectionKey: "ideas", contentKey: "title", labelAr: "عنوان قسم بنك الأفكار", selector: "section.chapter:nth-of-type(2) .ch-title", defaultText: "خبرتك هي <em>بنك الأفكار</em>", contentType: "richtext" },
      { sectionKey: "ideas", contentKey: "intro", labelAr: "تمهيد قائمة الأفكار", selector: "section.chapter:nth-of-type(2) .ch-head p:nth-of-type(1)", defaultText: "فكرة المحتوى قد تبدأ من:", contentType: "text" },
      { sectionKey: "ideas", contentKey: "item1", labelAr: "مصدر الفكرة الأول (مع الأيقونة)", selector: "section.chapter:nth-of-type(2) .icon-list li:nth-child(1)", defaultText: "سؤال عميل", contentType: "text" },
      { sectionKey: "ideas", contentKey: "item2", labelAr: "مصدر الفكرة الثاني (مع الأيقونة)", selector: "section.chapter:nth-of-type(2) .icon-list li:nth-child(2)", defaultText: "مشكلة حللتها", contentType: "text" },
      { sectionKey: "ideas", contentKey: "item3", labelAr: "مصدر الفكرة الثالث (مع الأيقونة)", selector: "section.chapter:nth-of-type(2) .icon-list li:nth-child(3)", defaultText: "موقف غيّر رأيك", contentType: "text" },
      { sectionKey: "ideas", contentKey: "item4", labelAr: "مصدر الفكرة الرابع (مع الأيقونة)", selector: "section.chapter:nth-of-type(2) .icon-list li:nth-child(4)", defaultText: "خطأ تراه في السوق", contentType: "text" },
      { sectionKey: "ideas", contentKey: "item5", labelAr: "مصدر الفكرة الخامس (مع الأيقونة)", selector: "section.chapter:nth-of-type(2) .icon-list li:nth-child(5)", defaultText: "تجربة صنعت طريقة عملك", contentType: "text" },
      { sectionKey: "ideas", contentKey: "close", labelAr: "سطر ختام قسم الأفكار", selector: "section.chapter:nth-of-type(2) .list-close", defaultText: "أنا أساعدك على التقاط هذه الأفكار وتحويلها إلى محتوى مستمر", contentType: "text" },
      { sectionKey: "services", contentKey: "title", labelAr: "عنوان قسم الخدمات", selector: "section.chapter:nth-of-type(3) .ch-title", defaultText: "خدمات <em>LinkedIn</em>", contentType: "richtext" },
      { sectionKey: "services", contentKey: "card1Title", labelAr: "عنوان الخدمة الأولى", selector: ".svc-grid .svc-card:nth-child(1) h3", defaultText: "استراتيجية المحتوى", contentType: "text" },
      { sectionKey: "services", contentKey: "card1Body", labelAr: "وصف الخدمة الأولى", selector: ".svc-grid .svc-card:nth-child(1) p", defaultText: "تموضع، جمهور، محاور وزوايا", contentType: "text" },
      { sectionKey: "services", contentKey: "card2Title", labelAr: "عنوان الخدمة الثانية", selector: ".svc-grid .svc-card:nth-child(2) h3", defaultText: "Ghostwriting", contentType: "text" },
      { sectionKey: "services", contentKey: "card2Body", labelAr: "وصف الخدمة الثانية", selector: ".svc-grid .svc-card:nth-child(2) p", defaultText: "استخراج الأفكار وكتابة المنشورات بصوتك", contentType: "text" },
      { sectionKey: "services", contentKey: "card3Title", labelAr: "عنوان الخدمة الثالثة", selector: ".svc-grid .svc-card:nth-child(3) h3", defaultText: "تطوير الحساب", contentType: "text" },
      { sectionKey: "services", contentKey: "card3Body", labelAr: "وصف الخدمة الثالثة", selector: ".svc-grid .svc-card:nth-child(3) p", defaultText: "Headline · About · Experience · الغلاف · الكلمات المفتاحية", contentType: "text" },
      { sectionKey: "services", contentKey: "card4Title", labelAr: "عنوان الخدمة الرابعة", selector: ".svc-grid .svc-card:nth-child(4) h3", defaultText: "الاستشارات", contentType: "text" },
      { sectionKey: "services", contentKey: "card4Body", labelAr: "وصف الخدمة الرابعة", selector: ".svc-grid .svc-card:nth-child(4) p", defaultText: "جلسة مركزة لمراجعة الحساب وتحديد الخطوات القادمة", contentType: "text" },
      { sectionKey: "cta", contentKey: "title", labelAr: "عنوان دعوة التواصل", selector: "section.contact h2", defaultText: "أريد أن تقرأ المنشور وتقول:<br/><em>هذه فكرتي فعلًا</em>", contentType: "richtext" },
      { sectionKey: "cta", contentKey: "buttonLabel", labelAr: "نص زر التواصل", selector: "section.contact .btn.btn-gold", defaultText: "ابدأ العمل على حسابك", contentType: "text" },
    ],
  },
  {
    key: "articles",
    label: "المقالات",
    route: "/articles/",
    file: "docs/articles/index.html",
    entries: [
      { sectionKey: "hero", contentKey: "title", labelAr: "عنوان الصفحة الرئيسي", selector: ".hero-title", defaultText: "بعض الأفكار تحتاج <span class=\"hl-gold\">مساحة</span> أكبر", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "lead", labelAr: "النص التمهيدي (أربعة أسطر)", selector: ".page-head p.page-lead:not(.strong)", defaultText: "رأي يحتاج حجة<br/>تجربة تحتاج سياقًا<br/>موضوع يحتاج بحثًا<br/>أو معرفة تستحق أن تتحول إلى مرجع يمكن الرجوع إليه", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "leadStrong", labelAr: "الجملة التمهيدية المميزة", selector: ".page-lead.strong", defaultText: "أعمل مع الخبراء على تحويل هذه المادة إلى مقالات تحمل معرفتهم وصوتهم", contentType: "text" },
      { sectionKey: "method", contentKey: "title", labelAr: "عنوان قسم طريقة العمل", selector: ".method-band .ch-title", defaultText: "كيف أبني <em>المقال</em>؟", contentType: "richtext" },
      { sectionKey: "method", contentKey: "step1Title", labelAr: "عنوان الخطوة الأولى", selector: ".steps .step:nth-of-type(1) h3", defaultText: "الفكرة", contentType: "text" },
      { sectionKey: "method", contentKey: "step1Body", labelAr: "وصف الخطوة الأولى", selector: ".steps .step:nth-of-type(1) p", defaultText: "أحدد السؤال ووجهة النظر", contentType: "text" },
      { sectionKey: "method", contentKey: "step2Title", labelAr: "عنوان الخطوة الثانية", selector: ".steps .step:nth-of-type(2) h3", defaultText: "البحث", contentType: "text" },
      { sectionKey: "method", contentKey: "step2Body", labelAr: "وصف الخطوة الثانية", selector: ".steps .step:nth-of-type(2) p", defaultText: "أراجع المصادر والتقارير والبيانات التي يحتاجها الموضوع", contentType: "text" },
      { sectionKey: "method", contentKey: "step3Title", labelAr: "عنوان الخطوة الثالثة", selector: ".steps .step:nth-of-type(3) h3", defaultText: "الهيكل", contentType: "text" },
      { sectionKey: "method", contentKey: "step3Body", labelAr: "وصف الخطوة الثالثة", selector: ".steps .step:nth-of-type(3) p", defaultText: "أرتب الأفكار حول رحلة القارئ", contentType: "text" },
      { sectionKey: "method", contentKey: "step4Title", labelAr: "عنوان الخطوة الرابعة", selector: ".steps .step:nth-of-type(4) h3", defaultText: "الكتابة", contentType: "text" },
      { sectionKey: "method", contentKey: "step4Body", labelAr: "وصف الخطوة الرابعة", selector: ".steps .step:nth-of-type(4) p", defaultText: "أدمج خبرتك مع المادة البحثية في نص واضح ومتماسك", contentType: "text" },
      { sectionKey: "method", contentKey: "step5Title", labelAr: "عنوان الخطوة الخامسة", selector: ".steps .step:nth-of-type(5) h3", defaultText: "المراجعة", contentType: "text" },
      { sectionKey: "method", contentKey: "step5Body", labelAr: "وصف الخطوة الخامسة", selector: ".steps .step:nth-of-type(5) p", defaultText: "الدقة، اللغة، المصادر وSEO عند الحاجة", contentType: "text" },
      { sectionKey: "types", contentKey: "title", labelAr: "عنوان قسم أنواع المقالات", selector: "section.chapter .ch-title", defaultText: "<em>أكتب</em>", contentType: "richtext" },
      { sectionKey: "types", contentKey: "item1", labelAr: "نوع المقال الأول", selector: ".icon-list li:nth-child(1)", defaultText: "مقالات متخصصة", contentType: "text" },
      { sectionKey: "types", contentKey: "item2", labelAr: "نوع المقال الثاني", selector: ".icon-list li:nth-child(2)", defaultText: "Thought Leadership", contentType: "text" },
      { sectionKey: "types", contentKey: "item3", labelAr: "نوع المقال الثالث", selector: ".icon-list li:nth-child(3)", defaultText: "مقالات رأي وتحليل", contentType: "text" },
      { sectionKey: "types", contentKey: "item4", labelAr: "نوع المقال الرابع", selector: ".icon-list li:nth-child(4)", defaultText: "مقالات SEO", contentType: "text" },
      { sectionKey: "types", contentKey: "item5", labelAr: "نوع المقال الخامس", selector: ".icon-list li:nth-child(5)", defaultText: "مقالات مبنية على دراسات وتقارير", contentType: "text" },
      { sectionKey: "cta", contentKey: "title", labelAr: "عنوان قسم دعوة التواصل", selector: "section.contact h2", defaultText: "لديك معرفة تستحق أن تصبح <em>مرجعًا</em>؟", contentType: "richtext" },
      { sectionKey: "cta", contentKey: "buttonLabel", labelAr: "نص زر التواصل", selector: ".contact-ctas .btn-gold", defaultText: "ناقش فكرة مقالك", contentType: "text" },
      { sectionKey: "cta", contentKey: "buttonHref", labelAr: "رابط زر التواصل", selector: ".contact-ctas .btn-gold", defaultText: "/contact", contentType: "url" },
    ],
  },
  {
    key: "scripts",
    label: "سكريبتات الفيديو",
    route: "/scripts/",
    file: "docs/scripts/index.html",
    entries: [
      { sectionKey: "hero", contentKey: "title", labelAr: "عنوان الصفحة الرئيسي", selector: ".hero-title", defaultText: "لديك المعرفة<br/>والمشاهد لديه زر التمرير<br/>بين الاثنين يوجد السكريبت", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "lead", labelAr: "الجملة التعريفية تحت العنوان", selector: ".page-lead", defaultText: "أحوّل خبرتك إلى فيديو يمنح المشاهد سببًا للاستمرار من أول ثانية إلى النهاية", contentType: "text" },
      { sectionKey: "method", contentKey: "title", labelAr: "عنوان قسم طريقة بناء السكريبت", selector: ".method-band .ch-title", defaultText: "كيف أبني <em>السكريبت</em>؟", contentType: "richtext" },
      { sectionKey: "method", contentKey: "step1Title", labelAr: "عنوان الخطوة ١", selector: ".step:nth-of-type(1) h3", defaultText: "أفهم الجمهور", contentType: "text" },
      { sectionKey: "method", contentKey: "step1Body", labelAr: "وصف الخطوة ١", selector: ".step:nth-of-type(1) p", defaultText: "ما الذي يهمه؟ وما الذي يعرفه مسبقًا؟", contentType: "text" },
      { sectionKey: "method", contentKey: "step2Title", labelAr: "عنوان الخطوة ٢", selector: ".step:nth-of-type(2) h3", defaultText: "أبحث", contentType: "text" },
      { sectionKey: "method", contentKey: "step2Body", labelAr: "وصف الخطوة ٢", selector: ".step:nth-of-type(2) p", defaultText: "أجمع المادة التي يحتاجها الموضوع", contentType: "text" },
      { sectionKey: "method", contentKey: "step3Title", labelAr: "عنوان الخطوة ٣", selector: ".step:nth-of-type(3) h3", defaultText: "أجد الزاوية", contentType: "text" },
      { sectionKey: "method", contentKey: "step3Body", labelAr: "وصف الخطوة ٣", selector: ".step:nth-of-type(3) p", defaultText: "أحدد المدخل الذي يعطي الفكرة قيمتها", contentType: "text" },
      { sectionKey: "method", contentKey: "step4Title", labelAr: "عنوان الخطوة ٤", selector: ".step:nth-of-type(4) h3", defaultText: "أبني الهوك", contentType: "text" },
      { sectionKey: "method", contentKey: "step4Body", labelAr: "وصف الخطوة ٤", selector: ".step:nth-of-type(4) p", defaultText: "أبدأ من نقطة تخلق فضولًا أو حاجة", contentType: "text" },
      { sectionKey: "method", contentKey: "step5Title", labelAr: "عنوان الخطوة ٥", selector: ".step:nth-of-type(5) h3", defaultText: "أرتب الرحلة", contentType: "text" },
      { sectionKey: "method", contentKey: "step5Body", labelAr: "وصف الخطوة ٥", selector: ".step:nth-of-type(5) p", defaultText: "كل معلومة تأتي في الوقت الذي يحتاجها المشاهد", contentType: "text" },
      { sectionKey: "formats", contentKey: "title", labelAr: "عنوان قسم أنواع السكريبتات", selector: ".chapter .ch-title", defaultText: "أكتب <em>سكريبتات</em>", contentType: "richtext" },
      { sectionKey: "formats", contentKey: "item1", labelAr: "نوع السكريبت ١", selector: ".icon-list li:nth-child(1)", defaultText: "فيديوهات قصيرة", contentType: "text" },
      { sectionKey: "formats", contentKey: "item2", labelAr: "نوع السكريبت ٢", selector: ".icon-list li:nth-child(2)", defaultText: "فيديوهات تعليمية", contentType: "text" },
      { sectionKey: "formats", contentKey: "item3", labelAr: "نوع السكريبت ٣", selector: ".icon-list li:nth-child(3)", defaultText: "محتوى معرفي وتحليلي", contentType: "text" },
      { sectionKey: "formats", contentKey: "item4", labelAr: "نوع السكريبت ٤", selector: ".icon-list li:nth-child(4)", defaultText: "YouTube", contentType: "text" },
      { sectionKey: "formats", contentKey: "item5", labelAr: "نوع السكريبت ٥", selector: ".icon-list li:nth-child(5)", defaultText: "حلقات مبنية على البحث", contentType: "text" },
      { sectionKey: "cta", contentKey: "title", labelAr: "عنوان قسم الدعوة للتواصل", selector: ".contact h2", defaultText: "فيديو يعرف كيف يبدأ، وكيف <em>يحافظ على المشاهد</em>", contentType: "richtext" },
      { sectionKey: "cta", contentKey: "buttonLabel", labelAr: "نص زر التواصل", selector: ".contact-ctas .btn-gold", defaultText: "ناقش فكرة الفيديو", contentType: "text" },
      { sectionKey: "cta", contentKey: "buttonHref", labelAr: "رابط زر التواصل", selector: ".contact-ctas .btn-gold", defaultText: "/contact", contentType: "url" },
    ],
  },
  {
    key: "about",
    label: "عني",
    route: "/about/",
    file: "docs/about/index.html",
    entries: [
      { sectionKey: "hero", contentKey: "title", labelAr: "عنوان الصفحة الرئيسي", selector: ".hero-title", defaultText: "أريد أن يصل محتواك<br/><span class=\"hl-gold\">إلى المستوى نفسه<br/>الذي وصلت إليه خبرتك</span>", contentType: "richtext" },
      { sectionKey: "hero", contentKey: "leadClose", labelAr: "سطر التعريف تحت العنوان", selector: ".page-lead.strong", defaultText: "أنا رحيق كنجو، كاتبة محتوى تسويقي", contentType: "text" },
      { sectionKey: "hero", contentKey: "portrait", labelAr: "صورة رحيق الشخصية", selector: ".stage-photo img", defaultText: "/raheeq-about.webp", contentType: "image" },
      { sectionKey: "hero", contentKey: "channel1", labelAr: "قناة ١ (منشور)", selector: ".channels li:nth-child(1) a", defaultText: "منشور", contentType: "text" },
      { sectionKey: "hero", contentKey: "channel2", labelAr: "قناة ٢ (مقال)", selector: ".channels li:nth-child(2) a", defaultText: "مقال", contentType: "text" },
      { sectionKey: "hero", contentKey: "channel3", labelAr: "قناة ٣ (سكريبت فيديو)", selector: ".channels li:nth-child(3) a", defaultText: "سكريبت فيديو", contentType: "text" },
      { sectionKey: "story", contentKey: "q1", labelAr: "السؤال 1", selector: ".qa-list .qa:nth-of-type(1) .qa-q", defaultText: "من أنا؟ ولماذا اخترت أن أكتب للخبراء؟", contentType: "text" },
      { sectionKey: "story", contentKey: "q2", labelAr: "السؤال 2", selector: ".qa-list .qa:nth-of-type(2) .qa-q", defaultText: "لماذا الخبراء تحديدًا؟", contentType: "text" },
      { sectionKey: "story", contentKey: "q3", labelAr: "السؤال 3", selector: ".qa-list .qa:nth-of-type(3) .qa-q", defaultText: "ماذا أبحث عنه عندما أتحدث مع خبير؟", contentType: "text" },
      { sectionKey: "story", contentKey: "q4", labelAr: "السؤال 4", selector: ".qa-list .qa:nth-of-type(4) .qa-q", defaultText: "أين يدخل السرد القصصي في طريقتي؟", contentType: "text" },
      { sectionKey: "story", contentKey: "q5", labelAr: "السؤال 5", selector: ".qa-list .qa:nth-of-type(5) .qa-q", defaultText: "لماذا أنا؟", contentType: "text" },
      { sectionKey: "story", contentKey: "q6", labelAr: "السؤال 6", selector: ".qa-list .qa:nth-of-type(6) .qa-q", defaultText: "وما النتيجة التي أريد الوصول إليها معك؟", contentType: "text" },
      { sectionKey: "method", contentKey: "title", labelAr: "عنوان قسم الطريقة", selector: ".method-band .ch-title em", defaultText: "طريقتي", contentType: "text" },
      { sectionKey: "method", contentKey: "step1", labelAr: "الخطوة ١", selector: ".roadmap li:nth-child(1) .rm-label", defaultText: "أستمع حتى أفهم", contentType: "text" },
      { sectionKey: "method", contentKey: "step2", labelAr: "الخطوة ٢", selector: ".roadmap li:nth-child(2) .rm-label", defaultText: "أسأل حتى أصل إلى الفكرة", contentType: "text" },
      { sectionKey: "method", contentKey: "step3", labelAr: "الخطوة ٣", selector: ".roadmap li:nth-child(3) .rm-label", defaultText: "أبحث حتى تحمل الكتابة مادة قوية", contentType: "text" },
      { sectionKey: "method", contentKey: "step4", labelAr: "الخطوة ٤", selector: ".roadmap li:nth-child(4) .rm-label", defaultText: "أرتب حتى يصبح المعنى واضحًا", contentType: "text" },
      { sectionKey: "method", contentKey: "step5", labelAr: "الخطوة ٥", selector: ".roadmap li:nth-child(5) .rm-label", defaultText: "ثم أكتب بصوت صاحب الخبرة", contentType: "text" },
      { sectionKey: "workwith", contentKey: "title", labelAr: "عنوان قسم «أعمل مع»", selector: "section.chapter:not(#certs) .ch-title", defaultText: "أعمل <em>مع</em>", contentType: "richtext" },
      { sectionKey: "workwith", contentKey: "audience1", labelAr: "الفئة ١", selector: ".tag-row:nth-of-type(1) li:nth-child(1)", defaultText: "خبراء ومديرين", contentType: "text" },
      { sectionKey: "workwith", contentKey: "audience2", labelAr: "الفئة ٢", selector: ".tag-row:nth-of-type(1) li:nth-child(2)", defaultText: "رواد أعمال", contentType: "text" },
      { sectionKey: "workwith", contentKey: "audience3", labelAr: "الفئة ٣", selector: ".tag-row:nth-of-type(1) li:nth-child(3)", defaultText: "علامات شخصية", contentType: "text" },
      { sectionKey: "workwith", contentKey: "audience4", labelAr: "الفئة ٤", selector: ".tag-row:nth-of-type(1) li:nth-child(4)", defaultText: "شركات وفرق محتوى", contentType: "text" },
      { sectionKey: "workwith", contentKey: "projectsIntro", labelAr: "جملة تمهيد المشاريع", selector: ".list-close", defaultText: "وعلى مشاريع تشمل", contentType: "text" },
      { sectionKey: "workwith", contentKey: "project1", labelAr: "نوع المشروع ١", selector: ".tag-row:nth-of-type(2) li:nth-child(1)", defaultText: "LinkedIn", contentType: "text" },
      { sectionKey: "workwith", contentKey: "project2", labelAr: "نوع المشروع ٢", selector: ".tag-row:nth-of-type(2) li:nth-child(2)", defaultText: "Ghostwriting", contentType: "text" },
      { sectionKey: "workwith", contentKey: "project3", labelAr: "نوع المشروع ٣", selector: ".tag-row:nth-of-type(2) li:nth-child(3)", defaultText: "المقالات والمحتوى البحثي", contentType: "text" },
      { sectionKey: "workwith", contentKey: "project4", labelAr: "نوع المشروع ٤", selector: ".tag-row:nth-of-type(2) li:nth-child(4)", defaultText: "سكريبتات الفيديو", contentType: "text" },
      { sectionKey: "certs", contentKey: "title", labelAr: "عنوان قسم الشهادات", selector: "#certs .ch-title", defaultText: "تعلّم <em>مستمر</em>", contentType: "richtext" },
      { sectionKey: "certs", contentKey: "cert1Title", labelAr: "اسم الشهادة ١", selector: "#certs .cert-card:nth-child(1) .cert-cap b", defaultText: "صناعة وكتابة المحتوى التسويقي والإعلاني", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert1Meta", labelAr: "تفاصيل الشهادة ١", selector: "#certs .cert-card:nth-child(1) .cert-cap small", defaultText: "أكاديمية رامي بدره، 45 ساعة تدريبية، 2025", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert1Image", labelAr: "صورة الشهادة ١", selector: "#certs .cert-card:nth-child(1) img", defaultText: "/cert-rami-badrah.jpg", contentType: "image" },
      { sectionKey: "certs", contentKey: "cert2Title", labelAr: "اسم الشهادة ٢", selector: "#certs .cert-card:nth-child(2) .cert-cap b", defaultText: "The Art of Storytelling", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert2Meta", labelAr: "تفاصيل الشهادة ٢", selector: "#certs .cert-card:nth-child(2) .cert-cap small", defaultText: "IESE Business School عبر Coursera، 2026", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert2Image", labelAr: "صورة الشهادة ٢", selector: "#certs .cert-card:nth-child(2) img", defaultText: "/cert-iese-storytelling.jpg", contentType: "image" },
      { sectionKey: "certs", contentKey: "cert3Title", labelAr: "اسم الشهادة ٣", selector: "#certs .cert-card:nth-child(3) .cert-cap b", defaultText: "Search Engine Optimization", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert3Meta", labelAr: "تفاصيل الشهادة ٣", selector: "#certs .cert-card:nth-child(3) .cert-cap small", defaultText: "منصة إدراك، 2023", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert3Image", labelAr: "صورة الشهادة ٣", selector: "#certs .cert-card:nth-child(3) img", defaultText: "/cert-edraak-seo.jpg", contentType: "image" },
      { sectionKey: "certs", contentKey: "cert4Title", labelAr: "اسم الشهادة ٤", selector: "#certs .cert-card:nth-child(4) .cert-cap b", defaultText: "شهادة تقدير: تسجيل 300 صفحة صوتيًا لدعم الطلاب المكفوفين", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert4Meta", labelAr: "تفاصيل الشهادة ٤", selector: "#certs .cert-card:nth-child(4) .cert-cap small", defaultText: "Light Initiative وSyrian Youth Assembly، 2022", contentType: "text" },
      { sectionKey: "certs", contentKey: "cert4Image", labelAr: "صورة الشهادة ٤", selector: "#certs .cert-card:nth-child(4) img", defaultText: "/cert-light-initiative.jpg", contentType: "image" },
      { sectionKey: "closing", contentKey: "title", labelAr: "عنوان الخاتمة", selector: ".contact h2", defaultText: "أفضل محتوى للخبير يبدأ من الشيء الذي <em>يعرفه فعلًا</em>", contentType: "richtext" },
      { sectionKey: "closing", contentKey: "body", labelAr: "نص الخاتمة", selector: ".contact p", defaultText: "ثم يأتي دوري في إيجاد الطريقة التي تجعله يصل", contentType: "text" },
      { sectionKey: "closing", contentKey: "ctaLabel", labelAr: "نص زر الدعوة", selector: ".contact .btn-gold", defaultText: "ابدأ مشروعك", contentType: "text" },
    ],
  },
  {
    key: "contact",
    label: "تواصل معي",
    route: "/contact/",
    file: "docs/contact/index.html",
    entries: [
      { sectionKey: "hero", contentKey: "title", labelAr: "عنوان الصفحة", selector: ".hero-title", defaultText: "لديك فكرة تستحق أن تتحول إلى محتوى؟", contentType: "text" },
      { sectionKey: "hero", contentKey: "lead", labelAr: "جملة تمهيدية قبل القائمة", selector: ".page-lead.d2", defaultText: "يمكن أن تكون:", contentType: "text" },
      { sectionKey: "hero", contentKey: "ideaLinkedin", labelAr: "فكرة ١: حساب LinkedIn", selector: ".icon-list li:nth-child(1)", defaultText: "حساب LinkedIn", contentType: "text" },
      { sectionKey: "hero", contentKey: "ideaArticle", labelAr: "فكرة ٢: فكرة مقال", selector: ".icon-list li:nth-child(2)", defaultText: "فكرة مقال", contentType: "text" },
      { sectionKey: "hero", contentKey: "ideaVideo", labelAr: "فكرة ٣: موضوع فيديو", selector: ".icon-list li:nth-child(3)", defaultText: "موضوع فيديو", contentType: "text" },
      { sectionKey: "hero", contentKey: "ideaCluster", labelAr: "فكرة ٤: مجموعة أفكار", selector: ".icon-list li:nth-child(4)", defaultText: "أو مجموعة أفكار تحتاج إلى ترتيب", contentType: "text" },
      { sectionKey: "hero", contentKey: "brief", labelAr: "سطر الدعوة تحت القائمة", selector: ".page-lead.strong", defaultText: "احكِ لي عن خبرتك، المشروع والجمهور الذي تريد الوصول إليه", contentType: "text" },
      { sectionKey: "form", contentKey: "nameLabel", labelAr: "عنوان حقل الاسم", selector: "label[for=\"cf-name\"] > span", defaultText: "الاسم", contentType: "text" },
      { sectionKey: "form", contentKey: "emailLabel", labelAr: "عنوان حقل البريد الإلكتروني", selector: "label[for=\"cf-email\"] > span", defaultText: "البريد الإلكتروني", contentType: "text" },
      { sectionKey: "form", contentKey: "messageLabel", labelAr: "عنوان حقل الرسالة", selector: "label[for=\"cf-message\"] > span", defaultText: "رسالتك", contentType: "text" },
      { sectionKey: "form", contentKey: "submitLabel", labelAr: "نص زر الإرسال", selector: ".cf-send", defaultText: "تواصل معي", contentType: "text" },
      { sectionKey: "form", contentKey: "art", labelAr: "الصورة الزخرفية بجانب النموذج", selector: ".contact-art", defaultText: "/art-seal.webp", contentType: "image" },
      { sectionKey: "alt", contentKey: "emailLinkText", labelAr: "نص رابط البريد الإلكتروني", selector: ".contact-alt a[href^=\"mailto:\"]", defaultText: "raheeqkanjo@gmail.com", contentType: "text" },
      { sectionKey: "alt", contentKey: "emailHref", labelAr: "وجهة رابط البريد الإلكتروني", selector: ".contact-alt a[href^=\"mailto:\"]", defaultText: "mailto:raheeqkanjo@gmail.com", contentType: "url" },
      { sectionKey: "alt", contentKey: "linkedinLinkText", labelAr: "نص رابط LinkedIn", selector: ".contact-alt a[href^=\"https://www.linkedin.com\"]", defaultText: "أو راسلني على LinkedIn", contentType: "text" },
      { sectionKey: "alt", contentKey: "linkedinHref", labelAr: "وجهة رابط LinkedIn", selector: ".contact-alt a[href^=\"https://www.linkedin.com\"]", defaultText: "https://www.linkedin.com/in/raheekkanjo/", contentType: "url" },
    ],
  },
  {
    key: "blog",
    label: "المدونة",
    route: "/blog/",
    file: "docs/blog/index.html",
    entries: [

    ],
  },
];

export const PAGE_KEYS = PAGES.map((p) => p.key);

export function findPage(key: string): PageSpec | undefined {
  return PAGES.find((p) => p.key === key);
}

export function findEntry(
  pageKey: string,
  sectionKey: string,
  contentKey: string
): ContentEntry | undefined {
  return findPage(pageKey)?.entries.find(
    (e) => e.sectionKey === sectionKey && e.contentKey === contentKey
  );
}

/** Section labels, so the editor can head each group with words rather than keys. */
export const SECTION_LABELS: Record<string, string> = {
  hero: "الواجهة",
  pain: "المشكلة",
  positioning: "التموضع",
  services: "الخدمات",
  voice: "الصوت",
  testimonials: "التوصيات",
  process: "طريقة العمل",
  method: "الطريقة",
  formats: "الأنواع",
  cta: "الدعوة للتواصل",
  contact: "التواصل",
  form: "النموذج",
  alt: "طرق تواصل أخرى",
  intro: "المقدمة",
  story: "القصة",
  values: "القيم",
  work: "العمل",
  tools: "الأدوات",
  certificates: "الشهادات",
  roadmap: "المسار",
  closing: "الختام",
  faq: "الأسئلة الشائعة",
  deliverables: "ما تحصل عليه",
  why: "لماذا",
  outcome: "النتيجة",
  question: "السؤال",
  ideas: "الأفكار",
  workwith: "أعمل مع",
  certs: "الشهادات والتعلّم",
  types: "الأنواع",
};

export function sectionLabel(key: string): string {
  return SECTION_LABELS[key] || key;
}
