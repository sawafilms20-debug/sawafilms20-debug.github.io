"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_URL } from "../config";
import { type PostFile, type Lead, LEADS_PATH, loadPosts, readJson, relativeTime } from "../lib";
import { IconBlog, IconProjects, IconLeads } from "../icons";

type Section = "blog" | "projects" | "leads" | "analytics";

export default function DashboardHome({
  onErr,
  goTo,
  counts,
}: {
  onErr: (e: string) => void;
  goTo: (s: Section) => void;
  counts: { posts: number; drafts: number; projects: number; unread: number };
}) {
  const [posts, setPosts] = useState<PostFile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, ld] = await Promise.all([
        loadPosts().catch(() => [] as PostFile[]),
        readJson<Lead[]>(LEADS_PATH, []).then((r) => r.data).catch(() => [] as Lead[]),
      ]);
      setPosts(p);
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

  const cards = [
    { Icon: IconBlog, n: counts.posts, label: "مقالات منشورة", sub: `${posts.filter((p) => p.status !== "draft" && p.lang === "en").length} EN · ${posts.filter((p) => p.status !== "draft" && p.lang === "ar").length} AR`, go: () => goTo("blog") },
    { Icon: IconBlog, n: counts.drafts, label: "مسودات", sub: "بانتظار النشر", go: () => goTo("blog") },
    { Icon: IconProjects, n: counts.projects, label: "مشاريع", sub: "على موقعك", go: () => goTo("projects") },
    { Icon: IconLeads, n: counts.unread, label: "رسائل جديدة", sub: `${leads.length} إجمالًا`, go: () => goTo("leads") },
  ];

  return (
    <>
      <div className="adm-stats">
        {cards.map((c) => (
          <button className="adm-stat-card" key={c.label} onClick={c.go}>
            <span className="adm-stat-icon"><c.Icon /></span>
            <b>{c.n}</b>
            <span className="adm-stat-label">{c.label}</span>
            <small>{c.sub}</small>
          </button>
        ))}
      </div>

      <div className="adm-cols">
        <section>
          <div className="adm-col-head">
            <h3>أحدث المقالات</h3>
            <button className="adm-link" onClick={() => goTo("blog")}>كل المقالات ←</button>
          </div>
          <div className="adm-table">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div className="adm-row adm-skel-row" key={i}>
                  <div className="adm-skel" style={{ width: "50%", height: 15 }} />
                  <div className="adm-skel" style={{ width: 90, height: 13 }} />
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="adm-empty"><p className="adm-muted">لا توجد مقالات بعد.</p></div>
            ) : (
              posts.slice(0, 5).map((p) =>
                p.status !== "draft" ? (
                  <a key={p.slug} className="adm-row adm-row-link" href={`${SITE_URL}/blog/p/?s=${p.slug}`} target="_blank" rel="noopener">
                    <PostRow p={p} />
                  </a>
                ) : (
                  <button key={p.slug} className="adm-row adm-row-link" onClick={() => goTo("blog")}>
                    <PostRow p={p} />
                  </button>
                )
              )
            )}
          </div>
        </section>

        <section>
          <div className="adm-col-head">
            <h3>أحدث الرسائل</h3>
            <button className="adm-link" onClick={() => goTo("leads")}>الصندوق ←</button>
          </div>
          <div className="adm-table">
            {loading ? (
              [0, 1].map((i) => (
                <div className="adm-row adm-skel-row" key={i}>
                  <div className="adm-skel" style={{ width: "40%", height: 15 }} />
                  <div className="adm-skel" style={{ width: "80%", height: 13 }} />
                </div>
              ))
            ) : leads.length === 0 ? (
              <div className="adm-empty"><p className="adm-muted">لا رسائل بعد. رسائل نموذج التواصل ستظهر هنا.</p></div>
            ) : (
              leads.slice(0, 4).map((l) => (
                <button key={l.id} className={`adm-row adm-row-link ${l.read ? "" : "adm-unread"}`} onClick={() => goTo("leads")}>
                  <div className="adm-row-main">
                    <b>{!l.read && <span className="adm-dot" />} {l.name}</b>
                    <small dir="auto">
                      {l.message?.length > 60 ? `${l.message.slice(0, 60)}…` : l.message}
                      {" · "}
                      {relativeTime(l.date)}
                    </small>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function PostRow({ p }: { p: PostFile }) {
  return (
    <div className="adm-row-main">
      <b>{p.title}</b>
      <small>
        <span className={`adm-badge ${p.status}`}>{p.status === "draft" ? "مسودة" : "منشور"}</span>{" "}
        {p.date} · {p.lang === "en" ? "EN" : "AR"}
      </small>
    </div>
  );
}
