"use client";

import { useEffect, useMemo, useState } from "react";
import { rpc, RpcError } from "./rpc";
import { linkedInPostUrl, linkedInToArticle } from "@/lib/linkedin";
import { Dialog, Field } from "./ui";
import { findSharesCsv, isZip } from "./zip";

/* Paste a LinkedIn post, get a draft.
 *
 * The first version of this put the post in a queue and asked for a second
 * click to turn it into an article. That was a step nobody asked for: the
 * request was "paste it on the website, keep it as a draft for me to edit and
 * publish", and a queue is not a draft. So the button that says «احفظيه
 * كمسودة» writes the article and opens the editor on it, and the queue is
 * demoted to what it is actually for — the archive import, where two hundred
 * posts arriving as two hundred drafts would bury the blog.
 *
 * Reachable from the blog list as well as the LinkedIn tab, so the queue is
 * something she can go her whole life without opening. */

export function LinkedInPasteDialog({
  open,
  onClose,
  toast,
  /** A draft now exists; take her to it. */
  onDrafted,
  /** Queued instead, for later. */
  onQueued,
}: {
  open: boolean;
  onClose: () => void;
  toast: (m: string, kind?: "ok" | "bad") => void;
  onDrafted: (articleId: number) => void;
  onQueued?: () => void;
}) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (open) {
      setText("");
      setUrl("");
      setTruncated(false);
    }
  }, [open]);

  /* A link is one tap on LinkedIn — «…» then Copy link to post — where copying
     the whole post is a select-and-drag. The server reads the text off the
     post's own public page, so this needs nothing from her browser. */
  const readFromUrl = async (link: string) => {
    setFetching(true);
    setTruncated(false);
    try {
      const r = await rpc.linkedin.readPost<{
        text: string;
        truncated: boolean;
        postUrl: string;
      }>({ url: link });
      setText(r.text);
      setUrl(r.postUrl);
      setTruncated(r.truncated);
      if (r.truncated) {
        toast("وصل النص مقطوعًا — راجعيه، أو الصقي المنشور كاملًا بدل الرابط.", "bad");
      }
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّرت قراءة المنشور.", "bad");
    } finally {
      setFetching(false);
    }
  };

  // Shown live, so she sees the hook become a title before she commits.
  const preview = useMemo(() => (text.trim() ? linkedInToArticle(text) : null), [text]);

  /* One click instead of "find the box, then press ⌘V". Reading the clipboard
     needs a user gesture, which this is; Firefox refuses outright, so the
     failure says what to do rather than what went wrong. */
  const fromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        toast("الحافظة فارغة — انسخي المنشور من LinkedIn أولًا.", "bad");
        return;
      }
      // A bare link is the fast path: read the post rather than storing a URL
      // as if it were the article.
      if (linkedInPostUrl(clip)) {
        await readFromUrl(clip);
        return;
      }
      setText(clip);
    } catch {
      toast("متصفحك لا يسمح بالقراءة من الحافظة. الصقي داخل الصندوق بـ ⌘V.", "bad");
    }
  };

  const saveAsDraft = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await rpc.linkedin.pasteAsDraft<{
        article: { id: number; titleAr: string };
        created: boolean;
      }>({ text, ...(url.trim() ? { postUrl: url.trim() } : {}) });
      toast(
        r.created
          ? "صار مسودة في مدونتك — عدّليه ثم انشريه ✓"
          : "هذا المنشور صار مسودة من قبل؛ ها هي."
      );
      onDrafted(r.article.id);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر الحفظ.", "bad");
    } finally {
      setBusy(false);
    }
  };

  const queueForLater = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await rpc.linkedin.addPaste<{ added: boolean }>({
        text,
        ...(url.trim() ? { postUrl: url.trim() } : {}),
      });
      toast(r.added ? "حُفظ في قائمة LinkedIn ✓" : "هذا المنشور في القائمة بالفعل.");
      onQueued?.();
      onClose();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّرت الإضافة.", "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="منشور من LinkedIn"
      subtitle="يُحفظ كمسودة في مدونتك. لا يراه أحد قبل أن تنشريه."
      width={760}
      footer={
        <>
          <button
            className="btn btn-gold"
            disabled={!text.trim() || busy || fetching}
            onClick={saveAsDraft}
          >
            {busy ? "جارٍ الحفظ…" : "احفظيه كمسودة"}
          </button>
          <button className="adm-link" disabled={!text.trim() || busy} onClick={queueForLater}>
            أو احفظيه في القائمة لوقت لاحق
          </button>
          <button className="btn btn-ghost" onClick={onClose} style={{ marginInlineStart: "auto" }}>
            إلغاء
          </button>
        </>
      }
    >
      <Field
        label="المنشور"
        required
        hint="على LinkedIn: «…» فوق المنشور ثم Copy link to post، والصقي الرابط هنا — أقرأ النص بنفسي. أو الصقي النص كاملًا إن فضّلتِ."
      >
        <div className="adm-ed-bar">
          <button type="button" className="adm-ed-btn" onClick={fromClipboard}>
            الصقي ما نسختِه
          </button>
          <span className="adm-ed-note">
            أو الصقي داخل الصندوق مباشرة بـ <span dir="ltr">⌘V</span>
          </span>
        </div>
        <textarea
          dir="rtl"
          rows={11}
          value={fetching ? "جارٍ قراءة المنشور من LinkedIn…" : text}
          disabled={fetching}
          placeholder="الصقي رابط المنشور — أو المنشور كاملًا بالإيموجي والهاشتاقات."
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            setTruncated(false);
            // Pasted a link and nothing else: fetch it instead of keeping it.
            if (linkedInPostUrl(v)) void readFromUrl(v);
          }}
        />
      </Field>

      <Field label="رابط المنشور" hint="اختياري — يمنع حفظ المنشور نفسه مرتين.">
        <input
          dir="ltr"
          value={url}
          placeholder="https://www.linkedin.com/posts/…"
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>

      {truncated && (
        <p className="adm-err" role="alert">
          LinkedIn أعطى مقتطفًا لا المنشور كاملًا. راجعي النص أعلاه قبل الحفظ، أو انسخي
          المنشور بنفسك والصقيه بدل الرابط.
        </p>
      )}

      {preview && (
        <div className="adm-li-preview">
          <p className="adm-panel-title">هكذا سيصل إلى المدونة</p>
          <h3>{preview.titleAr}</h3>
          <pre dir="auto">{preview.bodyAr}</pre>
          {preview.tags.length > 0 && (
            <p className="adm-item-meta">
              {preview.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
          )}
        </div>
      )}

    </Dialog>
  );
}

/* The archive import, on its own.
 *
 * It used to be a section at the bottom of the paste dialog, which meant the
 * only way to find "import everything I have ever written" was to open the box
 * for pasting one post. Asked where the archive was, the honest answer was
 * "hidden inside another button" — so it is a button of its own now. */
export function LinkedInArchiveDialog({
  open,
  onClose,
  toast,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  toast: (m: string, kind?: "ok" | "bad") => void;
  onImported: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // LinkedIn emails a zip of forty-odd CSVs. Opening it here saves
      // unzipping and then finding one file among them — which on a phone is
      // most of the work.
      const csv = isZip(bytes) ? await findSharesCsv(bytes) : new TextDecoder().decode(bytes);
      const r = await rpc.linkedin.importArchive<{
        found: number;
        added: number;
        skipped: number;
      }>({ csv });
      toast(
        r.added
          ? `وصل ${r.added} منشورًا${r.skipped ? ` (${r.skipped} كانت عندك)` : ""} ✓`
          : "كل المنشورات في هذا الملف موجودة عندك بالفعل."
      );
      onImported();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت قراءة الملف.", "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="استيراد أرشيف LinkedIn"
      subtitle="كل ما نشرتِه على LinkedIn، دفعة واحدة."
      width={640}
      footer={
        <button className="btn btn-ghost" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <ol className="adm-steps-list">
        <li>
          على LinkedIn، افتحي{" "}
          <span dir="ltr">Settings &amp; Privacy → Data privacy → Get a copy of your data</span>.
        </li>
        <li>
          اختاري <b>Posts</b> ثم اطلبي الأرشيف.
        </li>
        <li>يصلك بريد فيه ملف مضغوط خلال دقائق (وقد يستغرق حتى يوم).</li>
        <li>
          ارفعيه هنا <b>كما هو</b> — دون فكّ الضغط، ودون البحث عن ملف بداخله.
        </li>
      </ol>

      <label className="btn btn-gold adm-li-file" style={{ marginTop: 4 }}>
        {busy ? "جارٍ القراءة…" : "اختاري الملف الذي وصلك"}
        <input
          type="file"
          accept=".zip,.csv,text/csv,application/zip"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            // Cleared so choosing the same file twice fires change again.
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
      </label>

      <p className="adm-note" style={{ marginTop: 16 }}>
        منشورات الأرشيف تصل إلى قائمة «بانتظارك»، لا إلى المدونة — لأن مئتي منشور قديم لا
        يجب أن تصير مئتي مسودة. تختارين منها ما يستحق أن يصير مقالًا. ورفع أرشيف أحدث لاحقًا
        يضيف الجديد فقط.
      </p>
    </Dialog>
  );
}
