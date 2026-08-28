"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import {
  EmptyState,
  Loading,
  Pagination,
  Segmented,
  Toggle,
  Toolbar,
  formatDate,
  relativeTime,
} from "../ui";
import { IconTrash } from "../icons";

type ErrorRow = {
  id: number;
  fingerprint: string;
  message: string;
  stack: string | null;
  path: string | null;
  userAgent: string | null;
  hits: number;
  isResolved: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
};

type Counts = { open: number; resolved: number; hits: number };

type Filter = "open" | "resolved" | "all";

const PER_PAGE = 25;

const RESOLVED_FOR: Record<Filter, boolean | undefined> = {
  open: false,
  resolved: true,
  all: undefined,
};

export default function ErrorLogSection({ toast, confirm, onCountsChanged }: SectionProps) {
  const [filter, setFilter] = useState<Filter>("open");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ErrorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({ open: 0, resolved: 0, hits: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [nonce, setNonce] = useState(0);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resolved = RESOLVED_FOR[filter];
        const [list, c] = await Promise.all([
          rpc.errors.list<{ items: ErrorRow[]; total: number; page: number; perPage: number }>({
            page,
            perPage: PER_PAGE,
            ...(resolved === undefined ? {} : { resolved }),
          }),
          rpc.errors.counts<Counts>(),
        ]);
        if (cancelled) return;
        setItems(list.items);
        setTotal(list.total);
        setCounts(c);
        setErr("");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof RpcError ? e.message : "تعذّر تحميل سجل الأخطاء.";
        setErr(msg);
        toast(msg, "bad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, page, nonce, toast]);

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
    setExpanded([]);
  };

  const toggleExpanded = (id: number) =>
    setExpanded((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const setResolved = async (row: ErrorRow, isResolved: boolean) => {
    setPendingId(row.id);
    try {
      await rpc.errors.setResolved<ErrorRow>({ id: row.id, isResolved });
      toast(isResolved ? "تمّت المعالجة ✓" : "أُعيد فتح الخطأ ✓");
      // Under a filter the row leaves this list. If it was the last one on a
      // later page, that page is now empty — step back rather than show
      // "لا أخطاء" over a log that still has plenty.
      if (filter !== "all" && items.length === 1 && page > 1) setPage(page - 1);
      onCountsChanged();
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الخطأ.", "bad");
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (row: ErrorRow) => {
    const ok = await confirm("سيُحذف هذا الخطأ من السجل نهائيًا، بكل تكراراته.", {
      confirmLabel: "احذفيه",
    });
    if (!ok) return;
    try {
      await rpc.errors.delete<{ ok: boolean }>({ id: row.id });
      toast("تم حذف الخطأ ✓");
      if (items.length === 1 && page > 1) setPage(page - 1);
      onCountsChanged();
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الخطأ.", "bad");
    }
  };

  const clearResolved = async () => {
    const ok = await confirm(
      `سيُمسح ${counts.resolved} خطأ معالَج من السجل نهائيًا. الأخطاء المفتوحة لن تتأثر.`,
      { confirmLabel: "امسحيها" }
    );
    if (!ok) return;
    try {
      const r = await rpc.errors.clearResolved<{ deleted: number }>();
      toast(`تم مسح ${r.deleted} خطأ معالَج ✓`);
      setPage(1);
      onCountsChanged();
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر مسح الأخطاء المعالَجة.", "bad");
    }
  };

  const empty = (() => {
    if (filter === "open") {
      return {
        title: "لا أخطاء مفتوحة — كل شيء على ما يرام",
        body: "لم يسجّل الموقع أي خطأ ينتظر المعالجة. لا شيء يحتاج تدخّلك هنا الآن.",
      };
    }
    if (filter === "resolved") {
      return {
        title: "لا أخطاء معالَجة",
        body: "الأخطاء التي تضعين عليها علامة «تمّت المعالجة» تُجمع هنا حتى تمسحيها.",
      };
    }
    return {
      title: "السجل فارغ",
      body: "هنا تُسجَّل الأخطاء التي تقع على الموقع المنشور، مع مكان وقوعها وعدد مرات تكرارها.",
    };
  })();

  return (
    <>
      <div className="adm-strip" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        <div className={`adm-strip-cell ${counts.open ? "urgent" : ""}`}>
          <span className="adm-strip-num">{counts.open}</span>
          <span className="adm-strip-label">أخطاء مفتوحة</span>
        </div>
        <div className="adm-strip-cell">
          <span className="adm-strip-num">{counts.hits}</span>
          <span className="adm-strip-label">مرات وقوعها مجتمعة</span>
        </div>
        <div className="adm-strip-cell">
          <span className="adm-strip-num">{counts.resolved}</span>
          <span className="adm-strip-label">أخطاء معالَجة</span>
        </div>
      </div>

      <p className="adm-note">
        الخطأ نفسه إذا تكرّر لا يُضاف سطرًا جديدًا في كل مرة، بل يُحتسب على السطر ذاته ويرتفع عدّاده.
        فسطر واحد عدّاده 300 يعني خطأً واحدًا وقع 300 مرة، لا ثلاثمئة مشكلة.
      </p>

      <section className="adm-panel">
        <Toolbar>
          <Segmented<Filter>
            ariaLabel="تصفية الأخطاء"
            value={filter}
            onChange={changeFilter}
            options={[
              { value: "open", label: "المفتوحة", count: counts.open },
              { value: "resolved", label: "المعالجة", count: counts.resolved },
              { value: "all", label: "الكل", count: counts.open + counts.resolved },
            ]}
          />
          <button
            className="btn btn-ghost"
            onClick={clearResolved}
            disabled={!counts.resolved}
            style={{ marginInlineStart: "auto" }}
          >
            مسح المعالجة
          </button>
        </Toolbar>

        {err && (
          <p className="adm-err" role="alert">
            {err}
          </p>
        )}

        {loading ? (
          <Loading label="جارٍ تحميل السجل…" />
        ) : items.length === 0 ? (
          <EmptyState
            title={empty.title}
            body={empty.body}
            actionLabel="تحديث"
            onAction={reload}
          />
        ) : (
          <>
            <div className="adm-list">
              {items.map((r) => {
                const open = expanded.includes(r.id);
                return (
                  <Fragment key={r.id}>
                    <div className={`adm-item ${open ? "selected" : ""}`}>
                      <div className="adm-item-main">
                        <p className="adm-item-title" dir="auto">
                          {r.message}
                        </p>
                        <p className="adm-item-sub" dir="ltr" style={{ textAlign: "start" }}>
                          {r.path || "مسار غير معروف"}
                        </p>
                        <div className="adm-item-meta">
                          <span>وقع {r.hits} مرة</span>
                          <span>آخر مرة {relativeTime(r.lastSeenAt)}</span>
                          <span>أول مرة {formatDate(r.firstSeenAt)}</span>
                        </div>
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-link" onClick={() => toggleExpanded(r.id)}>
                          {open ? "إخفاء التفاصيل" : "التفاصيل"}
                        </button>
                        <span className="adm-strip-label">تمّت المعالجة</span>
                        <Toggle
                          checked={r.isResolved}
                          disabled={pendingId === r.id}
                          onChange={(v) => setResolved(r, v)}
                          label={`تمّت معالجة الخطأ: ${r.message}`}
                        />
                        <button
                          className="adm-icon-btn"
                          onClick={() => remove(r)}
                          aria-label="حذف هذا الخطأ من السجل"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div style={{ padding: "0 6px 8px" }}>
                        <div className="adm-kv" style={{ marginBottom: 10 }}>
                          <div>
                            <span>بصمة الخطأ</span>
                            <b dir="ltr">{r.fingerprint}</b>
                          </div>
                          <div>
                            <span>المتصفح</span>
                            <b dir="ltr">{r.userAgent || "—"}</b>
                          </div>
                        </div>
                        <pre className="adm-code">
                          {r.stack || "لم يُسجَّل تتبّع لهذا الخطأ."}
                        </pre>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>

            <Pagination page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
          </>
        )}
      </section>
    </>
  );
}
