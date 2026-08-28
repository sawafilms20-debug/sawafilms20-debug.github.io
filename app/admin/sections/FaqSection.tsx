"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { BilingualField, Dialog, DragList, EmptyState, Field, Loading, Toggle } from "../ui";
import { IconPlus } from "../icons";

type FaqItem = {
  id: number;
  questionAr: string;
  questionEn: string | null;
  answerAr: string;
  answerEn: string | null;
  category: string | null;
  displayOrder: number;
  isVisible: boolean;
};

type Draft = {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  isVisible: boolean;
};

const BLANK: Draft = {
  questionAr: "",
  questionEn: "",
  answerAr: "",
  answerEn: "",
  category: "",
  isVisible: true,
};

export default function FaqSection({ toast, confirm, newNonce }: SectionProps) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rpc.faq
      .list<{ items: FaqItem[] }>()
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof RpcError ? e.message : "تعذّر تحميل الأسئلة.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);
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

  const openEdit = (f: FaqItem) =>
    setEditing({
      id: f.id,
      draft: {
        questionAr: f.questionAr,
        questionEn: f.questionEn ?? "",
        answerAr: f.answerAr,
        answerEn: f.answerEn ?? "",
        category: f.category ?? "",
        isVisible: f.isVisible,
      },
    });

  const save = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.questionAr.trim() || !d.answerAr.trim()) {
      toast("السؤال والجواب بالعربية مطلوبان.", "bad");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        questionAr: d.questionAr.trim(),
        questionEn: d.questionEn.trim(),
        answerAr: d.answerAr.trim(),
        answerEn: d.answerEn.trim(),
        category: d.category.trim(),
        isVisible: d.isVisible,
      };
      if (editing.id === null) {
        const row = await rpc.faq.create<FaqItem>(payload);
        setItems((prev) => [...prev, row]);
        toast("أُضيف السؤال ✓");
      } else {
        const row = await rpc.faq.update<FaqItem>({ id: editing.id, ...payload });
        setItems((prev) => prev.map((i) => (i.id === row.id ? row : i)));
        toast("حُفظت التعديلات ✓");
      }
      setEditing(null);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ السؤال.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (f: FaqItem) => {
    const ok = await confirm(`سيُحذف السؤال «${f.questionAr}» وجوابه نهائيًا.`, {
      confirmLabel: "احذفي السؤال",
    });
    if (!ok) return;
    try {
      await rpc.faq.delete<{ ok: boolean }>({ id: f.id });
      setItems((prev) => prev.filter((i) => i.id !== f.id));
      toast("حُذف السؤال ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف السؤال.", "bad");
    }
  };

  const setVisible = async (f: FaqItem, isVisible: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === f.id ? { ...i, isVisible } : i)));
    try {
      await rpc.faq.setVisible<FaqItem>({ id: f.id, isVisible });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === f.id ? { ...i, isVisible: f.isVisible } : i)));
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الظهور.", "bad");
    }
  };

  const reorder = async (ids: number[]) => {
    const previous = items;
    const byId = new Map(items.map((i) => [i.id, i]));
    setItems(ids.map((id) => byId.get(id)).filter((f): f is FaqItem => Boolean(f)));
    try {
      await rpc.faq.reorder<{ ok: boolean }>({ ids });
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
            <h2>الأسئلة الشائعة</h2>
            <p className="adm-field-hint">
              اسحبي السؤال لتغيير موضعه، أو اضغطي عليه لقراءة جوابه دون فتح المحرّر.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={openNew}>
            <IconPlus /> سؤال جديد
          </button>
        </div>

        {error && (
          <p className="adm-err" role="alert">
            {error}{" "}
            <button className="adm-link" onClick={retry}>
              إعادة المحاولة
            </button>
          </p>
        )}

        {loading && !items.length ? (
          <Loading label="جارٍ تحميل الأسئلة…" />
        ) : !items.length ? (
          <EmptyState
            title="لا توجد أسئلة بعد"
            body="هنا تجمعين الأسئلة التي تتكرر عليك، مع أجوبتها، لتظهر على الموقع بالترتيب الذي تختارينه."
            actionLabel="أضيفي أول سؤال"
            onAction={openNew}
          />
        ) : (
          <DragList
            items={items}
            onReorder={reorder}
            renderItem={(f) => {
              const expanded = openId === f.id;
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* The question itself is the accordion control: reading a
                        Q&A should not cost a trip through the editor. */}
                    <button
                      type="button"
                      className="adm-item-main"
                      aria-expanded={expanded}
                      onClick={() => setOpenId(expanded ? null : f.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        font: "inherit",
                        textAlign: "start",
                        cursor: "pointer",
                      }}
                    >
                      <span className="adm-item-title">{f.questionAr}</span>
                      <span className="adm-item-meta">
                        {f.category && <span className="adm-chip">{f.category}</span>}
                        {!f.isVisible && <span>مخفي عن الموقع</span>}
                        <span>{expanded ? "إخفاء الجواب" : "اضغطي لقراءة الجواب"}</span>
                      </span>
                    </button>
                    <div className="adm-item-actions">
                      <Toggle
                        checked={f.isVisible}
                        onChange={(v) => setVisible(f, v)}
                        label={`إظهار السؤال «${f.questionAr}» على الموقع`}
                      />
                      <button className="adm-link" onClick={() => openEdit(f)}>
                        تعديل
                      </button>
                      <button className="adm-link adm-danger" onClick={() => remove(f)}>
                        حذف
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <p
                      className="adm-muted"
                      style={{ margin: "10px 0 2px", whiteSpace: "pre-wrap", lineHeight: 1.9 }}
                    >
                      {f.answerAr}
                    </p>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? "سؤال جديد" : "تعديل السؤال"}
        footer={
          <>
            <button
              className="btn btn-gold"
              onClick={save}
              disabled={
                saving || !editing?.draft.questionAr.trim() || !editing?.draft.answerAr.trim()
              }
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
              label="السؤال"
              required
              valueAr={editing.draft.questionAr}
              valueEn={editing.draft.questionEn}
              onAr={(v) => patch({ questionAr: v })}
              onEn={(v) => patch({ questionEn: v })}
            />
            <BilingualField
              label="الجواب"
              required
              multiline
              rows={5}
              valueAr={editing.draft.answerAr}
              valueEn={editing.draft.answerEn}
              onAr={(v) => patch({ answerAr: v })}
              onEn={(v) => patch({ answerEn: v })}
            />
            <Field
              label="التصنيف"
              hint="اختياري — كلمة واحدة تجمع الأسئلة المتشابهة، مثل: الأسعار."
            >
              <input
                dir="auto"
                value={editing.draft.category}
                onChange={(e) => patch({ category: e.target.value })}
              />
            </Field>
            <div className="adm-field">
              <span className="adm-field-label">الظهور على الموقع</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle
                  checked={editing.draft.isVisible}
                  onChange={(v) => patch({ isVisible: v })}
                  label="إظهار السؤال على الموقع"
                />
                <span className="adm-muted">
                  {editing.draft.isVisible ? "ظاهر للزوار" : "مخفي — محفوظ عندك فقط"}
                </span>
              </span>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
