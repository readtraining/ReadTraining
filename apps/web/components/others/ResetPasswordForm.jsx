"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { AuthCheck, AuthField, AuthNotice, AuthPage } from "@/components/auth/authParts";
import { AUTH_ROUTES, resetPassword, useAuthUser } from "@/lib/auth/authClient";
import { PASSWORD_ERROR, weakPassword } from "@/lib/auth/useSignUpForm";
import { focusFirstError } from "@/lib/focusFirstError";
import { LockIcon } from "./authIcons";

// Set a new password (/reset-password), opened from the reset email (the link signs the person in for this change through
// /auth/callback). The shared auth card: the new password twice with "Show passwords", the sign-up page's password rule, the
// message above each field and the first one focused; then "Password changed" and on to the account. Without a valid link
// (opened directly, expired or used) it says so and offers a new link.
export default function ResetPasswordForm() {
  const router = useRouter();
  const person = useAuthUser();
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | done
  const formRef = useRef(null);
  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => router.replace(AUTH_ROUTES.afterLogin), 1500);
    return () => clearTimeout(t);
  }, [status, router]);

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (status === "saving") return;
    const found = {};
    if (!values.password) found.password = "Enter a new password.";
    else if (weakPassword(values.password)) found.password = PASSWORD_ERROR;
    if (!values.confirm) found.confirm = "Enter the new password again.";
    else if (values.password && values.confirm !== values.password) found.confirm = "The passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setFormError("");
    setStatus("saving");
    try {
      await resetPassword({ password: values.password });
      setStatus("done");
    } catch (err) {
      setFormError(err?.message || "We couldn't change your password. Please try again.");
      setStatus("idle");
    }
  };

  const expired = person === null && status !== "done";
  const title = status === "done" ? "Password changed" : expired ? "This link has expired" : "Set a new password";
  const lead = status === "done" ? null : expired ? null : person ? <>For <b>{person.email}</b></> : null;

  return (
    <AuthPage title={title} lead={lead} footer={<p><Link href={AUTH_ROUTES.login}>Back to log in</Link></p>}>
      {status === "done" ? (
        <p className="rt-auth__done" role="status">You can now log in with your new password. Taking you to your account…</p>
      ) : expired ? (
        <>
          <p className="rt-auth__done">Reset links work once and for a limited time. Ask for a new one and use the latest email.</p>
          <Link href={AUTH_ROUTES.forgotPassword} className="button -md -purple-1 text-white rt-btn-block">Send a new link</Link>
        </>
      ) : (
        <form className="rt-auth__form" onSubmit={submit} noValidate ref={formRef}>
          {formError && <AuthNotice>{formError}</AuthNotice>}
          <AuthField id="reset-password" label="New password" hint={PASSWORD_ERROR} icon={<LockIcon />} error={errors.password} type={show ? "text" : "password"} autoComplete="new-password" value={values.password} onChange={set("password")} disabled={status === "saving"} />
          <AuthField id="reset-confirm" label="Confirm new password" icon={<LockIcon />} error={errors.confirm} type={show ? "text" : "password"} autoComplete="new-password" value={values.confirm} onChange={set("confirm")} disabled={status === "saving"} />
          <AuthCheck id="reset-show" label="Show passwords" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "saving" || person === undefined} aria-busy={status === "saving"}>
            {status === "saving" ? "Saving" : "Save new password"}
          </button>
        </form>
      )}
    </AuthPage>
  );
}
