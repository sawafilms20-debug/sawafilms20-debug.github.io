"use client";

import { POSTHOG_DASHBOARD_URL } from "../config";

const METRICS = [
  { icon: "👥", label: "الزوّار", desc: "كم شخصًا يزور، وكم زيارة، والجدد مقابل العائدين" },
  { icon: "🌍", label: "المواقع", desc: "من أي دولة ومدينة يأتي زوّارك" },
  { icon: "💻", label: "الأجهزة", desc: "جوال أم حاسوب، والمتصفّح المُستخدم" },
  { icon: "⏱️", label: "مدة البقاء", desc: "كم يبقى الزائر، وأي الصفحات تشدّه" },
  { icon: "🖱️", label: "النقرات", desc: "على أي الأزرار والروابط يضغط الزوّار" },
  { icon: "↗️", label: "المصدر", desc: "من أين جاؤوا: بحث، سوشال، أو رابط مباشر" },
];

export default function AnalyticsSection() {
  if (POSTHOG_DASHBOARD_URL) {
    return (
      <div className="adm-analytics-embed">
        <iframe
          title="Analytics"
          src={POSTHOG_DASHBOARD_URL}
          style={{ width: "100%", height: "78vh", border: "1px solid var(--line)", borderRadius: 16 }}
        />
      </div>
    );
  }

  return (
    <div className="adm-analytics-intro">
      <div className="adm-card adm-card-soft">
        <h3>تحليلات مفصّلة — قيد التفعيل</h3>
        <p className="adm-muted">
          سيتم تفعيل التحليلات عبر PostHog. بمجرد ربطه، ستظهر هنا لوحة تفاعلية
          كاملة بكل هذه المؤشرات — وتبدأ البيانات بالتجمّع مع زيارات موقعك.
        </p>
      </div>
      <div className="adm-metric-grid">
        {METRICS.map((m) => (
          <div className="adm-metric" key={m.label}>
            <span className="adm-metric-icon">{m.icon}</span>
            <b>{m.label}</b>
            <small>{m.desc}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
