"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { escapeHtml, htmlToMarkdown, markdownToHtml, unsupportedMarkdown } from "./markdown";

/* The article body, written the way it will read.

   The file on disk stays Markdown — `marked` renders it into the published
   page, and the posts already in the repository are written in it. But a
   writer should not have to type `##` to get a heading, any more than she
   should have to type `<span class="hl-gold">` to get a gold word. So the
   Markdown is rendered into a contenteditable box, the buttons act on the
   rendering, and every keystroke turns the box back into Markdown.

   The text mode is not a power-user feature. It is the honest answer for a
   post containing something this editor cannot draw — a table, a code block,
   an image — where showing a visual editor would mean silently deleting it on
   the next save. */

type Mode = "rich" | "markdown";

type Block = "p" | "h2" | "h3";

/** The block the caret is inside, so the toolbar can show what is already on. */
function currentBlock(root: HTMLElement): Block | "ul" | "ol" | "quote" | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
  if (!root.contains(node)) return null;
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName;
      // The immediate parent, not the nearest ancestor: a bulleted list nested
      // inside a numbered one is still a bulleted list.
      if (tag === "LI") {
        return (node as HTMLElement).parentElement?.tagName === "OL" ? "ol" : "ul";
      }
      if (tag === "BLOCKQUOTE") return "quote";
      if (tag === "H2") return "h2";
      if (tag === "H3") return "h3";
      if (tag === "P" || tag === "DIV") return "p";
    }
    node = node.parentNode;
  }
  return null;
}

export function ArticleEditor({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (markdown: string) => void;
  ariaLabel: string;
}) {
  /* Read once, from the article as it arrived. Re-deciding on every keystroke
     would yank the writer into text mode mid-sentence the moment her own
     typing happened to look like a construct — the caller remounts this
     component per article, which is when the question is worth asking. */
  const opened = useRef(value);
  const blocked = useMemo(() => unsupportedMarkdown(opened.current), []);
  const [mode, setMode] = useState<Mode>(blocked ? "markdown" : "rich");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [active, setActive] = useState<ReturnType<typeof currentBlock>>(null);
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  // Uncontrolled while focused: reseeding innerHTML on every keystroke would
  // throw the caret back to the top of the article on every letter.
  const lastEmitted = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (mode !== "rich" || !el) return;
    if (document.activeElement === el) return;
    if (value === lastEmitted.current && el.innerHTML) return;
    el.innerHTML = markdownToHtml(value) || "<p><br/></p>";
    lastEmitted.current = value;
  }, [value, mode]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const md = htmlToMarkdown(el);
    lastEmitted.current = md;
    onChange(md);
  };

  /* execCommand is deprecated and universally implemented; a block editor
     written from scratch would be a larger surface to get wrong than this.

     It does need tidying after, though: the list commands build the list
     inside the paragraph they were called on instead of replacing it, and a
     `<p><ul>` is not something to leave in a document. The converter copes
     with it either way; this keeps the DOM honest. */
  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    const box = ref.current;
    if (box) {
      for (const list of Array.from(box.querySelectorAll("p > ul, p > ol"))) {
        const p = list.parentElement;
        // Only when the list is all the paragraph holds — otherwise unwrapping
        // it would drop a paragraph that still has words of its own.
        if (p && p !== box && p.childNodes.length === 1) p.replaceWith(list);
      }
    }
    setActive(box ? currentBlock(box) : null);
    emit();
  };

  const setBlock = (tag: Block) => exec("formatBlock", `<${tag}>`);

  const openLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    if (!ref.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
    savedRange.current = sel.getRangeAt(0).cloneRange();
    setLinkUrl("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    const range = savedRange.current;
    setLinkOpen(false);
    if (!url || !range) return;
    const href = /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : `https://${url}`;
    // The selection died when focus moved to the URL box; put it back first.
    ref.current?.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand("createLink", false, href);
    emit();
  };

  const trackCaret = () => setActive(ref.current ? currentBlock(ref.current) : null);

  if (mode === "markdown") {
    return (
      <div className="adm-ed">
        <div className="adm-ed-bar">
          <span className="adm-ed-note">
            {blocked
              ? `هذا المقال يحتوي على ${blocked}، والمحرّر المرئي لا يعرضه — التحرير هنا بالنص الخام حتى لا يُحذف.`
              : "التحرير بالنص الخام (Markdown)."}
          </span>
          {!blocked && (
            <button type="button" className="adm-ed-btn" onClick={() => setMode("rich")}>
              العودة إلى المحرّر
            </button>
          )}
        </div>
        <textarea
          dir="rtl"
          rows={20}
          value={value}
          aria-label={ariaLabel}
          placeholder="## عنوان فرعي&#10;&#10;اكتبي هنا…"
          onChange={(e) => {
            lastEmitted.current = e.target.value;
            onChange(e.target.value);
          }}
        />
      </div>
    );
  }

  return (
    <div className="adm-ed">
      <div className="adm-ed-bar" role="toolbar" aria-label="تنسيق النص">
        <Tool on={active === "p"} onClick={() => setBlock("p")} title="فقرة عادية">
          نص
        </Tool>
        <Tool on={active === "h2"} onClick={() => setBlock("h2")} title="عنوان فرعي">
          عنوان
        </Tool>
        <Tool on={active === "h3"} onClick={() => setBlock("h3")} title="عنوان أصغر تحت العنوان الفرعي">
          عنوان أصغر
        </Tool>
        <i className="adm-ed-sep" aria-hidden="true" />
        <Tool onClick={() => exec("bold")} title="عريض">
          <b>عريض</b>
        </Tool>
        <Tool onClick={() => exec("italic")} title="مائل">
          <i>مائل</i>
        </Tool>
        <i className="adm-ed-sep" aria-hidden="true" />
        <Tool
          on={active === "ul"}
          onClick={() => exec("insertUnorderedList")}
          title="قائمة بنقاط"
        >
          نقاط
        </Tool>
        <Tool
          on={active === "ol"}
          onClick={() => exec("insertOrderedList")}
          title="قائمة مرقّمة"
        >
          ترقيم
        </Tool>
        <Tool
          on={active === "quote"}
          onClick={() => exec("formatBlock", "<blockquote>")}
          title="اقتباس"
        >
          اقتباس
        </Tool>
        <Tool onClick={openLink} title="حوّلي الكلمات المحددة إلى رابط">
          رابط
        </Tool>
        <button
          type="button"
          className="adm-ed-plain"
          onClick={() => setMode("markdown")}
          title="تحرير النص الخام"
        >
          نص خام
        </button>
      </div>

      {linkOpen && (
        <div className="adm-ed-link">
          <input
            dir="ltr"
            autoFocus
            value={linkUrl}
            placeholder="https://…"
            aria-label="عنوان الرابط"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                setLinkOpen(false);
              }
            }}
          />
          <button type="button" className="adm-ed-btn" onClick={applyLink}>
            إضافة
          </button>
          <button type="button" className="adm-ed-plain" onClick={() => setLinkOpen(false)}>
            إلغاء
          </button>
        </div>
      )}

      <div
        ref={ref}
        className="adm-ed-box"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        dir="rtl"
        onInput={emit}
        onBlur={emit}
        onKeyUp={trackCaret}
        onMouseUp={trackCaret}
        onFocus={trackCaret}
        onPaste={(e) => {
          /* Anything pasted arrives as words. Word and Google Docs carry fonts,
             colours and their own class names; letting those through would put
             someone else's markup into the repository. The blank lines survive,
             because that is the structure of what was copied. */
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          const html = text
            .split(/\n{2,}/)
            .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
            .join("");
          document.execCommand("insertHTML", false, html);
          emit();
        }}
      />
    </div>
  );
}

function Tool({
  children,
  onClick,
  title,
  on,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  on?: boolean;
}) {
  return (
    <button
      type="button"
      className={`adm-ed-btn ${on ? "on" : ""}`}
      title={title}
      aria-pressed={on}
      // Keeps the selection alive: the caret must survive the click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
