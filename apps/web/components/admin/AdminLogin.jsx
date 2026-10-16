"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { AuthField, AuthNotice, PasswordToggle } from "@/components/auth/authParts";
import { LockIcon, MailIcon } from "@/components/others/authIcons";
import { EMAIL_PATTERN } from "@/lib/auth/authClient";
import { focusFirstError } from "@/lib/focusFirstError";
import { AUTH_ROUTES } from "@/lib/routes";
import { safeNext } from "@/lib/safeNext";
import { getSupabase } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/react";

// The admin sign-in (/admin/login): its own dark page, no sign-up and no social sign-in. Step 1 is email and password; the API
// then says whether this login is an admin. Anyone who isn't is signed out at once and gets the same message as a wrong
// password, so the page never tells an outsider which emails are admins. Full admins (and anyone who has set one up) then use an
// authenticator app: the first time, scan a QR code and enter a code to set it up; after that, enter the code at each sign-in.
// Supabase MFA (TOTP) raises the session to aal2, which the API requires before the panel opens.

const GENERAL = "We couldn't sign you in. Check your email and password and try again.";
const CODE_PATTERN = /^\d{6}$/;
const codeProblem = (error) => {
  const code = error?.code || "";
  if (code === "over_request_rate_limit" || /rate limit|too many/i.test(error?.message || "")) return "Too many attempts. Please wait a few minutes and try again.";
  if (/fetch|network/i.test(error?.message || "")) return "We couldn't reach the server. Check your connection and try again.";
  return "That code didn't work. Enter the newest code from your authenticator app.";
};

function AdminAuthPage({ title, lead, children }) {
  return (
    <div className="rt-home rt-auth rt-adm-auth">
      <main className="rt-adm-auth__wrap" id="rt-adm-auth-main">
        <p className="rt-adm-auth__brand">
          <Image width={150} height={38} src="/assets/img/general/readtraining-logo.svg" alt="ReadTraining" priority />
          <span className="rt-adm__tag">Admin</span>
        </p>
        <div className="rt-auth__card">
          <h1 className="rt-auth__h1">{title}</h1>
          {lead && <p className="rt-auth__lead">{lead}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLogin() {
  const router = useRouter();
  const formRef = useRef(null);
  const [step, setStep] = useState("loading"); // loading | password | enrol | challenge
  const [values, setValues] = useState({ email: "", password: "", code: "" });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [factor, setFactor] = useState(null); // { id, qr, secret } while setting up; { id } when entering a code
  const [next, setNext] = useState(AUTH_ROUTES.admin);
  const check = api.admin.check.useMutation();
  const signedIn = api.admin.signedIn.useMutation();

  // where to go afterwards (only somewhere in the panel), and whether a session is already here (an admin who still has to
  // enter their code, or someone signed in on the public site)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = safeNext(q.get("next"), AUTH_ROUTES.admin);
    const path = n.split("?")[0];
    setNext((path === AUTH_ROUTES.admin || path.startsWith(`${AUTH_ROUTES.admin}/`)) && path !== AUTH_ROUTES.adminLogin ? n : AUTH_ROUTES.admin);
    if (q.get("unavailable") === "1") setNotice("We couldn't check your access just now. Please try again in a moment.");
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (!data.session) return setStep("password");
        const { step: s } = await check.mutateAsync({ attempt: false });
        await goTo(s, false);
      } catch {
        setStep("password");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: "" }));
    if (notice) setNotice("");
  };

  const finish = async (enrolled) => {
    await signedIn.mutateAsync({ enrolled }).catch(() => {});
    router.replace(next);
    router.refresh();
  };

  // the step after the password (or on arrival): set up, enter a code, or open the panel. `denied` on arrival (someone signed
  // in on the public site who isn't an admin): just show the form, without signing them out of the site.
  async function goTo(s, justSignedIn) {
    if (s === "denied") return setStep("password");
    const mfa = getSupabase().auth.mfa;
    if (s === "ready") return justSignedIn ? finish(false) : router.replace(next);
    if (s === "challenge") {
      const { data } = await mfa.listFactors();
      const totp = data?.totp?.[0];
      if (!totp) throw new Error("no factor");
      setFactor({ id: totp.id });
      return setStep("challenge");
    }
    // set up: clear any half-finished set-up from an earlier visit, then start a new one
    const { data: list } = await mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status !== "verified") await mfa.unenroll({ factorId: f.id });
    const { data, error } = await mfa.enroll({ factorType: "totp", friendlyName: "ReadTraining admin" });
    if (error) throw error;
    setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setStep("enrol");
  }

  const refuse = async (message = GENERAL) => {
    await getSupabase().auth.signOut({ scope: "local" }).catch(() => {});
    setValues((v) => ({ ...v, password: "", code: "" }));
    setFactor(null);
    setStep("password");
    setNotice(message);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    const found = {};
    if (!values.email.trim()) found.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(values.email.trim())) found.email = "Enter a valid email address.";
    if (!values.password) found.password = "Enter your password.";
    setErrors(found);
    setNotice("");
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: values.email.trim(), password: values.password });
      if (error) {
        const limited = error.code === "over_request_rate_limit" || /rate limit/i.test(error.message);
        const offline = /fetch|network/i.test(error.message);
        return setNotice(limited ? "Too many attempts. Please wait a few minutes and try again." : offline ? "We couldn't reach the server. Check your connection and try again." : GENERAL);
      }
      let s;
      try {
        s = (await check.mutateAsync({ attempt: true })).step;
      } catch {
        return refuse("We couldn't check your access just now. Please try again in a moment.");
      }
      // not an admin: signed out, same message as a wrong password
      if (s === "denied") return refuse();
      setValues((v) => ({ ...v, password: "" }));
      await goTo(s, true);
    } catch {
      setNotice("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!CODE_PATTERN.test(values.code)) {
      setErrors({ code: "Enter the 6-digit code from your authenticator app." });
      return focusFirstError(formRef.current);
    }
    setBusy(true);
    setNotice("");
    const { error } = await getSupabase().auth.mfa.challengeAndVerify({ factorId: factor.id, code: values.code });
    if (error) {
      setBusy(false);
      setValues((v) => ({ ...v, code: "" }));
      setErrors({ code: codeProblem(error) });
      return focusFirstError(formRef.current);
    }
    await finish(step === "enrol");
  };

  const switchAccount = async (e) => {
    e.preventDefault();
    await refuse("");
  };

  if (step === "loading") {
    return (
      <AdminAuthPage title="Admin sign-in">
        <p className="rt-adm-auth__wait" role="status">Checking your sign-in…</p>
      </AdminAuthPage>
    );
  }

  if (step === "password") {
    return (
      <AdminAuthPage title="Admin sign-in" lead="For ReadTraining staff only.">
        <form className="rt-auth__form" onSubmit={submitPassword} noValidate ref={formRef}>
          {notice && <AuthNotice>{notice}</AuthNotice>}
          <AuthField id="rt-adm-email" label="Email address" icon={<MailIcon />} error={errors.email} name="email" type="email" autoComplete="username" value={values.email} onChange={set} disabled={busy} />
          <AuthField
            id="rt-adm-password"
            label="Password"
            labelAside={<Link href={AUTH_ROUTES.forgotPassword} className="rt-auth__aside">Forgot your password?</Link>}
            icon={<LockIcon />}
            error={errors.password}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={values.password}
            onChange={set}
            disabled={busy}
            trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} disabled={busy} />}
          />
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </AdminAuthPage>
    );
  }

  const enrolling = step === "enrol";
  return (
    <AdminAuthPage
      title={enrolling ? "Set up two-step sign-in" : "Enter your code"}
      lead={enrolling ? "Admin accounts need a code from an authenticator app (for example Google Authenticator or Microsoft Authenticator) each time they sign in." : "Open your authenticator app and enter the 6-digit code for ReadTraining."}
    >
      <form className="rt-auth__form" onSubmit={submitCode} noValidate ref={formRef}>
        {notice && <AuthNotice>{notice}</AuthNotice>}
        {enrolling && factor?.qr && (
          <ol className="rt-adm-auth__steps">
            <li>
              <span>Scan this QR code with your authenticator app.</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="rt-adm-auth__qr" src={factor.qr} alt="QR code to add ReadTraining to your authenticator app" width={176} height={176} />
              <details className="rt-adm-auth__manual">
                <summary>Can&apos;t scan it? Enter this key instead</summary>
                <code>{factor.secret.match(/.{1,4}/g).join(" ")}</code>
              </details>
            </li>
            <li><span>Enter the 6-digit code the app shows.</span></li>
          </ol>
        )}
        <AuthField id="rt-adm-code" label="6-digit code" error={errors.code} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={values.code} onChange={set} disabled={busy} autoFocus={!enrolling} />
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy}>{busy ? "Checking…" : enrolling ? "Turn on and continue" : "Continue"}</button>
        <p className="rt-adm-auth__other">
          {enrolling ? "Lost access to your app later? Another Full admin can reset it for you." : "Lost your phone? Ask a Full admin to reset your two-step sign-in."}{" "}
          <a href={AUTH_ROUTES.adminLogin} onClick={switchAccount}>Sign in with a different account</a>
        </p>
      </form>
    </AdminAuthPage>
  );
}
