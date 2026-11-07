/* Lets a plain `node` script import the app's TypeScript modules.
 *
 * Node strips TypeScript types natively, but it resolves imports the way the
 * browser does: `./email` is not `./email.ts`, and `@/lib/x` means nothing.
 * The app's modules are written for the Next/TypeScript resolver, so a script
 * that imports lib/siteGen.ts fails on its first extensionless import. This
 * maps both forms onto real files.
 *
 *   node --import ./scripts/ts-paths.mjs scripts/regen-blog.mjs */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTS = [".ts", ".tsx", ".mjs", ".js", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith("@/")) spec = pathToFileURL(path.join(ROOT, spec.slice(2))).href;

    const relative = spec.startsWith("./") || spec.startsWith("../");
    const fileish = relative || spec.startsWith("file:");
    if (fileish && !/\.[cm]?[jt]sx?$/.test(spec) && context.parentURL) {
      const base = new URL(spec, context.parentURL);
      for (const ext of EXTS) {
        const candidate = new URL(base.href + ext);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(spec, context);
  },
});
