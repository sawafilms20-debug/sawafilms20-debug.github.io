"use client";

import { useEffect, useState } from "react";
import { ImageField } from "../MediaPicker";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { EmptyState, Field, Loading } from "../ui";

type SettingType = "text" | "image" | "url" | "color" | "json";

type Setting = {
  key: string;
  label: string;
  type: SettingType;
  value: string | null;
};

type Values = Record<string, string | null>;

const valuesOf = (items: Setting[]): Values =>
  Object.fromEntries(items.map((s) => [s.key, s.value]));

/** An emptied field clears the setting rather than storing a blank string, so
 *  the site falls back to its built-in default instead of rendering nothing. */
const orNull = (v: string | null) => (v && v.trim() ? v.trim() : null);

export default function SiteSettingsSection({ toast }: SectionProps) {
  const [items, setItems] = useState<Setting[]>([]);
  const [saved, setSaved] = useState<Values>({});
  const [draft, setDraft] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await rpc.siteSettings.list<{ items: Setting[] }>();
        if (cancelled) return;
        setItems(r.items);
        setSaved(valuesOf(r.items));
        setDraft(valuesOf(r.items));
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof RpcError ? e.message : "تعذّر تحميل إعدادات الموقع.";
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

  const changed = items.filter((s) => orNull(draft[s.key] ?? null) !== orNull(saved[s.key] ?? null));

  const set = (key: string, value: string | null) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setJustSaved(false);
  };

  const save = async () => {
    // A link saved without its scheme resolves relative to whatever page it
    // lands on, so the footer ends up pointing at raheeqkanjo.com/linkedin.com/…
    // The server stores any string it is given, so the check has to be here.
    const badUrl = changed.find(
      (s) =>
        s.type === "url" &&
        !!orNull(draft[s.key] ?? null) &&
        !/^https?:\/\//i.test(String(orNull(draft[s.key] ?? null)))
    );
    if (badUrl) {
      toast(`«${badUrl.label}» يبدأ بـ https:// — انسخي الرابط كاملًا من شريط المتصفح.`, "bad");
      return;
    }

    setSaving(true);
    // Written one at a time; whatever landed before a failure stays committed
    // locally, so a retry does not re-send settings the server already has.
    const landed: Values = {};
    try {
      for (const s of changed) {
        const value = orNull(draft[s.key] ?? null);
        await rpc.siteSettings.upsert<{ ok: boolean }>({
          settingKey: s.key,
          settingValue: value,
          settingType: s.type,
        });
        landed[s.key] = value;
      }
      setJustSaved(true);
      toast(`تم حفظ ${changed.length} إعداد ✓`);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الإعدادات.", "bad");
    } finally {
      setSaved((v) => ({ ...v, ...landed }));
      setDraft((v) => ({ ...v, ...landed }));
      setSaving(false);
    }
  };

  if (loading) return <Loading label="جارٍ تحميل إعدادات الموقع…" />;

  if (!items.length) {
    return (
      <>
        {error && <p className="adm-err" role="alert">{error}</p>}
        <EmptyState
          title="لا توجد إعدادات لعرضها"
          body="هنا يُضبط الشعار وبيانات التواصل وسطور التذييل التي تظهر على كل صفحة. لم تصل القائمة من الخادم — أعيدي المحاولة."
          actionLabel="إعادة المحاولة"
          onAction={() => setReloadKey((k) => k + 1)}
        />
      </>
    );
  }

  return (
    <>
      {error && <p className="adm-err" role="alert">{error}</p>}

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>إعدادات الموقع</h2>
          <p className="adm-panel-title">تظهر على كل صفحة</p>
        </div>

        <div className="adm-grid-2">
          {items.map((s) => {
            if (s.type === "image") {
              return (
                <ImageField
                  key={s.key}
                  label={s.label}
                  value={draft[s.key] ?? null}
                  onChange={(url) => set(s.key, url)}
                  onError={(m) => toast(m, "bad")}
                />
              );
            }
            if (s.type === "url") {
              return (
                <Field key={s.key} label={s.label} hint="الرابط كاملًا، يبدأ بـ https://">
                  <input
                    dir="ltr"
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    value={draft[s.key] ?? ""}
                    onChange={(e) => set(s.key, e.target.value)}
                  />
                </Field>
              );
            }
            return (
              <Field key={s.key} label={s.label}>
                <input
                  dir="auto"
                  value={draft[s.key] ?? ""}
                  onChange={(e) => set(s.key, e.target.value)}
                />
              </Field>
            );
          })}
        </div>

        <div className="adm-toolbar2" style={{ marginBottom: 0 }}>
          <button className="btn btn-gold" onClick={save} disabled={!changed.length || saving}>
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          <span className={`adm-saved ${justSaved && !changed.length ? "on" : ""}`}>
            {changed.length
              ? `${changed.length} إعداد لم يُحفَظ`
              : justSaved
                ? "تم الحفظ ✓"
                : "لا تغييرات غير محفوظة"}
          </span>
        </div>
      </div>
    </>
  );
}
