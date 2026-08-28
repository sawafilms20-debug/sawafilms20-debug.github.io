"use client";

import { useEffect, useState } from "react";
import { rpc, RpcError } from "../rpc";
import type { SectionProps } from "../types";
import { Dialog, Field, Loading } from "../ui";

/* The operator's own credentials: password and two-factor.

   This lives outside the user roster on purpose. The roster is owner-only, and
   an editor who cannot reach it would otherwise have no way to change her own
   password or turn on two-factor — the two things every account holder needs
   and nobody should need permission for. */

export default function AccountSection({ toast }: SectionProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [busy2fa, setBusy2fa] = useState(false);

  useEffect(() => {
    let cancelled = false;
    rpc.auth
      .twoFactorStatus<{ enabled: boolean }>()
      .then((r) => {
        if (!cancelled) setTwoFactor(r.enabled);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast(e instanceof RpcError ? e.message : "تعذّر قراءة حالة التحقق بخطوتين.", "bad");
        setTwoFactor(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const changePassword = async () => {
    if (next.length < 8) {
      toast("كلمة المرور الجديدة يجب ألّا تقلّ عن 8 أحرف.", "bad");
      return;
    }
    if (next !== again) {
      toast("الكلمتان غير متطابقتين.", "bad");
      return;
    }
    setSavingPw(true);
    try {
      await rpc.auth.changePassword<{ ok: boolean }>({ current, next });
      toast("تم تغيير كلمة المرور — وسُجّل الخروج من الأجهزة الأخرى ✓");
      setCurrent("");
      setNext("");
      setAgain("");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير كلمة المرور.", "bad");
    } finally {
      setSavingPw(false);
    }
  };

  const startSetup = async () => {
    setBusy2fa(true);
    try {
      const r = await rpc.auth.twoFactorSetup<{ secret: string; otpauth: string }>();
      setCode("");
      setSetup(r);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر بدء التفعيل.", "bad");
    } finally {
      setBusy2fa(false);
    }
  };

  const confirmSetup = async () => {
    if (!setup) return;
    setBusy2fa(true);
    try {
      await rpc.auth.twoFactorEnable<{ ok: boolean }>({ secret: setup.secret, code: code.trim() });
      toast("تم تفعيل التحقق بخطوتين ✓");
      setSetup(null);
      setTwoFactor(true);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تفعيل التحقق بخطوتين.", "bad");
    } finally {
      setBusy2fa(false);
    }
  };

  const disable = async () => {
    setBusy2fa(true);
    try {
      await rpc.auth.twoFactorDisable<{ ok: boolean }>({ password: disablePw });
      toast("تم تعطيل التحقق بخطوتين ✓");
      setDisableOpen(false);
      setDisablePw("");
      setTwoFactor(false);
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تعطيل التحقق بخطوتين.", "bad");
    } finally {
      setBusy2fa(false);
    }
  };

  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>أمان حسابك</h2>
        <p className="adm-panel-title">هذا القسم يخصّ حسابك أنتِ وحدك</p>
      </div>

      <div className="adm-grid-2">
        <div>
          <h3 className="adm-panel-title">تغيير كلمة المرور</h3>
          <p className="adm-muted" style={{ margin: "6px 0 14px", fontSize: 13.5 }}>
            بعد التغيير يُسجَّل الخروج من كل الأجهزة الأخرى، ويبقى هذا الجهاز وحده مفتوحًا.
          </p>
          <Field label="كلمة المرور الحالية" required>
            <input
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field label="كلمة المرور الجديدة" required hint="8 أحرف على الأقل.">
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة" required>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
          </Field>
          <button
            className="btn btn-gold"
            onClick={changePassword}
            disabled={savingPw || !current || !next}
          >
            {savingPw ? "جارٍ التغيير…" : "غيّري كلمة المرور"}
          </button>
        </div>

        <div>
          <h3 className="adm-panel-title">التحقق بخطوتين</h3>
          <p className="adm-muted" style={{ margin: "6px 0 14px", fontSize: 13.5 }}>
            رمز من تطبيق مصادقة على جوّالك، يُطلب بعد كلمة المرور عند كل دخول.
          </p>

          {twoFactor === null ? (
            <Loading label="جارٍ قراءة الحالة…" />
          ) : twoFactor ? (
            <>
              <p className="adm-ok" style={{ marginBottom: 12 }}>
                التحقق بخطوتين مُفعَّل على حسابك.
              </p>
              <button className="btn btn-ghost" onClick={() => setDisableOpen(true)}>
                تعطيل التحقق بخطوتين
              </button>
            </>
          ) : (
            <>
              <p className="adm-muted" style={{ marginBottom: 12, fontSize: 13.5 }}>
                غير مُفعَّل. تفعيله يعني أن كلمة المرور وحدها لا تكفي لدخول أحد إلى لوحتك.
              </p>
              <button className="btn btn-gold" onClick={startSetup} disabled={busy2fa}>
                {busy2fa ? "لحظة…" : "تفعيل التحقق بخطوتين"}
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={!!setup}
        onClose={() => setSetup(null)}
        title="تفعيل التحقق بخطوتين"
        subtitle="أضيفي المفتاح إلى تطبيق المصادقة، ثم أكّدي بالرمز الذي يعرضه."
        width={560}
        footer={
          <>
            <button
              className="btn btn-gold"
              onClick={confirmSetup}
              disabled={busy2fa || code.trim().length < 6}
            >
              {busy2fa ? "جارٍ التأكيد…" : "تأكيد وتفعيل"}
            </button>
            <button className="adm-link" onClick={() => setSetup(null)}>
              إلغاء
            </button>
          </>
        }
      >
        <p className="adm-note">
          افتحي تطبيق مصادقة على جوّالك (Google Authenticator أو Microsoft Authenticator أو ما
          يشبههما)، واختاري «إضافة حساب» ثم «إدخال المفتاح يدويًا»، وانسخي المفتاح التالي كما هو.
          لا يظهر هنا رمز QR، فالإدخال اليدوي يؤدّي الغرض نفسه.
        </p>

        <div className="adm-field">
          <span className="adm-field-label">المفتاح</span>
          <code className="adm-code" style={{ display: "block" }}>
            {setup?.secret}
          </code>
          <small className="adm-field-hint">
            احتفظي به في مكان آمن حتى ينتهي التفعيل. لن يُعرض مرة أخرى.
          </small>
        </div>

        <div className="adm-field">
          <span className="adm-field-label">رابط الإعداد (otpauth)</span>
          <code className="adm-code" style={{ display: "block" }}>
            {setup?.otpauth}
          </code>
          <small className="adm-field-hint">
            بعض التطبيقات تقبل لصق هذا الرابط مباشرة بدل المفتاح.
          </small>
        </div>

        <Field label="الرمز المكوّن من ستة أرقام" required hint="الرمز الذي يعرضه التطبيق الآن.">
          <input
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
      </Dialog>

      <Dialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="تعطيل التحقق بخطوتين"
        width={460}
        footer={
          <>
            <button className="btn btn-danger" onClick={disable} disabled={busy2fa || !disablePw}>
              {busy2fa ? "جارٍ التعطيل…" : "عطّلي التحقق"}
            </button>
            <button className="adm-link" onClick={() => setDisableOpen(false)}>
              إلغاء
            </button>
          </>
        }
      >
        <p className="adm-note">
          بعد التعطيل تكفي كلمة المرور وحدها لدخول لوحتك. أكّدي بكلمة مرورك الحالية.
        </p>
        <Field label="كلمة المرور الحالية" required>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={disablePw}
            onChange={(e) => setDisablePw(e.target.value)}
          />
        </Field>
      </Dialog>
    </section>
  );
}
