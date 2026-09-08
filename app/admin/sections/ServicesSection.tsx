"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_URL } from "../config";
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

type Service = {
  id: number;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  summaryAr: string | null;
  summaryEn: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
  icon: string | null;
  coverImage: string | null;
  priceNote: string | null;
  displayOrder: number;
  isActive: boolean;
};

type Draft = {
  id: number | null;
  slug: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  coverImage: string | null;
  priceNote: string;
  isActive: boolean;
};

/* The card's slug is not decoration: it is the route the card links to, and
   the site only has these three service pages. Typing it by hand could only
   ever produce one of these three or a broken link, so it is a choice. */
const ROUTES: { slug: string; labelAr: string }[] = [
  { slug: "linkedin", labelAr: "بناء علامتك الشخصية على LinkedIn" },
  { slug: "articles", labelAr: "خدمة كتابة المقالات" },
  { slug: "scripts", labelAr: "خدمة كتابة سيناريو الفيديو" },
];

const blankDraft = (): Draft => ({
  id: null,
  slug: "",
  titleAr: "",
  titleEn: "",
  summaryAr: "",
  summaryEn: "",
  coverImage: null,
  priceNote: "",
  isActive: true,
});

const draftOf = (s: Service): Draft => ({
  id: s.id,
  slug: s.slug,
  titleAr: s.titleAr,
  titleEn: s.titleEn ?? "",
  summaryAr: s.summaryAr ?? "",
  summaryEn: s.summaryEn ?? "",
  coverImage: s.coverImage,
  priceNote: s.priceNote ?? "",
  isActive: s.isActive,
});

export default function ServicesSection({
  toast,
  confirm,
  newNonce,
  onCountsChanged,
}: SectionProps) {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    rpc.services
      .list<{ items: Service[] }>()
      .then((r) => {
        if (!cancelled) setItems(r.items);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof RpcError ? e.message : "تعذّر تحميل الخدمات.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* The header's "خدمة جديدة" button lives in the shell and only bumps a
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
    const byId = new Map(items.map((s) => [s.id, s]));
    setItems(ids.map((id) => byId.get(id)).filter((s): s is Service => !!s));
    try {
      await rpc.services.reorder<{ ok: boolean }>({ ids });
      toast("تم حفظ ترتيب الخدمات ✓");
      onCountsChanged();
    } catch (e) {
      setItems(before);
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الترتيب.", "bad");
    }
  };

  const setActive = async (s: Service, on: boolean) => {
    setItems((list) => list.map((x) => (x.id === s.id ? { ...x, isActive: on } : x)));
    try {
      // The router factory names this input "isVisible" for every collection,
      // including this one, where the column is actually "isActive".
      await rpc.services.setVisible<Service>({ id: s.id, isVisible: on });
      toast(on ? "الخدمة تظهر على الموقع ✓" : "أُخفيت الخدمة عن الموقع ✓");
      onCountsChanged();
    } catch (e) {
      setItems((list) => list.map((x) => (x.id === s.id ? { ...x, isActive: !on } : x)));
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الخدمة.", "bad");
    }
  };

  const remove = async (s: Service) => {
    const ok = await confirm(`سيُحذف «${s.titleAr}» نهائيًا. هل تريدين المتابعة؟`, {
      confirmLabel: "احذفي الخدمة",
    });
    if (!ok) return;
    try {
      await rpc.services.delete<{ ok: boolean }>({ id: s.id });
      setItems((list) => list.filter((x) => x.id !== s.id));
      toast("تم حذف الخدمة ✓");
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الخدمة.", "bad");
    }
  };

  const save = async () => {
    if (!draft) return;
    const titleAr = draft.titleAr.trim();
    const slug = draft.slug.trim().toLowerCase();
    if (!titleAr) {
      toast("عنوان الخدمة بالعربية مطلوب.", "bad");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast("المعرّف يُكتب بحروف لاتينية صغيرة وأرقام وشرطات فقط.", "bad");
      return;
    }
    /* The column is UNIQUE. Caught here, the operator reads why in Arabic;
       left to Postgres, she reads its English constraint text instead. */
    const clash = items.find((x) => x.slug === slug && x.id !== draft.id);
    if (clash) {
      toast(`المعرّف «${slug}» مستخدَم في «${clash.titleAr}». اختاري معرّفًا آخر.`, "bad");
      return;
    }

    const payload = {
      slug,
      titleAr,
      titleEn: draft.titleEn.trim() || null,
      summaryAr: draft.summaryAr.trim() || null,
      summaryEn: draft.summaryEn.trim() || null,
      coverImage: draft.coverImage || null,
      priceNote: draft.priceNote.trim() || null,
      isActive: draft.isActive,
    };

    setSaving(true);
    try {
      if (draft.id === null) {
        await rpc.services.create<Service>(payload);
        toast("تمت إضافة الخدمة ✓");
      } else {
        await rpc.services.update<Service>({ id: draft.id, ...payload });
        toast("تم حفظ الخدمة ✓");
      }
      setDraft(null);
      setTick((t) => t + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الخدمة.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>بطاقات الخدمات</h2>
          <span className="adm-panel-title">الترتيب هنا هو ترتيب الظهور</span>
        </div>

        <p className="adm-note">
          كل بطاقة تفتح صفحة خدمة على الموقع، ويحدّد المعرّف أيّ صفحة تفتحها. اسحبي البطاقات
          لتغيير ترتيبها على الصفحة الرئيسية — يُحفظ الترتيب فور تغييره.
        </p>

        {error && <p className="adm-err">{error}</p>}

        {loading ? (
          <Loading label="جارٍ تحميل الخدمات…" />
        ) : items.length ? (
          <DragList
            items={items}
            onReorder={saveOrder}
            renderItem={(s) => (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="adm-item-main">
                  <p className="adm-item-title">{s.titleAr}</p>
                  <p className="adm-item-sub">{s.summaryAr || "بلا ملخّص بعد"}</p>
                  <span className="adm-item-meta">
                    <span className="adm-chip" dir="ltr">
                      /{s.slug}
                    </span>
                    {!ROUTES.some((r) => r.slug === s.slug) && (
                      <span className="adm-chip new">لا صفحة بهذا المعرّف</span>
                    )}
                    {s.priceNote && <span>{s.priceNote}</span>}
                    {!s.isActive && <span>مخفيّة</span>}
                  </span>
                </div>
                <div className="adm-item-actions">
                  <Toggle
                    checked={s.isActive}
                    onChange={(v) => setActive(s, v)}
                    label={`إظهار ${s.titleAr} على الموقع`}
                  />
                  <button className="adm-link" onClick={() => setDraft(draftOf(s))}>
                    تحرير
                  </button>
                  <button
                    className="adm-icon-btn"
                    onClick={() => remove(s)}
                    aria-label={`حذف ${s.titleAr}`}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            )}
          />
        ) : (
          <EmptyState
            title="لا توجد خدمات بعد"
            body="الخدمات هي البطاقات الثلاث على الصفحة الرئيسية: خدمات LinkedIn، كتابة المقالات، وسيناريو الفيديو. أضيفي أول بطاقة واختاري لها المعرّف الذي يوافق صفحتها."
            actionLabel="أضيفي خدمة"
            onAction={() => setDraft(blankDraft())}
          />
        )}
      </div>

      {draft && (
        <Dialog
          open
          onClose={() => setDraft(null)}
          title={draft.id === null ? "خدمة جديدة" : "تحرير الخدمة"}
          subtitle="العنوان والملخّص يظهران على البطاقة، ونصّ الصفحة يظهر داخل صفحة الخدمة."
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
            label="عنوان الخدمة"
            required
            valueAr={draft.titleAr}
            valueEn={draft.titleEn}
            onAr={(v) => patch({ titleAr: v })}
            onEn={(v) => patch({ titleEn: v })}
          />

          <BilingualField
            label="الملخّص"
            multiline
            rows={3}
            hint="سطران على الأكثر — هذا ما يُقرأ على البطاقة نفسها."
            valueAr={draft.summaryAr}
            valueEn={draft.summaryEn}
            onAr={(v) => patch({ summaryAr: v })}
            onEn={(v) => patch({ summaryEn: v })}
          />

          {/* «نصّ الصفحة» stood here: a Markdown box asking for `##` and `**`,
              writing to a column the published site never reads. The words on
              /linkedin, /articles and /scripts come from «نصوص الصفحات». */}
          <p className="adm-note">
            هذه البطاقة هي ما يظهر على الصفحة الرئيسية. نصّ صفحة الخدمة نفسها
            يُحرَّر من «نصوص الصفحات».
          </p>

          <ImageField
            label="صورة البطاقة"
            value={draft.coverImage}
            onChange={(url) => patch({ coverImage: url })}
            onError={(m) => toast(m, "bad")}
            hint="صورة عريضة تظهر أعلى البطاقة. اتركيها فارغة لتبقى البطاقة بأيقونتها الحالية."
          />

          <div className="adm-grid-2">
            <Field
              label="الصفحة التي تفتحها البطاقة"
              required
              hint={draft.slug ? `${SITE_URL}/${draft.slug}/` : "اختاري إحدى صفحات الخدمات الثلاث."}
            >
              <select value={draft.slug} onChange={(e) => patch({ slug: e.target.value })}>
                <option value="">— اختاري صفحة —</option>
                {ROUTES.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.labelAr}
                  </option>
                ))}
                {/* A row already pointing somewhere else keeps showing it,
                    rather than silently snapping to the first choice. */}
                {draft.slug && !ROUTES.some((r) => r.slug === draft.slug) && (
                  <option value={draft.slug}>{draft.slug}</option>
                )}
              </select>
            </Field>

            <Field
              label="ملاحظة السعر"
              hint="سطر قصير يظهر أسفل البطاقة، مثل «تبدأ من ٥٠٠ ر.س». اتركيه فارغًا لإخفائه."
            >
              <input
                dir="rtl"
                value={draft.priceNote}
                onChange={(e) => patch({ priceNote: e.target.value })}
              />
            </Field>
          </div>

          <div className="adm-field">
            <span className="adm-field-label">الظهور على الموقع</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle
                checked={draft.isActive}
                onChange={(v) => patch({ isActive: v })}
                label="إظهار الخدمة على الموقع"
              />
              <span className="adm-muted">
                {draft.isActive ? "ظاهرة على الصفحة الرئيسية" : "مخفيّة عن الزوّار"}
              </span>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
