"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export default function SiteNav({ solid = false }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav id="nav" className={`${solid ? "scrolled" : ""} ${open ? "nav-open" : ""}`.trim() || undefined}>
      <div className="nav-in">
        <Link className="mark" href="/" onClick={close}>
          <img src="/logo-raheeq.webp" alt="رحيق" width={360} height={470} />
        </Link>
        <div className="nav-links" id="nav-menu">
          <Link href="/" onClick={close}>الرئيسية</Link>
          <div className="nav-group">
            {/* opens on hover and on focus-within, so it needs no javascript and
                works the same in the static snapshot as it does here */}
            <button type="button" className="nav-group-btn" aria-haspopup="true">
              خدمات
              <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-caret">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="nav-drop">
              <Link href="/linkedin" onClick={close}>بناء علامتك الشخصية على LinkedIn</Link>
              <Link href="/articles" onClick={close}>خدمة كتابة المقالات</Link>
              <Link href="/scripts" onClick={close}>خدمة كتابة سيناريو الفيديو</Link>
            </div>
          </div>
          <Link href="/blog" onClick={close}>المدونة</Link>
          <Link href="/about" onClick={close}>عني</Link>
        </div>
        <div className="nav-end">
          <Link className="nav-cta" href="/contact" onClick={close}>
            تواصل معي
          </Link>
          <button
            type="button"
            className="nav-burger"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="nav-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </nav>
  );
}
