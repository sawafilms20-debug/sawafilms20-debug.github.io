/* Applies the content edited in the dashboard to this page.

   The site is static HTML on GitHub Pages; the dashboard and its database live
   on Railway. Publishing writes /site-content.json next to these pages, and
   this script swaps in whatever it finds there.

   The important property is that a MISSING value changes nothing. Every string
   below already exists in the HTML as shipped, so a page with no overrides — or
   one where the JSON never loads, or where a selector stopped matching after a
   redesign — renders exactly what it was built with. Editing is an override,
   never a dependency. */
(function () {
  var ROUTES = {
    "/": "home",
    "/about/": "about",
    "/linkedin/": "linkedin",
    "/articles/": "articles",
    "/scripts/": "scripts",
    "/contact/": "contact",
    "/blog/": "blog"
  };

  function pageKey() {
    var p = location.pathname.replace(/\/index\.html$/, "/");
    if (p !== "/" && p.slice(-1) !== "/") p += "/";
    return ROUTES[p] || null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* A name written in Latin script reads correctly only left-to-right, and the
     page is right-to-left. Detect it by codepoint rather than by guessing. */
  function isLatin(name) {
    var s = String(name || "");
    var letters = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      // General punctuation (curly quotes, dashes, the ellipsis) is shared by
      // both scripts and decides nothing; anything else past Latin Extended-B
      // — Arabic above all — means this is not Latin text.
      if (c >= 0x2000 && c <= 0x206f) continue;
      if (c > 591) return false;
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c > 191) letters++;
    }
    return letters > 0;
  }

  /* Replace only the element's trailing text, so an inline icon in the same
     element survives the swap. Falls back to textContent when the element has
     no child elements at all. */
  function setText(el, value) {
    for (var i = el.childNodes.length - 1; i >= 0; i--) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) {
        n.nodeValue = value;
        return;
      }
    }
    el.textContent = value;
  }

  function applyOne(item) {
    var el;
    try {
      el = document.querySelector(item.selector);
    } catch (e) {
      return;
    }
    if (!el) return;
    if (item.type === "richtext") el.innerHTML = item.value;
    else if (item.type === "url") el.setAttribute("href", item.value);
    else if (item.type === "image") el.setAttribute("src", item.value);
    else setText(el, item.value);
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /* The page's own reveal-on-scroll observer runs once, at load, over the
     elements that existed then. Cards written in afterwards would keep the
     hidden starting state of .rv forever — so they get an observer of their
     own here. */
  function reveal(wrap) {
    var els = wrap.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add("on");
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /* Rendering is retried several times around hydration. Re-rendering a list
     that is already on the page would restart its entrance animation each
     time, so a list is written only when it differs from what is there. */
  var sigList = null, sigValue = "";
  function signature(list) {
    // Memoised on the list itself: the guard below asks on every DOM change.
    if (list === sigList) return sigValue;
    var s = JSON.stringify(list), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    sigList = list;
    sigValue = String(h);
    return sigValue;
  }

  function renderTestimonials(list) {
    var wrap = document.querySelector("#testimonials .notes");
    if (!wrap || !list || !list.length) return;
    var sig = signature(list);
    var first = wrap.firstElementChild;
    if (first && first.getAttribute("data-rk") === sig) return;
    wrap.innerHTML = list
      .map(function (t, i) {
        var role = [t.authorTitleAr, t.company].filter(Boolean).join(" · ");
        var photo = t.authorPhoto
          ? '<img class="note-avatar" src="' + esc(t.authorPhoto) + '" alt="" width="100" height="100" loading="lazy"/>'
          : "";
        return (
          '<blockquote data-rk="' + sig + '" class="note rv' + (i % 3 ? " d" + (i % 3) : "") + '"' +
          // An English recommendation reads left to right, as the built page has it.
          (isLatin(t.quoteAr) ? ' dir="ltr"' : "") + ">" +
          "<q>" + esc(t.quoteAr) + "</q>" +
          "<footer>" + photo +
          '<span class="note-who"' + (isLatin(t.authorName) ? ' dir="ltr"' : "") + ">" +
          "<b>" + esc(t.authorName) + "</b>" +
          (role ? "<small>" + esc(role) + "</small>" : "") +
          "</span></footer></blockquote>"
        );
      })
      .join("");
    reveal(wrap);
  }

  function renderSteps(list) {
    var wrap = document.querySelector("#process .steps");
    if (!wrap || !list || !list.length) return;
    var icons = wrap.querySelectorAll(".step .ic-chip");
    wrap.innerHTML = list
      .map(function (s, i) {
        var icon = icons[i] ? icons[i].outerHTML : "";
        return (
          '<div class="step rv' + (i ? " d" + i : "") + '">' + icon +
          '<div class="step-num">' + pad2(s.stepNumber || i + 1) + "</div>" +
          "<h3>" + esc(s.titleAr) + "</h3>" +
          (s.descriptionAr ? "<p>" + esc(s.descriptionAr) + "</p>" : "") +
          "</div>"
        );
      })
      .join("");
  }

  function renderServices(list) {
    var wrap = document.querySelector("#services .offers");
    if (!wrap || !list || !list.length) return;
    var existing = wrap.querySelectorAll(".offer");
    wrap.innerHTML = list
      .map(function (s, i) {
        var old = existing[i];
        var oldArt = old ? old.querySelector(".offer-art") : null;
        var oldCta = old ? old.querySelector(".offer-cta") : null;
        var art = s.coverImage
          ? '<img class="offer-art" src="' + esc(s.coverImage) + '" alt="" aria-hidden="true" loading="lazy"/>'
          : oldArt
            ? oldArt.outerHTML
            : "";
        var cta = oldCta
          ? oldCta.outerHTML
          : '<div class="offer-cta"><span>تفاصيل الخدمة</span></div>';
        return (
          '<a class="offer" href="/' + esc(s.slug) + '/">' + art +
          "<h3>" + esc(s.titleAr) + "</h3>" +
          (s.summaryAr ? "<p>" + esc(s.summaryAr) + "</p>" : "") +
          cta + "</a>"
        );
      })
      .join("");
  }

  /* Recommendations are read live from the dashboard's server, so one she
     approves appears without a publish. The published list stays the
     fallback: if this request fails or is slow, nothing is lost but freshness. */
  var LIVE = /(^|\.)raheeqkanjo\.com$/.test(location.hostname)
    ? "https://rak-production.up.railway.app/api/testimonials"
    : "/api/testimonials";
  var liveTestimonials = null;

  function apply(data) {
    var key = pageKey();
    // Site-wide values — logo, footer wording, contact links — live on every
    // page, so they are applied whether or not this route is in the registry.
    if (data.global) data.global.forEach(applyOne);
    if (key && data.pages && data.pages[key]) data.pages[key].forEach(applyOne);
    if (key === "home") {
      renderTestimonials(liveTestimonials || data.testimonials);
      renderSteps(data.processSteps);
      renderServices(data.services);
    }
  }

  /* These pages are a static Next export, so React hydrates them from a bundle
     that still holds the original wording, and anything written into the DOM
     before hydration commits is reconciled straight back out. So apply, then
     apply again after hydration has had time to finish.

     Deliberately setTimeout and not requestAnimationFrame: rAF does not fire in
     a background tab, and a page opened in one would keep the old wording until
     it was looked at. */
  var RETRIES = [0, 250, 900, 2000];

  function applyLate(data) {
    RETRIES.forEach(function (delay) {
      setTimeout(function () {
        apply(data);
      }, delay);
    });
  }

  /* Hydration on a slow phone can finish after the live list is drawn, and
     when it does React puts the built-in list back. Watch the list for a while and put
     the live one back whenever that happens. Our own render matches its
     signature and is left alone, so this cannot loop. */
  function guard() {
    if (!("MutationObserver" in window)) return;
    // The whole page, not the list: a failed hydration regenerates the
    // section, and an observer on the old list would be watching a node that
    // is no longer in the document.
    var mo = new MutationObserver(function () {
      renderTestimonials(liveTestimonials);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      mo.disconnect();
    }, 15000);
  }

  function loadLive() {
    if (!document.querySelector("#testimonials .notes")) return;
    fetch(LIVE, { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (!j || !j.testimonials || !j.testimonials.length) return;
        liveTestimonials = j.testimonials;
        renderTestimonials(liveTestimonials);
        guard();
      })
      .catch(function () {});
  }

  function init() {
    if (pageKey() === "home") {
      if (document.readyState === "complete") loadLive();
      else window.addEventListener("load", loadLive);
    }
    fetch("/site-content.json?v=" + Math.floor(Date.now() / 60000), { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (!data) return;
        if (document.readyState === "complete") applyLate(data);
        else window.addEventListener("load", function () { applyLate(data); });
      })
      .catch(function () {});
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
