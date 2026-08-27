import Link from "next/link";

export default function SiteNav({ solid = false }: { solid?: boolean }) {
  return (
    <nav id="nav" className={solid ? "scrolled" : undefined}>
      <div className="nav-in">
        <Link className="mark" href="/">
          <img src="/logo-raheeq.webp" alt="رحيق" width={717} height={379} />
        </Link>
        <div className="nav-links">
          <Link href="/linkedin">LinkedIn</Link>
          <Link href="/articles">المقالات</Link>
          <Link href="/scripts">سكريبتات الفيديو</Link>
          <Link href="/about">عني</Link>
          <Link className="nav-cta" href="/contact">
            تواصل معي
          </Link>
        </div>
      </div>
    </nav>
  );
}
