"use client";

import { useEffect, useState } from "react";

/* Renders the "أعمالي" section from the projects managed in the admin.
   Reads content/projects.json straight from the repo, so adding a project in
   the dashboard shows up here with no rebuild. Renders nothing when empty.
   (Replaces the old projects.js DOM-injection script, which mutated the tree
   before React hydrated and caused hydration mismatches.) */

const SRC =
  "https://raw.githubusercontent.com/sawafilms20-debug/sawafilms20-debug.github.io/main/content/projects.json";

type Project = {
  title: string;
  desc?: string;
  url?: string;
  tags?: string[];
  featured?: boolean;
  date?: string;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch(`${SRC}?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => {
        if (!Array.isArray(list) || list.length === 0) return;
        const sorted = [...(list as Project[])].sort((a, b) => {
          if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
          return (a.date || "") < (b.date || "") ? 1 : -1;
        });
        setProjects(sorted);
      })
      .catch(() => {});
  }, []);

  if (projects.length === 0) return null;

  return (
    <section className="projects wrap" id="work">
      <span className="slug">أعمالي</span>
      <h2>مشاريع كتبتُها، ونتائج تتحدث عنها</h2>
      <p className="lead">مختارات من التعاونات التي عملتُ عليها</p>
      <div className="projects-grid">
        {projects.map((p, i) => {
          const inner = (
            <>
              <h3>{p.title}</h3>
              {p.desc ? <p>{p.desc}</p> : null}
              {p.tags && p.tags.length > 0 ? (
                <div className="project-tags">
                  {p.tags.slice(0, 4).map((t) => (
                    <i key={t}>{t}</i>
                  ))}
                </div>
              ) : null}
              {p.url ? <span className="project-link">زيارة المشروع</span> : null}
            </>
          );
          const cls = `project-card${p.featured ? " featured" : ""}`;
          return p.url ? (
            <a key={i} className={cls} href={p.url} target="_blank" rel="noopener">
              {inner}
            </a>
          ) : (
            <div key={i} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
