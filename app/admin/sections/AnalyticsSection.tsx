"use client";

import { useEffect, useState, type ReactNode } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { EmptyState, Loading, RankedBars, Segmented, TrendChart } from "../ui";

/* Traffic overview.

   Every figure on this screen comes from one `overview` call, so the range
   control at the top is the only one there is: a per-panel range would let two
   panels disagree about the window they describe. */

type Row = { k: string; n: string };

type Overview = {
  totals: { pageViews?: string; visitors?: string; sessions?: string; events?: string };
  series: { d: string; views: string; sessions: string }[];
  pages: Row[];
  referrers: Row[];
  devices: Row[];
  browsers: Row[];
  locations: Row[];
  events: Row[];
  utm: Row[];
  sessions: {
    sessionId: string;
    device: string | null;
    browser: string | null;
    location: string | null;
    firstPath: string | null;
    pages: string;
    lastSeen: string;
  }[];
};

type RangeKey = "7" | "30" | "90" | "365";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7", label: "٧ أيام" },
  { value: "30", label: "٣٠ يومًا" },
  { value: "90", label: "٩٠ يومًا" },
  { value: "365", label: "سنة" },
];

// The counts arrive as ::text casts, so every one of them needs converting.
const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;

const DEVICES: Record<string, string> = {
  mobile: "جوال",
  tablet: "لوحي",
  desktop: "حاسوب",
  unknown: "غير معروف",
};

const deviceLabel = (k: string) => DEVICES[k] ?? k;
const ltr = (k: string) => <span dir="ltr">{k}</span>;

/* A place is either "Riyadh, Saudi Arabia" or the Arabic fallback, so the
   direction has to be read off the text rather than fixed either way. */
const placeLabel = (k: string) => <span dir="auto">{k || "غير معروف"}</span>;

function pagesLabel(n: number): string {
  if (n === 1) return "صفحة واحدة";
  if (n === 2) return "صفحتان";
  if (n <= 10) return `${n} صفحات`;
  return `${n} صفحة`;
}

export default function AnalyticsSection({ toast }: SectionProps) {
  const [range, setRange] = useState<RangeKey>("30");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    rpc.analytics
      .overview<Overview>({ days: Number(range) })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof RpcError ? e.message : "تعذّر تحميل التحليلات.";
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

  const views = num(data?.totals?.pageViews);
  const visitors = num(data?.totals?.visitors);
  const sessions = num(data?.totals?.sessions);
  const events = num(data?.totals?.events);
  const silent = !!data && views + visitors + sessions + events === 0;

  return (
    <>
      <div className="adm-toolbar2">
        <Segmented
          value={range}
          options={RANGES}
          onChange={setRange}
          ariaLabel="المدة الزمنية لكل الأرقام في هذه الصفحة"
        />
        {loading && data && <span className="adm-muted">جارٍ التحديث…</span>}
      </div>

      {err && (
        <p className="adm-err" role="alert">
          {err}{" "}
          <button className="adm-link" onClick={() => setReloadNonce((n) => n + 1)}>
            إعادة المحاولة
          </button>
        </p>
      )}

      {!data ? (
        loading ? <Loading label="جارٍ تحميل التحليلات…" /> : null
      ) : silent ? (
        <EmptyState
          title="لا توجد زيارات في هذه المدة"
          body="تظهر هنا أرقام الزيارات تلقائيًا بمجرد وصول زوّار إلى الموقع المنشور — الصفحات التي يفتحونها، ومن أين جاؤوا، وبأي جهاز. جرّبي مدة أطول، أو انتظري أول زيارة."
          actionLabel="تحديث"
          onAction={() => setReloadNonce((n) => n + 1)}
        />
      ) : (
        <>
          <div className="adm-strip">
            <div className="adm-strip-cell">
              <span className="adm-strip-num">{views.toLocaleString("en")}</span>
              <span className="adm-strip-label">المشاهدات</span>
            </div>
            <div className="adm-strip-cell">
              <span className="adm-strip-num">{visitors.toLocaleString("en")}</span>
              <span className="adm-strip-label">الزوّار</span>
            </div>
            <div className="adm-strip-cell">
              <span className="adm-strip-num">{sessions.toLocaleString("en")}</span>
              <span className="adm-strip-label">الجلسات</span>
            </div>
            <div className="adm-strip-cell">
              <span className="adm-strip-num">{events.toLocaleString("en")}</span>
              <span className="adm-strip-label">الأحداث</span>
            </div>
          </div>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>الاتجاه اليومي</h2>
              <p className="adm-panel-title">مشاهدات الصفحات</p>
            </div>
            <TrendChart series={data.series} />
          </section>

          <div className="adm-grid-2" style={{ marginBottom: 18 }}>
            <ChartPanel title="أكثر الصفحات زيارة">
              <RankedBars rows={data.pages} format={ltr} emptyLabel="لا صفحات مُسجّلة بعد" />
            </ChartPanel>

            <ChartPanel title="مصادر الزيارات">
              <RankedBars
                rows={data.referrers}
                format={ltr}
                emptyLabel="كل الزيارات وصلت مباشرة، بلا موقع محيل"
              />
            </ChartPanel>

            <ChartPanel title="الأجهزة">
              <RankedBars rows={data.devices} format={deviceLabel} emptyLabel="لا بيانات أجهزة بعد" />
            </ChartPanel>

            <ChartPanel title="المتصفحات">
              <RankedBars rows={data.browsers} format={ltr} emptyLabel="لا بيانات متصفحات بعد" />
            </ChartPanel>

            <ChartPanel title="الدول والمدن">
              <RankedBars
                rows={data.locations}
                format={placeLabel}
                emptyLabel="لم يُتعرَّف على موقع أي زائر بعد"
              />
            </ChartPanel>

            <ChartPanel title="الأحداث">
              <RankedBars
                rows={data.events}
                format={ltr}
                emptyLabel="لا أحداث بعد — نقرات الأزرار وإرسال النماذج تظهر هنا"
              />
            </ChartPanel>

            <ChartPanel title="حملات UTM">
              <RankedBars
                rows={data.utm}
                format={ltr}
                emptyLabel="أضيفي ‎?utm_source=…‎ إلى روابطك لتتبّع الحملات"
              />
            </ChartPanel>
          </div>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>آخر الجلسات</h2>
              <p className="adm-panel-title">آخر ١٥ زيارة</p>
            </div>
            {data.sessions.length ? (
              <div className="adm-list">
                {data.sessions.map((s) => (
                  <div className="adm-item" key={s.sessionId}>
                    <div className="adm-item-main">
                      <p className="adm-item-title" dir="ltr">
                        {s.firstPath || "/"}
                      </p>
                      <div className="adm-item-meta">
                        <span>{deviceLabel(s.device || "unknown")}</span>
                        <span dir="ltr">{s.browser || "—"}</span>
                        <span>{placeLabel(s.location || "")}</span>
                        <span>{pagesLabel(num(s.pages))}</span>
                        <span dir="ltr">{s.lastSeen}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-muted adm-chart-empty">لا جلسات في هذه المدة</p>
            )}
          </section>
        </>
      )}
    </>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    // The grid supplies the gap between panels; the panel's own bottom margin
    // would double it on every row but the last.
    <section className="adm-panel" style={{ marginBottom: 0 }}>
      <div className="adm-panel-head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
