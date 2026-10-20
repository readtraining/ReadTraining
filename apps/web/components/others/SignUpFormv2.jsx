"use client";

import Link from "next/link";
import React, { useRef, useState } from "react";
import { AuthCheck, AuthField, AuthNotice, AuthPage, PasswordToggle, SocialSignIn } from "@/components/auth/authParts";
import { AUTH_ROUTES } from "@/lib/auth/authClient";
import { PASSWORD_ERROR, SIGNUP_BUTTON_LABELS, useSignUpForm } from "@/lib/auth/useSignUpForm";
import { focusFirstError } from "@/lib/focusFirstError";
import { LockIcon, MailIcon, UserIcon } from "./authIcons";

// Sign up (/signup): the shared auth card (components/auth/authParts.jsx) with the useSignUpForm hook's fields and checks. After
// a failed check the first field with a message gets the focus; once the account exists, "Check your email" (confirmation on)
// or straight on to the account.
export default function SignUpFormv2() {
  const { values, fieldErrors, formError, setFormError, status, busy, handleChange, handleSubmit, handleSocial } = useSignUpForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef(null);
  const common = { onChange: handleChange, disabled: busy };

  const submit = async (e) => {
    await handleSubmit(e);
    focusFirstError(formRef.current);
  };

  return (
    <AuthPage
      title={status === "sent" ? "Check your email" : "Create your account"}
      lead={status === "sent" ? null : "Book courses and track your training in one place."}
      footer={
        <>
          <p>Already have an account? <Link href={AUTH_ROUTES.login}>Log in</Link></p>
          <p className="rt-auth__small">
            By signing up, you agree to our <Link href={AUTH_ROUTES.terms}>Terms of Use</Link> and <Link href={AUTH_ROUTES.privacy}>Privacy Policy</Link>.
          </p>
        </>
      }
    >
      {status === "sent" ? (
        <p className="rt-auth__done" role="status">
          We&apos;ve sent a link to <b>{values.email.trim()}</b>. Open it to confirm your email and start using your account. If you
          don&apos;t see it, check your spam or junk folder.
        </p>
      ) : (
        <>
          <form className="rt-auth__form" onSubmit={submit} noValidate ref={formRef}>
            {status === "success" && <AuthNotice tone="success">Your account has been created. Taking you to your account…</AuthNotice>}
            {formError && <AuthNotice>{formError}</AuthNotice>}
            <div className="rt-auth__pair">
              <AuthField id="signup-first-name" label="First name" icon={<UserIcon />} error={fieldErrors.firstName} type="text" name="firstName" autoComplete="given-name" value={values.firstName} {...common} />
              <AuthField id="signup-last-name" label="Last name" icon={<UserIcon />} error={fieldErrors.lastName} type="text" name="lastName" autoComplete="family-name" value={values.lastName} {...common} />
            </div>
            <AuthField id="signup-email" label="Email" icon={<MailIcon />} error={fieldErrors.email} type="email" name="email" autoComplete="email" value={values.email} {...common} />
            <AuthField
              id="signup-password"
              label="Password"
              hint={PASSWORD_ERROR}
              icon={<LockIcon />}
              error={fieldErrors.password}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              value={values.password}
              trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} disabled={busy} />}
              {...common}
            />
            <AuthField
              id="signup-confirm-password"
              label="Confirm password"
              icon={<LockIcon />}
              error={fieldErrors.confirmPassword}
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              value={values.confirmPassword}
              trailing={<PasswordToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} disabled={busy} />}
              {...common}
            />
            <AuthCheck id="signup-marketing" label="Send me updates and offers" name="marketingOptIn" checked={values.marketingOptIn} onChange={handleChange} disabled={busy} />
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={status === "validating" || status === "submitting"}>
              {SIGNUP_BUTTON_LABELS[status]}
            </button>
          </form>
          <SocialSignIn onSocial={handleSocial} disabled={busy} onError={setFormError} signingUp />
        </>
      )}
    </AuthPage>
  );
}
