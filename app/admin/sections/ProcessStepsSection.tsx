"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { BilingualField, Dialog, DragList, EmptyState, Field, Loading, Toggle } from "../ui";
import { IconPlus } from "../icons";

/* The «كيف أعمل؟» sequence. Order is the whole point of this screen, so the
   list is a drag list and nothing else — no search, no filter, no paging. */

type Step = {
  id: number;
  stepNumber: number;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  displayOrder: number;
  isVisible: boolean;
};

type Draft = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  isVisible: boolean;
};

const BLANK: Draft = {
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  icon: "",
  isVisible: true,
};

const two = (n: number) => String(n).padStart(2, "0");

export default function ProcessStepsSection({ toast, confirm, newNonce }: SectionProps) {
  const [items, setItems] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rpc.processSteps
      .list<{ items: Step[] }>()
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof RpcError ? e.message : "تعذّر تحميل خطوات العمل.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* Every create, update, delete and reorder renumbers stepNumber on the
     server, and the row a mutation hands back was read before that renumber
     ran — so the numbers are only trustworthy after a fresh read. */
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const openNew = useCallback(() => setEditing({ id: null, draft: BLANK }), []);

  const lastNonce = useRef(newNonce);
  useEffect(() => {
    if (newNonce === lastNonce.current) return;
    lastNonce.current = newNonce;
    openNew();
  }, [newNonce, openNew]);

  function patch(p: Partial<Draft>) {
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e));
  }

  const openEdit = (s: Step) =>
    setEditing({
      id: s.id,
      draft: {
        titleAr: s.titleAr,
        titleEn: s.titleEn ?? "",
        descriptionAr: s.descriptionAr ?? "",
        descriptionEn: s.descriptionEn ?? "",
        icon: s.icon ?? "",
        isVisible: s.isVisible,
      },
    });

  const save = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.titleAr.trim()) {
      toast("عنوان الخطوة بالعربية مطلوب.", "bad");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titleAr: d.titleAr.trim(),
        titleEn: d.titleEn.trim(),
        descriptionAr: d.descriptionAr.trim(),
        descriptionEn: d.descriptionEn.trim(),
        icon: d.icon.trim(),
        isVisible: d.isVisible,
      };
      if (editing.id === null) await rpc.processSteps.create<Step>(payload);
      else await rpc.processSteps.update<Step>({ id: editing.id, ...payload });
      toast(editing.id === null ? "أُضيفت الخطوة ✓" : "حُفظت التعديلات ✓");
      setEditing(null);
      refresh();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الخطوة.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Step) => {
    const ok = await confirm(`سيُحذف «${s.titleAr}» نهائيًا من قسم «كيف أعمل؟».`, {
      confirmLabel: "احذفي الخطوة",
    });
    if (!ok) return;
    try {
      await rpc.processSteps.delete<{ ok: boolean }>({ id: s.id });
      toast("حُذفت الخطوة ✓");
      refresh();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الخطوة.", "bad");
    }
  };

  const setVisible = async (s: Step, isVisible: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === s.id ? { ...i, isVisible } : i)));
    try {
      await rpc.processSteps.setVisible<Step>({ id: s.id, isVisible });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === s.id ? { ...i, isVisible: s.isVisible } : i)));
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الظهور.", "bad");
    }
  };

  const reorder = async (ids: number[]) => {
    const previous = items;
    const byId = new Map(items.map((i) => [i.id, i]));
    setItems(ids.map((id) => byId.get(id)).filter((s): s is Step => Boolean(s)));
    try {
      await rpc.processSteps.reorder<{ ok: boolean }>({ ids });
      refresh();
    } catch (e) {
      setItems(previous);
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الترتيب الجديد.", "bad");
    }
  };

  return (
    <>
      <div className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>خطوات العمل</h2>
            <p className="adm-field-hint">
              الترتيب هنا هو الترتيب على الصفحة. الأرقام (01، 02، …) تتبع هذا الترتيب وتُعاد
              ترقيمها وحدها عند سحب أي خطوة، فلا حاجة لكتابتها.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={openNew}>
            <IconPlus /> خطوة جديدة
          </button>
        </div>

        {error && (
          <p className="adm-err" role="alert">
            {error}{" "}
            <button className="adm-link" onClick={refresh}>
              إعادة المحاولة
            </button>
          </p>
        )}

        {loading && !items.length ? (
          <Loading label="جارٍ تحميل الخطوات…" />
        ) : !items.length ? (
          <EmptyState
            title="لا توجد خطوات بعد"
            body="قسم «كيف أعمل؟» يشرح للزائرة ما يحدث بعد أن تتواصل معك، خطوة بخطوة. أضيفي الخطوة الأولى ليظهر القسم على الصفحة الرئيسية."
            actionLabel="أضيفي أول خطوة"
            onAction={openNew}
          />
        ) : (
          <DragList
            items={items}
            onReorder={reorder}
            renderItem={(s) => (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="adm-chip adm-num">{two(s.stepNumber)}</span>
                <div className="adm-item-main">
                  <p className="adm-item-title">{s.titleAr}</p>
                  {s.descriptionAr && <p className="adm-item-sub">{s.descriptionAr}</p>}
                  <span className="adm-item-meta">
                    {s.icon && <span dir="auto">أيقونة: {s.icon}</span>}
                    {!s.isVisible && <span>مخفية عن الموقع</span>}
                  </span>
                </div>
                <div className="adm-item-actions">
                  <Toggle
                    checked={s.isVisible}
                    onChange={(v) => setVisible(s, v)}
                    label={`إظهار «${s.titleAr}» على الموقع`}
                  />
                  <button className="adm-link" onClick={() => openEdit(s)}>
                    تعديل
                  </button>
                  <button className="adm-link adm-danger" onClick={() => remove(s)}>
                    حذف
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? "خطوة جديدة" : "تعديل الخطوة"}
        subtitle="رقم الخطوة يُحسَب من ترتيبها في القائمة."
        footer={
          <>
            <button
              className="btn btn-gold"
              onClick={save}
              disabled={saving || !editing?.draft.titleAr.trim()}
            >
              {saving ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            <button className="adm-link" onClick={() => setEditing(null)}>
              إلغاء
            </button>
          </>
        }
      >
        {editing && (
          <>
            <BilingualField
              label="العنوان"
              required
              valueAr={editing.draft.titleAr}
              valueEn={editing.draft.titleEn}
              onAr={(v) => patch({ titleAr: v })}
              onEn={(v) => patch({ titleEn: v })}
              placeholder="مثل: استشارة مجانية"
            />
            <BilingualField
              label="الوصف"
              multiline
              rows={4}
              valueAr={editing.draft.descriptionAr}
              valueEn={editing.draft.descriptionEn}
              onAr={(v) => patch({ descriptionAr: v })}
              onEn={(v) => patch({ descriptionEn: v })}
              hint="سطران أو ثلاثة يشرحان ما يحدث في هذه الخطوة."
            />
            <Field
              label="اسم الأيقونة"
              hint="اختياري — اسم الأيقونة كما هو مكتوب في تصميم الموقع، بالحروف اللاتينية."
            >
              <input
                dir="ltr"
                value={editing.draft.icon}
                onChange={(e) => patch({ icon: e.target.value })}
              />
            </Field>
            <div className="adm-field">
              <span className="adm-field-label">الظهور على الموقع</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle
                  checked={editing.draft.isVisible}
                  onChange={(v) => patch({ isVisible: v })}
                  label="إظهار الخطوة على الموقع"
                />
                <span className="adm-muted">
                  {editing.draft.isVisible ? "ظاهرة للزوار" : "مخفية — محفوظة عندك فقط"}
                </span>
              </span>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
