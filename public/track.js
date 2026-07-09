/* Raheeq site analytics — tiny, privacy-light, no cookies-for-tracking-networks.
   Sends pageviews + CTA clicks to the admin's ingest endpoint. */
(function () {
  var ENDPOINT = "https://rak-production.up.railway.app/api/track";
  try {
    if (location.pathname.indexOf("/admin") === 0) return; // never track the admin

    function rid() {
      return (
        Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
      );
    }
    // long-lived visitor id
    var vid = localStorage.getItem("rk_vid");
    if (!vid) {
      vid = rid();
      localStorage.setItem("rk_vid", vid);
    }
    // 30-min session id
    var now = Date.now();
    var sid = sessionStorage.getItem("rk_sid");
    var last = +sessionStorage.getItem("rk_sid_t") || 0;
    if (!sid || now - last > 30 * 60 * 1000) sid = rid();
    sessionStorage.setItem("rk_sid", sid);
    sessionStorage.setItem("rk_sid_t", String(now));

    var qs = new URLSearchParams(location.search);
    function send(body) {
      body.sid = sid;
      body.vid = vid;
      try {
        var blob = new Blob([JSON.stringify(body)], { type: "application/json" });
        if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
      } catch (e) {}
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () {});
    }

    send({
      type: "pageview",
      path: location.pathname,
      referrer: document.referrer || "",
      utm_source: qs.get("utm_source") || "",
      utm_medium: qs.get("utm_medium") || "",
      utm_campaign: qs.get("utm_campaign") || "",
    });

    // CTA / conversion clicks
    document.addEventListener(
      "click",
      function (e) {
        var el = e.target && e.target.closest
          ? e.target.closest("[data-cta],a.nav-cta,a.btn-gold,a.btn,a[href^='mailto'],a[href^='https://wa.me'],a[href*='whatsapp']")
          : null;
        if (!el) return;
        var name =
          el.getAttribute("data-cta") ||
          (el.getAttribute("href") || "").slice(0, 40) ||
          (el.textContent || "").trim().slice(0, 40) ||
          "cta";
        send({ type: "event", event_name: name, path: location.pathname });
      },
      true
    );

    document.addEventListener(
      "submit",
      function () {
        send({ type: "event", event_name: "form_submit", path: location.pathname });
      },
      true
    );
  } catch (e) {}
})();
