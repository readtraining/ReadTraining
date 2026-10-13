"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  AUTH_ROUTES,
  EMAIL_PATTERN,
  loginWithPassword,
  loginWithProvider,
  resendConfirmation,
} from "@/lib/auth/authClient";

const PROJECT_NAME = "ReadTraining";

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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
    />
  </svg>
);

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg {...iconProps}>
    <path d="M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </svg>
);

const leadingIconStyle = {
  position: "absolute",
  left: 16,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  color: "#8C8CA1",
  pointerEvents: "none",
};

export default function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | validating | submitting
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false); // the email has no confirmed account yet: offer the link again
  const [resent, setResent] = useState("");
  const [next, setNext] = useState(AUTH_ROUTES.afterLogin);

  // ?next= (where to go after logging in, set by the account pages) and ?error=link (an email link that expired or was used)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
    if (q.get("error") === "link") setFormError("That link has expired or was already used. Log in, or ask for a new link.");
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
      return;
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
    <div
      className="d-flex items-center justify-center px-20 py-20"
      style={{ minHeight: "100vh", background: "var(--color-light-4)" }}
    >
      <div
        className="bg-white shadow-1 rounded-16"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "24px 28px",
          border: "1px solid #DDDDDD",
        }}
      >
        <div className="d-flex justify-center mb-20">
          <Link href="/" aria-label={`${PROJECT_NAME} home`}>
            <Image
              width={150}
              height={38}
              src="/assets/img/general/readtraining-logo-dark.svg"
              alt={PROJECT_NAME}
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </Link>
        </div>

        <h1
          className="lh-13 fw-700 text-dark-1 text-center"
          style={{ fontSize: 22 }}
        >
          Log in to your {PROJECT_NAME} account
        </h1>
        <p className="text-14 text-center mt-5">
          Access your courses, bookings, and dashboard
        </p>

        <form
          className="contact-form pt-20"
          onSubmit={handleSubmit}
          noValidate
        >
          {formError && (
            <div
              role="alert"
              className="text-14 rounded-8 px-15 py-10 mb-15"
              style={{
                background: "var(--color-red-2)",
                color: "var(--color-red-3)",
                overflowWrap: "anywhere",
              }}
            >
              {formError}
              {unconfirmed && (
                <div className="mt-8">
                  {resent === "sent" ? (
                    <span className="fw-500">A new link is on its way to {values.email.trim()}.</span>
                  ) : (
                    <button type="button" className="fw-600 text-purple-1" style={{ background: "none", border: 0, padding: 0, textDecoration: "underline" }} onClick={handleResend} disabled={resent === "sending"}>
                      {resent === "sending" ? "Sending" : "Send the link again"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mb-15">
            <label
              htmlFor="login-email"
              className="text-15 lh-1 fw-500 text-dark-1 mb-8 d-block"
            >
             <b> Email Address </b>
            </label>
            <div style={{ position: "relative" }}>
              <span style={leadingIconStyle}>
                <MailIcon />
              </span>
              <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={handleChange}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              style={{ paddingLeft: 44 }}
            />
            </div>
            {fieldErrors.email && (
              <div
                id="login-email-error"
                className="text-13 mt-5"
                style={{ color: "var(--color-red-3)" }}
              >
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="mb-15">
            <div className="d-flex justify-between items-center mb-8 x-gap-10">
              <label
                htmlFor="login-password"
                className="text-15 lh-1 fw-500 text-dark-1"
              >
                <b> Password </b>
              </label>
              <Link
                href={AUTH_ROUTES.forgotPassword}
                className="text-14 text-purple-1"
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <span style={leadingIconStyle}>
                <LockIcon />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={values.password}
                onChange={handleChange}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "login-password-error" : undefined
                }
                style={{ paddingLeft: 44, paddingRight: 46 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={busy}
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  background: "none",
                  border: 0,
                  padding: 0,
                  color: "#8C8CA1",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <div
                id="login-password-error"
                className="text-13 mt-5"
                style={{ color: "var(--color-red-3)" }}
              >
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="button -md -purple-1 text-white fw-500 w-1/1"
            disabled={busy}
            aria-busy={status !== "idle"}
          >
            {BUTTON_LABELS[status]}
          </button>
        </form>

        <div className="text-14 text-center mt-20 mb-15 d-flex items-center x-gap-15">
          <span style={{ flex: 1, borderTop: "1px solid #DDDDDD" }} />
          <span>Or continue with</span>
          <span style={{ flex: 1, borderTop: "1px solid #DDDDDD" }} />
        </div>
        <div className="row y-gap-10">
          <div className="col-sm-6">
            <button
              type="button"
              className="button -sm -outline-dark-1 text-dark-1 w-1/1 d-flex items-center justify-center"
              style={{ gap: 10 }}
              onClick={() => handleSocial("google")}
              disabled={busy}
            >
              <GoogleIcon /> Google
            </button>
          </div>
          <div className="col-sm-6">
            <button
              type="button"
              className="button -sm -outline-dark-1 text-dark-1 w-1/1 d-flex items-center justify-center"
              style={{ gap: 10 }}
              onClick={() => handleSocial("facebook")}
              disabled={busy}
            >
              <FacebookIcon /> Facebook
            </button>
          </div>
        </div>

        <p className="text-14 text-center mt-20">
          Don&apos;t have an account?{" "}
          <Link href={AUTH_ROUTES.signUp} className="text-purple-1 fw-500">
            Sign up
          </Link>
        </p>

        <div className="text-center mt-20">
          <div className="text-14 fw-500 text-dark-1">
            Looking to partner with our ReadTraining?
          </div>
          <div className="d-flex justify-center flex-wrap items-center mt-8 text-14">
            <Link href="/#providers" className="text-purple-1">
              Course provider
            </Link>
            <span style={{ margin: "0 10px" }} aria-hidden="true">
              |
            </span>
            <Link href="/#employers" className="text-purple-1">
              Business account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
