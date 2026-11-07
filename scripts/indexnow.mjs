/* Tells IndexNow (Bing, Yandex, Seznam, Naver and the other engines that share
 * it) which URLs of raheeqkanjo.com changed, so they recrawl without waiting.
 *
 * Run it only AFTER docs/ is published and live, because the engines fetch the
 * key file from the live site to check that the submission is ours:
 *
 *   node scripts/indexnow.mjs                 # every <loc> in docs/sitemap.xml
 *   node scripts/indexnow.mjs URL [URL ...]   # only these URLs
 *   node scripts/indexnow.mjs --dry-run       # print the request, send nothing
 *
 * The key is the 32-hex file in public/ (<key>.txt holding the key itself);
 * the snapshot copies it to docs/, so it is served at https://raheeqkanjo.com/<key>.txt.
 * Exit code is non-zero when the request fails. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "raheeqkanjo.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const keyFile = fs
  .readdirSync(path.join(ROOT, "public"))
  .find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("No IndexNow key file (32 hex characters + .txt) in public/.");
  process.exit(1);
}
const key = fs.readFileSync(path.join(ROOT, "public", keyFile), "utf8").trim();
if (`${key}.txt` !== keyFile) {
  console.error(`public/${keyFile} must contain exactly its own name without .txt.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
let urls = args.filter((a) => !a.startsWith("--"));
if (urls.length === 0) {
  const sitemap = fs.readFileSync(path.join(ROOT, "docs", "sitemap.xml"), "utf8");
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&")
  );
}
urls = [...new Set(urls)].filter((u) => {
  try {
    return new URL(u).host === HOST;
  } catch {
    return false;
  }
});
if (urls.length === 0) {
  console.error("No URLs on https://" + HOST + " to submit.");
  process.exit(1);
}

const body = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${keyFile}`,
  urlList: urls.slice(0, 10000),
};

if (dryRun) {
  console.log(`POST ${ENDPOINT}\n${JSON.stringify(body, null, 2)}`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
const text = await res.text().catch(() => "");
// 200 = accepted, 202 = accepted while the key is still being checked.
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow accepted ${body.urlList.length} URL(s) (HTTP ${res.status}).`);
} else {
  console.error(`IndexNow refused the submission: HTTP ${res.status} ${text}`.trim());
  process.exit(1);
}
