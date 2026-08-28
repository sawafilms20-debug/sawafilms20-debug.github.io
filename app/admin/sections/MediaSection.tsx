"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SectionProps } from "../types";
import { rpc, RpcError } from "../rpc";
import {
  BilingualField,
  Dialog,
  EmptyState,
  Loading,
  Segmented,
  Toolbar,
  formatBytes,
  formatDate,
} from "../ui";
import { MediaThumb, UploadZone, useMediaLibrary, type MediaAsset } from "../MediaPicker";
import { IconCopy, IconTrash } from "../icons";

/* The media library.

   One upload, many uses: the same photo is picked from here by the article
   editor, the services list and the settings screen, so alt text written once
   travels with the file everywhere it appears. */

type Kind = "all" | "image" | "pdf";

/** media.list returns these two columns too; MediaAsset leaves them out because
 *  the picker has no use for them. */
type LibraryAsset = MediaAsset & { altEn?: string | null; createdAt?: string | null };

const isImage = (a: LibraryAsset) => a.mimeType.startsWith("image/");
const isPdf = (a: LibraryAsset) => a.mimeType === "application/pdf";

function fileCount(n: number): string {
  if (n === 1) return "ملف واحد";
  if (n === 2) return "ملفان";
  if (n <= 10) return `${n} ملفات`;
  return `${n} ملفًا`;
}

export default function MediaSection({ toast, confirm, newNonce }: SectionProps) {
  const { items, total, totalBytes, loading, error, reload } = useMediaLibrary();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [selected, setSelected] = useState<LibraryAsset | null>(null);
  const [altAr, setAltAr] = useState("");
  const [altEn, setAltEn] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const skipFirstSearch = useRef(true);
  const lastNonce = useRef(newNonce);

  const assets: LibraryAsset[] = items;
  const query = search.trim();

  useEffect(() => {
    // The hook already fetched page one on mount; only later edits re-query.
    if (skipFirstSearch.current) {
      skipFirstSearch.current = false;
      return;
    }
    const t = setTimeout(() => reload(query), 300);
    return () => clearTimeout(t);
  }, [query, reload]);

  const openFilePicker = useCallback(() => {
    dropRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // UploadZone owns its file input, so the header's «رفع صورة» presses that
    // component's own button instead of this screen keeping a second input.
    dropRef.current?.querySelector("button")?.click();
  }, []);

  useEffect(() => {
    if (newNonce === lastNonce.current) return;
    lastNonce.current = newNonce;
    openFilePicker();
  }, [newNonce, openFilePicker]);

  const counts = useMemo(
    () => ({
      images: assets.filter(isImage).length,
      pdfs: assets.filter(isPdf).length,
    }),
    [assets]
  );

  /* media.list filters on ONE exact mimeType, so «صور» — which spans jpeg, png,
     webp, avif and gif — has no single server-side value. Both options are
     applied to the loaded list here instead, so the two filters behave alike
     and the counts printed beside them stay true. */
  const shown = useMemo(
    () =>
      kind === "all" ? assets : assets.filter((a) => (kind === "pdf" ? isPdf(a) : isImage(a))),
    [assets, kind]
  );

  const open = (a: LibraryAsset) => {
    setSelected(a);
    setAltAr(a.altAr || "");
    setAltEn(a.altEn || "");
    setManualCopy(false);
  };

  const copyUrl = async (url: string) => {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      toast("نُسخ الرابط ✓");
    } catch {
      // The clipboard API is unavailable outside a secure context and inside
      // some embedded browsers; leave a selectable field rather than a dead button.
      setManualCopy(true);
      toast("تعذّر النسخ تلقائيًا — انسخي الرابط من الحقل الظاهر.", "bad");
    }
  };

  const saveAlt = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // The server keeps the old value when a field arrives as null, so both are
      // sent as strings — an empty one is how alt text gets cleared.
      const row = await rpc.media.updateAlt<LibraryAsset>({
        id: selected.id,
        altAr: altAr.trim(),
        altEn: altEn.trim(),
      });
      setSelected(row);
      toast("حُفظ النص البديل ✓");
      reload(query);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ النص البديل.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    const ok = await confirm(
      `سيُحذف «${selected.fileName}» نهائيًا. إن كان مستخدمًا في صفحة أو مقال على الموقع فسيختفي من مكانه هناك ولن يظهر بديل عنه.`,
      { confirmLabel: "احذفي الملف", danger: true }
    );
    if (!ok) return;
    try {
      await rpc.media.delete<{ ok: boolean }>({ id: selected.id });
      setSelected(null);
      toast("حُذف الملف ✓");
      reload(query);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الملف.", "bad");
    }
  };

  const filtering = !!query || kind !== "all";

  return (
    <>
      <div ref={dropRef}>
        <UploadZone
          onUploaded={() => {
            toast("تم الرفع ✓");
            reload(query);
          }}
          onError={(m) => toast(m, "bad")}
        />
      </div>

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>الملفات المرفوعة</h2>
          <p className="adm-muted">
            {fileCount(total)} · {formatBytes(totalBytes)}
            {loading && assets.length > 0 ? " · جارٍ التحديث…" : ""}
          </p>
        </div>

        <Toolbar search={search} onSearch={setSearch} placeholder="بحث بالاسم أو النص البديل…">
          <Segmented<Kind>
            value={kind}
            onChange={setKind}
            ariaLabel="نوع الملف"
            options={[
              { value: "all", label: "الكل", count: assets.length },
              { value: "image", label: "صور", count: counts.images },
              { value: "pdf", label: "PDF", count: counts.pdfs },
            ]}
          />
        </Toolbar>

        {error && <p className="adm-err">{error}</p>}

        {loading && !assets.length ? (
          <Loading />
        ) : shown.length ? (
          <div className="adm-media-grid">
            {shown.map((a) => (
              <button
                key={a.id}
                type="button"
                className="adm-media-card"
                onClick={() => open(a)}
              >
                <span className="adm-media-thumb">
                  <MediaThumb asset={a} />
                </span>
                <span className="adm-media-meta">
                  <b>{a.fileName}</b>
                  <span>
                    {a.width && a.height ? `${a.width}×${a.height} · ` : ""}
                    {formatBytes(a.sizeBytes)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : filtering ? (
          <EmptyState
            title="لا ملفات مطابقة"
            body="لا يوجد في المكتبة ملف يطابق البحث أو نوع الملف المختار. جرّبي كلمة أخرى أو اعرضي الكل."
            actionLabel="عرض كل الملفات"
            onAction={() => {
              setSearch("");
              setKind("all");
            }}
          />
        ) : (
          <EmptyState
            title="المكتبة فارغة"
            body="هنا تُحفظ كل الصور والملفات المرفوعة، فترفعين الصورة مرة واحدة وتستخدمينها في المقالات والخدمات وإعدادات الموقع دون إعادة رفعها."
            actionLabel="رفع أول ملف"
            onAction={openFilePicker}
          />
        )}
      </div>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="تفاصيل الملف"
        subtitle={selected?.fileName}
        width={720}
        footer={
          <>
            <button className="btn btn-gold" onClick={saveAlt} disabled={saving}>
              {saving ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            <button className="adm-link adm-danger" onClick={remove}>
              <IconTrash /> حذف
            </button>
          </>
        }
      >
        {selected && (
          <>
            {isPdf(selected) ? (
              <iframe className="adm-preview-frame" src={selected.url} title={selected.fileName} />
            ) : (
              <img
                src={selected.url}
                alt={selected.altAr || ""}
                style={{
                  width: "100%",
                  maxHeight: "44vh",
                  objectFit: "contain",
                  borderRadius: 12,
                  background: "var(--sand)",
                }}
              />
            )}

            <div className="adm-kv" style={{ margin: "16px 0" }}>
              <div>
                <span>النوع</span>
                <b dir="ltr">{selected.mimeType}</b>
              </div>
              <div>
                <span>الأبعاد</span>
                <b dir="ltr">
                  {selected.width && selected.height
                    ? `${selected.width}×${selected.height}`
                    : "—"}
                </b>
              </div>
              <div>
                <span>الحجم</span>
                <b>{formatBytes(selected.sizeBytes)}</b>
              </div>
              <div>
                <span>تاريخ الرفع</span>
                <b>{formatDate(selected.createdAt)}</b>
              </div>
            </div>

            <div className="adm-field">
              <span className="adm-field-label">الرابط العلني</span>
              <p className="adm-code">{selected.url}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyUrl(selected.url)}
                >
                  <IconCopy /> نسخ الرابط
                </button>
                {manualCopy && (
                  <input
                    dir="ltr"
                    readOnly
                    value={selected.url}
                    aria-label="الرابط العلني للنسخ اليدوي"
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                )}
              </div>
              <small className="adm-field-hint">
                هذا هو الرابط الذي يستخدمه الموقع لعرض الملف.
              </small>
            </div>

            <div style={{ marginTop: 16 }}>
              <BilingualField
                label="النص البديل"
                valueAr={altAr}
                valueEn={altEn}
                onAr={setAltAr}
                onEn={setAltEn}
                multiline
                rows={2}
                placeholder="وصف مختصر لما تُظهره الصورة"
                hint="يقرأه من يتصفّح الموقع بقارئ شاشة، ويظهر مكان الصورة إن تعذّر تحميلها. اتركيه فارغًا إن كانت الصورة زخرفية فقط."
              />
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
