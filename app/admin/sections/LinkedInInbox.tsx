"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { rpc, RpcError } from "../rpc";
import { linkedInToArticle } from "@/lib/linkedin";
import { Dialog, EmptyState, Field, Loading, Segmented, slugify } from "../ui";
import { LinkedInArchiveDialog, LinkedInPasteDialog } from "../LinkedInPaste";
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
}: {
  toast: (m: string, kind?: "ok" | "bad") => void;
  confirm: ConfirmFn;
  /** The queue's job ends at the draft; the blog list takes it from there. */
  onConverted: (articleId: number) => void;
  onCountChanged: (waiting: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("new");
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [nonce, setNonce] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
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
        هذه قائمة انتظار، لا المدونة. المنشور الذي تلصقينه يصير مسودة في المدونة مباشرة؛
        ما يصل إلى هنا هو ما استوردتِه من أرشيف LinkedIn، لتختاري منه ما يستحق أن يصير
        مقالًا. (LinkedIn لا يسمح لأي موقع بقراءة منشورات حساب شخصي تلقائيًا — الوصول محجوز
        لشركاء معتمدين.)
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
        {/* Was a section at the bottom of the paste dialog. Asked where the
            archive was, the honest answer was "inside another button". */}
        <button className="btn btn-ghost" onClick={() => setArchiveOpen(true)}>
          استوردي أرشيف LinkedIn
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
            body="المنشور الذي تلصقينه يصير مسودة في المدونة فورًا، فلا يمر من هنا. تمتلئ هذه القائمة حين ترفعين أرشيف LinkedIn — منشوراتك القديمة كلها — لتختاري منها ما يصير مقالًا."
            actionLabel="استوردي أرشيف LinkedIn"
            onAction={() => setArchiveOpen(true)}
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

      <LinkedInArchiveDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        toast={toast}
        onImported={() => {
          setTab("new");
          refresh();
        }}
      />

      <LinkedInPasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        toast={toast}
        onDrafted={(articleId) => {
          setPasteOpen(false);
          onConverted(articleId);
        }}
        onQueued={() => {
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
