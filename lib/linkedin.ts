/* Turning a LinkedIn post into an article.

   A LinkedIn post is plain text pretending to be formatted. There are no
   headings and no lists — there are lines that start with ✅, paragraphs made
   by pressing Enter, emphasis faked with Mathematical Alphanumeric Symbols,
   and a pile of hashtags at the bottom. Pasted straight into the blog it
   arrives as one long grey block with a row of hashes at the end.

   This reads those conventions back into real structure: the hook becomes the
   title, ✅ lines become a list, 𝗯𝗼𝗹𝗱 becomes **bold**, and the hashtags
   become tags instead of body text.

   Nothing here touches the network or the database — it is string in, string
   out, so the same conversion runs on the server when a post is converted and
   in the browser to show the preview beside it. */

/* ------------------------------------------------------------- unicode */

/* LinkedIn has no bold button, so writers paste 𝗠𝗮𝘁𝗵𝗲𝗺𝗮𝘁𝗶𝗰𝗮𝗹 𝗔𝗹𝗽𝗵𝗮𝗻𝘂𝗺𝗲𝗿𝗶𝗰
   𝗦𝘆𝗺𝗯𝗼𝗹𝘀 from a generator. They look like letters and are not: a search
   engine cannot read them, a screen reader says "mathematical bold small a",
   and copying one into a heading breaks the font. Every one of them is
   converted back to a real letter — and the runs that were bold are wrapped in
   ** so the emphasis survives the trip rather than being flattened away. */
const BOLD_RANGES: [number, number][] = [
  [0x1d400, 0x1d433], // bold serif
  [0x1d468, 0x1d49b], // bold italic serif
  [0x1d5d4, 0x1d607], // bold sans-serif
  [0x1d63c, 0x1d66f], // bold italic sans-serif
  [0x1d7ce, 0x1d7d7], // bold digits
  [0x1d7ec, 0x1d7f5], // bold sans-serif digits
];

const isBoldCodepoint = (cp: number) => BOLD_RANGES.some(([a, b]) => cp >= a && cp <= b);

/** One decorated character as the plain character it is imitating. */
function plainChar(ch: string): string {
  // NFKC carries the <font> decomposition these blocks were defined with, so
  // it already knows 𝗔 is A. Applied to the whole string it would also expand
  // ligatures and Arabic presentation forms, which is why it is applied one
  // character at a time, only to the blocks in question.
  const plain = ch.normalize("NFKC");
  return plain.length ? plain : ch;
}

export function normalizeFancyText(input: string): string {
  let out = "";
  let boldRun = "";

  const flush = () => {
    if (boldRun) {
      out += `**${boldRun}**`;
      boldRun = "";
    }
  };

  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    const decorated = cp >= 0x1d400 && cp <= 0x1d7ff;

    if (decorated && isBoldCodepoint(cp)) {
      boldRun += plainChar(ch);
      continue;
    }
    // A space inside a bold run keeps the run alive; anything else ends it.
    if (boldRun && ch === " ") {
      boldRun += ch;
      continue;
    }
    flush();
    out += decorated ? plainChar(ch) : ch;
  }
  flush();

  // A run that ended on a space would close the marks behind whitespace, and
  // `**bold **` is not bold in CommonMark — it is four literal asterisks.
  return out.replace(/\*\*(\s*)([\s\S]*?)(\s*)\*\*/g, (m, a, mid, b) =>
    mid ? `${a}**${mid}**${b}` : `${a}${b}`
  );
}

/* ------------------------------------------------------------- hashtags */

// Arabic hashtags use _ between words, since a space would end the tag.
const HASHTAG = /#[\p{L}\p{N}_؀-ۿ]+/gu;
const ONLY_HASHTAGS = /^\s*(?:#[\p{L}\p{N}_؀-ۿ]+[\s،,]*)+$/u;

const cleanTag = (t: string) => t.replace(/^#/, "").replace(/_/g, " ").trim();

/* ------------------------------------------------------------- markdown */

const URL_RE = /https?:\/\/\S+|www\.\S+/gi;

/** Escapes what would otherwise become markup — but never inside a URL, where
 *  a backslash would break the link. */
function escapeOutsideUrls(line: string): string {
  const parts: string[] = [];
  let last = 0;
  for (const m of line.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    parts.push(escapeMd(line.slice(last, start)), m[0]);
    last = start + m[0].length;
  }
  parts.push(escapeMd(line.slice(last)));
  return parts.join("");
}

function escapeMd(s: string): string {
  // ** is produced deliberately by normalizeFancyText above, so a lone
  // asterisk is escaped but a pair is left to mean what it says.
  return s
    .replace(/([\\_`[\]])/g, "\\$1")
    .replace(/(?<!\*)\*(?!\*)/g, "\\*");
}

/* Bullets, as LinkedIn writes them: a hyphen, a real bullet, or — far more
   often — an emoji doing a bullet's job at the head of the line. */
const BULLET =
  /^\s*(?:[-–—•·▪️*]|[\u{1F300}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]+)\s+/u;
const NUMBERED = /^\s*(?:\d+|[٠-٩]+)\s*[.)\-–]\s+/u;

const stripLeadingDecoration = (s: string) =>
  s
    .replace(
      /^[\s\u{1F300}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]+/u,
      ""
    )
    .trim();

/* ------------------------------------------------------------- the shape */

export type ConvertedPost = {
  /** The hook line, cleaned up — the article's title. */
  titleAr: string;
  /** The opening lines, for the blog index and the search result. */
  excerptAr: string;
  /** The rest, as Markdown. */
  bodyAr: string;
  /** Hashtags, without the # and with underscores read as spaces. */
  tags: string[];
};

/** A title is one line, so a hook that runs on gets cut at its first stop. */
function titleFrom(line: string): string {
  const clean = stripLeadingDecoration(line)
    // The title is escaped into an <h1>, never parsed as markdown — so the **
    // that normalizeFancyText produced for a bold hook would print as four
    // literal asterisks on the published page.
    .replace(/\*\*|__/g, "")
    .replace(/\\([\\*_`[\]])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= 100) return clean.replace(/[:：]\s*$/, "");

  const stop = clean.search(/[.؟?!…]\s/);
  if (stop > 20 && stop < 100) return clean.slice(0, stop + 1).trim();

  // No sentence break to cut at — fall back to the last word inside the limit.
  const cut = clean.slice(0, 100);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).trim() + "…";
}

function excerptFrom(body: string): string {
  const first = body
    .split(/\n{2,}/)
    .map((b) => b.replace(/^[#>\-*\d.)\s]+/, "").replace(/\s+/g, " ").trim())
    .find((b) => b.length > 0);
  if (!first) return "";
  if (first.length <= 200) return first;
  const cut = first.slice(0, 200);
  const space = cut.lastIndexOf(" ");
  return (space > 80 ? cut.slice(0, space) : cut).trim() + "…";
}

/**
 * Reads one LinkedIn post and returns the article it wants to be.
 *
 * Deliberately lossless in one direction only: everything in the post reaches
 * the draft somewhere. Nothing is dropped silently — hashtags move to `tags`
 * rather than disappearing, and the hook moves to the title rather than being
 * repeated as the first paragraph under itself.
 */
export function linkedInToArticle(raw: string): ConvertedPost {
  const text = normalizeFancyText(String(raw || ""))
    .replace(/\r\n?/g, "\n")
    // A no-break space typed by a phone keyboard is still a space.
    .replace(/[  ]/g, " ")
    .replace(/[ \t]+$/gm, "");

  const lines = text.split("\n");

  /* Hashtags first: they sit at the bottom, and pulling them out before the
     body is split stops a trailing hashtag line from becoming a paragraph. */
  const tags: string[] = [];
  let end = lines.length;
  while (end > 0) {
    const line = lines[end - 1];
    if (!line.trim()) {
      end--;
      continue;
    }
    if (!ONLY_HASHTAGS.test(line)) break;
    // The lines are walked bottom-up, so this line's tags go in front as a
    // group — pushing them one at a time would reverse each line.
    tags.unshift(...[...line.matchAll(HASHTAG)].map((m) => cleanTag(m[0])));
    end--;
  }
  const kept = lines.slice(0, end);

  // Hashtags trailing the final sentence, e.g. "…نكتب. #كتابة #محتوى"
  for (let i = kept.length - 1; i >= 0; i--) {
    if (!kept[i].trim()) continue;
    const trail = /((?:\s*#[\p{L}\p{N}_؀-ۿ]+){2,})\s*$/u.exec(kept[i]);
    if (trail) {
      for (const m of trail[1].matchAll(HASHTAG)) tags.push(cleanTag(m[0]));
      kept[i] = kept[i].slice(0, trail.index).trimEnd();
    }
    break;
  }

  const firstIdx = kept.findIndex((l) => l.trim());
  const titleAr = firstIdx === -1 ? "" : titleFrom(kept[firstIdx]);
  const rest = firstIdx === -1 ? [] : kept.slice(firstIdx + 1);

  /* Blocks are separated by blank lines. Inside a block LinkedIn's single
     newlines are the writer's own line breaks, so they stay as breaks rather
     than being reflowed into one paragraph. */
  const blocks: string[] = [];
  let current: string[] = [];
  const flushBlock = () => {
    if (!current.length) return;
    blocks.push(renderBlock(current));
    current = [];
  };

  for (const line of rest) {
    if (!line.trim()) flushBlock();
    else current.push(line);
  }
  flushBlock();

  const bodyAr = blocks.filter(Boolean).join("\n\n").trim();

  return {
    titleAr,
    excerptAr: excerptFrom(bodyAr),
    bodyAr,
    // Same tag twice in one post is common; the order it was written in is kept.
    tags: [...new Set(tags.filter(Boolean))].slice(0, 20),
  };
}

/** The run of list items at the end of a block, and whatever led into them.
 *
 *  A LinkedIn list almost never starts the block. It is introduced —
 *  "الكتابة الجيدة ثلاثة أشياء:" — and the items follow. Requiring the whole
 *  block to be items missed every real list and left the ✅ marks as body text. */
function trailingRun(lines: string[], re: RegExp): { lead: string[]; run: string[] } {
  let i = lines.length;
  while (i > 0 && re.test(lines[i - 1])) i--;
  return { lead: lines.slice(0, i), run: lines.slice(i) };
}

// Two trailing spaces is the one hard break `marked` honours, and it is what
// the article editor round-trips.
const paragraph = (lines: string[]) =>
  lines.map((l) => escapeOutsideUrls(l.trim())).join("  \n");

function renderBlock(lines: string[]): string {
  const meaningful = lines.filter((l) => l.trim());
  if (!meaningful.length) return "";

  for (const [re, marker] of [
    [BULLET, null],
    [NUMBERED, "n"],
  ] as [RegExp, string | null][]) {
    const { lead, run } = trailingRun(meaningful, re);
    // One line is punctuation or a stray dash, not a list.
    if (run.length < 2) continue;
    const items = run.map((l, i) =>
      marker
        ? `${i + 1}. ${escapeOutsideUrls(l.replace(re, "").trim())}`
        : `- ${escapeOutsideUrls(l.replace(re, "").trim())}`
    );
    // The lead-in is its own paragraph; a blank line between the two is what
    // makes the list a list rather than a continuation of the sentence.
    return lead.length ? `${paragraph(lead)}\n\n${items.join("\n")}` : items.join("\n");
  }

  return paragraph(meaningful);
}

/* ------------------------------------------------------- the CSV archive */

export type ShareRow = {
  date: string | null;
  url: string | null;
  text: string;
  sharedUrl: string | null;
  mediaUrl: string | null;
  visibility: string | null;
};

/* A real parser rather than split(","): every field that matters here — the
   post text — contains commas, quotation marks and newlines, and a naive split
   turns one post into nine broken rows. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/**
 * Reads `Shares.csv` from a LinkedIn data export.
 *
 * Columns are matched by their header name, not their position: the export's
 * column order has changed before and would otherwise silently import the
 * visibility column as the post text.
 */
export function parseSharesCsv(csv: string): ShareRow[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const at = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const iDate = at("date");
  const iLink = at("sharelink", "link", "url");
  const iText = at("sharecommentary", "commentary", "text", "content");
  const iShared = at("sharedurl");
  const iMedia = at("mediaurl");
  const iVis = at("visibility");

  if (iText === -1) return [];

  const cell = (r: string[], i: number) => (i === -1 ? null : (r[i] ?? "").trim() || null);

  return rows
    .slice(1)
    .map((r) => ({
      date: cell(r, iDate),
      url: cell(r, iLink),
      text: (r[iText] ?? "").trim(),
      sharedUrl: cell(r, iShared),
      mediaUrl: cell(r, iMedia),
      visibility: cell(r, iVis),
    }))
    // A share with no words of its own is a reshare of someone else's post.
    // It is not hers to republish, so it never reaches the queue.
    .filter((r) => r.text.length > 0);
}
