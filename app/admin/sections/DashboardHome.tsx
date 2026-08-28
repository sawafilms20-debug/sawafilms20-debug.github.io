"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { EmptyState, Loading, TrendChart, formatDate, relativeTime } from "../ui";

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
  views30d: number;
  visitors30d: number;
  published: number;
  drafts: number;
  enquiriesAwaiting: number;
  enquiriesTotal: number;
  openErrors: number;
  series: { d: string; n: string }[];
  recentEnquiries: Enquiry[];
  scheduledArticles: Scheduled[];
};

const STATUS_LABEL: Record<string, string> = {
  new: "جديدة",
  read: "مقروءة",
  replied: "تم الرد",
  archived: "مؤرشفة",
};

/* Western digits everywhere in the dashboard, as in the charts and the strip. */
const en = (n: number) => n.toLocaleString("en");

export default function DashboardHome({ toast, goTo }: SectionProps) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const alive = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await rpc.dashboard.summary<Summary>();
      if (!alive.current) return;
      setData(r);
      setErr("");
    } catch (e) {
      if (!alive.current) return;
      const msg = e instanceof RpcError ? e.message : "تعذّر تحميل ملخّص اللوحة.";
      setErr(msg);
      toast(msg, "bad");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  if (!data) {
    return loading ? (
      <Loading label="جارٍ تحميل اللوحة…" />
    ) : (
      <div className="adm-panel">
        <p className="adm-err" role="alert">
          {err || "تعذّر تحميل ملخّص اللوحة."}
        </p>
        <button className="btn btn-gold" onClick={load}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const enquiriesPanel = (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>أحدث الرسائل</h2>
        <button className="adm-link" onClick={() => goTo("enquiries")}>
          كل الرسائل ←
        </button>
      </div>
      {data.recentEnquiries.length ? (
        <div className="adm-list">
          {data.recentEnquiries.map((e) => (
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

  const scheduledPanel = data.scheduledArticles.length ? (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>مجدولة للنشر</h2>
        <button className="adm-link" onClick={() => goTo("articles")}>
          كل المقالات ←
        </button>
      </div>
      <div className="adm-list">
        {data.scheduledArticles.map((a) => (
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
      <div className="adm-strip">
        <StripCell
          n={data.views30d}
          label="مشاهدة خلال 30 يومًا"
          sub={`${en(data.visitors30d)} زائرًا فريدًا`}
        />
        <StripCell
          n={data.enquiriesAwaiting}
          label="رسالة تنتظر ردًا"
          sub={`من أصل ${en(data.enquiriesTotal)} رسالة`}
          urgent={data.enquiriesAwaiting > 0}
          onClick={() => goTo("enquiries")}
        />
        <StripCell n={data.published} label="مقالة منشورة" onClick={() => goTo("articles")} />
        <StripCell n={data.drafts} label="مسودة" onClick={() => goTo("articles")} />
      </div>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <p className="adm-panel-title">آخر 30 يومًا</p>
            <h2>حركة الزوار</h2>
          </div>
          <button className="adm-link" onClick={load} disabled={loading}>
            {loading ? "جارٍ التحديث…" : "تحديث"}
          </button>
        </div>
        <TrendChart series={data.series} label="المشاهدات" />
        {err && (
          <p className="adm-err" role="alert">
            {err}
          </p>
        )}
      </section>

      {scheduledPanel ? (
        <div className="adm-grid-2">
          {enquiriesPanel}
          {scheduledPanel}
        </div>
      ) : (
        enquiriesPanel
      )}

      {data.openErrors > 0 && (
        <p className="adm-note">
          {en(data.openErrors)} خطأ لم يُعالَج بعد على الموقع المنشور.{" "}
          <button className="adm-link" onClick={() => goTo("errorLog")}>
            افتحي سجل الأخطاء ←
          </button>
        </p>
      )}
    </>
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
  const num = <span className="adm-strip-num">{en(n)}</span>;
  return (
    <div className={`adm-strip-cell ${urgent ? "urgent" : ""}`}>
      {onClick ? (
        // The figure itself is the control; on its own it reads as a bare number.
        <button type="button" onClick={onClick} aria-label={`${en(n)} ${label}`}>
          {num}
        </button>
      ) : (
        num
      )}
      <span className="adm-strip-label">{label}</span>
      {sub && <span className="adm-strip-label">{sub}</span>}
    </div>
  );
}
