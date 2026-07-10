/* Renders the "أعمالي" section on the homepage from the projects you manage in
   the admin. Reads content/projects.json straight from the repo, so adding a
   project in the dashboard shows up here with no rebuild. Renders nothing when
   there are no projects. */
(function () {
  var SRC =
    "https://raw.githubusercontent.com/sawafilms20-debug/sawafilms20-debug.github.io/main/content/projects.json";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function card(p) {
    var tags = (p.tags || [])
      .slice(0, 4)
      .map(function (t) {
        return "<i>" + esc(t) + "</i>";
      })
      .join("");
    var inner =
      "<h3>" + esc(p.title) + "</h3>" +
      (p.desc ? "<p>" + esc(p.desc) + "</p>" : "") +
      (tags ? '<div class="project-tags">' + tags + "</div>" : "") +
      (p.url ? '<span class="project-link">زيارة المشروع ←</span>' : "");
    var cls = "project-card" + (p.featured ? " featured" : "");
    return p.url
      ? '<a class="' + cls + '" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + inner + "</a>"
      : '<div class="' + cls + '">' + inner + "</div>";
  }

  function init() {
    if (document.querySelector(".projects")) return;
    var anchor = document.querySelector("#contact");
    if (!anchor) return;

    fetch(SRC + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (list) {
        if (!Array.isArray(list) || list.length === 0) return;
        list.sort(function (a, b) {
          if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
          return (a.date || "") < (b.date || "") ? 1 : -1;
        });
        var sec = document.createElement("section");
        sec.className = "projects wrap";
        sec.id = "work";
        sec.innerHTML =
          '<span class="slug">أعمالي</span>' +
          "<h2>مشاريع كتبتُها، ونتائج تتحدّث عنها</h2>" +
          '<p class="lead">مختارات من التعاونات التي عملتُ عليها.</p>' +
          '<div class="projects-grid">' + list.map(card).join("") + "</div>";
        anchor.parentNode.insertBefore(sec, anchor);
      })
      .catch(function () {});
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
