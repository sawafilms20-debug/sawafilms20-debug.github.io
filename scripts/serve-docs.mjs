/* Serves docs/ the way GitHub Pages does, for previewing the published site.

   docs/ is what visitors actually get — the static snapshot, not the Next dev
   server — so this is the only way to check a publish, a selector in
   lib/pageRegistry.ts, or the site-content.js overlay against the real thing.

     npm run dev:docs          # PORT from the environment, else 4580

   The port comes from PORT because the preview harness assigns one; nothing
   here needs a fixed port. */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  "docs"
);
const PORT = Number(process.env.PORT) || 4580;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function resolveFile(urlPath) {
  // The path comes from the URL, so confine it to docs/ before touching disk.
  const requested = path.normalize(path.join(ROOT, decodeURIComponent(urlPath)));
  if (requested !== ROOT && !requested.startsWith(ROOT + path.sep)) return null;

  if (fs.existsSync(requested) && fs.statSync(requested).isDirectory()) {
    const index = path.join(requested, "index.html");
    return fs.existsSync(index) ? index : null;
  }
  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) return requested;

  const index = path.join(requested, "index.html");
  return fs.existsSync(index) ? index : null;
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const file = resolveFile(url.pathname);

    if (!file) {
      const notFound = path.join(ROOT, "404.html");
      if (fs.existsSync(notFound)) {
        res.writeHead(404, { "Content-Type": TYPES[".html"] });
        fs.createReadStream(notFound).pipe(res);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      // Always re-read: the point of this server is to see the newest snapshot.
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`docs/ served on http://localhost:${PORT}`);
  });
