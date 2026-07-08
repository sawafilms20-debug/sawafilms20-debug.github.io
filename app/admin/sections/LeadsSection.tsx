"use client";

import { useCallback, useEffect, useState } from "react";
import { type Lead, LEADS_PATH, readJson, writeJson } from "../lib";

export default function LeadsSection({
  onMsg,
  onErr,
}: {
  onMsg: (m: string) => void;
  onErr: (e: string) => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await readJson<Lead[]>(LEADS_PATH, []);
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => (a.date < b.date ? 1 : -1));
      setLeads(list);
    } catch (e: unknown) {
      onErr(`تعذّر تحميل الرسائل — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }, [onErr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (next: Lead[], message: string) => {
    setBusy(true);
    onErr("");
    try {
      const cur = await readJson<Lead[]>(LEADS_PATH, []);
      await writeJson(LEADS_PATH, next, cur.sha, message);
      setLeads([...next].sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch (e: unknown) {
      onErr(`تعذّر الحفظ — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleRead = (l: Lead) =>
    persist(
      leads.map((x) => (x.id === l.id ? { ...x, read: !x.read } : x)),
      `Lead ${l.read ? "unread" : "read"}: ${l.id}`
    );

  const remove = (l: Lead) => {
    if (!confirm(`حذف رسالة «${l.name}»؟`)) return;
    persist(leads.filter((x) => x.id !== l.id), `Delete lead: ${l.id}`);
  };

  const unread = leads.filter((l) => !l.read).length;

  return (
    <>
      <div className="adm-toolbar">
        <span className="adm-muted">
          {leads.length} رسالة{unread ? ` · ${unread} غير مقروءة` : ""}
        </span>
        <button className="adm-link" onClick={refresh} disabled={busy}>
          تحديث
        </button>
      </div>
      {busy && leads.length === 0 ? (
        <p className="adm-muted">جارٍ التحميل…</p>
      ) : leads.length === 0 ? (
        <div className="adm-empty">
          <p>لا توجد رسائل بعد.</p>
          <p className="adm-muted">
            رسائل نموذج التواصل على موقعك ستظهر هنا تلقائيًا.
          </p>
        </div>
      ) : (
        <div className="adm-table">
          {leads.map((l) => (
            <div className={`adm-lead ${l.read ? "" : "unread"}`} key={l.id}>
              <div className="adm-lead-head">
                <div>
                  <b>{l.name}</b>{" "}
                  <a href={`mailto:${l.email}`} className="adm-lead-email" dir="ltr">
                    {l.email}
                  </a>
                </div>
                <small className="adm-muted" dir="ltr">
                  {l.date?.slice(0, 16).replace("T", " ")}
                  {l.source ? ` · ${l.source}` : ""}
                </small>
              </div>
              <p className="adm-lead-msg" dir="auto">
                {l.message}
              </p>
              <div className="adm-row-actions">
                <a href={`mailto:${l.email}`}>ردّ</a>
                <button onClick={() => toggleRead(l)}>
                  {l.read ? "تعليم كغير مقروءة" : "تعليم كمقروءة"}
                </button>
                <button className="adm-danger" onClick={() => remove(l)}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
