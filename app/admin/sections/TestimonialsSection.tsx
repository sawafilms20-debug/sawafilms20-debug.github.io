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
});

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
    setItems(ids.map((id) => byId.get(id)).filter((t): t is Testimonial => !!t));
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

  const save = async () => {
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
          <h2>توصيات العملاء</h2>
          <span className="adm-panel-title">الترتيب هنا هو ترتيب الظهور</span>
        </div>

        <p className="adm-note">
          اسحبي التوصيات لتغيير ترتيبها على الموقع — يُحفظ الترتيب فور تغييره. ضعي أقوى توصية
          أولًا؛ هي التي يقرأها أغلب الزوّار.
        </p>

        {error && <p className="adm-err">{error}</p>}

        {loading ? (
          <Loading label="جارٍ تحميل التوصيات…" />
        ) : items.length ? (
          <DragList
            items={items}
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
            body="انسخي ما كتبه عملاؤك عنك على LinkedIn أو في رسائلهم، وأضيفيه هنا باسم صاحبه ومسمّاه الوظيفي. التوصيات تظهر على الموقع بالترتيب الذي تضعينه."
            actionLabel="أضيفي توصية"
            onAction={() => setDraft(blankDraft())}
          />
        )}
      </div>

      {draft && (
        <Dialog
          open
          onClose={() => setDraft(null)}
          title={draft.id === null ? "توصية جديدة" : "تحرير التوصية"}
          subtitle="انقلي كلام صاحب التوصية كما كتبه، دون تحسينه."
          width={780}
          footer={
            <>
              <button className="btn btn-gold" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ…" : "حفظ"}
              </button>
              <button className="adm-link" onClick={() => setDraft(null)} disabled={saving}>
                إلغاء
              </button>
            </>
          }
        >
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
        </Dialog>
      )}
    </>
  );
}
