/* Guards the one place this codebase fetches a URL on the server's behalf.
 *
 * `linkedin.readPost` takes a link from the dashboard and fetches it, so the
 * function that decides which links are allowed is the whole security boundary:
 * an admin-authenticated procedure that will fetch anything is an SSRF hole
 * pointed at whatever else the container can reach — cloud metadata at
 * 169.254.169.254, the Postgres port, another service on the private network.
 *
 * No network here. This tests the decision, not the fetch.
 *
 *   node scripts/linkcheck.mjs
 * Exit code is non-zero when anything fails. */

import { linkedInPostUrl, postTextFromHtml } from "../lib/linkedin.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push({ name, error: e.message });
    process.stdout.write(`  FAIL ${name}\n       ${e.message}\n`);
  }
}

/* Links LinkedIn's own "copy link to post" actually produces. Refusing one of
   these means she pastes a valid link and is told it is not a link. */
const ACCEPT = [
  "https://www.linkedin.com/feed/update/urn:li:activity:7502107041549783041/",
  "https://www.linkedin.com/feed/update/urn:li:activity:7502107041549783041",
  "https://linkedin.com/feed/update/urn:li:share:7502107041549783041/",
  "https://www.linkedin.com/feed/update/urn:li:ugcPost:7502107041549783041/",
  "https://linkedin.com/posts/raheekkanjo_abc-activity-7502107041549783041-xYz",
  "https://www.linkedin.com/posts/raheekkanjo_slug-activity-123-ab_c",
  "https://www.linkedin.com/feed/update/urn:li:activity:123/?utm_source=share&utm_medium=x",
  "https://lnkd.in/gAbCdEf",
];

/* Everything else. The first two are the ones a plain host check misses. */
const REFUSE = [
  "https://user:pass@linkedin.com/feed/update/urn:li:activity:1/", // credential confusion
  "https://linkedin.com:8080/feed/update/urn:li:activity:1/",      // a port is never a post
  "http://www.linkedin.com/feed/update/urn:li:activity:1/",        // plaintext
  "https://linkedin.com.evil.com/posts/x",                         // suffix lookalike
  "https://evillinkedin.com/posts/x",
  "https://evil.com/https://linkedin.com/posts/x",
  "https://linkedin.com/in/raheekkanjo/",                           // a profile, not a post
  "https://linkedin.com/in/raheekkanjo/recent-activity/all/",
  "https://linkedin.com/feed/",
  "https://linkedin.com/",
  "https://169.254.169.254/latest/meta-data/",                      // cloud metadata
  "http://localhost:5433/",
  "https://127.0.0.1/",
  "https://[::1]/",
  "file:///etc/passwd",
  "ftp://linkedin.com/x",
  "javascript:alert(1)",
  "https://lnkd.in/a/../../etc/passwd",
  "https://lnkd.in/",
  "not a url at all",
  "",
  "   ",
];

console.log("\nlink guard");
for (const u of ACCEPT) {
  check(`accepts ${u.slice(0, 56)}`, () => {
    if (!linkedInPostUrl(u)) throw new Error("a real post link was refused");
  });
}
for (const u of REFUSE) {
  check(`refuses ${JSON.stringify(u).slice(0, 56)}`, () => {
    const got = linkedInPostUrl(u);
    if (got) throw new Error(`accepted, and would fetch ${got}`);
  });
}

check("query and fragment are stripped, so one post is one link", () => {
  const got = linkedInPostUrl(
    "https://www.linkedin.com/feed/update/urn:li:activity:1/?utm_source=x#frag"
  );
  if (got !== "https://www.linkedin.com/feed/update/urn:li:activity:1/") {
    throw new Error(`got ${got}`);
  }
});

/* ------------------------------------------------------------- extraction */

const page = (desc) =>
  `<html><head><meta property="og:description" content="${desc}"/></head></html>`;

console.log("\nextraction");
check("reads the post text out of the preview tags", () => {
  const r = postTextFromHtml(page("سطر أول&#10;&#10;سطر ثانٍ"));
  if (r?.text !== "سطر أول\n\nسطر ثانٍ") throw new Error(`got ${JSON.stringify(r)}`);
});

check("strips the comment-count suffix LinkedIn appends", () => {
  const r = postTextFromHtml(page("نص المنشور | 27 comments on LinkedIn"));
  if (r?.text !== "نص المنشور") throw new Error(`got ${JSON.stringify(r?.text)}`);
});

check("decodes the entities the tag is escaped with", () => {
  const r = postTextFromHtml(page("a &amp; b &quot;c&quot; &#39;d&#39;"));
  if (r?.text !== `a & b "c" 'd'`) throw new Error(`got ${JSON.stringify(r?.text)}`);
});

check("flags a preview that arrived cut off", () => {
  // Saving half a post as a whole article is the failure worth catching.
  if (!postTextFromHtml(page("بداية المنشور الطويل…"))?.truncated) {
    throw new Error("an ellipsis-terminated preview was not flagged");
  }
  if (postTextFromHtml(page("منشور كامل."))?.truncated) {
    throw new Error("a complete post was flagged as truncated");
  }
});

check("a page with no preview tags yields nothing rather than junk", () => {
  if (postTextFromHtml("<html><head><title>x</title></head></html>") !== null) {
    throw new Error("invented text from a page that had none");
  }
});

/* ----------------------------------------------------------------- report */

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}
console.log("link guard and post extraction verified.\n");
