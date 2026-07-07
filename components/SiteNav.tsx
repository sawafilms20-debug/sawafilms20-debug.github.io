import Link from "next/link";

export default function SiteNav({ solid = false }: { solid?: boolean }) {
  return (
    <nav id="nav" className={solid ? "scrolled" : undefined}>
      <div className="nav-in">
        <Link className="mark" href="/">
          <img src="/logo-raheeq.webp" alt="رحيق" width={717} height={379} />
        </Link>
        <div className="nav-links">
          <a href="/#why">النتائج</a>
          <a href="/#services">كيف نعمل معًا</a>
          <a href="/#method">منهجيتي</a>
          <Link href="/blog">المدونة</Link>
          <a className="nav-cta" href="/#contact">
            احجز استشارة مجانية
          </a>
        </div>
      </div>
    </nav>
  );
}
