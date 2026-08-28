"use client";

import { useEffect, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { EmptyState, Loading, RankedBars, Segmented } from "../ui";

/* Which article gets read.

   Reads come from pageviews on /blog/<slug>/, so a slug with no matching row
   in `articles` still appears — the server falls back to the slug as the
   title, and a deleted article's traffic stays visible rather than vanishing. */

type Item = {
  slug: string;
  reads: string;
  readers: string;
  avgSeconds: string | null;
  title: string;
};

type RangeKey = "7" | "30" | "90" | "365";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7", label: "٧ أيام" },
  { value: "30", label: "٣٠ يومًا" },
  { value: "90", label: "٩٠ يومًا" },
  { value: "365", label: "سنة" },
];

const TOP = 10;

// The counts arrive as ::text casts, and avgSeconds is null when no visit
// recorded a duration.
const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;

// A title that fell back to its Latin slug must not be laid out right-to-left.
const autoDir = (k: string) => <span dir="auto">{k}</span>;

function durationLabel(v: string | null): string | null {
  const n = num(v);
  if (!n) return null;
  if (n < 60) return `${n} ثانية`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return s ? `${m} دقيقة و${s} ثانية` : `${m} دقيقة`;
}

/* Arabic counts its nouns in four forms, not two: one and two have their own
   words, three to ten take the plural, and eleven upwards goes back to the
   singular. "٣ مقالًا" is the mistake an English plural rule makes here. */
function counted(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const written = n.toLocaleString("en");
  return n >= 3 && n <= 10 ? `${written} ${few}` : `${written} ${many}`;
}

export default function ArticleAnalyticsSection({ toast, goTo }: SectionProps) {
  const [range, setRange] = useState<RangeKey>("30");
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    rpc.analytics
      .articlePerformance<{ items: Item[] }>({ days: Number(range) })
      .then((r) => {
        if (!cancelled) setItems(r.items);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof RpcError ? e.message : "تعذّر تحميل أداء المقالات.";
        setErr(msg);
        toast(msg, "bad");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, reloadNonce, toast]);

  return (
    <>
      <div className="adm-toolbar2">
        <Segmented
          value={range}
          options={RANGES}
          onChange={setRange}
          ariaLabel="المدة الزمنية لكل الأرقام في هذه الصفحة"
        />
        {loading && items && <span className="adm-muted">جارٍ التحديث…</span>}
      </div>

      {err && (
        <p className="adm-err" role="alert">
          {err}{" "}
          <button className="adm-link" onClick={() => setReloadNonce((n) => n + 1)}>
            إعادة المحاولة
          </button>
        </p>
      )}

      {!items ? (
        loading ? <Loading label="جارٍ تحميل أداء المقالات…" /> : null
      ) : !items.length ? (
        <EmptyState
          title="لا قراءات في هذه المدة"
          body="يظهر هنا كل مقال زاره أحد على الموقع المنشور: عدد القراءات، عدد القرّاء، ومتوسط زمن القراءة. انشري مقالًا وشاركيه، أو جرّبي مدة أطول."
          actionLabel="إدارة المقالات"
          onAction={() => goTo("articles")}
        />
      ) : (
        <>
          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>الأكثر قراءة</h2>
              <p className="adm-panel-title">عدد القراءات</p>
            </div>
            <RankedBars
              rows={items.slice(0, TOP).map((i) => ({ k: i.title, n: i.reads }))}
              format={autoDir}
              emptyLabel="لا قراءات بعد"
            />
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>التفاصيل</h2>
              <p className="adm-panel-title">
                {counted(items.length, "مقال واحد", "مقالان", "مقالات", "مقالًا")}
              </p>
            </div>
            <div className="adm-list">
              {items.map((it) => {
                const avg = durationLabel(it.avgSeconds);
                return (
                  <div className="adm-item" key={it.slug}>
                    <div className="adm-item-main">
                      {/* The title is the slug whenever the article row is gone,
                          so the direction has to follow the text, not the page. */}
                      <p className="adm-item-title" dir="auto">
                        {it.title}
                      </p>
                      <p className="adm-item-sub" dir="ltr">
                        /blog/{it.slug}/
                      </p>
                      <div className="adm-item-meta">
                        <span>
                          {counted(num(it.readers), "قارئ واحد", "قارئان", "قرّاء", "قارئًا")}
                        </span>
                        {avg && <span>متوسط القراءة {avg}</span>}
                      </div>
                    </div>
                    <div className="adm-item-actions">
                      <b className="adm-num">{num(it.reads).toLocaleString("en")}</b>
                      <span className="adm-muted">قراءة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </>
  );
}
