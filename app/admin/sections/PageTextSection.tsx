"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { rpc, RpcError } from "../rpc";
import { EmptyState, Loading, relativeTime } from "../ui";
import { ImageField } from "../MediaPicker";
import { RichText, emphasisOf } from "../RichText";
import type { SectionProps } from "../types";

/* "الصفحات" — every string the public site renders, offered for editing.

   A stored row is an OVERRIDE, never the site's content: an empty field means
   "leave it as built", which is why every control shows the live wording as
   its placeholder and clearing one is a real operation. */

type ContentType = "text" | "richtext" | "url" | "image";

type PageRow = {
  key: string;
  label: string;
  route: string;
  fields: number;
  edited: number;
};

type FieldSpec = {
  sectionKey: string;
  contentKey: string;
  labelAr: string;
  selector: string;
  defaultText: string;
  contentType: ContentType;
  valueAr: string | null;
  valueEn: string | null;
  updatedAt: string | null;
  overridden: boolean;
};

type SectionGroup = { sectionKey: string; label: string; fields: FieldSpec[] };

type PageDetail = {
  page: { key: string; label: string; route: string };
  sections: SectionGroup[];
};

/* The English translation is not edited on this screen, but it is carried
   through every save — dropping it would silently wipe a column the operator
   never touched, and clearing a field has to clear both or the row survives. */
type Draft = { ar: string; en: string };


const keyOf = (sectionKey: string, contentKey: string) => `${sectionKey}.${contentKey}`;

export default function PageTextSection({ toast, confirm }: SectionProps) {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState("");
  const [pagesNonce, setPagesNonce] = useState(0);

  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<PageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailNonce, setDetailNonce] = useState(0);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPagesLoading(true);
    setPagesError("");
    rpc.pageContent
      .pages<{ items: PageRow[] }>()
      .then((r) => {
        if (cancelled) return;
        setPages(r.items);
        setSelected((cur) => cur || r.items[0]?.key || "");
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPagesError(e instanceof RpcError ? e.message : "تعذّر تحميل قائمة الصفحات.");
        }
      })
      .finally(() => {
        if (!cancelled) setPagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pagesNonce]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDrafts({});
      return;
    }
    /* A page switch must drop the previous page's fields immediately. Leaving
       them on screen shows page B in the sidebar while the editor still holds
       page A — with a live save button pointed at the page just left. A plain
       refresh of the same page keeps them, so saving does not flash a spinner. */
    setDetail((cur) => (cur && cur.page.key === selected ? cur : null));
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    rpc.pageContent
      .listByPage<PageDetail>({ pageKey: selected })
      .then((r) => {
        if (cancelled) return;
        setDetail(r);
        const next: Record<string, Draft> = {};
        for (const s of r.sections) {
          for (const f of s.fields) {
            /* The box opens with what the site says today, so this is a page
               to EDIT rather than a form to re-type from scratch. An empty box
               is not "leave it alone" any more — it means an empty heading. */
            next[keyOf(s.sectionKey, f.contentKey)] = {
              ar: f.valueAr ?? f.defaultText,
              en: f.valueEn ?? "",
            };
          }
        }
        setDrafts(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(e instanceof RpcError ? e.message : "تعذّر تحميل نصوص هذه الصفحة.");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, detailNonce]);

  const changed = useMemo(() => {
    if (!detail) {
      return [] as {
        sectionKey: string;
        contentKey: string;
        ar: string;
        en: string;
        defaultText: string;
      }[];
    }
    const out: {
      sectionKey: string;
      contentKey: string;
      ar: string;
      en: string;
      defaultText: string;
    }[] = [];
    for (const s of detail.sections) {
      for (const f of s.fields) {
        const d = drafts[keyOf(s.sectionKey, f.contentKey)];
        if (!d) continue;
        if (d.ar !== (f.valueAr ?? f.defaultText) || d.en !== (f.valueEn ?? "")) {
          out.push({
            sectionKey: s.sectionKey,
            contentKey: f.contentKey,
            ar: d.ar,
            en: d.en,
            defaultText: f.defaultText,
          });
        }
      }
    }
    return out;
  }, [detail, drafts]);

  /* English rides along untouched while there is Arabic to save. Emptying the
     box by hand has to drop it too, exactly as «إرجاع الأصل» does: the server
     only deletes the override when both columns are blank, so keeping the
     English would leave the row — and the «محرّر» chip — behind on a field the
     operator just emptied to get the built-in wording back. */
  const setDraft = (k: string, ar: string) =>
    setDrafts((d) => ({ ...d, [k]: { ar, en: ar.trim() ? d[k]?.en ?? "" : "" } }));

  const clearDraft = (k: string, defaultText: string) =>
    setDrafts((d) => ({ ...d, [k]: { ar: defaultText, en: "" } }));

  const save = async () => {
    if (!detail || !changed.length) return;
    setSaving(true);
    try {
      const r = await rpc.pageContent.bulkUpsert<{ saved: number; cleared: number }>({
        items: changed.map((c) => ({
          pageKey: detail.page.key,
          sectionKey: c.sectionKey,
          contentKey: c.contentKey,
          /* Restoring the original wording by hand has to mean the same thing
             as «إرجاع الأصل»: send it empty so the server drops the row and the
             page falls back to what it was built with. Storing an override
             identical to the default would work, but it would pin the text — a
             later copy change in the code would no longer reach the site. */
          valueAr: c.ar.trim() === c.defaultText.trim() ? "" : c.ar,
          valueEn: c.ar.trim() === c.defaultText.trim() ? "" : c.en,
        })),
      });
      toast(
        r.cleared
          ? `حُفظ ${r.saved} حقلًا، وأُرجع ${r.cleared} إلى النص الأصلي ✓`
          : `حُفظ ${r.saved} حقلًا ✓`
      );
      setDetailNonce((n) => n + 1);
      setPagesNonce((n) => n + 1);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ التعديلات.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const resetPage = async () => {
    if (!detail) return;
    const ok = await confirm(
      `سيُحذف كل تعديل نصّي على صفحة «${detail.page.label}» وتعود إلى نصوصها الأصلية. هل تريدين المتابعة؟`,
      { confirmLabel: "أرجعي الصفحة", danger: true }
    );
    if (!ok) return;
    try {
      const r = await rpc.pageContent.reset<{ cleared: number }>({ pageKey: detail.page.key });
      toast(
        r.cleared
          ? `أُرجعت ${r.cleared} من الحقول إلى نصوصها الأصلية ✓`
          : "لا توجد تعديلات محفوظة على هذه الصفحة."
      );
      setDetailNonce((n) => n + 1);
      setPagesNonce((n) => n + 1);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر إرجاع الصفحة.", "bad");
    }
  };

  return (
    <>
      <p className="adm-note">
        التعديلات تظهر على الموقع بعد الضغط على «نشر على الموقع» في الأعلى. الحقل الفارغ يعني
        «اتركي النص كما هو مبني على الموقع».
      </p>

      <div className="adm-split">
        <aside className="adm-panel">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title">صفحات الموقع</h2>
          </div>

          {pagesError && <p className="adm-err">{pagesError}</p>}

          {pagesLoading && !pages.length ? (
            <Loading label="جارٍ تحميل الصفحات…" />
          ) : pages.length ? (
            <div className="adm-list">
              {pages.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`adm-item ${selected === p.key ? "selected" : ""}`}
                  style={{ font: "inherit", cursor: "pointer", textAlign: "start" }}
                  aria-current={selected === p.key ? "true" : undefined}
                  onClick={() => setSelected(p.key)}
                >
                  <span className="adm-item-main">
                    <span className="adm-item-title">{p.label}</span>
                    <span className="adm-item-sub" dir="ltr">
                      {p.route}
                    </span>
                    <span className="adm-item-meta">
                      {p.edited > 0 ? `${p.edited} من ${p.fields} محرّرة` : `${p.fields} حقلًا`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            !pagesError && (
              <EmptyState
                title="لا صفحات قابلة للتعديل"
                body="لم يعثر النظام على أي صفحة مسجّلة في فهرس الموقع. حدّثي القائمة، وإن استمرت فارغة فالمشكلة في إعداد الموقع لا في اللوحة."
                actionLabel="تحديث القائمة"
                onAction={() => setPagesNonce((n) => n + 1)}
              />
            )
          )}
        </aside>

        <div>
          {detailError && <p className="adm-err">{detailError}</p>}

          {detailLoading && !detail ? (
            <Loading label="جارٍ تحميل نصوص الصفحة…" />
          ) : detail ? (
            <>
              <div className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h2>{detail.page.label}</h2>
                    <p className="adm-item-meta" dir="ltr" style={{ margin: "4px 0 0" }}>
                      {detail.page.route}
                    </p>
                  </div>
                  <div className="adm-item-actions">
                    <button
                      className="btn btn-gold"
                      disabled={!changed.length || saving}
                      onClick={save}
                    >
                      {saving ? "جارٍ الحفظ…" : "حفظ التعديلات"}
                    </button>
                    <button className="adm-link adm-danger" onClick={resetPage}>
                      إرجاع الصفحة بالكامل
                    </button>
                  </div>
                </div>
                <span className="adm-saved">
                  {changed.length
                    ? `${changed.length} تعديل غير محفوظ`
                    : "كل شيء محفوظ على هذه الصفحة"}
                </span>
              </div>

              {detail.sections.length ? (
                detail.sections.map((s) => (
                  <section className="adm-panel" key={s.sectionKey}>
                    <div className="adm-panel-head">
                      <h2 className="adm-panel-title">{s.label}</h2>
                    </div>
                    {s.fields.map((f) => {
                      const k = keyOf(s.sectionKey, f.contentKey);
                      return (
                        <FieldRow
                          key={k}
                          field={f}
                          value={drafts[k]?.ar ?? ""}
                          onChange={(v) => setDraft(k, v)}
                          onClear={() => clearDraft(k, f.defaultText)}
                          onError={(m) => toast(m, "bad")}
                        />
                      );
                    })}
                  </section>
                ))
              ) : (
                <EmptyState
                  title="لا نصوص قابلة للتعديل هنا"
                  body="هذه الصفحة لا تحتوي على أي نص مسجّل في فهرس الموقع بعد. اختاري صفحة أخرى من القائمة."
                />
              )}
            </>
          ) : (
            !detailError && (
              <EmptyState
                title="اختاري صفحة"
                body="كل نص مكتوب على الموقع موجود هنا مرتّبًا حسب الصفحة والقسم. اختاري صفحة من القائمة لتظهر نصوصها."
              />
            )
          )}
        </div>
      </div>
    </>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  onClear,
  onError,
}: {
  field: FieldSpec;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
}) {
  const id = useId();

  const hints: string[] = [];
  if (field.contentType === "image") hints.push(`الصورة الأصلية على الموقع: ${field.defaultText}`);
  if (field.overridden && field.updatedAt) hints.push(`آخر تعديل ${relativeTime(field.updatedAt)}`);

  /* Only offer the reset when there is something to reset. Now that every
     box opens pre-filled, "not empty" is true of nearly every field. */
  const resettable = value.trim() !== field.defaultText.trim();

  if (field.contentType === "image") {
    return (
      <>
        <ImageField
          label={field.labelAr}
          value={value || null}
          onChange={(url) => onChange(url ?? "")}
          onError={onError}
          hint={hints.join(" · ")}
        />
        {resettable && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px" }}>
            {field.overridden && <span className="adm-chip">محرّر</span>}
            <button type="button" className="adm-link" onClick={onClear}>
              إرجاع الأصل
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="adm-field">
      <label className="adm-field-label" htmlFor={id}>
        {field.labelAr}
        {field.overridden && (
          <span className="adm-chip" style={{ marginInlineStart: 8 }}>
            محرّر
          </span>
        )}
      </label>

      {field.contentType === "richtext" ? (
        <RichText
          value={value}
          onChange={onChange}
          emphasis={emphasisOf(field.defaultText)}
          ariaLabel={field.labelAr}
        />
      ) : (
        <input
          id={id}
          dir={field.contentType === "url" ? "ltr" : "rtl"}
          value={value}
          placeholder={field.defaultText}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {hints.map((h) => (
        <small className="adm-field-hint" key={h}>
          {h}
        </small>
      ))}

      {resettable && (
        <button
          type="button"
          className="adm-link"
          style={{ justifySelf: "start" }}
          onClick={onClear}
        >
          إرجاع الأصل
        </button>
      )}
    </div>
  );
}
