/* Checks that every editable string the dashboard offers still points at
   something on the published site.

   The "الصفحات" screen works by CSS selector: each entry in lib/pageRegistry.ts
   names one element in docs/<page>/index.html. A redesign that renames a class
   or moves a section turns an entry into a silent no-op — the operator edits a
   field, presses publish, and nothing changes, with no error anywhere. This
   catches that at check time instead.

   Usage:  node scripts/check-selectors.mjs
   Exit code is non-zero when any selector is missing or ambiguous. */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "node-html-parser";
import { PAGES } from "../lib/pageRegistry.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

let missing = 0;
let ambiguous = 0;
let drifted = 0;
let ok = 0;

for (const page of PAGES) {
  if (!page.entries.length) continue;

  const file = path.join(ROOT, page.file);
  if (!fs.existsSync(file)) {
    console.log(`\n${page.key}: ${page.file} does not exist — skipped`);
    continue;
  }
  const root = parse(fs.readFileSync(file, "utf8"));
  const problems = [];

  for (const e of page.entries) {
    const id = `${e.sectionKey}.${e.contentKey}`;
    let nodes;
    try {
      nodes = root.querySelectorAll(e.selector);
    } catch (err) {
      problems.push(`  MISSING  ${id}  ${e.selector}  (${err.message})`);
      missing++;
      continue;
    }
    if (nodes.length === 0) {
      problems.push(`  MISSING  ${id}  ${e.selector}`);
      missing++;
      continue;
    }
    if (nodes.length > 1) {
      problems.push(`  AMBIG    ${id}  ${e.selector}  matches ${nodes.length}`);
      ambiguous++;
      continue;
    }

    const el = nodes[0];
    const actual =
      e.contentType === "url"
        ? el.getAttribute("href")
        : e.contentType === "image"
          ? el.getAttribute("src")
          : norm(el.textContent);

    /* The placeholder shown in the editor is the site's current wording. When
       it falls behind, editing still works — the operator just sees stale
       example text — so this is reported but is not a failure. Tags are
       stripped from both sides because the extractor recorded innerHTML while
       the parser gives text. */
    const expected =
      e.contentType === "url" || e.contentType === "image"
        ? norm(e.defaultText)
        : norm(e.defaultText.replace(/<[^>]+>/g, " "));

    if (norm(actual).replace(/\s+/g, "") !== expected.replace(/\s+/g, "")) {
      problems.push(`  stale    ${id}  placeholder differs from the page`);
      drifted++;
      continue;
    }
    ok++;
  }

  const head = `${page.key.padEnd(10)} ${String(page.entries.length).padStart(3)} entries`;
  if (problems.length) {
    console.log(`\n${head}`);
    problems.forEach((p) => console.log(p));
  } else {
    console.log(`${head}  all resolve`);
  }
}

console.log(
  `\n${ok} resolve exactly, ${drifted} with a stale placeholder, ` +
    `${missing} missing, ${ambiguous} ambiguous`
);

if (missing || ambiguous) {
  console.log(
    "\nA missing or ambiguous selector means that field silently does nothing.\n" +
      "Repoint it in lib/pageRegistry.ts against the current markup in docs/."
  );
  process.exit(1);
}
