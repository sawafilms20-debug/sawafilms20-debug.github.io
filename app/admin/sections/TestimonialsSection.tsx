"use client";

import { useEffect, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import {
  BilingualField,
  DragList,
  Dialog,
  EmptyState,
  Field,
  Loading,
  Toggle,
} from "../ui";
import { ImageField } from "../MediaPicker";
import { IconTrash } from "../icons";

type Testimonial = {
  id: number;
  quoteAr: string;
  quoteEn: string | null;
  authorName: string;
  authorTitleAr: string | null;
  authorTitleEn: string | null;
  company: string | null;
  authorPhoto: string | null;
  sourceUrl: string | null;
  displayOrder: number;
  isVisible: boolean;
  /** Sent through the recommendation link and not yet seen by her. */
  pendingReview: boolean;
  submitterEmail: string | null;
  submittedAt: string | null;
};

type Draft = {
  id: number | null;
  quoteAr: string;
  quoteEn: string;
  authorName: string;
  authorTitleAr: string;
  authorTitleEn: string;
  company: string;
  authorPhoto: string | null;
  sourceUrl: string;
  isVisible: boolean;
  pending: boolean;
  submitterEmail: string | null;
};

const blankDraft = (): Draft => ({
  id: null,
  quoteAr: "",
  quoteEn: "",
  authorName: "",
  authorTitleAr: "",
  authorTitleEn: "",
  company: "",
  authorPhoto: null,
  sourceUrl: "",
  isVisible: true,
  pending: false,
  submitterEmail: null,
});

const draftOf = (t: Testimonial): Draft => ({
  id: t.id,
  quoteAr: t.quoteAr,
  quoteEn: t.quoteEn ?? "",
  authorName: t.authorName,
  authorTitleAr: t.authorTitleAr ?? "",
  authorTitleEn: t.authorTitleEn ?? "",
  company: t.company ?? "",
  authorPhoto: t.authorPhoto,
  sourceUrl: t.sourceUrl ?? "",
  isVisible: t.isVisible,
  pending: t.pendingReview,
  submitterEmail: t.submitterEmail,
});

/** The day it arrived. */
function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar", { dateStyle: "long" });
}

/* What she sends along with the link. Neutral wording: it goes to men and
   women alike, and Arabic has no gender-free "you" — so it avoids addressing
   the reader's verb forms at all. */
const inviteMessage = (url: string) =>
  `مرحبًا،\n\nيسعدني جدًا أن أقرأ رأيك في تجربة العمل معي. كتابة التوصية تأخذ دقيقتين، وستظهر على موقعي باسمك ومسمّاك الوظيفي:\n\n${url}\n\nشكرًا من القلب،\nرحيق`;

/** A stored link is only safe to render as an anchor when it carries its own
 *  scheme; "linkedin.com/in/x" would resolve against /admin and go nowhere. */
function absoluteUrl(u: string | null): string | null {
  return u && /^https?:\/\//i.test(u) ? u : null;
}

/** "مديرة تسويق · شركة كذا" — whichever halves exist. */
function byline(t: Testimonial): string {
  return [t.authorTitleAr, t.company].filter(Boolean).join(" · ");
}

export default function TestimonialsSection({
  toast,
  confirm,
  newNonce,
  onCountsChanged,
}: SectionProps) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const pending = items.filter((t) => t.pendingReview);
  const live = items.filter((t) => !t.pendingReview);

  useEffect(() => {
    rpc.recommendations
      .invite<{ url: string }>()
      .then((r) => setInviteUrl(r.url))
      .catch(() => {
        /* the list below still works without the link */
      });
  }, []);

  const copy = async (text: string, done: string) => {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      setManualCopy(true);
      toast("تعذّر النسخ تلقائيًا — انسخي الرابط من الحقل الظاهر.", "bad");
    }
  };

  const rotate = async () => {
    const ok = await confirm(
      "سيتوقف الرابط الحالي عن العمل فورًا، ومن معه الرابط القديم لن يستطيع إرسال توصية. التوصيات التي وصلت تبقى كما هي.",
      { confirmLabel: "أنشئي رابطًا جديدًا" }
    );
    if (!ok) return;
    try {
      const r = await rpc.recommendations.rotateInvite<{ url: string }>();
      setInviteUrl(r.url);
      toast("رابط جديد جاهز — الرابط القديم لم يعد يعمل ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر إنشاء رابط جديد.", "bad");
    }
  };

  const approve = async (t: Testimonial) => {
    setBusyId(t.id);
    try {
      await rpc.recommendations.approve<{ ok: boolean }>({ id: t.id });
      toast(`توصية ${t.authorName} على الموقع الآن ✓`);
      setTick((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر نشر التوصية.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (t: Testimonial) => {
    const ok = await confirm(
      `ستُحذف توصية ${t.authorName} والصورة المرفقة بها، ولن تظهر على الموقع. هل تريدين المتابعة؟`,
      { confirmLabel: "احذفيها" }
    );
    if (!ok) return;
    setBusyId(t.id);
    try {
      await rpc.recommendations.reject<{ ok: boolean }>({ id: t.id });
      setItems((list) => list.filter((x) => x.id !== t.id));
      toast("حُذفت التوصية ✓");
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف التوصية.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    rpc.testimonials
      .list<{ items: Testimonial[] }>()
      .then((r) => {
        if (!cancelled) setItems(r.items);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof RpcError ? e.message : "تعذّر تحميل التوصيات.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* The header's "توصية جديدة" button lives in the shell and only bumps a
     counter shared by every section. What marks a press is the counter moving
     off the value this section saw when it mounted — comparing against zero
     instead would open an empty editor merely because "مقال جديد" had been
     pressed somewhere else before the operator walked over here. */
  const nonceAtMount = useRef(newNonce);
  useEffect(() => {
    if (newNonce !== nonceAtMount.current) {
      nonceAtMount.current = newNonce;
      setDraft(blankDraft());
    }
  }, [newNonce]);

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const saveOrder = async (ids: number[]) => {
    const before = items;
    const byId = new Map(items.map((t) => [t.id, t]));
    // Only the published ones are dragged; the waiting ones keep their place.
    setItems([
      ...ids.map((id) => byId.get(id)).filter((t): t is Testimonial => !!t),
      ...items.filter((t) => t.pendingReview),
    ]);
    try {
      await rpc.testimonials.reorder<{ ok: boolean }>({ ids });
      toast("تم حفظ ترتيب التوصيات ✓");
      onCountsChanged();
    } catch (e) {
      setItems(before);
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الترتيب.", "bad");
    }
  };

  const setVisible = async (t: Testimonial, on: boolean) => {
    setItems((list) => list.map((x) => (x.id === t.id ? { ...x, isVisible: on } : x)));
    try {
      await rpc.testimonials.setVisible<Testimonial>({ id: t.id, isVisible: on });
      toast(on ? "التوصية تظهر على الموقع ✓" : "أُخفيت التوصية عن الموقع ✓");
      onCountsChanged();
    } catch (e) {
      setItems((list) => list.map((x) => (x.id === t.id ? { ...x, isVisible: !on } : x)));
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة التوصية.", "bad");
    }
  };

  const remove = async (t: Testimonial) => {
    const ok = await confirm(`ستُحذف توصية ${t.authorName} نهائيًا. هل تريدين المتابعة؟`, {
      confirmLabel: "احذفي التوصية",
    });
    if (!ok) return;
    try {
      await rpc.testimonials.delete<{ ok: boolean }>({ id: t.id });
      setItems((list) => list.filter((x) => x.id !== t.id));
      toast("تم حذف التوصية ✓");
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف التوصية.", "bad");
    }
  };

  const save = async (publishAfter = false) => {
    if (!draft) return;
    const quoteAr = draft.quoteAr.trim();
    const authorName = draft.authorName.trim();
    if (!quoteAr) {
      toast("نصّ التوصية بالعربية مطلوب.", "bad");
      return;
    }
    if (!authorName) {
      toast("اسم صاحب التوصية مطلوب.", "bad");
      return;
    }
    const sourceUrl = draft.sourceUrl.trim();
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      toast("رابط المصدر يبدأ بـ https:// — انسخيه كاملًا من شريط المتصفح.", "bad");
      return;
    }

    const payload = {
      quoteAr,
      quoteEn: draft.quoteEn.trim() || null,
      authorName,
      authorTitleAr: draft.authorTitleAr.trim() || null,
      authorTitleEn: draft.authorTitleEn.trim() || null,
      company: draft.company.trim() || null,
      authorPhoto: draft.authorPhoto || null,
      sourceUrl: sourceUrl || null,
      isVisible: draft.isVisible,
    };

    setSaving(true);
    try {
      if (draft.id === null) {
        await rpc.testimonials.create<Testimonial>(payload);
        toast("تمت إضافة التوصية ✓");
      } else if (draft.pending) {
        // Visibility is the approval's to set, not the editor's.
        const { isVisible: _ignored, ...edits } = payload;
        await rpc.testimonials.update<Testimonial>({ id: draft.id, ...edits });
        if (publishAfter) {
          await rpc.recommendations.approve<{ ok: boolean }>({ id: draft.id });
          toast(`توصية ${authorName} على الموقع الآن ✓`);
        } else {
          toast("حُفظت التعديلات — التوصية ما زالت بانتظار نشرك ✓");
        }
      } else {
        await rpc.testimonials.update<Testimonial>({ id: draft.id, ...payload });
        toast("تم حفظ التوصية ✓");
      }
      setDraft(null);
      setTick((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ التوصية.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>اطلبي توصية</h2>
          <span className="adm-panel-title">رابط واحد لكل من تريدين</span>
        </div>
        <p className="adm-note">
          أرسلي هذا الرابط لعملائك. يكتب كلٌّ منهم اسمه ومسمّاه الوظيفي وتوصيته وبريده، ويرفع صورته
          إن أراد — وتصلك هنا لتراجعيها. لا يظهر شيء على الموقع قبل أن تنشريه أنتِ.
        </p>
        {inviteUrl ? (
          <>
            <div className="adm-invite">
              <input
                dir="ltr"
                readOnly
                value={inviteUrl}
                aria-label="رابط طلب التوصية"
                onFocus={(e) => e.currentTarget.select()}
                className={manualCopy ? "manual" : undefined}
              />
              <button className="btn btn-gold" onClick={() => copy(inviteUrl, "نُسخ الرابط ✓")}>
                انسخي الرابط
              </button>
            </div>
            <div className="adm-invite-more">
              <button
                className="adm-link"
                onClick={() => copy(inviteMessage(inviteUrl), "نُسخت الرسالة مع الرابط ✓")}
              >
                انسخي رسالة جاهزة مع الرابط
              </button>
              <a className="adm-link" href={inviteUrl} target="_blank" rel="noopener noreferrer">
                افتحي الصفحة كما يراها العميل
              </a>
              <button className="adm-link" onClick={rotate}>
                أوقفي هذا الرابط وأنشئي غيره
              </button>
            </div>
          </>
        ) : (
          <Loading label="جارٍ تجهيز الرابط…" />
        )}
      </div>

      {pending.length > 0 && (
        <div className="adm-panel adm-panel-pending">
          <div className="adm-panel-head">
            <h2>بانتظار مراجعتك</h2>
            <span className="adm-panel-title">
              {pending.length === 1 ? "توصية واحدة" : `${pending.length} توصيات`} وصلت عبر الرابط
            </span>
          </div>
          <div className="adm-list">
            {pending.map((t) => (
              <article key={t.id} className="adm-rec">
                <header className="adm-rec-head">
                  {t.authorPhoto ? (
                    <img className="adm-rec-photo" src={t.authorPhoto} alt="" />
                  ) : (
                    <span className="adm-rec-photo empty" aria-hidden>
                      {t.authorName.trim().charAt(0)}
                    </span>
                  )}
                  <div className="adm-item-main">
                    <p className="adm-item-title">{t.authorName}</p>
                    <span className="adm-item-meta">
                      {byline(t) && <span>{byline(t)}</span>}
                      {t.submitterEmail && (
                        <a className="adm-link" dir="ltr" href={`mailto:${t.submitterEmail}`}>
                          {t.submitterEmail}
                        </a>
                      )}
                      {t.submittedAt && <span>{when(t.submittedAt)}</span>}
                    </span>
                  </div>
                </header>
                <p className="adm-rec-quote" dir="auto">
                  {t.quoteAr}
                </p>
                <div className="adm-rec-actions">
                  <button
                    className="btn btn-gold"
                    onClick={() => approve(t)}
                    disabled={busyId === t.id}
                  >
                    انشريها على الموقع
                  </button>
                  <button
                    className="adm-link"
                    onClick={() => setDraft(draftOf(t))}
                    disabled={busyId === t.id}
                  >
                    عدّليها أولًا
                  </button>
                  <button
                    className="adm-link adm-link-danger"
                    onClick={() => reject(t)}
                    disabled={busyId === t.id}
                  >
                    احذفيها
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>توصيات العملاء</h2>
          <span className="adm-panel-title">الترتيب هنا هو ترتيب الظهور</span>
        </div>

        <p className="adm-note">
          اسحبي التوصيات لتغيير ترتيبها على الموقع — يُحفظ الترتيب فور تغييره. ضعي أقوى توصية
          أولًا؛ هي التي يقرأها أغلب الزوّار. أي تغيير هنا يظهر على الموقع خلال دقيقة، دون زر النشر.
        </p>

        {error && <p className="adm-err">{error}</p>}

        {loading ? (
          <Loading label="جارٍ تحميل التوصيات…" />
        ) : live.length ? (
          <DragList
            items={live}
            onReorder={saveOrder}
            renderItem={(t) => (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="adm-item-main">
                  <p className="adm-item-title">{t.authorName}</p>
                  <span className="adm-item-meta">
                    {byline(t) ? <span>{byline(t)}</span> : <span>بلا مسمّى وظيفي</span>}
                    {absoluteUrl(t.sourceUrl) && (
                      <a
                        className="adm-link"
                        href={absoluteUrl(t.sourceUrl) as string}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        المصدر على LinkedIn
                      </a>
                    )}
                    {!t.isVisible && <span>مخفيّة</span>}
                  </span>
                  <p className="adm-item-sub">{t.quoteAr}</p>
                </div>
                <div className="adm-item-actions">
                  <Toggle
                    checked={t.isVisible}
                    onChange={(v) => setVisible(t, v)}
                    label={`إظهار توصية ${t.authorName} على الموقع`}
                  />
                  <button className="adm-link" onClick={() => setDraft(draftOf(t))}>
                    تحرير
                  </button>
                  <button
                    className="adm-icon-btn"
                    onClick={() => remove(t)}
                    aria-label={`حذف توصية ${t.authorName}`}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            )}
          />
        ) : (
          <EmptyState
            title="لا توجد توصيات بعد"
            body="أرسلي رابط التوصيات أعلاه لعملائك، أو انسخي ما كتبوه عنك على LinkedIn وأضيفيه هنا باسم صاحبه ومسمّاه الوظيفي. التوصيات تظهر على الموقع بالترتيب الذي تضعينه."
            actionLabel="أضيفي توصية"
            onAction={() => setDraft(blankDraft())}
          />
        )}
      </div>

      {draft && (
        <Dialog
          open
          onClose={() => setDraft(null)}
          title={
            draft.id === null ? "توصية جديدة" : draft.pending ? "مراجعة التوصية" : "تحرير التوصية"
          }
          subtitle={
            draft.pending
              ? "صحّحي خطأً إملائيًا إن وُجد، لكن اتركي الكلام كلامه — التوصية باسمه."
              : "انقلي كلام صاحب التوصية كما كتبه، دون تحسينه."
          }
          width={780}
          footer={
            draft.pending ? (
              <>
                <button className="btn btn-gold" onClick={() => save(true)} disabled={saving}>
                  {saving ? "جارٍ الحفظ…" : "احفظي وانشريها"}
                </button>
                <button className="adm-link" onClick={() => save(false)} disabled={saving}>
                  احفظي دون نشر
                </button>
                <button className="adm-link" onClick={() => setDraft(null)} disabled={saving}>
                  إلغاء
                </button>
              </>
            ) : (
            <>
              <button className="btn btn-gold" onClick={() => save()} disabled={saving}>
                {saving ? "جارٍ الحفظ…" : "حفظ"}
              </button>
              <button className="adm-link" onClick={() => setDraft(null)} disabled={saving}>
                إلغاء
              </button>
            </>
            )
          }
        >
          {draft.pending && draft.submitterEmail && (
            <p className="adm-note">
              أرسلها{" "}
              <a className="adm-link" dir="ltr" href={`mailto:${draft.submitterEmail}`}>
                {draft.submitterEmail}
              </a>{" "}
              — البريد لا يظهر على الموقع.
            </p>
          )}
          <BilingualField
            label="نصّ التوصية"
            required
            multiline
            rows={5}
            valueAr={draft.quoteAr}
            valueEn={draft.quoteEn}
            onAr={(v) => patch({ quoteAr: v })}
            onEn={(v) => patch({ quoteEn: v })}
          />

          <Field
            label="اسم صاحب التوصية"
            required
            hint="اسم الشخص يُكتب كما يكتبه هو، ولا يُترجَم — بعض الأسماء بالحروف اللاتينية وبعضها بالعربية، وكلاهما صحيح هنا."
          >
            <input
              value={draft.authorName}
              placeholder="مثال: Sarah Al-Otaibi أو سارة العتيبي"
              onChange={(e) => patch({ authorName: e.target.value })}
            />
          </Field>

          <BilingualField
            label="المسمّى الوظيفي"
            valueAr={draft.authorTitleAr}
            valueEn={draft.authorTitleEn}
            onAr={(v) => patch({ authorTitleAr: v })}
            onEn={(v) => patch({ authorTitleEn: v })}
          />

          <Field label="الشركة" hint="اسم جهة العمل كما هي معروفة، بلا ترجمة.">
            <input
              value={draft.company}
              onChange={(e) => patch({ company: e.target.value })}
            />
          </Field>

          <ImageField
            label="الصورة الشخصية"
            value={draft.authorPhoto}
            onChange={(url) => patch({ authorPhoto: url })}
            onError={(m) => toast(m, "bad")}
            hint="صورة مربّعة صغيرة. اتركيها فارغة وستظهر التوصية بالاسم وحده."
          />

          <Field
            label="رابط التوصية الأصلية على LinkedIn"
            hint="يُستخدم للرجوع إلى المصدر عند الحاجة، ولا يظهر للزوّار."
          >
            <input
              dir="ltr"
              type="url"
              value={draft.sourceUrl}
              placeholder="https://www.linkedin.com/in/…"
              onChange={(e) => patch({ sourceUrl: e.target.value })}
            />
          </Field>

          {!draft.pending && (
          <div className="adm-field">
            <span className="adm-field-label">الظهور على الموقع</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle
                checked={draft.isVisible}
                onChange={(v) => patch({ isVisible: v })}
                label="إظهار التوصية على الموقع"
              />
              <span className="adm-muted">
                {draft.isVisible ? "ظاهرة للزوّار" : "مخفيّة عن الزوّار"}
              </span>
            </div>
          </div>
          )}
        </Dialog>
      )}
    </>
  );
}
