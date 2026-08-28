"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import {
  Dialog,
  EmptyState,
  Field,
  Loading,
  Pagination,
  Segmented,
  Toolbar,
  formatDate,
  relativeTime,
} from "../ui";
import { IconExport } from "../icons";

/* The inbox, read as a pipeline: جديدة → مقروءة → تم الرد → مؤرشفة.
   Every row belongs to exactly one of those, so the tabs are the whole story
   and nothing waits for an answer without being counted somewhere. */

type EnquiryStatus = "new" | "read" | "replied" | "archived";
type Filter = EnquiryStatus | "all";

type Enquiry = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  serviceInterest: string | null;
  message: string;
  source: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  status: EnquiryStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResult = {
  items: Enquiry[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<string, number>;
};

const PER_PAGE = 25;

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: "جديدة",
  read: "مقروءة",
  replied: "تم الرد",
  archived: "مؤرشفة",
};

const STATUS_OPTIONS: { value: EnquiryStatus; label: string }[] = [
  { value: "new", label: STATUS_LABEL.new },
  { value: "read", label: STATUS_LABEL.read },
  { value: "replied", label: STATUS_LABEL.replied },
  { value: "archived", label: STATUS_LABEL.archived },
];

const SOURCE_LABEL: Record<string, string> = {
  homepage: "الصفحة الرئيسية",
  "contact-page": "صفحة التواصل",
  "contact-form": "نموذج التواصل",
  "blog-subscribe": "نموذج المدوّنة",
};

const sourceLabel = (s: string | null) => (s ? SOURCE_LABEL[s] ?? s : "مصدر غير معروف");

/** Arabic counts the first ten differently from the rest. */
function countLabel(n: number): string {
  if (n === 1) return "رسالة واحدة";
  if (n === 2) return "رسالتين";
  if (n <= 10) return `${n} رسائل`;
  return `${n} رسالة`;
}

function downloadCsv(csv: string, fileName: string) {
  // The BOM is what makes Excel read an Arabic UTF-8 CSV as Arabic. Written as
  // an escape, not a literal: an invisible U+FEFF in source is too easy to lose.
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  /* The anchor has to be in the document and the blob URL has to outlive the
     click: revoking in the same tick cancels the download in Firefox and
     Safari, and the operator gets nothing with no error to explain it. */
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const today = () => new Date().toISOString().slice(0, 10);

export default function EnquiriesSection({ toast, confirm, onCountsChanged }: SectionProps) {
  const [filter, setFilter] = useState<Filter>("new");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);

  const [items, setItems] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [detail, setDetail] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  /* Status edits inside the dialog are patched into the open row instead of
     reloading, so a row does not vanish under the reader when it stops
     matching the current tab. The list catches up once the dialog closes. */
  const staleAfterDialog = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    rpc.enquiries
      .list<ListResult>({
        status: filter,
        page,
        perPage: PER_PAGE,
        ...(query ? { search: query } : {}),
      })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.total);
        setCounts(r.counts);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        // Inline rather than a toast: a failed load leaves an empty screen that
        // needs an explanation and a retry in the place the rows should be.
        setError(e instanceof RpcError ? e.message : "تعذّر تحميل الرسائل.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, page, query, nonce]);

  useEffect(() => {
    setSelected([]);
  }, [filter, page, query, nonce]);

  const allCount = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  const tabs = useMemo(
    () => [
      { value: "new" as Filter, label: STATUS_LABEL.new, count: counts.new ?? 0 },
      { value: "read" as Filter, label: STATUS_LABEL.read, count: counts.read ?? 0 },
      { value: "replied" as Filter, label: STATUS_LABEL.replied, count: counts.replied ?? 0 },
      { value: "archived" as Filter, label: STATUS_LABEL.archived, count: counts.archived ?? 0 },
      { value: "all" as Filter, label: "الكل", count: allCount },
    ],
    [counts, allCount]
  );

  const reload = () => setNonce((n) => n + 1);

  const applyStatus = async (row: Enquiry, status: EnquiryStatus, quiet = false) => {
    if (row.status === status) return;
    try {
      const updated = await rpc.enquiries.setStatus<Enquiry>({ id: row.id, status });
      setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));
      setDetail((d) => (d && d.id === updated.id ? updated : d));
      setCounts((c) => ({
        ...c,
        [row.status]: Math.max(0, (c[row.status] ?? 0) - 1),
        [status]: (c[status] ?? 0) + 1,
      }));
      staleAfterDialog.current = true;
      onCountsChanged();
      if (!quiet) toast(`الحالة الآن «${STATUS_LABEL[status]}» ✓`);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الرسالة.", "bad");
    }
  };

  const openRow = (row: Enquiry) => {
    setDetail(row);
    setNotes(row.notes ?? "");
    setNotesSaved(false);
    // Reading a message is what marks it read; nobody should have to remember to.
    if (row.status === "new") applyStatus(row, "read", true);
  };

  const closeDetail = () => {
    setDetail(null);
    if (staleAfterDialog.current) {
      staleAfterDialog.current = false;
      reload();
    }
  };

  const saveNotes = async () => {
    if (!detail) return;
    setSavingNotes(true);
    try {
      const updated = await rpc.enquiries.setNotes<Enquiry>({ id: detail.id, notes });
      setDetail(updated);
      setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));
      setNotesSaved(true);
      toast("حُفظت الملاحظات ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ الملاحظات.", "bad");
    } finally {
      setSavingNotes(false);
    }
  };

  const removeOne = async (row: Enquiry) => {
    const ok = await confirm(
      `سيتم حذف رسالة ${row.name} نهائيًا، ولا يمكن التراجع عن ذلك.`,
      { confirmLabel: "احذفي الرسالة" }
    );
    if (!ok) return;
    try {
      await rpc.enquiries.delete<{ ok: boolean }>({ id: row.id });
      setDetail(null);
      staleAfterDialog.current = false;
      reload();
      onCountsChanged();
      toast("حُذفت الرسالة ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الرسالة.", "bad");
    }
  };

  const bulkStatus = async (status: EnquiryStatus) => {
    if (!selected.length) return;
    setBusy(true);
    try {
      const r = await rpc.enquiries.bulkStatus<{ updated: number }>({ ids: selected, status });
      reload();
      onCountsChanged();
      toast(`تم تحديث ${countLabel(r.updated)} إلى «${STATUS_LABEL[status]}» ✓`);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تحديث الرسائل المحددة.", "bad");
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    const ok = await confirm(
      `سيتم حذف ${countLabel(selected.length)} نهائيًا، ولا يمكن التراجع عن ذلك.`,
      { confirmLabel: "احذفي نهائيًا" }
    );
    if (!ok) return;
    setBusy(true);
    // No bulk delete on the server, so one call per row and a count of failures.
    const results = await Promise.allSettled(
      selected.map((id) => rpc.enquiries.delete<{ ok: boolean }>({ id }))
    );
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    reload();
    onCountsChanged();
    if (failed) toast(`تعذّر حذف ${countLabel(failed)} من المحدد.`, "bad");
    else toast(`تم حذف ${countLabel(selected.length)} ✓`);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await rpc.enquiries.exportCsv<{ csv: string; count: number }>();
      if (!r.count) {
        toast("لا توجد رسائل لتصديرها بعد.", "bad");
        return;
      }
      downloadCsv(r.csv, `enquiries-${today()}.csv`);
      toast(`تم تصدير ${countLabel(r.count)} ✓`);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تصدير الرسائل.", "bad");
    } finally {
      setExporting(false);
    }
  };

  const toggleOne = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const filtering = filter !== "new" || !!query;

  return (
    <div className="adm-panel">
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="ابحثي بالاسم أو البريد أو نص الرسالة…"
      >
        <Segmented<Filter>
          value={filter}
          options={tabs}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          ariaLabel="تصفية الرسائل حسب الحالة"
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={exportCsv}
          disabled={exporting}
        >
          <IconExport /> {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
        </button>
      </Toolbar>

      {selected.length > 0 && (
        <div className="adm-bulkbar">
          <span>{countLabel(selected.length)} محددة</span>
          <button
            type="button"
            className="adm-link"
            onClick={() => bulkStatus("replied")}
            disabled={busy}
          >
            تعليم «تم الرد»
          </button>
          <button
            type="button"
            className="adm-link"
            onClick={() => bulkStatus("archived")}
            disabled={busy}
          >
            أرشفة
          </button>
          <button
            type="button"
            className="adm-link adm-danger"
            onClick={bulkDelete}
            disabled={busy}
          >
            حذف
          </button>
          <button
            type="button"
            className="adm-link"
            onClick={() => setSelected(items.map((i) => i.id))}
            disabled={busy || selected.length === items.length}
          >
            تحديد كل الظاهر
          </button>
          <button type="button" className="adm-link" onClick={() => setSelected([])}>
            إلغاء التحديد
          </button>
        </div>
      )}

      {error && (
        <p className="adm-err" role="alert">
          {error}{" "}
          <button type="button" className="adm-link" onClick={reload}>
            إعادة المحاولة
          </button>
        </p>
      )}

      {loading ? (
        <Loading label="جارٍ تحميل الرسائل…" />
      ) : items.length === 0 ? (
        filtering ? (
          <EmptyState
            title="لا رسائل هنا"
            body="لا توجد رسالة تطابق البحث أو التبويب المفتوح. جرّبي تبويب «الكل» لرؤية كل ما وصل."
            actionLabel="عرض كل الرسائل"
            onAction={() => {
              setFilter("all");
              setSearch("");
              setQuery("");
              setPage(1);
            }}
          />
        ) : (
          <EmptyState
            title="لا رسائل جديدة"
            body="رسائل نموذج التواصل على الموقع تصل إلى هنا: الاسم والبريد ونص الرسالة، مع الصفحة التي أُرسلت منها. ستجدين كل رسالة وصلت سابقًا في تبويب «الكل»."
            actionLabel="تحديث القائمة"
            onAction={reload}
          />
        )
      ) : (
        <>
          <div className="adm-list">
            {items.map((row) => {
              const isSelected = selected.includes(row.id);
              return (
                <div className={`adm-item ${isSelected ? "selected" : ""}`} key={row.id}>
                  <input
                    type="checkbox"
                    className="adm-checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`تحديد رسالة ${row.name}`}
                  />
                  <button
                    type="button"
                    className="adm-item-main"
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      font: "inherit",
                      textAlign: "start",
                      cursor: "pointer",
                    }}
                    onClick={() => openRow(row)}
                  >
                    <span className="adm-item-title">{row.name}</span>
                    <span className="adm-item-sub" dir="auto">
                      {row.message}
                    </span>
                    <span className="adm-item-meta">
                      <bdi dir="ltr">{row.email}</bdi>
                      <span>{sourceLabel(row.source)}</span>
                      <span>{relativeTime(row.createdAt)}</span>
                    </span>
                  </button>
                  <div className="adm-item-actions">
                    <span className={`adm-chip ${row.status}`}>{STATUS_LABEL[row.status]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
        </>
      )}

      {detail && (
        <Dialog
          open
          width={660}
          onClose={closeDetail}
          title={detail.name}
          subtitle={`وصلت ${relativeTime(detail.createdAt)} · ${formatDate(detail.createdAt)}`}
          footer={
            <>
              <a
                className="btn btn-gold"
                href={`mailto:${detail.email}?subject=${encodeURIComponent(
                  "رد على رسالتك عبر الموقع"
                )}`}
              >
                الرد بالبريد
              </a>
              <button
                type="button"
                className="adm-link adm-danger"
                onClick={() => removeOne(detail)}
              >
                حذف الرسالة
              </button>
              <button type="button" className="adm-link" onClick={closeDetail}>
                إغلاق
              </button>
            </>
          }
        >
          <div className="adm-field">
            <span className="adm-field-label">نص الرسالة</span>
            <p dir="auto" style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
              {detail.message}
            </p>
          </div>

          <div className="adm-toolbar2">
            <Segmented<EnquiryStatus>
              value={detail.status}
              options={STATUS_OPTIONS}
              onChange={(s) => applyStatus(detail, s)}
              ariaLabel="حالة الرسالة"
            />
          </div>

          <Field
            label="ملاحظات خاصة"
            hint="هذه الملاحظات لا تغادر لوحة التحكم: لا يراها المرسِل ولا تظهر على الموقع."
          >
            <textarea
              dir="rtl"
              rows={4}
              value={notes}
              placeholder="ما اتفقتِ عليه، موعد المتابعة، أي شيء يخصك…"
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
            />
          </Field>

          <div className="adm-toolbar2">
            <button
              type="button"
              className="btn btn-gold"
              onClick={saveNotes}
              disabled={savingNotes || notes === (detail.notes ?? "")}
            >
              {savingNotes ? "جارٍ الحفظ…" : "حفظ الملاحظات"}
            </button>
            {notesSaved && <span className="adm-saved on">حُفظت ✓</span>}
          </div>

          <div className="adm-kv">
            <div>
              <span>البريد الإلكتروني</span>
              <b>
                <bdi dir="ltr">{detail.email}</bdi>
              </b>
            </div>
            {detail.phone && (
              <div>
                <span>الهاتف</span>
                <b>
                  <bdi dir="ltr">{detail.phone}</bdi>
                </b>
              </div>
            )}
            {detail.serviceInterest && (
              <div>
                <span>الخدمة المطلوبة</span>
                <b>{detail.serviceInterest}</b>
              </div>
            )}
            <div>
              <span>الصفحة التي أُرسلت منها</span>
              <b>{sourceLabel(detail.source)}</b>
            </div>
            {detail.utmSource && (
              <div>
                <span>مصدر الحملة (UTM)</span>
                <b>
                  <bdi dir="ltr">{detail.utmSource}</bdi>
                </b>
              </div>
            )}
            {detail.utmCampaign && (
              <div>
                <span>اسم الحملة (UTM)</span>
                <b>
                  <bdi dir="ltr">{detail.utmCampaign}</bdi>
                </b>
              </div>
            )}
            <div>
              <span>تاريخ الوصول</span>
              <b>{formatDate(detail.createdAt)}</b>
            </div>
            <div>
              <span>آخر تحديث</span>
              <b>{relativeTime(detail.updatedAt)}</b>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
