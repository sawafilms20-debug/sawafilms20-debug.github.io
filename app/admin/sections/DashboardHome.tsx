"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import {
  EmptyState,
  Loading,
  RankedBars,
  Segmented,
  TrendChart,
  formatDate,
  relativeTime,
} from "../ui";

/* The one screen that answers "how is the site doing?".

   There used to be two. This dashboard opened with visitor numbers and a trend
   chart, and «التحليلات ← نظرة عامة» opened with the same visitor numbers and
   the same trend chart over a range you could change — which is a duplicate
   wearing a different hat, and the owner said so. They are one screen now, and
   the range control at the top governs every figure below it, because two
   panels quietly describing different windows is worse than either.

   What did not survive the merge: browsers, UTM campaigns, the raw event feed
   and the last-fifteen-sessions list. The server still returns all four from
   `analytics.overview`; nothing here reads them. */

type Enquiry = {
  id: number;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
};

type Scheduled = { id: number; slug: string; titleAr: string; scheduledAt: string };

type Summary = {
  published: number;
  drafts: number;
  enquiriesAwaiting: number;
  enquiriesTotal: number;
  recentEnquiries: Enquiry[];
  scheduledArticles: Scheduled[];
};

type Row = { k: string; n: string };

type Overview = {
  totals: { pageViews?: string; visitors?: string };
  series: { d: string; views: string; sessions: string }[];
  pages: Row[];
  referrers: Row[];
  devices: Row[];
  locations: Row[];
};

type ArticleRow = { slug: string; reads: string; title: string };

/* "0" is since the beginning — the server reads it as no lower bound. */
type RangeKey = "7" | "30" | "90" | "365" | "0";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7", label: "٧ أيام" },
  { value: "30", label: "٣٠ يومًا" },
  { value: "90", label: "٩٠ يومًا" },
  { value: "365", label: "سنة" },
  { value: "0", label: "منذ البداية" },
];

const RANGE_WORDS: Record<RangeKey, string> = {
  "7": "آخر ٧ أيام",
  "30": "آخر ٣٠ يومًا",
  "90": "آخر ٩٠ يومًا",
  "365": "آخر سنة",
  "0": "منذ البداية",
};

const STATUS_LABEL: Record<string, string> = {
  new: "جديدة",
  read: "مقروءة",
  replied: "تم الرد",
  archived: "مؤرشفة",
};

const DEVICES: Record<string, string> = {
  mobile: "جوال",
  tablet: "لوحي",
  desktop: "حاسوب",
  unknown: "غير معروف",
};

/* Western digits everywhere in the dashboard, as in the charts and the strip. */
const en = (n: number) => n.toLocaleString("en");
// The counts arrive as ::text casts, so every one of them needs converting.
const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;

const deviceLabel = (k: string) => DEVICES[k] ?? k;
const ltr = (k: string) => <span dir="ltr">{k}</span>;
/* A place is either "Riyadh, Saudi Arabia" or the Arabic fallback, so the
   direction has to be read off the text rather than fixed either way. */
const placeLabel = (k: string) => <span dir="auto">{k || "غير معروف"}</span>;
// A title that fell back to its Latin slug must not be laid out right-to-left.
const autoDir = (k: string) => <span dir="auto">{k}</span>;

export default function DashboardHome({ toast, goTo }: SectionProps) {
  const [range, setRange] = useState<RangeKey>("30");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [traffic, setTraffic] = useState<Overview | null>(null);
  const [reads, setReads] = useState<ArticleRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* The summary does not take a range and the two traffic calls do, but a
     dashboard that painted itself in three instalments would flicker. One
     await, one render. */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const days = Number(range);
      const [s, o, a] = await Promise.all([
        rpc.dashboard.summary<Summary>(),
        rpc.analytics.overview<Overview>({ days }),
        rpc.analytics.articlePerformance<{ items: ArticleRow[] }>({ days }),
      ]);
      if (!alive.current) return;
      setSummary(s);
      setTraffic(o);
      setReads(a.items);
      setErr("");
    } catch (e) {
      if (!alive.current) return;
      const msg = e instanceof RpcError ? e.message : "تعذّر تحميل اللوحة.";
      setErr(msg);
      toast(msg, "bad");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  if (!summary) {
    return loading ? (
      <Loading label="جارٍ تحميل اللوحة…" />
    ) : (
      <div className="adm-panel">
        <p className="adm-err" role="alert">
          {err || "تعذّر تحميل ملخّص اللوحة."}
        </p>
        <button className="btn btn-gold" onClick={() => setNonce((n) => n + 1)}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const views = num(traffic?.totals?.pageViews);
  const visitors = num(traffic?.totals?.visitors);
  const noTraffic = !!traffic && views + visitors === 0;

  const enquiriesPanel = (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>أحدث الرسائل</h2>
        <button className="adm-link" onClick={() => goTo("enquiries")}>
          كل الرسائل ←
        </button>
      </div>
      {summary.recentEnquiries.length ? (
        <div className="adm-list">
          {summary.recentEnquiries.map((e) => (
            /* .adm-item was written for a div, so the button needs the UA font,
               alignment and cursor put back — nothing the class already sets. */
            <button
              key={e.id}
              type="button"
              className="adm-item"
              style={{ font: "inherit", textAlign: "start", cursor: "pointer" }}
              onClick={() => goTo("enquiries")}
            >
              <span className="adm-item-main">
                <span className="adm-item-title">{e.name}</span>
                <span className="adm-item-sub" dir="auto" style={{ WebkitLineClamp: 1 }}>
                  {e.message}
                </span>
              </span>
              <span className="adm-item-actions">
                <span className={`adm-chip ${STATUS_LABEL[e.status] ? e.status : ""}`}>
                  {STATUS_LABEL[e.status] || e.status}
                </span>
                <span className="adm-item-meta">{relativeTime(e.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا رسائل بعد"
          body="كل رسالة تصل من نموذج التواصل على الموقع تظهر هنا، ومن الصندوق تردّين عليها وتؤرشفينها."
          actionLabel="فتح صندوق الرسائل"
          onAction={() => goTo("enquiries")}
        />
      )}
    </section>
  );

  const scheduledPanel = summary.scheduledArticles.length ? (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>مجدولة للنشر</h2>
        <button className="adm-link" onClick={() => goTo("articles")}>
          كل المقالات ←
        </button>
      </div>
      <div className="adm-list">
        {summary.scheduledArticles.map((a) => (
          <div key={a.id} className="adm-item">
            <div className="adm-item-main">
              <p className="adm-item-title">{a.titleAr}</p>
              <p className="adm-item-sub" dir="ltr">
                {a.slug}
              </p>
            </div>
            <div className="adm-item-actions">
              <span className="adm-chip scheduled">{formatDate(a.scheduledAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <>
      <div className="adm-toolbar2">
        <Segmented
          value={range}
          options={RANGES}
          onChange={setRange}
          ariaLabel="المدة الزمنية لكل الأرقام في هذه الصفحة"
        />
        {loading ? (
          <span className="adm-muted">جارٍ التحديث…</span>
        ) : (
          <button className="adm-link" onClick={() => setNonce((n) => n + 1)}>
            تحديث
          </button>
        )}
      </div>

      {err && (
        <p className="adm-err" role="alert">
          {err}
        </p>
      )}

      <div className="adm-strip">
        <StripCell n={views} label={`مشاهدة · ${RANGE_WORDS[range]}`} sub={`${en(visitors)} زائرًا`} />
        <StripCell
          n={summary.enquiriesAwaiting}
          label="رسالة تنتظر ردًا"
          sub={`من أصل ${en(summary.enquiriesTotal)} رسالة`}
          urgent={summary.enquiriesAwaiting > 0}
          onClick={() => goTo("enquiries")}
        />
        <StripCell n={summary.published} label="مقالة منشورة" onClick={() => goTo("articles")} />
        <StripCell n={summary.drafts} label="مسودة" onClick={() => goTo("articles")} />
      </div>

      {noTraffic ? (
        <EmptyState
          title="لا زيارات في هذه المدة"
          body="تظهر هنا أرقام الزيارات تلقائيًا بمجرد وصول زوّار إلى الموقع المنشور — الصفحات التي يفتحونها، ومن أين جاؤوا، وبأي جهاز. جرّبي مدة أطول، أو انتظري أول زيارة."
          actionLabel="تحديث"
          onAction={() => setNonce((n) => n + 1)}
        />
      ) : (
        traffic && (
          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <p className="adm-panel-title">{RANGE_WORDS[range]}</p>
                <h2>حركة الزوار</h2>
              </div>
            </div>
            <TrendChart series={traffic.series} label="المشاهدات" />
          </section>
        )
      )}

      {scheduledPanel ? (
        <div className="adm-grid-2">
          {enquiriesPanel}
          {scheduledPanel}
        </div>
      ) : (
        enquiriesPanel
      )}

      {reads && reads.length > 0 && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>أكثر المقالات قراءة</h2>
            <button className="adm-link" onClick={() => goTo("articles")}>
              المدونة ←
            </button>
          </div>
          <RankedBars
            rows={reads.slice(0, 8).map((i) => ({ k: i.title, n: i.reads }))}
            format={autoDir}
            emptyLabel="لا قراءات بعد"
          />
        </section>
      )}

      {traffic && !noTraffic && (
        <div className="adm-grid-2">
          <Panel title="أكثر الصفحات زيارة">
            <RankedBars rows={traffic.pages} format={ltr} emptyLabel="لا صفحات مُسجّلة بعد" />
          </Panel>
          <Panel title="من أين جاء الزوّار">
            <RankedBars
              rows={traffic.referrers}
              format={ltr}
              emptyLabel="كل الزيارات وصلت مباشرة، بلا موقع محيل"
            />
          </Panel>
          <Panel title="الدول والمدن">
            <RankedBars
              rows={traffic.locations}
              format={placeLabel}
              emptyLabel="لم يُتعرَّف على موقع أي زائر بعد"
            />
          </Panel>
          <Panel title="الأجهزة">
            <RankedBars rows={traffic.devices} format={deviceLabel} emptyLabel="لا بيانات أجهزة بعد" />
          </Panel>
        </div>
      )}
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
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

function StripCell({
  n,
  label,
  sub,
  urgent,
  onClick,
}: {
  n: number;
  label: string;
  sub?: string;
  urgent?: boolean;
  onClick?: () => void;
}) {
  const value = <span className="adm-strip-num">{en(n)}</span>;
  return (
    <div className={`adm-strip-cell ${urgent ? "urgent" : ""}`}>
      {onClick ? (
        // The figure itself is the control; on its own it reads as a bare number.
        <button type="button" onClick={onClick} aria-label={`${en(n)} ${label}`}>
          {value}
        </button>
      ) : (
        value
      )}
      <span className="adm-strip-label">{label}</span>
      {sub && <span className="adm-strip-label">{sub}</span>}
    </div>
  );
}
