"use client";

import { useEffect, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import {
  EmptyState,
  Loading,
  Pagination,
  Toggle,
  Toolbar,
  formatDate,
} from "../ui";
import { IconExport } from "../icons";

type Subscriber = {
  id: number;
  email: string;
  name: string | null;
  isActive: boolean;
  source: string | null;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

type ListResult = {
  items: Subscriber[];
  total: number;
  active: number;
  page: number;
  perPage: number;
};

const PER_PAGE = 50;

const SOURCE_LABEL: Record<string, string> = {
  "blog-subscribe": "نموذج المدوّنة",
  homepage: "الصفحة الرئيسية",
  "contact-page": "صفحة التواصل",
};

const sourceLabel = (s: string | null) => (s ? SOURCE_LABEL[s] ?? s : "مصدر غير معروف");

function countLabel(n: number): string {
  if (n === 1) return "مشترك واحد";
  if (n === 2) return "مشتركين";
  if (n <= 10) return `${n} مشتركين`;
  return `${n} مشتركًا`;
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

export default function NewsletterSection({ toast, confirm }: SectionProps) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);

  const [items, setItems] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  /* The headline pair is "active of everyone", so it must not follow a search:
     `total` narrows to the matches, and only the unfiltered load can say how
     many people are on the list altogether. Both start null rather than 0, so
     a first load that is still running — or that failed — shows no number at
     all instead of asserting an empty list. */
  const [active, setActive] = useState<number | null>(null);
  const [everyone, setEveryone] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

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
    rpc.newsletter
      .list<ListResult>({ page, perPage: PER_PAGE, ...(query ? { search: query } : {}) })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.total);
        setActive(r.active);
        if (!query) setEveryone(r.total);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        // Inline rather than a toast: a failed load leaves an empty list that
        // needs its explanation where the rows should have been.
        setError(e instanceof RpcError ? e.message : "تعذّر تحميل قائمة المشتركين.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query, nonce]);

  const reload = () => setNonce((n) => n + 1);

  const setSubscribed = async (row: Subscriber, isActive: boolean) => {
    setBusyId(row.id);
    try {
      const updated = await rpc.newsletter.setActive<Subscriber>({ id: row.id, isActive });
      setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));
      setActive((n) => (n === null ? n : Math.max(0, n + (isActive ? 1 : -1))));
      toast(isActive ? "أُعيد تفعيل الاشتراك ✓" : "أُوقف الاشتراك ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الاشتراك.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const removeOne = async (row: Subscriber) => {
    const ok = await confirm(
      `سيُحذف سجل ${row.email} نهائيًا ومعه تاريخ موافقته على الاشتراك. إن كان الهدف إيقاف الرسائل فقط، فإيقاف الاشتراك أفضل من الحذف.`,
      { confirmLabel: "احذفي السجل" }
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      await rpc.newsletter.delete<{ ok: boolean }>({ id: row.id });
      reload();
      toast("حُذف السجل ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف السجل.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await rpc.newsletter.exportCsv<{ csv: string; count: number }>();
      if (!r.count) {
        toast("لا يوجد مشتركون لتصديرهم بعد.", "bad");
        return;
      }
      downloadCsv(r.csv, `subscribers-${today()}.csv`);
      toast(`تم تصدير ${countLabel(r.count)} ✓`);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تصدير قائمة المشتركين.", "bad");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>المشتركون في النشرة</h2>
        {active !== null && everyone !== null && (
          <span className="adm-muted">
            {active} مشترك نشط من {everyone}
          </span>
        )}
      </div>

      <p className="adm-note">
        من يوقف اشتراكه يبقى سجله هنا بدل أن يُحذف: هكذا لا يظهر رجوعه لاحقًا كاشتراك جديد، ويبقى
        تاريخ موافقته على استلام النشرة قابلًا للإثبات إن سُئلتِ عنه يومًا.
      </p>

      <Toolbar search={search} onSearch={setSearch} placeholder="ابحثي بالبريد أو الاسم…">
        {query && !loading && <span className="adm-muted">{total} نتيجة</span>}
        <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={exporting}>
          <IconExport /> {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
        </button>
      </Toolbar>

      {error && (
        <p className="adm-err" role="alert">
          {error}{" "}
          <button type="button" className="adm-link" onClick={reload}>
            إعادة المحاولة
          </button>
        </p>
      )}

      {loading ? (
        <Loading label="جارٍ تحميل المشتركين…" />
      ) : items.length === 0 ? (
        query ? (
          <EmptyState
            title="لا نتائج"
            body="لا يوجد مشترك يطابق ما بحثتِ عنه."
            actionLabel="إظهار كل المشتركين"
            onAction={() => {
              setSearch("");
              setQuery("");
              setPage(1);
            }}
          />
        ) : (
          <EmptyState
            title="لا مشتركين بعد"
            body="كل من يشترك في نشرتك من نموذج المدوّنة يظهر هنا: بريده واسمه وتاريخ اشتراكه والصفحة التي اشترك منها."
            actionLabel="تحديث القائمة"
            onAction={reload}
          />
        )
      ) : (
        <>
          <div className="adm-list">
            {items.map((row) => (
              <div className="adm-item" key={row.id}>
                <div className="adm-item-main">
                  <span className="adm-item-title">
                    <bdi dir="ltr">{row.email}</bdi>
                  </span>
                  <span className="adm-item-meta">
                    <span>{row.name || "بلا اسم"}</span>
                    <span>{sourceLabel(row.source)}</span>
                    <span>اشترك في {formatDate(row.createdAt)}</span>
                    {!row.isActive && row.unsubscribedAt && (
                      <span>أوقف الاشتراك في {formatDate(row.unsubscribedAt)}</span>
                    )}
                  </span>
                </div>
                <div className="adm-item-actions">
                  <span className={`adm-chip ${row.isActive ? "published" : "archived"}`}>
                    {row.isActive ? "نشط" : "موقوف"}
                  </span>
                  <Toggle
                    checked={row.isActive}
                    onChange={(v) => setSubscribed(row, v)}
                    label={`حالة اشتراك ${row.email}`}
                    disabled={busyId === row.id}
                  />
                  <button
                    type="button"
                    className="adm-link adm-danger"
                    onClick={() => removeOne(row)}
                    disabled={busyId === row.id}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
