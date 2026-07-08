"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Lead, LEADS_PATH, readJson, writeJson, relativeTime } from "../lib";
import { IconRefresh, IconReply, IconTrash } from "../icons";

export default function LeadsSection({
  onMsg,
  onErr,
  confirm,
  onChange,
}: {
  onMsg: (m: string) => void;
  onErr: (e: string) => void;
  confirm: (m: string) => Promise<boolean>;
  onChange: () => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const sortDesc = (list: Lead[]) =>
    [...list].sort((a, b) => (a.date < b.date ? 1 : -1));

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await readJson<Lead[]>(LEADS_PATH, []);
      setLeads(sortDesc(Array.isArray(data) ? data : []));
    } catch (e: unknown) {
      onErr(`تعذّر تحميل الرسائل — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
      setLoaded(true);
    }
  }, [onErr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-read the freshest list, apply the change, then write — so a message
  // that arrived since page-load is never clobbered.
  const mutate = async (fn: (list: Lead[]) => Lead[], message: string) => {
    setBusy(true);
    onErr("");
    try {
      const cur = await readJson<Lead[]>(LEADS_PATH, []);
      const next = fn(Array.isArray(cur.data) ? cur.data : []);
      await writeJson(LEADS_PATH, next, cur.sha, message);
      setLeads(sortDesc(next));
      onChange();
    } catch (e: unknown) {
      onErr(`تعذّر الحفظ — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleRead = (l: Lead) =>
    mutate(
      (list) => list.map((x) => (x.id === l.id ? { ...x, read: !x.read } : x)),
      `Lead ${l.read ? "unread" : "read"}: ${l.id}`
    );

  const markAllRead = () =>
    mutate((list) => list.map((x) => ({ ...x, read: true })), "Mark all leads read").then(() =>
      onMsg("تم تعليم الكل كمقروء ✓")
    );

  const remove = async (l: Lead) => {
    if (!(await confirm(`حذف رسالة «${l.name}»؟`))) return;
    mutate((list) => list.filter((x) => x.id !== l.id), `Delete lead: ${l.id}`);
  };

  const unread = leads.filter((l) => !l.read).length;
  const shown = useMemo(
    () => (onlyUnread ? leads.filter((l) => !l.read) : leads),
    [leads, onlyUnread]
  );

  return (
    <>
      <div className="adm-toolbar adm-listbar">
        <span className="adm-muted">
          {leads.length} رسالة{unread ? ` · ${unread} غير مقروءة` : ""}
        </span>
        <div className="adm-chips">
          <button
            className={`adm-chip ${!onlyUnread ? "active" : ""}`}
            onClick={() => setOnlyUnread(false)}
          >
            الكل
          </button>
          <button
            className={`adm-chip ${onlyUnread ? "active" : ""}`}
            onClick={() => setOnlyUnread(true)}
          >
            غير مقروءة
          </button>
        </div>
        {unread > 0 && (
          <button className="adm-link" onClick={markAllRead} disabled={busy}>
            تعليم الكل كمقروء
          </button>
        )}
        <button className="adm-icon-btn" onClick={refresh} disabled={busy} aria-label="تحديث">
          <IconRefresh />
        </button>
      </div>

      {!loaded ? (
        <div className="adm-table">
          {[0, 1].map((i) => (
            <div className="adm-lead adm-skel-row" key={i}>
              <div className="adm-skel" style={{ width: "30%", height: 15 }} />
              <div className="adm-skel" style={{ width: "70%", height: 13 }} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="adm-empty">
          <p>{onlyUnread ? "لا رسائل غير مقروءة." : "لا توجد رسائل بعد."}</p>
          {!onlyUnread && (
            <p className="adm-muted">رسائل نموذج التواصل على موقعك ستظهر هنا تلقائيًا.</p>
          )}
        </div>
      ) : (
        <div className="adm-table">
          {shown.map((l) => (
            <div className={`adm-lead ${l.read ? "" : "unread"}`} key={l.id}>
              <div className="adm-lead-head">
                <div className="adm-lead-who">
                  {!l.read && <span className="adm-dot" aria-label="غير مقروءة" />}
                  <b>{l.name}</b>{" "}
                  <a href={`mailto:${l.email}`} className="adm-lead-email" dir="ltr">
                    {l.email}
                  </a>
                </div>
                <small className="adm-muted" title={l.date}>
                  {relativeTime(l.date)}
                  {l.source ? ` · ${l.source}` : ""}
                </small>
              </div>
              <p className="adm-lead-msg" dir="auto">
                {l.message}
              </p>
              <div className="adm-row-actions">
                <a href={`mailto:${l.email}`}>
                  <IconReply /> ردّ
                </a>
                <button onClick={() => toggleRead(l)} disabled={busy}>
                  {l.read ? "تعليم كغير مقروءة" : "تعليم كمقروءة"}
                </button>
                <button className="adm-danger" onClick={() => remove(l)} disabled={busy}>
                  <IconTrash /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
