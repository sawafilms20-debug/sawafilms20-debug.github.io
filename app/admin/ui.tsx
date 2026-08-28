"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { IconChevron, IconClose, IconDrag, IconSearch } from "./icons";

/* Shared dashboard primitives.

   One implementation each. Three separately built modals drift apart within a
   month — different widths, different close behaviour, and one of them with no
   scroll container at all. */

/* ------------------------------------------------------------------ toasts */

export type Toast = { message: string; kind: "ok" | "bad" };

type ToastFn = (message: string, kind?: "ok" | "bad") => void;

const ToastContext = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastContext);
export const ToastProvider = ToastContext.Provider;

/* ------------------------------------------------------------------ dialog */

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 720,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first real field, so typing starts where the operator expects.
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])"
      );
      (first ?? panelRef.current)?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  /* Rendered into document.body on purpose. A transformed ancestor becomes the
     containing block for position:fixed descendants — and an entrance
     animation whose last keyframe sets translateY(0) with fill-mode forwards
     leaves exactly such a transform behind. A dialog nested inside one sizes
     itself to that element's content box instead of the window. */
  return createPortal(
    <div
      className="adm-dialog-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="adm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        tabIndex={-1}
        style={{ maxWidth: width }}
      >
        <header className="adm-dialog-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="إغلاق">
            <IconClose />
          </button>
        </header>
        <div className="adm-dialog-body">{children}</div>
        {footer && <footer className="adm-dialog-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* ----------------------------------------------------------------- confirm */

export function useConfirm() {
  const [state, setState] = useState<{
    message: string;
    confirmLabel: string;
    danger: boolean;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (message: string, opts?: { confirmLabel?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) =>
        setState({
          message,
          confirmLabel: opts?.confirmLabel || "تأكيد",
          danger: opts?.danger ?? true,
          resolve,
        })
      ),
    []
  );

  const element = state ? (
    <Dialog
      open
      width={460}
      title="تأكيد"
      onClose={() => {
        state.resolve(false);
        setState(null);
      }}
      footer={
        <>
          <button
            className={`btn ${state.danger ? "btn-danger" : "btn-gold"}`}
            onClick={() => {
              state.resolve(true);
              setState(null);
            }}
          >
            {state.confirmLabel}
          </button>
          <button
            className="adm-link"
            onClick={() => {
              state.resolve(false);
              setState(null);
            }}
          >
            إلغاء
          </button>
        </>
      }
    >
      <p className="adm-confirm-text">{state.message}</p>
    </Dialog>
  ) : null;

  return { confirm, confirmElement: element };
}

/* ------------------------------------------------------------------ fields */

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="adm-field">
      <span className="adm-field-label">
        {label}
        {required && <i className="adm-req" aria-hidden="true"> *</i>}
      </span>
      {children}
      {hint && <small className="adm-field-hint">{hint}</small>}
    </label>
  );
}

/* Arabic is the site's language, so it comes first and is required; English is
   offered underneath as an optional translation, never the other way round. */
export function BilingualField({
  label,
  valueAr,
  valueEn,
  onAr,
  onEn,
  multiline,
  rows = 3,
  placeholder,
  required,
  hint,
}: {
  label: string;
  valueAr: string;
  valueEn: string;
  onAr: (v: string) => void;
  onEn: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  const [showEn, setShowEn] = useState(!!valueEn);
  const id = useId();
  return (
    <div className="adm-bilingual">
      <label className="adm-field" htmlFor={`${id}-ar`}>
        <span className="adm-field-label">
          {label}
          {required && <i className="adm-req" aria-hidden="true"> *</i>}
        </span>
        {multiline ? (
          <textarea
            id={`${id}-ar`}
            dir="rtl"
            rows={rows}
            value={valueAr}
            placeholder={placeholder}
            onChange={(e) => onAr(e.target.value)}
          />
        ) : (
          <input
            id={`${id}-ar`}
            dir="rtl"
            value={valueAr}
            placeholder={placeholder}
            onChange={(e) => onAr(e.target.value)}
          />
        )}
        {hint && <small className="adm-field-hint">{hint}</small>}
      </label>

      {showEn ? (
        <label className="adm-field adm-field-en" htmlFor={`${id}-en`}>
          <span className="adm-field-label adm-field-label-soft">
            {label} — الترجمة الإنجليزية (اختيارية)
          </span>
          {multiline ? (
            <textarea
              id={`${id}-en`}
              dir="ltr"
              rows={rows}
              value={valueEn}
              onChange={(e) => onEn(e.target.value)}
            />
          ) : (
            <input
              id={`${id}-en`}
              dir="ltr"
              value={valueEn}
              onChange={(e) => onEn(e.target.value)}
            />
          )}
        </label>
      ) : (
        <button type="button" className="adm-link adm-add-en" onClick={() => setShowEn(true)}>
          + إضافة ترجمة إنجليزية
        </button>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`adm-toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="adm-toggle-knob" />
    </button>
  );
}

/* ----------------------------------------------------------------- toolbar */

export function Toolbar({
  search,
  onSearch,
  placeholder = "بحث…",
  children,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="adm-toolbar2">
      {onSearch && (
        <div className="adm-search">
          <IconSearch />
          <input
            type="search"
            value={search ?? ""}
            placeholder={placeholder}
            onChange={(e) => onSearch(e.target.value)}
            aria-label={placeholder}
          />
        </div>
      )}
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="adm-segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.count === "number" && <i className="adm-seg-count">{o.count}</i>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  perPage,
  total,
  onPage,
}: {
  page: number;
  perPage: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div className="adm-pagination">
      <button className="adm-icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="السابق">
        <IconChevron dir="next" />
      </button>
      <span className="adm-num">
        {page} / {pages}
      </span>
      <button
        className="adm-icon-btn"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        aria-label="التالي"
      >
        <IconChevron dir="prev" />
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="adm-empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && onAction && (
        <button className="btn btn-gold" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Loading({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div className="adm-loading" role="status">
      <span className="adm-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

/* -------------------------------------------------------------- drag order */

/** Reorderable list. Drag with a mouse, or move with the keyboard — a list you
 *  can only reorder by dragging is a list some people cannot reorder. */
export function DragList<T extends { id: number }>({
  items,
  onReorder,
  renderItem,
}: {
  items: T[];
  onReorder: (ids: number[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next.map((i) => i.id));
  };

  return (
    <div className="adm-draglist">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`adm-dragrow ${dragId === item.id ? "dragging" : ""} ${
            overId === item.id && dragId !== item.id ? "over" : ""
          }`}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOverId(item.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId === null) return;
            move(
              items.findIndex((i) => i.id === dragId),
              index
            );
            setDragId(null);
            setOverId(null);
          }}
        >
          <span className="adm-drag-handle" aria-hidden="true">
            <IconDrag />
          </span>
          <div className="adm-dragrow-body">{renderItem(item, index)}</div>
          <span className="adm-drag-keys">
            <button
              className="adm-icon-btn"
              aria-label="تحريك لأعلى"
              disabled={index === 0}
              onClick={() => move(index, index - 1)}
            >
              ↑
            </button>
            <button
              className="adm-icon-btn"
              aria-label="تحريك لأسفل"
              disabled={index === items.length - 1}
              onClick={() => move(index, index + 1)}
            >
              ↓
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ charts */

/* Colour rules, applied everywhere below:
   - At most two categorical hues in one comparison. Ten cycled hues put an
     indistinguishable adjacent pair in front of a red-green colourblind reader.
   - Magnitude rankings get a single-hue light-to-dark ramp, not a hue per row.
   - The value is written on every row, so the bar is a reading aid, not the
     only carrier of the number. */

export function RankedBars({
  rows,
  emptyLabel = "لا توجد بيانات بعد",
  format,
}: {
  rows: { k: string; n: string | number }[];
  emptyLabel?: string;
  format?: (k: string) => ReactNode;
}) {
  const max = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.n) || 0)),
    [rows]
  );
  if (!rows.length) return <p className="adm-muted adm-chart-empty">{emptyLabel}</p>;
  return (
    <ul className="adm-bars">
      {rows.map((r, i) => {
        const n = Number(r.n) || 0;
        // single hue, light to dark by rank
        const strength = 0.28 + 0.62 * (1 - i / Math.max(1, rows.length - 1));
        return (
          <li key={`${r.k}-${i}`}>
            <span
              className="adm-bar-fill"
              style={{
                width: `${Math.max(3, (n / max) * 100)}%`,
                background: `color-mix(in srgb, var(--gold-deep) ${Math.round(
                  strength * 100
                )}%, var(--sand))`,
              }}
              aria-hidden="true"
            />
            <span className="adm-bar-label">{format ? format(r.k) : r.k}</span>
            <span className="adm-bar-value">{n.toLocaleString("en")}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function TrendChart({
  series,
  height = 160,
  label = "المشاهدات",
}: {
  series: { d: string; n?: string | number; views?: string | number }[];
  height?: number;
  label?: string;
}) {
  const points = series.map((s) => Number(s.n ?? s.views ?? 0));
  const max = Math.max(1, ...points);
  const w = 720;
  const h = height;
  const pad = 8;

  if (points.length < 2) {
    return <p className="adm-muted adm-chart-empty">لا توجد بيانات كافية لرسم منحنى بعد</p>;
  }

  const step = (w - pad * 2) / (points.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = points.map((v, i) => `${pad + i * step},${y(v)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${pad + (points.length - 1) * step},${h - pad}`;

  return (
    <figure className="adm-trend">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <polygon points={area} fill="var(--gold-soft)" opacity="0.45" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--gold-deep)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption>
        <span>{series[0]?.d}</span>
        <span>
          {label} — الذروة {max.toLocaleString("en")}
        </span>
        <span>{series[series.length - 1]?.d}</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------- misc */

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "الآن";
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d === 1) return "أمس";
  if (d < 7) return `قبل ${d} أيام`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    // Latin digits: every other figure in the dashboard is tabular-nums Western,
    // and Arabic-Indic numerals here would make dates the odd one out.
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      numberingSystem: "latn",
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} كيلوبايت`;
  return `${(n / 1024 / 1024).toFixed(1)} ميغابايت`;
}

/** Latin slug from an Arabic title: transliteration is not the goal, a stable
 *  readable URL is. Falls back to a dated stub when nothing survives. */
export function slugify(title: string): string {
  const map: Record<string, string> = {
    ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h",
    خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d",
    ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m",
    ن: "n", ه: "h", و: "w", ي: "y", ى: "a", ة: "a", ء: "", ئ: "", ؤ: "",
  };
  const out = Array.from(title.toLowerCase())
    .map((ch) => (map[ch] !== undefined ? map[ch] : /[a-z0-9]/.test(ch) ? ch : " "))
    .join("")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return out || `post-${new Date().toISOString().slice(0, 10)}`;
}
