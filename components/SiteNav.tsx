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
          <img src="/logo-raheeq.webp" alt="رحيق" width={717} height={379} />
        </Link>
        <div className="nav-links" id="nav-menu">
          <Link href="/linkedin" onClick={close}>LinkedIn</Link>
          <Link href="/articles" onClick={close}>المقالات</Link>
          <Link href="/scripts" onClick={close}>سكريبتات الفيديو</Link>
          <Link href="/about" onClick={close}>عني</Link>
          <Link className="nav-cta" href="/contact" onClick={close}>
            تواصل معي
          </Link>
        </div>
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
    </nav>
  );
}
