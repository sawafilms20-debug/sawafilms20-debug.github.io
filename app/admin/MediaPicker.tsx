"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, RpcError, uploadFile } from "./rpc";
import { Dialog, EmptyState, Loading, formatBytes } from "./ui";
import { IconPlus, IconTrash } from "./icons";

/* Choosing an image, anywhere in the dashboard.

   Every place that takes a picture opens this, not a bare file input: a bare
   input re-uploads the same photo for every use and leaves the library as a
   pile of duplicates with no alt text on any of them. */

export type MediaAsset = {
  id: number;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altAr: string | null;
};

export function useMediaLibrary() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const r = await rpc.media.list<{
        items: MediaAsset[];
        total: number;
        totalBytes: number;
      }>({ page: 1, perPage: 100, ...(search ? { search } : {}) });
      setItems(r.items);
      setTotal(r.total);
      setTotalBytes(r.totalBytes);
    } catch (e) {
      setError(e instanceof RpcError ? e.message : "تعذّر تحميل المكتبة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, total, totalBytes, loading, error, reload: load };
}

export function MediaThumb({ asset }: { asset: MediaAsset }) {
  if (asset.mimeType === "application/pdf") {
    return <span className="adm-muted">PDF</span>;
  }
  return <img src={asset.url} alt={asset.altAr || ""} loading="lazy" />;
}

/** Upload control shared by the picker and the library screen. */
export function UploadZone({
  onUploaded,
  onError,
  label = "اسحبي صورة إلى هنا، أو اختاري ملفًا",
}: {
  onUploaded: (asset: MediaAsset) => void;
  onError: (message: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const asset = await uploadFile(file);
        onUploaded({ ...asset, altAr: null });
      }
    } catch (e) {
      onError(e instanceof RpcError ? e.message : "تعذّر رفع الملف.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`adm-drop ${over ? "over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        send(e.dataTransfer.files);
      }}
    >
      <p style={{ margin: "0 0 10px" }}>{busy ? "جارٍ الرفع…" : label}</p>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <IconPlus /> اختيار ملف
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf"
        onChange={(e) => send(e.target.files)}
      />
      <p className="adm-muted" style={{ margin: "10px 0 0", fontSize: 12.5 }}>
        صور JPG أو PNG أو WebP أو AVIF أو GIF، وملفات PDF — حتى ٨ ميغابايت.
      </p>
    </div>
  );
}

export function MediaPicker({
  open,
  onClose,
  onPick,
  onError,
  title = "اختيار صورة",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, asset: MediaAsset) => void;
  onError: (message: string) => void;
  title?: string;
}) {
  const { items, loading, error, reload } = useMediaLibrary();
  const [local, setLocal] = useState<MediaAsset[]>([]);

  useEffect(() => {
    if (open) setLocal([]);
  }, [open]);

  const all = [...local, ...items.filter((i) => !local.some((l) => l.id === i.id))];

  return (
    <Dialog open={open} onClose={onClose} title={title} width={780}>
      <UploadZone
        onUploaded={(a) => {
          setLocal((l) => [a, ...l]);
          reload();
        }}
        onError={onError}
      />
      {error && <p className="adm-err">{error}</p>}
      {loading && !all.length ? (
        <Loading />
      ) : all.length ? (
        <div className="adm-media-grid">
          {all.map((a) => (
            <button
              key={a.id}
              type="button"
              className="adm-media-card"
              onClick={() => {
                onPick(a.url, a);
                onClose();
              }}
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
      ) : (
        <EmptyState
          title="المكتبة فارغة"
          body="ارفعي أول صورة من الأعلى، وستظهر هنا جاهزة لإعادة الاستخدام في أي مكان على الموقع."
        />
      )}
    </Dialog>
  );
}

/** A single image field: shows the current picture, opens the library, clears. */
export function ImageField({
  label,
  value,
  onChange,
  onError,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onError: (message: string) => void;
  hint?: string;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="adm-field">
      <span className="adm-field-label">{label}</span>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {value ? (
          <img
            src={value}
            alt=""
            style={{
              width: 92,
              height: 68,
              objectFit: "cover",
              borderRadius: 10,
              border: "1px solid var(--line)",
            }}
          />
        ) : (
          <span
            className="adm-muted"
            style={{
              width: 92,
              height: 68,
              borderRadius: 10,
              border: "1px dashed var(--line)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
            }}
          >
            لا صورة
          </span>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setPicking(true)}>
          {value ? "تغيير" : "اختيار صورة"}
        </button>
        {value && (
          <button type="button" className="adm-link adm-danger" onClick={() => onChange(null)}>
            <IconTrash /> إزالة
          </button>
        )}
      </div>
      {hint && <small className="adm-field-hint">{hint}</small>}
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(url) => onChange(url)}
        onError={onError}
      />
    </div>
  );
}
