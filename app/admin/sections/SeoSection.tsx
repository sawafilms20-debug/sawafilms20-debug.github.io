"use client";

import { useEffect, useState } from "react";
import { SITE_URL } from "../config";
import { ImageField } from "../MediaPicker";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { BilingualField, EmptyState, Loading, Toggle, formatDate } from "../ui";

type SeoRow = {
  id: number;
  pageKey: string;
  metaTitleAr: string | null;
  metaTitleEn: string | null;
  metaDescriptionAr: string | null;
  metaDescriptionEn: string | null;
  ogImage: string | null;
  noIndex: boolean;
  updatedAt: string;
};

type SeoPage = { pageKey: string; label: string; route: string; row: SeoRow | null };

type Draft = {
  metaTitleAr: string;
  metaTitleEn: string;
  metaDescriptionAr: string;
  metaDescriptionEn: string;
  ogImage: string | null;
  noIndex: boolean;
};

/* Google truncates around here. Both are soft limits: a longer line still
   publishes, it just gets cut with an ellipsis in the result. */
const TITLE_LIMIT = 60;
const DESC_LIMIT = 155;

const EMPTY: Draft = {
  metaTitleAr: "",
  metaTitleEn: "",
  metaDescriptionAr: "",
  metaDescriptionEn: "",
  ogImage: null,
  noIndex: false,
};

function draftOf(row: SeoRow | null): Draft {
  if (!row) return EMPTY;
  return {
    metaTitleAr: row.metaTitleAr ?? "",
    metaTitleEn: row.metaTitleEn ?? "",
    metaDescriptionAr: row.metaDescriptionAr ?? "",
    metaDescriptionEn: row.metaDescriptionEn ?? "",
    ogImage: row.ogImage ?? null,
    noIndex: row.noIndex,
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.metaTitleAr === b.metaTitleAr &&
    a.metaTitleEn === b.metaTitleEn &&
    a.metaDescriptionAr === b.metaDescriptionAr &&
    a.metaDescriptionEn === b.metaDescriptionEn &&
    a.ogImage === b.ogImage &&
    a.noIndex === b.noIndex
  );
}

/** Code points, not UTF-16 units — one emoji in a title must count as one. */
const charCount = (s: string) => Array.from(s.trim()).length;

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export default function SeoSection({ toast, confirm }: SectionProps) {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await rpc.seo.list<{ items: SeoPage[] }>();
        if (cancelled) return;
        setPages(r.items);
        const first = r.items[0] ?? null;
        setSelected(first ? first.pageKey : null);
        const d = draftOf(first?.row ?? null);
        setDraft(d);
        setBaseline(d);
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof RpcError ? e.message : "تعذّر تحميل بيانات محركات البحث.";
        setError(message);
        toast(message, "bad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, reloadKey]);

  const page = pages.find((p) => p.pageKey === selected) ?? null;
  const dirty = !sameDraft(draft, baseline);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setJustSaved(false);
  };

  const pick = async (p: SeoPage) => {
    if (p.pageKey === selected) return;
    if (dirty) {
      const ok = await confirm(
        "لديك تعديلات لم تُحفَظ على هذه الصفحة. هل تنتقلين وتتجاهلينها؟",
        { confirmLabel: "تجاهُل التعديلات" }
      );
      if (!ok) return;
    }
    setSelected(p.pageKey);
    const d = draftOf(p.row);
    setDraft(d);
    setBaseline(d);
    setJustSaved(false);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const row = await rpc.seo.upsert<SeoRow>({
        pageKey: selected,
        metaTitleAr: orNull(draft.metaTitleAr),
        metaTitleEn: orNull(draft.metaTitleEn),
        metaDescriptionAr: orNull(draft.metaDescriptionAr),
        metaDescriptionEn: orNull(draft.metaDescriptionEn),
        ogImage: draft.ogImage,
        noIndex: draft.noIndex,
      });
      setPages((ps) => ps.map((p) => (p.pageKey === selected ? { ...p, row } : p)));
      const d = draftOf(row);
      setDraft(d);
      setBaseline(d);
      setJustSaved(true);
      toast("تم حفظ بيانات الصفحة ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ بيانات الصفحة.", "bad");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="جارٍ تحميل صفحات الموقع…" />;

  if (!pages.length) {
    return (
      <>
        {error && <p className="adm-err" role="alert">{error}</p>}
        <EmptyState
          title="لا توجد صفحات لضبطها"
          body="هنا تُضبط عناوين وأوصاف صفحات الموقع كما تظهر في نتائج جوجل. لم تصل قائمة الصفحات من الخادم — أعيدي المحاولة."
          actionLabel="إعادة المحاولة"
          onAction={() => setReloadKey((k) => k + 1)}
        />
      </>
    );
  }

  const titleLen = charCount(draft.metaTitleAr);
  const descLen = charCount(draft.metaDescriptionAr);
  const titleOver = titleLen > TITLE_LIMIT;
  const descOver = descLen > DESC_LIMIT;

  const previewUrl = page ? `${SITE_URL}${page.route}` : SITE_URL;
  const previewTitle = draft.metaTitleAr.trim();
  const previewDesc = draft.metaDescriptionAr.trim();

  /* The counters warn, they do not block: a long line still publishes. So the
     over-limit state is a red word, never the .adm-err alert box — that block
     is reserved for a request that actually failed. */
  const counterStyle = (over: boolean) => ({
    marginTop: -8,
    marginBottom: 16,
    fontSize: 12.5,
    color: over ? "#a3352f" : undefined,
    fontWeight: over ? 700 : undefined,
  });

  return (
    <>
      {error && <p className="adm-err" role="alert">{error}</p>}

      <p className="adm-note">
        ما تحفظينه هنا يُخزَّن فقط. تُكتَب هذه القيم داخل صفحات الموقع عند الضغط على «نشر على
        الموقع» في أعلى اللوحة.
      </p>

      <div className="adm-split">
        <aside className="adm-panel">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title">الصفحات</h2>
          </div>
          <div className="adm-list">
            {pages.map((p) => (
              <button
                key={p.pageKey}
                type="button"
                className={`adm-item ${p.pageKey === selected ? "selected" : ""}`}
                aria-current={p.pageKey === selected ? "true" : undefined}
                onClick={() => pick(p)}
                style={{ width: "100%", font: "inherit", cursor: "pointer", textAlign: "start" }}
              >
                <span className="adm-item-main">
                  <span className="adm-item-title">{p.label}</span>
                  <span className="adm-item-sub" dir="ltr">
                    {p.route}
                  </span>
                </span>
                {p.row?.noIndex ? (
                  <span className="adm-chip archived">مخفية</span>
                ) : !p.row ? (
                  <span className="adm-chip draft">لم تُضبط</span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <div>
          <div className="adm-panel">
            <div className="adm-panel-head">
              <h2>{page?.label}</h2>
              <span className="adm-panel-title" dir="ltr">
                {page?.route}
              </span>
            </div>

            {/* keyed per page: BilingualField decides once whether to show the
                English box, so it has to be rebuilt when the page changes */}
            <BilingualField
              key={`title-${selected ?? ""}`}
              label="عنوان الصفحة في نتائج البحث"
              hint="السطر الذي يُنقَر عليه في جوجل. اجعليه واضحًا ومختلفًا عن باقي الصفحات."
              valueAr={draft.metaTitleAr}
              valueEn={draft.metaTitleEn}
              onAr={(v) => set({ metaTitleAr: v })}
              onEn={(v) => set({ metaTitleEn: v })}
              placeholder={page?.label}
            />
            <p className="adm-muted" style={counterStyle(titleOver)}>
              {titleLen} / {TITLE_LIMIT} حرفًا
              {titleOver ? " — أطول من اللازم، ستقتطع جوجل بقيّة العنوان." : ""}
            </p>

            <BilingualField
              key={`desc-${selected ?? ""}`}
              label="الوصف"
              hint="الفقرة القصيرة تحت العنوان. اكتبيها كدعوة للقراءة، لا كقائمة كلمات مفتاحية."
              multiline
              rows={3}
              valueAr={draft.metaDescriptionAr}
              valueEn={draft.metaDescriptionEn}
              onAr={(v) => set({ metaDescriptionAr: v })}
              onEn={(v) => set({ metaDescriptionEn: v })}
            />
            <p className="adm-muted" style={counterStyle(descOver)}>
              {descLen} / {DESC_LIMIT} حرفًا
              {descOver ? " — أطول من اللازم، ستقتطع جوجل بقيّة الوصف." : ""}
            </p>

            <ImageField
              label="صورة المشاركة"
              value={draft.ogImage}
              onChange={(url) => set({ ogImage: url })}
              onError={(m) => toast(m, "bad")}
              hint="الصورة التي تظهر حين يُشارَك رابط الصفحة على LinkedIn أو واتساب. المقاس المفضّل ١٢٠٠×٦٣٠."
            />

            <div className="adm-field">
              <span className="adm-field-label">الظهور في محركات البحث</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle
                  checked={draft.noIndex}
                  onChange={(v) => set({ noIndex: v })}
                  label="إخفاء الصفحة عن محركات البحث"
                />
                <span className="adm-muted">
                  {draft.noIndex ? "مخفية عن جوجل" : "ظاهرة في نتائج جوجل"}
                </span>
              </div>
              <small className="adm-field-hint">
                عند التفعيل تُزال الصفحة من نتائج جوجل، ولن يصل إليها أحد عن طريق البحث. الرابط
                المباشر يظل يعمل.
              </small>
            </div>

            <div className="adm-toolbar2" style={{ marginBottom: 0 }}>
              <button className="btn btn-gold" onClick={save} disabled={!dirty || saving}>
                {saving ? "جارٍ الحفظ…" : "حفظ"}
              </button>
              <span className={`adm-saved ${justSaved && !dirty ? "on" : ""}`}>
                {dirty
                  ? "تعديلات لم تُحفَظ"
                  : justSaved
                    ? "تم الحفظ ✓"
                    : page?.row
                      ? `آخر تحديث ${formatDate(page.row.updatedAt)}`
                      : "لم تُضبط هذه الصفحة بعد"}
              </span>
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-head">
              <h2 className="adm-panel-title">معاينة نتيجة البحث</h2>
            </div>
            <div style={{ maxWidth: 620 }}>
              <p
                className="adm-muted"
                dir="ltr"
                style={{ margin: "0 0 5px", fontSize: 13 }}
              >
                {previewUrl}
              </p>
              {previewTitle ? (
                <p
                  style={{
                    margin: "0 0 6px",
                    fontFamily: "var(--font-messiri), serif",
                    fontSize: 20,
                    lineHeight: 1.5,
                    color: "var(--gold-text)",
                  }}
                >
                  {previewTitle}
                </p>
              ) : (
                <p
                  className="adm-muted"
                  style={{ margin: "0 0 6px", fontSize: 14.5, lineHeight: 1.85 }}
                >
                  بلا عنوان — سيبقى العنوان المكتوب داخل الصفحة كما هو.
                </p>
              )}
              {previewDesc ? (
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.85, color: "var(--ink)" }}>
                  {previewDesc}
                </p>
              ) : (
                <p className="adm-muted" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.85 }}>
                  بلا وصف — ستختار جوجل جملة من الصفحة نيابةً عنك.
                </p>
              )}
            </div>
            {draft.noIndex && (
              <p className="adm-muted" style={{ marginBottom: 0 }}>
                هذه الصفحة مخفية عن محركات البحث، فلن تظهر هذه النتيجة أصلًا.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
