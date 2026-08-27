"use client";

import { useEffect } from "react";

const TYPED_ROLES = [
  "كاتبة محتوى تسويقي",
  "كاتبة واستراتيجية محتوى",
  "كاتبة محتوى LinkedIn",
  "كاتبة مقالات وسكريبتات فيديو",
];

export default function FX() {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // nav shadow
    const nav = document.getElementById("nav");
    const onScroll = () => nav?.classList.toggle("scrolled", scrollY > 10);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // typewriter (write, delete, rewrite)
    const typedEl = document.getElementById("typed");
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    if (typedEl) {
      if (reduced) {
        typedEl.textContent = TYPED_ROLES[0];
      } else {
        let ri = 0,
          ci = 0,
          del = false;
        const tick = () => {
          if (cancelled) return;
          const word = TYPED_ROLES[ri];
          typedEl.textContent = word.slice(0, ci);
          let wait = del ? 45 : 95;
          if (!del && ci === word.length) {
            wait = 1900;
            del = true;
          } else if (del && ci === 0) {
            del = false;
            ri = (ri + 1) % TYPED_ROLES.length;
            wait = 350;
          }
          ci += del ? -1 : 1;
          timer = setTimeout(tick, wait);
        };
        tick();
      }
    }

    // reveal on scroll
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return null;
}
