import { Mail } from "lucide-react";
import { LinkedInIcon } from "./icons";

export default function SiteFooter() {
  return (
    <footer className="foot foot2">
      <div className="wrap">
        <div className="foot-brand">
          <img
            className="foot-logo"
            src="/logo-raheeq.webp"
            alt="رحيق كنجو"
            width={360}
            height={470}
            loading="lazy"
          />
          <span className="foot-tag">كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب</span>
        </div>
        <nav className="foot-nav" aria-label="روابط الموقع">
          <a href="/linkedin/">بناء علامتك الشخصية على LinkedIn</a>
          <a href="/articles/">خدمة كتابة المقالات</a>
          <a href="/scripts/">خدمة كتابة سيناريو الفيديو</a>
          <a href="/blog/">المدونة</a>
          <a href="/about/">عني</a>
          <a href="/contact/">تواصل معي</a>
        </nav>
        <div className="foot-social">
          <a
            href="https://www.linkedin.com/in/raheekkanjo/"
            target="_blank"
            rel="noopener"
            aria-label="حساب رحيق على LinkedIn"
          >
            <LinkedInIcon />
          </a>
          <a href="mailto:raheeqkanjo@gmail.com" aria-label="راسلني عبر البريد الإلكتروني">
            <Mail />
          </a>
        </div>
        <p className="foot-line">أحوّل خبرتك إلى محتوى يحمل صوتك ويصنع حضورك.</p>
        <p className="foot-copy">© {new Date().getFullYear()} رحيق كنجو</p>
      </div>
    </footer>
  );
}
