"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { AuthField, AuthNotice, AuthPage, PasswordToggle, SocialSignIn } from "@/components/auth/authParts";
import { LockIcon, MailIcon } from "@/components/others/authIcons";
import { focusFirstError } from "@/lib/focusFirstError";
import {
  AUTH_ROUTES,
  EMAIL_PATTERN,
  loginWithPassword,
  loginWithProvider,
  resendConfirmation,
  useAuthUser,
} from "@/lib/auth/authClient";
import { safeNext } from "@/lib/safeNext";

const BUTTON_LABELS = {
  idle: "Log in",
  validating: "Validating",
  submitting: "Logging in",
};

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export default function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [linkProblem, setLinkProblem] = useState(false); // arrived from an expired or used email link
  const person = useAuthUser();
  const [status, setStatus] = useState("idle"); // idle | validating | submitting
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false); // the email has no confirmed account yet: offer the link again
  const [resent, setResent] = useState("");
  const [next, setNext] = useState(AUTH_ROUTES.afterLogin);
  const formRef = useRef(null);

  // ?next= (where to go after logging in, set by the account pages) and ?error=link (an email link that expired or was used)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get("next");
    if (n) setNext(safeNext(n, AUTH_ROUTES.afterLogin));
    if (q.get("error") === "link") {
      setLinkProblem(true);
      setFormError("That link has expired or was already used. Log in, or ask for a new link.");
    }
    if (q.get("ended") === "1") setFormError("You've been signed out on this device, for example because your password was changed. Please log in again.");
  }, []);

  const busy = status !== "idle" || Boolean(socialLoading);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    setStatus("validating");

    // Brief pause so the "Validating" state is visible; validation itself is sync.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setStatus("idle");
      return focusFirstError(formRef.current);
    }

    setStatus("submitting");
    setUnconfirmed(false);
    setResent("");
    try {
      await loginWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setFormError(err?.message || "We couldn't log you in. Please try again.");
      setUnconfirmed(err?.code === "email_not_confirmed");
      setStatus("idle");
    }
  };

  const handleResend = async () => {
    setResent("sending");
    try {
      await resendConfirmation({ email: values.email.trim() });
      setResent("sent");
    } catch (err) {
      setFormError(err?.message || "We couldn't send the link. Please try again.");
      setResent("");
    }
  };

  const handleSocial = async (provider) => {
    if (busy) return;
    setFormError("");
    setSocialLoading(provider);
    try {
      await loginWithProvider(provider);
      router.replace(next);
    } catch (err) {
      setFormError(err?.message || "Social sign-in failed. Please try again.");
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <AuthPage
      title="Log in to your ReadTraining account"
      lead="Access your courses, bookings and dashboard."
      footer={
        <>
          <p>Don&apos;t have an account? <Link href={next === AUTH_ROUTES.afterLogin ? AUTH_ROUTES.signUp : `${AUTH_ROUTES.signUp}?next=${encodeURIComponent(next)}`}>Sign up</Link></p>
          <p className="rt-auth__partner">
            Looking to partner with ReadTraining?
            <span><Link href="/for-providers">Course provider</Link><span aria-hidden="true"> | </span><Link href="/for-business">Business account</Link></span>
          </p>
        </>
      }
    >
      <form className="rt-auth__form" onSubmit={handleSubmit} noValidate ref={formRef}>
        {formError && (
          <AuthNotice>
            {linkProblem && person ? "That link has expired or was already used. You're still logged in." : formError}
            {linkProblem && person && (
              <span className="rt-auth__noticeaction">
                <Link href={next}>Go to your account</Link>
              </span>
            )}
            {unconfirmed && (
              <span className="rt-auth__noticeaction">
                {resent === "sent" ? (
                  <b>A new link is on its way to {values.email.trim()}.</b>
                ) : (
                  <button type="button" className="rt-auth__linkbtn" onClick={handleResend} disabled={resent === "sending"}>
                    {resent === "sending" ? "Sending" : "Send the link again"}
                  </button>
                )}
              </span>
            )}
          </AuthNotice>
        )}

        <AuthField id="login-email" label="Email address" icon={<MailIcon />} error={fieldErrors.email} type="email" name="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={handleChange} disabled={busy} />
        <AuthField
          id="login-password"
          label="Password"
          labelAside={<Link href={AUTH_ROUTES.forgotPassword} className="rt-auth__aside">Forgot password?</Link>}
          icon={<LockIcon />}
          error={fieldErrors.password}
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={handleChange}
          disabled={busy}
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((prev) => !prev)} disabled={busy} />}
        />

        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={status !== "idle"}>
          {BUTTON_LABELS[status]}
        </button>
      </form>

      <SocialSignIn onSocial={handleSocial} disabled={busy} />
    </AuthPage>
  );
}
