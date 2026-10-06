"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import {
  AUTH_ROUTES,
  EMAIL_PATTERN,
  loginWithPassword,
  loginWithProvider,
} from "@/lib/auth/authClient";
import {
  EyeIcon,
  EyeOffIcon,
  FacebookIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
} from "./authIcons";

// Version 2 of the login UI: same behaviour as LoginForm.jsx (Version 1) in a
// single narrow card. Left-aligned header, filled inputs, and plain inline
// footer rows (no inner panels or boxes).

const PROJECT_NAME = "ReadTraining";
const BORDER = "1px solid #DDDDDD";
const MUTED = "#8C8CA1";

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

const css = `
form.contact-form input.lf2-input[name] { background: var(--color-light-4); border-radius: 8px; padding: 12px 14px 12px 44px; }
form.contact-form input.lf2-input[name]:focus { background: #fff; }
form.contact-form input.lf2-input[name].-error { border-color: var(--color-red-3); }
.lf2-social { display: flex; align-items: center; justify-content: center; gap: 10px; height: 42px; width: 100%; background: #fff; border: ${BORDER}; border-radius: 8px; color: var(--color-dark-1); font-size: 14px; font-weight: 500; cursor: pointer; transition: border-color .15s; }
.lf2-social:hover:not(:disabled) { border-color: var(--color-dark-1); }
.lf2-social:disabled { opacity: .6; cursor: default; }
`;

const iconStyle = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  color: MUTED,
  pointerEvents: "none",
};

const errorStyle = { color: "var(--color-red-3)" };

export default function LoginFormv2() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | validating | submitting
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

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
    try {
      await loginWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      router.push(AUTH_ROUTES.afterLogin);
    } catch (err) {
      setFormError(err?.message || "We couldn't log you in. Please try again.");
      setStatus("idle");
    }
  };

  const handleSocial = async (provider) => {
    if (busy) return;
    setFormError("");
    setSocialLoading(provider);
    try {
      await loginWithProvider(provider);
      router.push(AUTH_ROUTES.afterLogin);
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
      <style>{css}</style>
      <div
        className="bg-white"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "26px 28px 22px",
          border: BORDER,
          borderRadius: 16,
        }}
      >
        <Link href="/" aria-label={`${PROJECT_NAME} home`} className="d-inline-block">
          <Image
            width={132}
            height={34}
            src="/assets/img/general/readtraining-logo-dark.svg"
            alt={PROJECT_NAME}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Link>

        <h1
          className="fw-700 text-dark-1 mt-15"
          style={{ fontSize: 21, lineHeight: 1.25, letterSpacing: "-0.01em" }}
        >
          Log in to your {PROJECT_NAME} account
        </h1>
        <p className="text-14 mt-5">Access your courses, bookings, and dashboard</p>

        <form className="contact-form pt-20" onSubmit={handleSubmit} noValidate>
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
            </div>
          )}

          <div className="mb-15">
            <label
              htmlFor="login2-email"
              className="text-14 lh-1 fw-500 text-dark-1 mb-8 d-block"
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <span style={iconStyle}>
                <MailIcon />
              </span>
              <input
                id="login2-email"
                className={`lf2-input${fieldErrors.email ? " -error" : ""}`}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={handleChange}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "login2-email-error" : undefined}
              />
            </div>
            {fieldErrors.email && (
              <div id="login2-email-error" className="text-13 mt-5" style={errorStyle}>
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="mb-20">
            <div className="d-flex justify-between items-center mb-8 x-gap-10">
              <label
                htmlFor="login2-password"
                className="text-14 lh-1 fw-500 text-dark-1"
              >
                Password
              </label>
              <Link
                href={AUTH_ROUTES.forgotPassword}
                className="text-13 fw-500 text-purple-1"
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <span style={iconStyle}>
                <LockIcon />
              </span>
              <input
                id="login2-password"
                className={`lf2-input${fieldErrors.password ? " -error" : ""}`}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={values.password}
                onChange={handleChange}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "login2-password-error" : undefined
                }
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={busy}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  background: "none",
                  border: 0,
                  padding: 0,
                  color: MUTED,
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <div
                id="login2-password-error"
                className="text-13 mt-5"
                style={errorStyle}
              >
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="button -md -purple-1 text-white fw-500 w-1/1"
            style={{ borderRadius: 8 }}
            disabled={busy}
            aria-busy={status !== "idle"}
          >
            {BUTTON_LABELS[status]}
          </button>
        </form>

        <div
          className="text-13 d-flex items-center mt-20 mb-15"
          style={{ gap: 12 }}
        >
          <span style={{ flex: 1, borderTop: BORDER }} />
          <span>Or continue with</span>
          <span style={{ flex: 1, borderTop: BORDER }} />
        </div>

        <div className="row x-gap-10 y-gap-10">
          <div className="col-sm-6">
            <button
              type="button"
              className="lf2-social"
              onClick={() => handleSocial("google")}
              disabled={busy}
            >
              <GoogleIcon /> Google
            </button>
          </div>
          <div className="col-sm-6">
            <button
              type="button"
              className="lf2-social"
              onClick={() => handleSocial("facebook")}
              disabled={busy}
            >
              <FacebookIcon /> Facebook
            </button>
          </div>
        </div>

        <div className="mt-20 pt-15" style={{ borderTop: BORDER }}>
          <p className="text-13">
            Don&apos;t have an account?{" "}
            <Link href={AUTH_ROUTES.signUp} className="text-purple-1 fw-500">
              Sign up
            </Link>
          </p>
          <p
            className="text-13 d-flex flex-wrap items-center mt-8"
            style={{ columnGap: 6 }}
          >
            <span>Looking to partner with our ReadTraining?</span>
            <span className="d-flex items-center" style={{ columnGap: 8 }}>
              <Link href="/#providers" className="text-purple-1 fw-500">
                Course provider
              </Link>
              <span aria-hidden="true">|</span>
              <Link href="/#employers" className="text-purple-1 fw-500">
                Business account
              </Link>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
