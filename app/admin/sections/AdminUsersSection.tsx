"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { Dialog, EmptyState, Field, Loading, Toggle, formatDate, relativeTime } from "../ui";
import { IconTrash } from "../icons";

type Role = "owner" | "editor";

type Account = {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Me = { user: { id: number; role: Role } | null };

const ROLE_LABEL: Record<Role, string> = { owner: "مالكة", editor: "محرِّرة" };

export default function AdminUsersSection(props: SectionProps) {
  /* The shell hides this route from an editor already. Repeating the check here
     means a future navigation change cannot expose the roster by accident. */
  if (props.role !== "owner") {
    return (
      <div className="adm-panel">
        <h2>هذه الصفحة للمالكة فقط</h2>
        <p className="adm-muted">
          إدارة حسابات الدخول متاحة لمالكة الموقع وحدها. إن احتجتِ حسابًا جديدًا أو تعديلًا في
          الصلاحيات، اطلبيه منها.
        </p>
      </div>
    );
  }
  return <OwnerView {...props} />;
}

function OwnerView({ toast, confirm, newNonce }: SectionProps) {
  const [items, setItems] = useState<Account[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [nonce, setNonce] = useState(0);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; email: string; password: string; role: Role }>({
    name: "",
    email: "",
    password: "",
    role: "editor",
  });

  const [editing, setEditing] = useState<Account | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    role: Role;
    isActive: boolean;
    password: string;
  }>({ name: "", role: "editor", isActive: true, password: "" });

  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, me] = await Promise.all([
          rpc.adminUsers.list<{ items: Account[] }>(),
          rpc.auth.me<Me>(),
        ]);
        if (cancelled) return;
        setItems(list.items);
        setMeId(me.user?.id ?? null);
        setErr("");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof RpcError ? e.message : "تعذّر تحميل الحسابات.";
        setErr(msg);
        toast(msg, "bad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce, toast]);

  const openCreate = useCallback(() => {
    setDraft({ name: "", email: "", password: "", role: "editor" });
    setCreateOpen(true);
  }, []);

  /* The header's "مستخدم جديد" button only bumps a counter; comparing against
     the value at mount keeps a stale count from opening the dialog on arrival. */
  const nonceAtMount = useRef(newNonce);
  useEffect(() => {
    if (newNonce !== nonceAtMount.current) openCreate();
  }, [newNonce, openCreate]);

  const submitCreate = async () => {
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name || !email) {
      toast("الاسم والبريد الإلكتروني مطلوبان.", "bad");
      return;
    }
    if (draft.password.length < 8) {
      toast("كلمة المرور يجب ألّا تقلّ عن 8 أحرف.", "bad");
      return;
    }
    setBusy(true);
    try {
      await rpc.adminUsers.create<Account>({
        name,
        email,
        password: draft.password,
        role: draft.role,
      });
      toast(`تم إنشاء حساب ${name} ✓`);
      setCreateOpen(false);
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر إنشاء الحساب.", "bad");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (a: Account) => {
    setEditDraft({ name: a.name, role: a.role, isActive: a.isActive, password: "" });
    setEditing(a);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const name = editDraft.name.trim();
    if (!name) {
      toast("الاسم مطلوب.", "bad");
      return;
    }
    if (editDraft.password && editDraft.password.length < 8) {
      toast("كلمة المرور الجديدة يجب ألّا تقلّ عن 8 أحرف.", "bad");
      return;
    }
    setBusy(true);
    try {
      await rpc.adminUsers.update<Account>({
        id: editing.id,
        name,
        role: editDraft.role,
        isActive: editDraft.isActive,
        ...(editDraft.password ? { password: editDraft.password } : {}),
      });
      toast(
        editDraft.password ? `تم الحفظ — سُجّل خروج ${name} من كل الأجهزة ✓` : "تم حفظ التعديلات ✓"
      );
      setEditing(null);
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حفظ التعديلات.", "bad");
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (a: Account, isActive: boolean) => {
    setPendingId(a.id);
    try {
      await rpc.adminUsers.update<Account>({ id: a.id, isActive });
      toast(isActive ? `تم تفعيل حساب ${a.name} ✓` : `تم تعطيل حساب ${a.name} ✓`);
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة الحساب.", "bad");
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (a: Account) => {
    const ok = await confirm(
      `سيُحذف حساب ${a.name} (${a.email}) نهائيًا ولن يستطيع الدخول إلى اللوحة بعدها.`,
      { confirmLabel: "احذفي الحساب" }
    );
    if (!ok) return;
    try {
      await rpc.adminUsers.delete<{ ok: boolean }>({ id: a.id });
      toast("تم حذف الحساب ✓");
      reload();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف الحساب.", "bad");
    }
  };

  return (
    <>
      <section className="adm-panel">
        <div className="adm-panel-head">
          <h2>حسابات الدخول</h2>
          <button className="btn btn-gold" onClick={openCreate}>
            مستخدم جديد
          </button>
        </div>

        {err && (
          <p className="adm-err" role="alert">
            {err}
          </p>
        )}

        {loading ? (
          <Loading label="جارٍ تحميل الحسابات…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="لا توجد حسابات بعد"
            body="هنا تظهر كل الحسابات التي تستطيع الدخول إلى هذه اللوحة، وصلاحية كل واحدة منها."
            actionLabel="أنشئي أول حساب"
            onAction={openCreate}
          />
        ) : (
          <div className="adm-list">
            {items.map((a) => (
              <div className="adm-item" key={a.id}>
                <div className="adm-item-main">
                  <p className="adm-item-title">
                    {a.name}
                    {a.id === meId && (
                      <span className="adm-chip" style={{ marginInlineStart: 8 }}>
                        أنتِ
                      </span>
                    )}
                  </p>
                  <p className="adm-item-sub" dir="ltr" style={{ textAlign: "start" }}>
                    {a.email}
                  </p>
                  <div className="adm-item-meta">
                    <span>
                      {a.lastLoginAt ? `آخر دخول ${relativeTime(a.lastLoginAt)}` : "لم تدخل بعد"}
                    </span>
                    <span>أُنشئ في {formatDate(a.createdAt)}</span>
                  </div>
                </div>
                <div className="adm-item-actions">
                  <span className={`adm-chip ${a.role === "owner" ? "scheduled" : ""}`}>
                    {ROLE_LABEL[a.role]}
                  </span>
                  {!a.isActive && <span className="adm-chip archived">معطّل</span>}
                  <Toggle
                    checked={a.isActive}
                    disabled={pendingId === a.id}
                    onChange={(v) => setActive(a, v)}
                    label={`تفعيل حساب ${a.name}`}
                  />
                  <button className="adm-link" onClick={() => openEdit(a)}>
                    تعديل
                  </button>
                  <button
                    className="adm-icon-btn"
                    onClick={() => remove(a)}
                    aria-label={`حذف حساب ${a.name}`}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="مستخدم جديد"
        subtitle="حساب دخول جديد إلى لوحة التحكم."
        width={560}
        footer={
          <>
            <button className="btn btn-gold" onClick={submitCreate} disabled={busy}>
              {busy ? "جارٍ الإنشاء…" : "أنشئي الحساب"}
            </button>
            <button className="adm-link" onClick={() => setCreateOpen(false)}>
              إلغاء
            </button>
          </>
        }
      >
        <Field label="الاسم" required>
          <input
            value={draft.name}
            dir="rtl"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field label="البريد الإلكتروني" required hint="هذا هو البريد الذي تدخل به إلى اللوحة.">
          <input
            type="email"
            dir="ltr"
            autoComplete="off"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          />
        </Field>
        <Field label="كلمة المرور" required hint="8 أحرف على الأقل. سلّميها لصاحبة الحساب بنفسك.">
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={draft.password}
            onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
          />
        </Field>
        <Field
          label="الصلاحية"
          hint="المحرِّرة تُدير المحتوى. المالكة تُدير المحتوى والحسابات معًا."
        >
          <select
            value={draft.role}
            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as Role }))}
          >
            <option value="editor">محرِّرة</option>
            <option value="owner">مالكة</option>
          </select>
        </Field>
      </Dialog>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `تعديل حساب ${editing.name}` : "تعديل الحساب"}
        subtitle={editing?.email}
        width={560}
        footer={
          <>
            <button className="btn btn-gold" onClick={submitEdit} disabled={busy}>
              {busy ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            <button className="adm-link" onClick={() => setEditing(null)}>
              إلغاء
            </button>
          </>
        }
      >
        <Field label="الاسم" required>
          <input
            value={editDraft.name}
            dir="rtl"
            onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field label="الصلاحية">
          <select
            value={editDraft.role}
            onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value as Role }))}
          >
            <option value="editor">محرِّرة</option>
            <option value="owner">مالكة</option>
          </select>
        </Field>
        <div className="adm-field">
          <span className="adm-field-label">الحساب مفعَّل</span>
          <Toggle
            checked={editDraft.isActive}
            onChange={(v) => setEditDraft((d) => ({ ...d, isActive: v }))}
            label="الحساب مفعَّل"
          />
          <small className="adm-field-hint">
            الحساب المعطَّل يبقى في القائمة لكنه لا يستطيع الدخول.
          </small>
        </div>
        <Field
          label="كلمة مرور جديدة (اختيارية)"
          hint="اتركيها فارغة إن لم ترغبي بتغييرها. تغييرها يُسجّل خروج هذا الشخص من كل أجهزته فورًا."
        >
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={editDraft.password}
            onChange={(e) => setEditDraft((d) => ({ ...d, password: e.target.value }))}
          />
        </Field>
      </Dialog>
    </>
  );
}
