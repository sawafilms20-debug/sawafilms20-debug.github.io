"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { BilingualField, Dialog, DragList, EmptyState, Field, Loading, Toggle } from "../ui";
import { IconPlus } from "../icons";

type Statistic = {
  id: number;
  labelAr: string;
  labelEn: string | null;
  value: string;
  suffix: string | null;
  icon: string | null;
  displayOrder: number;
  isVisible: boolean;
};

type Draft = {
  labelAr: string;
  labelEn: string;
  value: string;
  suffix: string;
  icon: string;
  isVisible: boolean;
};

const BLANK: Draft = {
  labelAr: "",
  labelEn: "",
  value: "",
  suffix: "",
  icon: "",
  isVisible: true,
};

export default function StatisticsSection({ toast, confirm, newNonce }: SectionProps) {
  const [items, setItems] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rpc.statistics
      .list<{ items: Statistic[] }>()
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof RpcError ? e.message : "تعذّر تحميل الأرقام.");
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

  const openEdit = (s: Statistic) =>
    setEditing({
      id: s.id,
      draft: {
        labelAr: s.labelAr,
        labelEn: s.labelEn ?? "",
        value: s.value,
        suffix: s.suffix ?? "",
        icon: s.icon ?? "",
        isVisible: s.isVisible,
      },
    });

  const save = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.labelAr.trim() || !d.value.trim()) {
      toast("التسمية بالعربية والقيمة مطلوبتان.", "bad");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        labelAr: d.labelAr.trim(),
        labelEn: d.labelEn.trim(),
        value: d.value.trim(),
        suffix: d.suffix.trim(),
        icon: d.icon.trim(),
        isVisible: d.isVisible,
      };
      if (editing.id === null) {
        const row = await rpc.statistics.create<Statistic>(payload);
        setItems((prev) => [...prev, row]);
        toast("أُضيف الرقم ✓");
      } else {
        const row = await rpc.statistics.update<Statistic>({ id: editing.id, ...payload });
        setItems((prev) => prev.map((i) => (i.id === row.id ? row : i)));
        toast("حُفظت التعديلات ✓");
      }
      setEditing(null);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الرقم.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Statistic) => {
    const ok = await confirm(`سيُحذف «${s.labelAr}» من الأرقام البارزة نهائيًا.`, {
      confirmLabel: "احذفي الرقم",
    });
    if (!ok) return;
    try {
      await rpc.statistics.delete<{ ok: boolean }>({ id: s.id });
      setItems((prev) => prev.filter((i) => i.id !== s.id));
      toast("حُذف الرقم ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الرقم.", "bad");
    }
  };

  const setVisible = async (s: Statistic, isVisible: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === s.id ? { ...i, isVisible } : i)));
    try {
      await rpc.statistics.setVisible<Statistic>({ id: s.id, isVisible });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === s.id ? { ...i, isVisible: s.isVisible } : i)));
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الظهور.", "bad");
    }
  };

  const reorder = async (ids: number[]) => {
    const previous = items;
    const byId = new Map(items.map((i) => [i.id, i]));
    setItems(ids.map((id) => byId.get(id)).filter((s): s is Statistic => Boolean(s)));
    try {
      await rpc.statistics.reorder<{ ok: boolean }>({ ids });
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
            <h2>الأرقام البارزة</h2>
            <p className="adm-field-hint">
              الترتيب هنا هو ترتيب ظهور الأرقام على الصفحة، من اليمين إلى اليسار.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={openNew}>
            <IconPlus /> رقم جديد
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
          <Loading label="جارٍ تحميل الأرقام…" />
        ) : !items.length ? (
          <EmptyState
            title="لا أرقام حتى الآن"
            body="الأرقام البارزة اختيارية تمامًا: مثل «١٢ سنة خبرة» أو «‎+٢٠٠ عميل». لا يظهر هذا القسم على الموقع إطلاقًا ما دام فارغًا — يظهر فقط بعد إضافة رقم واحد على الأقل."
            actionLabel="أضيفي أول رقم"
            onAction={openNew}
          />
        ) : (
          <DragList
            items={items}
            onReorder={reorder}
            renderItem={(s) => (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="adm-item-main">
                  {/* dir="auto" keeps a trailing "+" on the correct side of the
                      figure inside an otherwise right-to-left row. */}
                  <span className="adm-strip-num" dir="auto">
                    {s.value}
                    {s.suffix ?? ""}
                  </span>
                  <span className="adm-item-title">{s.labelAr}</span>
                  <span className="adm-item-meta">
                    {s.icon && <span dir="auto">أيقونة: {s.icon}</span>}
                    {!s.isVisible && <span>مخفي عن الموقع</span>}
                  </span>
                </div>
                <div className="adm-item-actions">
                  <Toggle
                    checked={s.isVisible}
                    onChange={(v) => setVisible(s, v)}
                    label={`إظهار «${s.labelAr}» على الموقع`}
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
        title={editing?.id === null ? "رقم جديد" : "تعديل الرقم"}
        footer={
          <>
            <button
              className="btn btn-gold"
              onClick={save}
              disabled={saving || !editing?.draft.labelAr.trim() || !editing?.draft.value.trim()}
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
              label="التسمية"
              required
              valueAr={editing.draft.labelAr}
              valueEn={editing.draft.labelEn}
              onAr={(v) => patch({ labelAr: v })}
              onEn={(v) => patch({ labelEn: v })}
              placeholder="مثل: سنوات الخبرة"
            />
            <div className="adm-grid-2">
              <Field label="القيمة" required hint="الرقم وحده، دون علامات.">
                <input
                  dir="auto"
                  value={editing.draft.value}
                  onChange={(e) => patch({ value: e.target.value })}
                />
              </Field>
              <Field label="اللاحقة" hint="اختيارية — مثل «+» أو «سنة»، تُكتب مباشرة بعد الرقم.">
                <input
                  dir="auto"
                  value={editing.draft.suffix}
                  onChange={(e) => patch({ suffix: e.target.value })}
                />
              </Field>
            </div>
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
                  label="إظهار الرقم على الموقع"
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
