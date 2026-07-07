"use client";

import { useEffect } from "react";

const MARQUEE_WORDS = [
  "استراتيجية المحتوى",
  "الغوست رايتنغ",
  "سيناريو الفيديو",
  "محتوى لينكدإن",
  "البودكاست",
  "صوت العلامة",
  "السرد القصصي",
  "القيادة التحريرية",
];

const TYPED_ROLES = [
  "شريكة محتواك",
  "كاتبة سيناريو",
  "غوست رايتر",
  "خبيرة استراتيجيات المحتوى",
];

export default function FX() {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // nav shadow
    const nav = document.getElementById("nav");
    const onScroll = () => nav?.classList.toggle("scrolled", scrollY > 10);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // marquee content (repeated for a seamless loop)
    const mq = document.getElementById("mq");
    if (mq) {
      const seq = MARQUEE_WORDS.map((w) => `<span>${w}</span><i>✺</i>`).join("");
      mq.innerHTML = seq.repeat(4);
    }

    // typewriter
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

    // counters
    const co = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          co.unobserve(e.target);
          const el = e.target as HTMLElement;
          const to = Number(el.dataset.to);
          if (reduced) {
            el.textContent = String(to);
            return;
          }
          const t0 = performance.now();
          const dur = 1400;
          const step = (t: number) => {
            const p = Math.min((t - t0) / dur, 1);
            el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 4))));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
      { threshold: 0.6 }
    );
    document.querySelectorAll(".count").forEach((el) => co.observe(el));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
      io.disconnect();
      co.disconnect();
    };
  }, []);

  return null;
}
