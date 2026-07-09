"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = { k: string; n: number | string };
type Sess = {
  session_id: string;
  device: string;
  browser: string;
  location: string;
  first_path: string;
  pages: number | string;
  last_ts: string;
};
type Data = {
  connected: boolean;
  totals?: { page_views?: string; visitors?: string; sessions?: string; events?: string };
  series?: { d: string; n: string }[];
  pages?: Row[];
  referrers?: Row[];
  devices?: Row[];
  browsers?: Row[];
  locations?: Row[];
  events?: Row[];
  utm?: Row[];
  sessions?: Sess[];
  error?: string;
};

const RANGES: [string, string][] = [
  ["7d", "7 أيام"],
  ["30d", "30 يوم"],
  ["90d", "90 يوم"],
  ["all", "الكل"],
];
const num = (v: unknown) => Number(v || 0);
const deviceLabel = (k: string) => (k === "mobile" ? "جوال" : k === "tablet" ? "لوحي" : k === "desktop" ? "حاسوب" : k);

export default function AnalyticsSection() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${r}`, { credentials: "include" });
      setData(await res.json());
    } catch {
      setData({ connected: true, error: "تعذّر التحميل" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  if (loading && !data) return <p className="adm-muted">جارٍ تحميل التحليلات…</p>;

  if (data && data.connected === false) return <NotConnected />;

  const t = data?.totals || {};
  const kpis = [
    { label: "مشاهدات الصفحات", n: num(t.page_views) },
    { label: "زوّار فريدون", n: num(t.visitors) },
    { label: "الجلسات", n: num(t.sessions) },
    { label: "أحداث / نقرات", n: num(t.events) },
  ];

  return (
    <div className="adm-an">
      <div className="adm-toolbar adm-listbar">
        <div className="adm-chips">
          {RANGES.map(([r, label]) => (
            <button key={r} className={`adm-chip ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
              {label}
            </button>
          ))}
        </div>
        {loading && <span className="adm-muted">تحديث…</span>}
      </div>

      <div className="adm-stats adm-an-kpis">
        {kpis.map((k) => (
          <div className="adm-stat-card adm-an-kpi" key={k.label}>
            <span className="adm-stat-label">{k.label}</span>
            <b>{k.n.toLocaleString("en-US")}</b>
          </div>
        ))}
      </div>

      <div className="adm-an-card">
        <h3>مشاهدات الصفحات عبر الوقت</h3>
        <AreaChart series={data?.series || []} />
      </div>

      <div className="adm-an-row2">
        <Panel title="أكثر الصفحات زيارة">
          <BarList rows={data?.pages} labeler={(k) => k} empty="لا بيانات بعد" />
        </Panel>
        <Panel title="مصادر الزيارات">
          <BarList rows={data?.referrers} labeler={(k) => k} empty="لا إحالات بعد" />
        </Panel>
      </div>

      <div className="adm-an-row3">
        <Panel title="الأجهزة">
          <BarList rows={data?.devices} labeler={deviceLabel} pct empty="لا بيانات" />
        </Panel>
        <Panel title="المتصفحات">
          <BarList rows={data?.browsers} labeler={(k) => k} pct empty="لا بيانات" />
        </Panel>
        <Panel title="المواقع الجغرافية">
          <BarList rows={data?.locations} labeler={(k) => k} empty="لا بيانات موقع بعد" />
        </Panel>
      </div>

      <div className="adm-an-row2">
        <Panel title="الأحداث والنقرات">
          {data?.events?.length ? (
            <table className="adm-an-table">
              <thead>
                <tr>
                  <th>الحدث</th>
                  <th>النوع</th>
                  <th className="adm-an-num">العدد</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.k}>
                    <td dir="ltr">{e.k}</td>
                    <td><span className="adm-badge draft">نقرة</span></td>
                    <td className="adm-an-num">{num(e.n).toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="adm-muted adm-an-empty">لا أحداث بعد. نقرات الأزرار وإرسال النماذج ستظهر هنا.</p>
          )}
        </Panel>
        <Panel title="مصادر الحملات (UTM)">
          {data?.utm?.length ? (
            <BarList rows={data.utm} labeler={(k) => k} empty="" />
          ) : (
            <p className="adm-muted adm-an-empty">أضيفي ‎?utm_source=…‎ إلى روابطك لتتبّع الحملات.</p>
          )}
        </Panel>
      </div>

      <div className="adm-an-card">
        <h3>أحدث الجلسات</h3>
        {data?.sessions?.length ? (
          <div className="adm-an-scroll">
            <table className="adm-an-table adm-an-sessions">
              <thead>
                <tr>
                  <th>الجهاز</th>
                  <th>المتصفّح</th>
                  <th>الموقع</th>
                  <th>أول صفحة</th>
                  <th>الصفحات</th>
                  <th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.session_id}>
                    <td>{deviceLabel(s.device || "")}</td>
                    <td>{s.browser}</td>
                    <td>{s.location || "غير معروف"}</td>
                    <td dir="ltr">{s.first_path || "/"}</td>
                    <td className="adm-an-num">{num(s.pages)}</td>
                    <td dir="ltr">{s.last_ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-muted adm-an-empty">لا جلسات بعد.</p>
        )}
      </div>

      {data?.error && <p className="adm-err" role="alert">{data.error}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adm-an-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function BarList({
  rows,
  labeler,
  pct,
  empty,
}: {
  rows?: Row[];
  labeler: (k: string) => string;
  pct?: boolean;
  empty: string;
}) {
  if (!rows || rows.length === 0)
    return empty ? <p className="adm-muted adm-an-empty">{empty}</p> : null;
  const max = Math.max(...rows.map((r) => num(r.n)), 1);
  const total = rows.reduce((a, r) => a + num(r.n), 0) || 1;
  return (
    <div className="adm-bars">
      {rows.map((r) => (
        <div className="adm-bar" key={r.k}>
          <span className="adm-bar-label" title={r.k}>{labeler(r.k) || "—"}</span>
          <span className="adm-bar-track">
            <span className="adm-bar-fill" style={{ width: `${(num(r.n) / max) * 100}%` }} />
          </span>
          <span className="adm-bar-n">{pct ? `${Math.round((num(r.n) / total) * 100)}%` : num(r.n)}</span>
        </div>
      ))}
    </div>
  );
}

function AreaChart({ series }: { series: { d: string; n: string }[] }) {
  const pts = useMemo(() => series.map((s) => num(s.n)), [series]);
  if (pts.length === 0) return <p className="adm-muted adm-an-empty">لا بيانات بعد — ستظهر مع زيارات موقعك.</p>;
  const W = 800, H = 180, P = 6;
  const max = Math.max(...pts, 1);
  const step = pts.length > 1 ? (W - P * 2) / (pts.length - 1) : 0;
  const xy = pts.map((v, i) => [P + i * step, H - P - (v / max) * (H - P * 2)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${H - P} L${xy[0][0].toFixed(1)},${H - P} Z`;
  return (
    <svg className="adm-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="مشاهدات الصفحات">
      <defs>
        <linearGradient id="rkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rkArea)" />
      <path d={line} fill="none" stroke="var(--gold-deep)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function NotConnected() {
  return (
    <div className="adm-an-intro">
      <div className="adm-card adm-card-soft">
        <h3>التحليلات — بخطوة واحدة من التفعيل</h3>
        <p className="adm-muted">
          كل المؤشرات جاهزة (الزوّار، المواقع، الأجهزة، المتصفحات، النقرات، المصادر، الجلسات).
          ينقص فقط ربط قاعدة بيانات صغيرة لتخزين الزيارات — بضع نقرات في Railway بلا أي مفاتيح.
          بمجرد ربطها ستبدأ البيانات بالتجمّع تلقائيًا.
        </p>
      </div>
      <div className="adm-metric-grid">
        {[
          ["👥", "الزوّار والجلسات"],
          ["🌍", "الدول والمدن"],
          ["💻", "الأجهزة والمتصفحات"],
          ["🖱️", "النقرات والأحداث"],
          ["↗️", "مصادر الزيارات"],
          ["📈", "الاتجاه عبر الوقت"],
        ].map(([icon, label]) => (
          <div className="adm-metric" key={label}>
            <span className="adm-metric-icon">{icon}</span>
            <b>{label}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
