import Link from "next/link";
import { Mail } from "lucide-react";
import { LinkedInIcon } from "./icons";

export default function SiteFooter() {
  return (
    <footer className="foot foot2">
      <div className="wrap">
        <div className="foot-brand">
          <b className="foot-name">رحيق كنجو</b>
          <span className="foot-tag">كاتبة واستراتيجية محتوى للخبراء</span>
        </div>
        <nav className="foot-nav" aria-label="روابط الموقع">
          <Link href="/linkedin">LinkedIn</Link>
          <Link href="/articles">المقالات</Link>
          <Link href="/scripts">سكريبتات الفيديو</Link>
          <Link href="/about">عني</Link>
          <Link href="/contact">تواصل معي</Link>
          <Link href="/blog">المدونة</Link>
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
