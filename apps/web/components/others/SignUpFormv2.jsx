"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { AUTH_ROUTES } from "@/lib/auth/authClient";
import { SIGNUP_BUTTON_LABELS, useSignUpForm } from "@/lib/auth/useSignUpForm";
import {
  EyeIcon,
  EyeOffIcon,
  FacebookIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "./authIcons";

// Sign Up version 2: same content and behaviour as SignUpForm.jsx (V1), via the
// shared useSignUpForm hook, in a softer layout: ambient gradient ground, one
// elevated card, filled-on-focus inputs, inline footer (no inner panels).

const PROJECT_NAME = "ReadTraining";
const BORDER = "1px solid #E4E5EE";
const MUTED = "#8C8CA1";

const css = `
.su2-page { background:
  radial-gradient(60% 50% at 15% 0%, rgba(100,64,251,.16) 0%, rgba(100,64,251,0) 70%),
  radial-gradient(50% 45% at 90% 100%, rgba(100,64,251,.10) 0%, rgba(100,64,251,0) 70%),
  var(--color-light-4); }
form.contact-form input.su2-input[name] { border: ${BORDER}; border-radius: 10px; background: #fff; padding: 10px 14px 10px 42px; font-size: 14.5px; }
form.contact-form input.su2-input[name]:hover:not(:disabled) { border-color: #C9CADB; }
form.contact-form input.su2-input[name]:focus { border-color: var(--color-purple-1); box-shadow: 0 0 0 3px rgba(100,64,251,.14); }
form.contact-form input.su2-input[name].-error { border-color: var(--color-red-3); }
form.contact-form input.su2-input[name].-error:focus { box-shadow: 0 0 0 3px rgba(217,48,37,.14); }
.su2-cta { box-shadow: 0 6px 16px rgba(100,64,251,.28); transition: box-shadow .15s, transform .15s; }
.su2-cta:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(100,64,251,.36); transform: translateY(-1px); }
.su2-cta:disabled { box-shadow: none; }
/* social buttons: same purple hover as the Sign up button (purple border and text) */
.button.-outline-dark-1.su2-social:hover:not(:disabled) { background: transparent; border-color: var(--color-purple-1); color: var(--color-purple-1) !important; }
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

function Field({ id, label, icon, error, trailing, className = "mb-10", ...inputProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-14 lh-1 fw-500 text-dark-1 mb-8 d-block">
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={iconStyle}>{icon}</span>
        <input
          id={id}
          className={`su2-input${error ? " -error" : ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          style={trailing ? { paddingRight: 42 } : undefined}
          {...inputProps}
        />
        {trailing}
      </div>
      {error && (
        <div id={`${id}-error`} className="text-13 mt-5" style={errorStyle}>
          {error}
        </div>
      )}
    </div>
  );
}

function PasswordToggle({ shown, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      disabled={disabled}
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
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

export default function SignUpFormv2() {
  const {
    values,
    fieldErrors,
    formError,
    status,
    busy,
    handleChange,
    handleSubmit,
    handleSocial,
  } = useSignUpForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const common = { onChange: handleChange, disabled: busy };

  return (
    <div
      className="su2-page d-flex items-center justify-center px-20 py-20"
      style={{ minHeight: "100vh" }}
    >
      <style>{css}</style>
      <div
        className="bg-white"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "24px 28px",
          border: BORDER,
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(20,3,66,0.08), 0 2px 6px rgba(20,3,66,0.04)",
        }}
      >
        <div className="d-flex justify-center mb-15">
          <Link href="/" aria-label={`${PROJECT_NAME} home`}>
            <Image
              width={140}
              height={35}
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
          Create your {PROJECT_NAME} account
        </h1>
        <p className="text-14 text-center mt-5">
          Book courses and track your training in one place.
        </p>

        <form className="contact-form pt-15" onSubmit={handleSubmit} noValidate>
          {status === "success" && (
            <div
              role="status"
              className="text-14 rounded-8 px-15 py-10 mb-12"
              style={{ background: "#E6F8EE", color: "#0B7A43" }}
            >
              Your account has been created. Taking you to the home page…
            </div>
          )}
          {formError && (
            <div
              role="alert"
              className="text-14 rounded-8 px-15 py-10 mb-12"
              style={{
                background: "var(--color-red-2)",
                color: "var(--color-red-3)",
                overflowWrap: "anywhere",
              }}
            >
              {formError}
            </div>
          )}

          <div className="row x-gap-10">
            <div className="col-sm-6">
              <Field
                id="signup2-first-name"
                label="First name"
                icon={<UserIcon />}
                error={fieldErrors.firstName}
                type="text"
                name="firstName"
                autoComplete="given-name"
                value={values.firstName}
                {...common}
              />
            </div>
            <div className="col-sm-6">
              <Field
                id="signup2-last-name"
                label="Last name"
                icon={<UserIcon />}
                error={fieldErrors.lastName}
                type="text"
                name="lastName"
                autoComplete="family-name"
                value={values.lastName}
                {...common}
              />
            </div>
          </div>

          <Field
            id="signup2-email"
            label="Email"
            icon={<MailIcon />}
            error={fieldErrors.email}
            type="email"
            name="email"
            autoComplete="email"
            value={values.email}
            {...common}
          />

          <div className="row x-gap-10">
            <div className="col-sm-6">
              <Field
                id="signup2-password"
                label="Password"
                icon={<LockIcon />}
                error={fieldErrors.password}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                value={values.password}
                trailing={
                  <PasswordToggle
                    shown={showPassword}
                    onToggle={() => setShowPassword((prev) => !prev)}
                    disabled={busy}
                  />
                }
                {...common}
              />
            </div>
            <div className="col-sm-6">
              <Field
                id="signup2-confirm-password"
                label="Confirm password"
                icon={<LockIcon />}
                error={fieldErrors.confirmPassword}
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={values.confirmPassword}
                trailing={
                  <PasswordToggle
                    shown={showConfirm}
                    onToggle={() => setShowConfirm((prev) => !prev)}
                    disabled={busy}
                  />
                }
                {...common}
              />
            </div>
          </div>

          <label
            htmlFor="signup2-marketing"
            className="d-flex items-center text-14 mb-12"
            style={{ gap: 10, cursor: busy ? "default" : "pointer" }}
          >
            <input
              id="signup2-marketing"
              type="checkbox"
              name="marketingOptIn"
              checked={values.marketingOptIn}
              onChange={handleChange}
              disabled={busy}
              style={{
                width: 16,
                height: 16,
                flex: "0 0 auto",
                accentColor: "var(--color-purple-1)",
              }}
            />
            <span>Send me updates and offers</span>
          </label>

          <button
            type="submit"
            className="su2-cta button -md -purple-1 text-white fw-700 w-1/1"
            style={{ height: 46, borderRadius: 10 }}
            disabled={busy}
            aria-busy={status === "validating" || status === "submitting"}
          >
            {SIGNUP_BUTTON_LABELS[status]}
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
              className="su2-social button -sm -outline-dark-1 text-dark-1 w-1/1 d-flex items-center justify-center"
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
              className="su2-social button -sm -outline-dark-1 text-dark-1 w-1/1 d-flex items-center justify-center"
              style={{ gap: 10 }}
              onClick={() => handleSocial("facebook")}
              disabled={busy}
            >
              <FacebookIcon /> Facebook
            </button>
          </div>
        </div>

        <div className="text-center mt-12 pt-12" style={{ borderTop: BORDER }}>
          <p className="text-14">
            Already have an account?{" "}
            <Link href={AUTH_ROUTES.login} className="text-purple-1 fw-700">
              Log in
            </Link>
          </p>
          <p className="mt-8" style={{ color: MUTED, fontSize: 12 }}>
            By signing up, you agree to our{" "}
            <Link href={AUTH_ROUTES.terms} className="text-purple-1">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href={AUTH_ROUTES.privacy} className="text-purple-1">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
