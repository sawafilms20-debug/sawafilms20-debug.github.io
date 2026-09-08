"use client";

import { useEffect, useMemo, useState } from "react";
import { rpc, RpcError } from "./rpc";
import { linkedInToArticle } from "@/lib/linkedin";
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

  useEffect(() => {
    if (open) {
      setText("");
      setUrl("");
    }
  }, [open]);

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

  const uploadArchive = async (file: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // LinkedIn emails a zip. Opening it here saves unzipping and then
      // finding one CSV among forty — which on a phone is most of the work.
      const csv = isZip(bytes) ? await findSharesCsv(bytes) : new TextDecoder().decode(bytes);
      const r = await rpc.linkedin.importArchive<{
        found: number;
        added: number;
        skipped: number;
      }>({ csv });
      toast(
        r.added
          ? `وصل ${r.added} منشورًا إلى قائمة LinkedIn${r.skipped ? ` (${r.skipped} كانت موجودة)` : ""} ✓`
          : "كل المنشورات في هذا الملف موجودة عندك بالفعل."
      );
      onQueued?.();
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
      title="منشور من LinkedIn"
      subtitle="يُحفظ كمسودة في مدونتك. لا يراه أحد قبل أن تنشريه."
      width={760}
      footer={
        <>
          <button className="btn btn-gold" disabled={!text.trim() || busy} onClick={saveAsDraft}>
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
        label="نص المنشور"
        required
        hint="افتحي منشورك على LinkedIn، حدّدي النص وانسخيه، ثم اضغطي الزر أعلاه."
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
          value={text}
          placeholder="الصقي المنشور كما هو — بالإيموجي والهاشتاقات وكل شيء."
          onChange={(e) => setText(e.target.value)}
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

      <div className="adm-li-archive">
        <p className="adm-panel-title">أو استوردي منشوراتك القديمة كلها</p>
        <p className="adm-muted">
          من LinkedIn: <span dir="ltr">Settings &amp; Privacy → Data privacy → Get a copy of your
          data → Posts</span>. يصلك ملف مضغوط خلال دقائق — ارفعيه كما هو، دون فكّ الضغط.
          تصل المنشورات إلى قائمة LinkedIn لا إلى المدونة، فتختارين منها ما يستحق أن يصير
          مقالًا.
        </p>
        <label className="btn btn-ghost adm-li-file">
          {busy ? "جارٍ القراءة…" : "اختاري الملف الذي وصلك"}
          <input
            type="file"
            accept=".zip,.csv,text/csv,application/zip"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Cleared so choosing the same file twice fires change again.
              e.target.value = "";
              if (f) void uploadArchive(f);
            }}
          />
        </label>
      </div>
    </Dialog>
  );
}
