/* Turns the homepage contact section into a real form that posts messages
   straight to the admin dashboard's inbox (no email needed). Progressive
   enhancement: if JS is off, the existing mailto link still works. */
(function () {
  var ENDPOINT = "https://rak-production.up.railway.app/api/leads";
  function init() {
    if (document.querySelector(".contact-form")) return;
    var ctas = document.querySelector("#contact .contact-ctas");
    if (!ctas) return;

    var form = document.createElement("form");
    form.className = "contact-form";
    form.setAttribute("novalidate", "");
    form.innerHTML =
      '<div class="cf-row">' +
      '<input class="cf-in" name="name" placeholder="الاسم" autocomplete="name" required>' +
      '<input class="cf-in" name="email" type="email" dir="ltr" placeholder="البريد الإلكتروني" autocomplete="email" required>' +
      "</div>" +
      '<textarea class="cf-in" name="message" rows="4" placeholder="أخبريني عن مشروعك أو سؤالك…" required></textarea>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">' +
      '<button class="btn btn-gold cf-send" type="submit">إرسال الرسالة</button>' +
      '<p class="cf-status" role="status" aria-live="polite"></p>';

    ctas.parentNode.insertBefore(form, ctas);
    var mail = ctas.querySelector('a[href^="mailto"]');
    if (mail) mail.style.display = "none";

    var status = form.querySelector(".cf-status");
    var btn = form.querySelector(".cf-send");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      if ((fd.get("website") || "").toString()) return; // honeypot
      var name = (fd.get("name") || "").toString().trim();
      var email = (fd.get("email") || "").toString().trim();
      var message = (fd.get("message") || "").toString().trim();
      if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        status.textContent = "الرجاء تعبئة الاسم والبريد ورسالة صحيحة.";
        status.className = "cf-status err";
        return;
      }
      btn.disabled = true;
      btn.textContent = "جارٍ الإرسال…";
      status.textContent = "";
      status.className = "cf-status";
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, message: message, source: "homepage" }),
      })
        .then(function (r) {
          return r
            .json()
            .catch(function () {
              return {};
            })
            .then(function (j) {
              return { ok: r.ok, j: j };
            });
        })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            status.textContent = "وصلتني رسالتك ✓ سأردّ عليك قريبًا.";
            status.className = "cf-status ok";
            btn.textContent = "تم الإرسال ✓";
          } else {
            status.textContent = (res.j && res.j.error) || "تعذّر الإرسال، حاولي مجددًا.";
            status.className = "cf-status err";
            btn.disabled = false;
            btn.textContent = "إرسال الرسالة";
          }
        })
        .catch(function () {
          status.textContent = "تعذّر الإرسال، تحقّقي من اتصالك.";
          status.className = "cf-status err";
          btn.disabled = false;
          btn.textContent = "إرسال الرسالة";
        });
    });
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
