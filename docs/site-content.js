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
    for (var i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) > 591) return false; // past Latin Extended-B
    }
    return s.length > 0;
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

  function renderTestimonials(list) {
    var wrap = document.querySelector("#testimonials .notes");
    if (!wrap || !list || !list.length) return;
    wrap.innerHTML = list
      .map(function (t, i) {
        var role = [t.authorTitleAr, t.company].filter(Boolean).join(" · ");
        var photo = t.authorPhoto
          ? '<img class="note-avatar" src="' + esc(t.authorPhoto) + '" alt="" width="100" height="100" loading="lazy"/>'
          : "";
        return (
          '<blockquote class="note rv' + (i % 3 ? " d" + (i % 3) : "") + '">' +
          "<q>" + esc(t.quoteAr) + "</q>" +
          "<footer>" + photo +
          '<span class="note-who"' + (isLatin(t.authorName) ? ' dir="ltr"' : "") + ">" +
          "<b>" + esc(t.authorName) + "</b>" +
          (role ? "<small>" + esc(role) + "</small>" : "") +
          "</span></footer></blockquote>"
        );
      })
      .join("");
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

  function apply(data) {
    var key = pageKey();
    // Site-wide values — logo, footer wording, contact links — live on every
    // page, so they are applied whether or not this route is in the registry.
    if (data.global) data.global.forEach(applyOne);
    if (key && data.pages && data.pages[key]) data.pages[key].forEach(applyOne);
    if (key === "home") {
      renderTestimonials(data.testimonials);
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

  function init() {
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
