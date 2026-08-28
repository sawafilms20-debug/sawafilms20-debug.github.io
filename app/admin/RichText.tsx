"use client";

import { useEffect, useRef } from "react";

/* A writing box for the handful of site strings that carry formatting.

   Those strings are stored as HTML, but the person editing them is a writer,
   not a developer. Showing her `<span class="hl-gold">…</span>` and asking her
   to keep it intact is not an editor, it is a hostage situation. So the markup
   is rendered, never typed: what she sees is the gold the site will show.

   The whole vocabulary across every field on the site is two ideas — a line
   break, and one emphasised run. Three different tags express that emphasis
   (`em` in section headings, `span.hl-gold` in hero lines, `b.choice-word`),
   but they all render as the same gold, and any given field only ever uses one.
   So there is no tag picker: the field tells the editor which one it uses, and
   the button just says «تمييز». */

/** The emphasis a field uses, derived from the wording the site ships with. */
export type Emphasis = { tag: "em" | "span" | "b"; className?: string };

export function emphasisOf(defaultHtml: string): Emphasis {
  if (/<span class="hl-gold"/.test(defaultHtml)) return { tag: "span", className: "hl-gold" };
  if (/<b class="choice-word"/.test(defaultHtml)) return { tag: "b", className: "choice-word" };
  if (/<b class="kw"/.test(defaultHtml)) return { tag: "b", className: "kw" };
  return { tag: "em" };
}

const ALLOWED = new Set(["EM", "BR", "SPAN", "B", "STRONG"]);
const ALLOWED_CLASSES = new Set(["hl-gold", "choice-word", "kw"]);

/** Keeps the formatting the site understands and drops everything else —
 *  fonts and colours pasted in from Word, stray divs, anything at all. */
export function sanitize(root: HTMLElement): string {
  const walk = (node: Node): string => {
    let out = "";
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += (child.textContent || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      if (el.tagName === "BR") {
        out += "<br/>";
        continue;
      }
      if (!ALLOWED.has(el.tagName)) {
        out += walk(el); // unwrap: keep the words, lose the wrapper
        continue;
      }
      const cls = (el.getAttribute("class") || "").trim();
      const keptClass = ALLOWED_CLASSES.has(cls) ? ` class="${cls}"` : "";
      // A bare span carries nothing; it is usually a paste artefact.
      if (el.tagName === "SPAN" && !keptClass) {
        out += walk(el);
        continue;
      }
      const tag = el.tagName.toLowerCase();
      out += `<${tag}${keptClass}>${walk(el)}</${tag}>`;
    }
    return out;
  };
  return walk(root).replace(/(<br\/>)+$/, "");
}

export function RichText({
  value,
  onChange,
  emphasis,
  ariaLabel,
}: {
  value: string;
  onChange: (html: string) => void;
  emphasis: Emphasis;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The box is uncontrolled once it has focus: rewriting innerHTML on every
  // keystroke would drop the caret to the start of the line on every letter.
  const lastEmitted = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (value === lastEmitted.current && el.innerHTML) return;
    el.innerHTML = value;
    lastEmitted.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const html = sanitize(el);
    lastEmitted.current = html;
    onChange(html);
  };

  const matches = (el: Element) =>
    el.tagName.toLowerCase() === emphasis.tag &&
    (emphasis.className ? el.classList.contains(emphasis.className) : !el.className);

  /** Wraps the selection in this field's emphasis, or unwraps it if it is
   *  already emphasised — one button, both directions. */
  const toggleEmphasis = () => {
    const el = ref.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;

    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== el) {
      if (node.nodeType === Node.ELEMENT_NODE && matches(node as Element)) {
        const found = node as HTMLElement;
        const parent = found.parentNode!;
        while (found.firstChild) parent.insertBefore(found.firstChild, found);
        parent.removeChild(found);
        emit();
        return;
      }
      node = node.parentNode;
    }

    if (range.collapsed) return;
    const wrapper = document.createElement(emphasis.tag);
    if (emphasis.className) wrapper.className = emphasis.className;
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    sel.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(wrapper);
    sel.addRange(after);
    emit();
  };

  return (
    <div className="adm-rt-wrap">
      <div className="adm-rt-bar">
        <button
          type="button"
          className="adm-rt-btn"
          onMouseDown={(e) => e.preventDefault()} // keep the selection alive
          onClick={toggleEmphasis}
          title="لون الكلمة المحددة بالذهبي، أو أزل اللون عنها"
        >
          تمييز
        </button>
        <span className="adm-rt-tip">حددي كلمة ثم «تمييز» · Enter لسطر جديد</span>
      </div>
      <div
        ref={ref}
        className="adm-rt"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        dir="rtl"
        onInput={emit}
        onBlur={emit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // A paragraph break would introduce a <div>; the site wants <br/>.
            e.preventDefault();
            document.execCommand("insertLineBreak");
            emit();
          }
        }}
        onPaste={(e) => {
          // Anything pasted arrives as words, never as someone else's markup.
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          emit();
        }}
      />
    </div>
  );
}
