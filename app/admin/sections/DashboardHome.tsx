"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_URL } from "../config";
import {
  type PostFile,
  type Project,
  type Lead,
  PROJECTS_PATH,
  LEADS_PATH,
  loadPosts,
  readJson,
} from "../lib";

export default function DashboardHome({
  onErr,
  goTo,
}: {
  onErr: (e: string) => void;
  goTo: (s: "blog" | "projects" | "leads" | "analytics") => void;
}) {
  const [posts, setPosts] = useState<PostFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pr, ld] = await Promise.all([
        loadPosts().catch(() => [] as PostFile[]),
        readJson<Project[]>(PROJECTS_PATH, []).then((r) => r.data),
        readJson<Lead[]>(LEADS_PATH, []).then((r) => r.data),
      ]);
      setPosts(p);
      setProjects(Array.isArray(pr) ? pr : []);
      const ls = Array.isArray(ld) ? ld : [];
      ls.sort((a, b) => (a.date < b.date ? 1 : -1));
      setLeads(ls);
    } catch (e: unknown) {
      onErr(`تعذّر تحميل البيانات — ${e instanceof Error ? e.message : e}`);
    } finally {
      setLoading(false);
    }
  }, [onErr]);

  useEffect(() => {
    load();
  }, [load]);

  const published = posts.filter((p) => p.status !== "draft");
  const drafts = posts.filter((p) => p.status === "draft");
  const unread = leads.filter((l) => !l.read).length;

  const cards = [
    { icon: "📄", n: published.length, label: "مقالات منشورة", sub: `${published.filter((p) => p.lang === "en").length} EN · ${published.filter((p) => p.lang === "ar").length} AR`, go: () => goTo("blog") },
    { icon: "📝", n: drafts.length, label: "مسودات", sub: "بانتظار النشر", go: () => goTo("blog") },
    { icon: "🗂️", n: projects.length, label: "مشاريع", sub: `${projects.filter((p) => p.featured).length} مميّز`, go: () => goTo("projects") },
    { icon: "✉️", n: leads.length, label: "رسائل", sub: unread ? `${unread} غير مقروءة` : "لا جديد", go: () => goTo("leads") },
  ];

  return (
    <>
      <div className="adm-stats">
        {cards.map((c) => (
          <button className="adm-stat-card" key={c.label} onClick={c.go}>
            <span className="adm-stat-icon">{c.icon}</span>
            <b>{loading ? "—" : c.n}</b>
            <span className="adm-stat-label">{c.label}</span>
            <small>{c.sub}</small>
          </button>
        ))}
      </div>

      <div className="adm-cols">
        <section>
          <div className="adm-col-head">
            <h3>أحدث المقالات</h3>
            <button className="adm-link" onClick={() => goTo("blog")}>
              كل المقالات ←
            </button>
          </div>
          <div className="adm-table">
            {posts.slice(0, 5).map((p) => (
              <a
                key={p.slug}
                className="adm-row adm-row-link"
                href={`${SITE_URL}/blog/p/?s=${p.slug}`}
                target="_blank"
                rel="noopener"
              >
                <div className="adm-row-main">
                  <b>{p.title}</b>
                  <small>
                    <span className={`adm-badge ${p.status}`}>
                      {p.status === "draft" ? "مسودة" : "منشور"}
                    </span>{" "}
                    {p.date} · {p.lang === "en" ? "EN" : "AR"}
                  </small>
                </div>
              </a>
            ))}
            {!loading && posts.length === 0 && (
              <p className="adm-muted">لا توجد مقالات بعد.</p>
            )}
          </div>
        </section>

        <section>
          <div className="adm-col-head">
            <h3>أحدث الرسائل</h3>
            <button className="adm-link" onClick={() => goTo("leads")}>
              الصندوق ←
            </button>
          </div>
          {leads.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-muted">
                لا رسائل بعد. رسائل نموذج التواصل ستظهر هنا.
              </p>
            </div>
          ) : (
            <div className="adm-table">
              {leads.slice(0, 4).map((l) => (
                <div className={`adm-row ${l.read ? "" : "adm-unread"}`} key={l.id}>
                  <div className="adm-row-main">
                    <b>{l.name}</b>
                    <small dir="auto">{l.message?.slice(0, 60)}…</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
