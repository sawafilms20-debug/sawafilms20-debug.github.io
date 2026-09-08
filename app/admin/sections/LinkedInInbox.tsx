"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { rpc, RpcError } from "../rpc";
import { linkedInToArticle } from "@/lib/linkedin";
import { Dialog, EmptyState, Field, Loading, Segmented, slugify } from "../ui";
import { findSharesCsv, isZip } from "../zip";
import type { ConfirmFn } from "../types";

/* LinkedIn posts, waiting to become articles.
 *
 * Everything here exists because a server cannot read her LinkedIn. Fetching
 * the activity page answers HTTP 999 behind an auth wall, and the API scope
 * that returns a member's own posts (r_member_social) is granted to approved
 * partners only. So this screen is honest about being a paste box and a file
 * upload, and spends its effort on the part that IS worth automating: turning
 * a wall of LinkedIn plain text into a properly formatted draft. */

type Post = {
  id: number;
  postUrl: string | null;
  postedAt: string | null;
  text: string;
  source: "paste" | "archive";
  status: "new" | "converted" | "dismissed";
  articleId: number | null;
};

type Tab = "new" | "converted" | "dismissed";

const TABS: { value: Tab; label: string }[] = [
  { value: "new", label: "بانتظارك" },
  { value: "converted", label: "تحوّلت إلى مقالات" },
  { value: "dismissed", label: "مستبعدة" },
];

const isoDay = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ar", { dateStyle: "long" });
};

export default function LinkedInInbox({
  toast,
  confirm,
  onConverted,
  onCountChanged,
  openPasteOnMount,
}: {
  toast: (m: string, kind?: "ok" | "bad") => void;
  confirm: ConfirmFn;
  /** The queue's job ends at the draft; the blog list takes it from there. */
  onConverted: (articleId: number) => void;
  onCountChanged: (waiting: number) => void;
  /** Arrived from /admin#linkedin-paste — the bookmark that skips four taps. */
  openPasteOnMount?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("new");
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [nonce, setNonce] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [pasteOpen, setPasteOpen] = useState(!!openPasteOnMount);
  const [convert, setConvert] = useState<{ post: Post; slug: string; title: string } | null>(null);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rpc.linkedin
      .list<{ items: Post[]; counts: { new: number } }>({ status: tab })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        onCountChanged(r.counts.new);
        setErr("");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(e instanceof RpcError ? e.message : "تعذّر تحميل منشورات LinkedIn.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, nonce, onCountChanged]);

  const setStatus = async (post: Post, status: "new" | "dismissed") => {
    setBusyId(post.id);
    try {
      await rpc.linkedin.setStatus({ id: post.id, status });
      toast(status === "dismissed" ? "استُبعد المنشور" : "أُعيد إلى القائمة ✓");
      refresh();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تحديث المنشور.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post: Post) => {
    if (!(await confirm("حذف هذا المنشور من القائمة نهائيًا؟", { danger: true }))) return;
    setBusyId(post.id);
    try {
      await rpc.linkedin.remove({ id: post.id });
      refresh();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر الحذف.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const openConvert = (post: Post) => {
    const draft = linkedInToArticle(post.text);
    setConvert({ post, slug: slugify(draft.titleAr), title: draft.titleAr });
  };

  return (
    <>
      <p className="adm-note">
        LinkedIn لا يسمح لأي موقع بقراءة منشوراتك تلقائيًا — الوصول إلى منشورات حساب شخصي
        محجوز لشركاء معتمدين. الطريقان اللذان يعملان: الصقي المنشور هنا بعد نشره، أو ارفعي
        ملف <span dir="ltr">Shares.csv</span> من أرشيف بياناتك لتصل منشوراتك كلها دفعة واحدة.
      </p>

      <div className="adm-toolbar2">
        <Segmented<Tab>
          value={tab}
          options={TABS}
          onChange={setTab}
          ariaLabel="حالة منشورات LinkedIn"
        />
        <button className="btn btn-gold" onClick={() => setPasteOpen(true)}>
          ألصقي منشورًا
        </button>
      </div>

      {err && (
        <p className="adm-err" role="alert">
          {err}
        </p>
      )}

      {loading && !items.length ? (
        <Loading label="جارٍ تحميل المنشورات…" />
      ) : !items.length ? (
        tab === "new" ? (
          <EmptyState
            title="لا منشورات بانتظارك"
            body="بعد أن تنشري على LinkedIn، انسخي نص المنشور والصقيه هنا — تصلك مسوّدة مقال جاهزة للتعديل خلال ثوانٍ. أو ارفعي ملف Shares.csv من أرشيف LinkedIn لتصل منشوراتك السابقة كلها مرة واحدة."
            actionLabel="ألصقي منشورًا"
            onAction={() => setPasteOpen(true)}
          />
        ) : (
          <EmptyState
            title={tab === "converted" ? "لم يتحوّل أي منشور بعد" : "لا منشورات مستبعدة"}
            body={
              tab === "converted"
                ? "المنشورات التي تحوّلينها إلى مقالات تظهر هنا، مع رابط إلى المقال الذي صارت إليه."
                : "المنشور الذي تستبعدينه يبقى هنا، ويمكن إعادته إلى القائمة في أي وقت."
            }
            actionLabel="العودة إلى القائمة"
            onAction={() => setTab("new")}
          />
        )
      ) : (
        <div className="adm-list">
          {items.map((post) => {
            const draft = linkedInToArticle(post.text);
            return (
              <div className="adm-item adm-li-item" key={post.id}>
                <div className="adm-item-main">
                  <p className="adm-item-title">{draft.titleAr || "منشور بلا سطر أول"}</p>
                  <p className="adm-li-text" dir="auto">
                    {post.text}
                  </p>
                  <div className="adm-item-meta">
                    {post.postedAt && <span>{isoDay(post.postedAt)}</span>}
                    <span>{post.source === "archive" ? "من الأرشيف" : "ملصق"}</span>
                    {draft.tags.length > 0 && <span>{draft.tags.length} وسمًا</span>}
                    {post.postUrl && (
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
                        المنشور على LinkedIn ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="adm-item-actions">
                  {post.status === "converted" ? (
                    <button
                      className="adm-link"
                      onClick={() => post.articleId && onConverted(post.articleId)}
                      disabled={!post.articleId}
                    >
                      افتحي المقال
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-gold"
                        disabled={busyId === post.id}
                        onClick={() => openConvert(post)}
                      >
                        حوّليه إلى مقال
                      </button>
                      {post.status === "new" ? (
                        <button
                          className="adm-link"
                          disabled={busyId === post.id}
                          onClick={() => void setStatus(post, "dismissed")}
                        >
                          استبعاد
                        </button>
                      ) : (
                        <button
                          className="adm-link"
                          disabled={busyId === post.id}
                          onClick={() => void setStatus(post, "new")}
                        >
                          إعادة
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className="adm-link adm-danger"
                    disabled={busyId === post.id}
                    onClick={() => void remove(post)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        toast={toast}
        onDone={() => {
          setPasteOpen(false);
          setTab("new");
          refresh();
        }}
      />

      <ConvertDialog
        state={convert}
        onClose={() => setConvert(null)}
        toast={toast}
        onDone={(articleId) => {
          setConvert(null);
          refresh();
          onConverted(articleId);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------ paste + csv */

function PasteDialog({
  open,
  onClose,
  toast,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  toast: (m: string, kind?: "ok" | "bad") => void;
  onDone: () => void;
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

  // Shown live, so she can see the hook become a title before she commits.
  const preview = useMemo(() => (text.trim() ? linkedInToArticle(text) : null), [text]);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await rpc.linkedin.addPaste<{ added: boolean }>({
        text,
        ...(url.trim() ? { postUrl: url.trim() } : {}),
      });
      toast(r.added ? "أُضيف المنشور إلى القائمة ✓" : "هذا المنشور موجود في القائمة بالفعل.");
      onDone();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّرت الإضافة.", "bad");
    } finally {
      setBusy(false);
    }
  };

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

  const uploadCsv = async (file: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // LinkedIn emails a zip. Opening it here saves unzipping and then
      // finding one CSV among forty — which on a phone is most of the work.
      const csv = isZip(bytes)
        ? await findSharesCsv(bytes)
        : new TextDecoder().decode(bytes);
      const r = await rpc.linkedin.importArchive<{
        found: number;
        added: number;
        skipped: number;
      }>({ csv });
      toast(
        r.added
          ? `وصل ${r.added} منشورًا${r.skipped ? ` (${r.skipped} كانت موجودة)` : ""} ✓`
          : "كل المنشورات في هذا الملف موجودة عندك بالفعل."
      );
      onDone();
    } catch (e) {
      toast(
        e instanceof RpcError || e instanceof Error ? e.message : "تعذّرت قراءة الملف.",
        "bad"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="منشور من LinkedIn"
      width={760}
      footer={
        <>
          <button className="btn btn-gold" disabled={!text.trim() || busy} onClick={save}>
            {busy ? "جارٍ الحفظ…" : "أضيفيه إلى القائمة"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
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
          rows={12}
          value={text}
          placeholder="الصقي المنشور كما هو — بالإيموجي والهاشتاقات وكل شيء."
          onChange={(e) => setText(e.target.value)}
        />
      </Field>

      <Field label="رابط المنشور" hint="اختياري — يُستخدم لمنع تكرار المنشور نفسه مرتين.">
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
        <p className="adm-panel-title">أو استوردي منشوراتك كلها دفعة واحدة</p>
        <p className="adm-muted">
          من LinkedIn: <span dir="ltr">Settings &amp; Privacy → Data privacy → Get a copy of
          your data → Posts</span>. يصلك ملف مضغوط خلال دقائق — ارفعيه كما هو، دون فكّ
          الضغط؛ سأجد ملف المنشورات بداخله.
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
              if (f) void uploadCsv(f);
            }}
          />
        </label>
      </div>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- convert */

function ConvertDialog({
  state,
  onClose,
  toast,
  onDone,
}: {
  state: { post: Post; slug: string; title: string } | null;
  onClose: () => void;
  toast: (m: string, kind?: "ok" | "bad") => void;
  onDone: (articleId: number) => void;
}) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setSlug(state.slug);
    setTitle(state.title);
  }, [state]);

  const draft = useMemo(
    () => (state ? linkedInToArticle(state.post.text) : null),
    [state]
  );

  const go = async () => {
    if (!state || !draft) return;
    setBusy(true);
    try {
      const r = await rpc.linkedin.convert<{ article: { id: number } }>({
        id: state.post.id,
        slug: slug.trim(),
        titleAr: title.trim(),
        excerptAr: draft.excerptAr || null,
        bodyAr: draft.bodyAr,
        tags: draft.tags,
      });
      toast("أُنشئت المسودة — عدّليها ثم انشريها ✓");
      onDone(r.article.id);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر التحويل.", "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!state}
      onClose={onClose}
      title="تحويل المنشور إلى مقال"
      width={720}
      footer={
        <>
          <button
            className="btn btn-gold"
            disabled={busy || !title.trim() || !slug.trim()}
            onClick={go}
          >
            {busy ? "جارٍ الإنشاء…" : "أنشئي المسودة"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </>
      }
    >
      {draft && (
        <>
          <p className="adm-note">
            سيُنشأ المقال كمسودة — لن يظهر لأحد قبل أن تراجعيه وتضغطي «نشر على الموقع».
          </p>

          <Field label="عنوان المقال" required hint="السطر الأول من المنشور، ويمكنك تغييره.">
            <input dir="rtl" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="الرابط" required hint={`raheeqkanjo.com/blog/${slug || "…"}/`}>
            <input dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>

          {draft.tags.length > 0 && (
            <Field label="الوسوم" hint="أُخذت من هاشتاقات المنشور.">
              <p className="adm-item-meta">
                {draft.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </p>
            </Field>
          )}

          <Field label="نص المقال" hint="بعد التحويل من تنسيق LinkedIn — يمكنك تعديله كاملًا بعد الإنشاء.">
            <div className="adm-li-preview">
              <pre dir="auto">{draft.bodyAr}</pre>
            </div>
          </Field>
        </>
      )}
    </Dialog>
  );
}
