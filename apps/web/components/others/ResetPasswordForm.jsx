"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { AUTH_ROUTES, resetPassword, useAuthUser } from "@/lib/auth/authClient";
import { PASSWORD_ERROR, weakPassword } from "@/lib/auth/useSignUpForm";

const PROJECT_NAME = "ReadTraining";

// Set a new password (/reset-password), opened from the reset email (the link signs the person in for this change through
// /auth/callback). The forgot-password card's layout: the new password twice, with show/hide, the sign-up page's password rule,
// a message under each field and the first one focused; then "Password changed" and on to the account. Without a valid
// link (opened directly, expired or used) it says so and offers a new link.
export default function ResetPasswordForm() {
  const router = useRouter();
  const person = useAuthUser();
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | done
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
    const first = Object.keys(found)[0];
    if (first) return document.getElementById(`reset-${first}`)?.focus();
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

  const field = (k, label, autoComplete) => (
    <div className="mb-20">
      <label htmlFor={`reset-${k}`} className="text-16 lh-1 fw-500 text-dark-1 mb-10 d-block">{label}</label>
      <input
        id={`reset-${k}`}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={values[k]}
        onChange={set(k)}
        disabled={status === "saving"}
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `reset-${k}-error` : k === "password" ? "reset-rule" : undefined}
      />
      {k === "password" && !errors[k] && <div id="reset-rule" className="text-13 mt-5">{PASSWORD_ERROR}</div>}
      {errors[k] && <div id={`reset-${k}-error`} role="alert" className="text-13 mt-5" style={{ color: "var(--color-red-3)" }}>{errors[k]}</div>}
    </div>
  );

  return (
    <div className="d-flex items-center justify-center px-20 py-40" style={{ minHeight: "100vh", background: "var(--color-light-4)" }}>
      <div className="bg-white shadow-1 rounded-16 px-40 py-40 md:px-25 md:py-30" style={{ width: "100%", maxWidth: 480 }}>
        <div className="d-flex justify-center mb-30">
          <Link href="/" aria-label={`${PROJECT_NAME} home`}>
            <Image width={176} height={44} src="/assets/img/general/readtraining-logo-dark.svg" alt={PROJECT_NAME} style={{ maxWidth: "100%", height: "auto" }} />
          </Link>
        </div>

        {status === "done" ? (
          <div role="status" className="text-center">
            <h1 className="text-24 lh-13 fw-700 text-dark-1">Password changed</h1>
            <p className="text-15 mt-15">You can now log in with your new password. Taking you to your account…</p>
          </div>
        ) : person === null ? (
          <div className="text-center">
            <h1 className="text-24 lh-13 fw-700 text-dark-1">This link has expired</h1>
            <p className="text-15 mt-15">Reset links work once and for a limited time. Ask for a new one and use the latest email.</p>
            <Link href={AUTH_ROUTES.forgotPassword} className="button -md -purple-1 text-white fw-500 w-1/1 mt-25">Send a new link</Link>
          </div>
        ) : (
          <>
            <h1 className="text-24 lh-13 fw-700 text-dark-1 text-center">Set a new password</h1>
            <p className="text-15 text-center mt-10" style={{ overflowWrap: "anywhere" }}>
              {person ? <>For <span className="fw-500 text-dark-1">{person.email}</span></> : " "}
            </p>
            <form className="contact-form pt-30" onSubmit={submit} noValidate>
              {formError && (
                <div role="alert" className="text-14 rounded-8 px-15 py-10 mb-15" style={{ background: "var(--color-red-2)", color: "var(--color-red-3)" }}>{formError}</div>
              )}
              {field("password", "New password", "new-password")}
              {field("confirm", "Confirm new password", "new-password")}
              <label className="d-flex items-center text-14 mb-20" htmlFor="reset-show" style={{ gap: 8 }}>
                <input id="reset-show" type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} style={{ width: 16, height: 16 }} />
                Show passwords
              </label>
              <button type="submit" className="button -md -purple-1 text-white fw-500 w-1/1" disabled={status === "saving" || person === undefined} aria-busy={status === "saving"}>
                {status === "saving" ? "Saving" : "Save new password"}
              </button>
            </form>
          </>
        )}

        <p className="text-15 text-center mt-30">
          <Link href={AUTH_ROUTES.login} className="text-purple-1 fw-500">Back to Log in</Link>
        </p>
      </div>
    </div>
  );
}
