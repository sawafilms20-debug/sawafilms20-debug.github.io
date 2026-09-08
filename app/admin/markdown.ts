/* Markdown in, Markdown out — with HTML only in the middle.

   Articles are stored as Markdown, because that is what `marked` renders into
   the published page and what the three posts already in `content/blog/` are
   written in. None of that changes. What changes is that nobody has to type it:
   the editor seeds a contenteditable box from the Markdown and turns the box
   back into Markdown on every keystroke, so the writer sees a heading and the
   file keeps its `##`.

   The two directions are deliberately not symmetrical. `markdownToHtml` is
   permissive — it has to make sense of whatever a legacy file contains.
   `htmlToMarkdown` is strict: it knows six blocks and four inline marks, and
   anything else is unwrapped down to its words. That is what keeps a paste from
   Word out of the repository. */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c] ?? c);
}

function safeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href);
}

function inlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) =>
      safeHref(href) ? `<a href="${href}" target="_blank" rel="noopener">${text}</a>` : text
    );
}

/* Enough markdown to judge a draft by, and no dependency: headings, emphasis,
   links, lists, quotes, paragraphs. Everything is escaped first, so a stray
   angle bracket in the writing shows up as text instead of markup. */
export function markdownToHtml(src: string): string {
  const normalized = escapeHtml(src)
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,4}\s+.*)$/gm, "\n$1\n");

  return normalized
    .split(/\n{2,}/)
    .map((raw) => {
      const block = raw.trim();
      if (!block) return "";

      const heading = /^(#{1,4})\s+(.*)$/.exec(block);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${inlineMd(heading[2])}</h${level}>`;
      }

      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const li = lines.map((l) => `<li>${inlineMd(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("");
        return `<ul>${li}</ul>`;
      }
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
        const li = lines
          .map((l) => `<li>${inlineMd(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`)
          .join("");
        return `<ol>${li}</ol>`;
      }
      if (lines.every((l) => /^&gt;\s?/.test(l))) {
        return `<blockquote>${inlineMd(block.replace(/^&gt;\s?/gm, ""))}</blockquote>`;
      }
      return `<p>${inlineMd(lines.join("\n")).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

/* ------------------------------------------------------------- the other way */

/** Characters that would start markup if they survived into the file. */
function escapeMd(s: string): string {
  return s.replace(/([\\*_`[\]])/g, "\\$1");
}

/** …and the ones that only mean something at the head of a line — on every
 *  line of the block, not just the first: a hard break makes more of them. */
function escapeLineStart(s: string): string {
  return s.replace(
    /^(\s*)(#{1,6}\s|[-+>]\s|\d+[.)]\s)/gm,
    (_m, pad: string, mark: string) => `${pad}\\${mark}`
  );
}

const INLINE_WRAP: Record<string, string> = {
  STRONG: "**",
  B: "**",
  EM: "*",
  I: "*",
  CODE: "`",
};

function inline(node: Node): string {
  let out = "";
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      // A contenteditable is full of layout whitespace; newlines inside it are
      // never the writer's, they are the browser's pretty-printing.
      out += escapeMd((child.textContent || "").replace(/\s*\n\s*/g, " "));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as HTMLElement;

    if (el.tagName === "BR") {
      // Two trailing spaces is the one hard line break `marked` honours.
      out += "  \n";
      continue;
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      const [before, text, after] = split(inline(el));
      out += safeHref(href) && text ? `${before}[${text}](${href})${after}` : before + text + after;
      continue;
    }
    const wrap = INLINE_WRAP[el.tagName];
    const [before, text, after] = split(inline(el));
    // An empty pair of asterisks is markup with nothing to mark.
    out += wrap && text ? `${before}${wrap}${text}${wrap}${after}` : before + text + after;
  }
  return out;
}

/* Selecting a word in a browser usually takes the space after it too, and
   `**bold **` is not bold — CommonMark will not close a delimiter that sits
   behind whitespace, so it renders as four literal asterisks on the page. The
   spaces belong outside the marks. */
function split(text: string): [string, string, string] {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  return m ? [m[1], m[2], m[3]] : ["", text, ""];
}

function listBlock(el: HTMLElement, ordered: boolean): string {
  const items = Array.from(el.children).filter((c) => c.tagName === "LI");
  return items
    .map((li, i) => {
      const marker = ordered ? `${i + 1}. ` : "- ";
      // A nested list arrives as a UL inside the LI; its own lines are indented
      // rather than flattened, so the structure survives the round trip.
      const nested = Array.from(li.children).filter(
        (c) => c.tagName === "UL" || c.tagName === "OL"
      );
      const own = document.createElement("div");
      for (const c of Array.from(li.childNodes)) {
        if (c.nodeType === Node.ELEMENT_NODE && ["UL", "OL"].includes((c as HTMLElement).tagName)) {
          continue;
        }
        own.appendChild(c.cloneNode(true));
      }
      let line = marker + inline(own).trim();
      for (const n of nested) {
        const sub = listBlock(n as HTMLElement, n.tagName === "OL");
        line += "\n" + sub.replace(/^/gm, "  ");
      }
      return line;
    })
    .join("\n");
}

const BLOCKS = new Set([
  "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "BLOCKQUOTE",
]);

const hasBlockChild = (el: HTMLElement) =>
  Array.from(el.children).some((c) => BLOCKS.has(c.tagName));

/* Blocks nest, so reading them has to recurse.

   `insertUnorderedList` in Chrome does not replace the paragraph it was called
   on — it puts the list *inside* it, and the DOM comes back as `<p><ul>…`.
   Treating that P as one paragraph flattens the list into a run of words and
   loses it on save, which is why this walks into any block that contains
   another rather than assuming the box is one level deep. */
function walkBlocks(root: HTMLElement, blocks: string[]) {
  let loose = "";
  const flush = () => {
    // Trailing spaces are noise, except the pair that means a line break.
    const t = loose.replace(/[ \t]+$/gm, (m) => (m === "  " ? m : "")).trim();
    if (t) blocks.push(escapeLineStart(t));
    loose = "";
  };

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      loose += escapeMd((child.textContent || "").replace(/\s*\n\s*/g, " "));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as HTMLElement;
    const tag = el.tagName;

    if (tag === "BR") {
      loose += "  \n";
      continue;
    }
    if (!BLOCKS.has(tag)) {
      // `inline` walks a node's children, so an inline element that is itself
      // a direct child of a block needs a parent to be read from.
      loose += inline(wrapOne(el));
      continue;
    }

    flush();

    if (tag === "UL" || tag === "OL") {
      const md = listBlock(el, tag === "OL");
      if (md.trim()) blocks.push(md);
      continue;
    }
    if (tag === "BLOCKQUOTE") {
      const text = inline(el).trim();
      if (text) blocks.push(text.replace(/^/gm, "> "));
      continue;
    }
    if (/^H[1-6]$/.test(tag)) {
      const text = inline(el).trim();
      // The site's article body starts below an <h1> title, so the largest
      // heading the writer can place inside it is an h2.
      const level = Math.min(4, Math.max(2, Number(tag[1])));
      if (text) blocks.push(`${"#".repeat(level)} ${text}`);
      continue;
    }
    if (hasBlockChild(el)) walkBlocks(el, blocks);
    else {
      const text = inline(el).replace(/[ \t]+$/gm, (m) => (m === "  " ? m : "")).trim();
      if (text) blocks.push(escapeLineStart(text));
    }
  }
  flush();
}

/** The editor box's DOM, as the Markdown that will be committed to the repo. */
export function htmlToMarkdown(root: HTMLElement): string {
  const blocks: string[] = [];
  walkBlocks(root, blocks);
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** A single inline element that ended up as a direct child of a block. */
function wrapOne(el: HTMLElement): HTMLElement {
  const box = document.createElement("div");
  box.appendChild(el.cloneNode(true));
  return box;
}

/* ------------------------------------------------------------------ guard */

/* Markdown the visual editor cannot represent. Opening one of these in it and
   saving would quietly delete the construct, so the editor stays in text mode
   instead and says so. Everything the three existing posts use — headings,
   bullets, numbers, bold — is absent from this list on purpose. */
const UNSUPPORTED: { re: RegExp; what: string }[] = [
  { re: /^```/m, what: "كتلة شيفرة" },
  { re: /^ {0,3}\|.*\|/m, what: "جدول" },
  { re: /!\[[^\]]*\]\([^)]*\)/, what: "صورة داخل النص" },
  { re: /<\/?[a-zA-Z][^>]*>/, what: "وسم HTML" },
  { re: /^ {0,3}(\*\s*){3,}$|^ {0,3}(-\s*){3,}$|^ {0,3}(_\s*){3,}$/m, what: "خط فاصل" },
];

export function unsupportedMarkdown(src: string): string | null {
  for (const u of UNSUPPORTED) if (u.re.test(src)) return u.what;
  return null;
}
