"use client";

import { useCallback, useEffect, useState } from "react";
import { type Project, PROJECTS_PATH, readJson, writeJson, slugify, today } from "../lib";

type Editing = Project & { _new?: boolean };

const empty = (): Editing => ({
  slug: "",
  title: "",
  desc: "",
  url: "",
  tags: [],
  featured: true,
  date: today(),
  _new: true,
});

export default function ProjectsSection({
  onMsg,
  onErr,
}: {
  onMsg: (m: string) => void;
  onErr: (e: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sha, setSha] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [tagsText, setTagsText] = useState("");

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const { data, sha } = await readJson<Project[]>(PROJECTS_PATH, []);
      setProjects(Array.isArray(data) ? data : []);
      setSha(sha);
    } catch (e: unknown) {
      onErr(`تعذّر تحميل المشاريع — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }, [onErr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (next: Project[], message: string) => {
    setBusy(true);
    onErr("");
    try {
      // re-read sha to avoid conflicts, then write
      const cur = await readJson<Project[]>(PROJECTS_PATH, []);
      await writeJson(PROJECTS_PATH, next, cur.sha, message);
      const after = await readJson<Project[]>(PROJECTS_PATH, []);
      setProjects(after.data);
      setSha(after.sha);
      onMsg("تم الحفظ ✓ — سيظهر على الموقع خلال دقيقة أو دقيقتين.");
    } catch (e: unknown) {
      onErr(`تعذّر الحفظ — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const startNew = () => {
    setEditing(empty());
    setTagsText("");
    onErr("");
  };
  const startEdit = (p: Project) => {
    setEditing({ ...p });
    setTagsText(p.tags.join("، "));
    onErr("");
  };

  const saveEditing = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return onErr("اسم المشروع مطلوب.");
    const slug = (editing.slug || slugify(editing.title) || `project-${Date.now()}`).trim();
    const tags = tagsText.split(/[,،]/).map((t) => t.trim()).filter(Boolean);
    const record: Project = {
      slug,
      title: editing.title.trim(),
      desc: editing.desc.trim(),
      url: editing.url.trim(),
      tags,
      featured: editing.featured,
      date: editing.date || today(),
    };
    const others = projects.filter((p) => p.slug !== slug && p !== editing);
    const next = editing._new
      ? [record, ...projects]
      : projects.map((p) => (p.slug === editing.slug ? record : p));
    // guard against dup slug on new
    const deduped = editing._new
      ? [record, ...others.filter((p) => p.slug !== slug)]
      : next;
    await persist(deduped, `${editing._new ? "Add" : "Update"} project: ${slug}`);
    setEditing(null);
  };

  const remove = async (p: Project) => {
    if (!confirm(`حذف مشروع «${p.title}»؟`)) return;
    await persist(projects.filter((x) => x.slug !== p.slug), `Delete project: ${p.slug}`);
  };

  if (editing) {
    return (
      <div className="adm-editor">
        <div className="adm-grid adm-grid-2">
          <label>
            اسم المشروع / العميل
            <input
              value={editing.title}
              dir="auto"
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </label>
          <label>
            الرابط (اختياري)
            <input
              value={editing.url}
              dir="ltr"
              placeholder="https://…"
              onChange={(e) => setEditing({ ...editing, url: e.target.value })}
            />
          </label>
        </div>
        <label>
          الوصف
          <textarea
            rows={3}
            dir="auto"
            value={editing.desc}
            onChange={(e) => setEditing({ ...editing, desc: e.target.value })}
          />
        </label>
        <div className="adm-grid adm-grid-2">
          <label>
            الوسوم (مفصولة بفاصلة)
            <input
              value={tagsText}
              dir="auto"
              placeholder="سيناريو، هوية، حملة"
              onChange={(e) => setTagsText(e.target.value)}
            />
          </label>
          <label>
            التاريخ
            <input
              type="date"
              dir="ltr"
              value={editing.date}
              onChange={(e) => setEditing({ ...editing, date: e.target.value })}
            />
          </label>
        </div>
        <label className="adm-check">
          <input
            type="checkbox"
            checked={editing.featured}
            onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
          />
          مميّز (يظهر بارزًا على الموقع)
        </label>
        <div className="adm-toolbar">
          <button className="btn btn-gold" onClick={saveEditing} disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          <button className="adm-link" onClick={() => setEditing(null)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="adm-toolbar">
        <button className="btn btn-gold" onClick={startNew}>
          + مشروع جديد
        </button>
        <button className="adm-link" onClick={refresh} disabled={busy}>
          تحديث
        </button>
      </div>
      {busy && projects.length === 0 ? (
        <p className="adm-muted">جارٍ التحميل…</p>
      ) : (
        <div className="adm-table">
          {projects.map((p) => (
            <div className="adm-row" key={p.slug}>
              <div className="adm-row-main">
                <b>{p.title}</b>
                <small>
                  {p.featured && <span className="adm-badge published">مميّز</span>}{" "}
                  {p.tags.slice(0, 3).join(" · ")} {p.date && `· ${p.date}`}
                </small>
              </div>
              <div className="adm-row-actions">
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener">
                    فتح
                  </a>
                )}
                <button onClick={() => startEdit(p)}>تعديل</button>
                <button className="adm-danger" onClick={() => remove(p)}>
                  حذف
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="adm-muted">لا توجد مشاريع بعد. أضيفي أول مشروع لعرض أعمالك على الموقع.</p>
          )}
        </div>
      )}
    </>
  );
}
