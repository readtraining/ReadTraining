"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  AUTH_ROUTES,
  EMAIL_PATTERN,
  registerAccount,
  signUpWithProvider,
} from "@/lib/auth/authClient";
import {
  EyeIcon,
  EyeOffIcon,
  FacebookIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "./authIcons";

const PROJECT_NAME = "ReadTraining";
const MUTED = "#8C8CA1";
const PASSWORD_HINT = "";
const PASSWORD_ERROR = "Use at least 8 characters, with a letter and a number.";

const BUTTON_LABELS = {
  idle: "Sign up",
  validating: "Validating",
  submitting: "Creating account",
  success: "Account created",
};

function validate({ firstName, lastName, email, password, confirmPassword }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = "Enter your first name.";
  if (!lastName.trim()) errors.lastName = "Enter your last name.";
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter a password.";
  else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = PASSWORD_ERROR;
  if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (password && confirmPassword !== password)
    errors.confirmPassword = "Passwords don't match.";
  return errors;
}

const leadingIconStyle = {
  position: "absolute",
  left: 16,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  color: MUTED,
  pointerEvents: "none",
};

const errorTextStyle = { color: "var(--color-red-3)" };

// Input with a leading icon and an optional trailing node (e.g. eye toggle).
function Field({ id, label, icon, error, hint, trailing, className = "", ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-15 lh-1 fw-500 text-dark-1 mb-8 d-block">
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={leadingIconStyle}>{icon}</span>
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          style={{
            paddingLeft: 44,
            paddingRight: trailing ? 46 : undefined,
            paddingTop: 12,
            paddingBottom: 12,
          }}
          {...inputProps}
        />
        {trailing}
      </div>
      {error ? (
        <div id={`${id}-error`} className="text-13 mt-5" style={errorTextStyle}>
          {error}
        </div>
      ) : (
        hint && (
          <div id={`${id}-hint`} className="text-13 mt-5" style={{ color: MUTED }}>
            {hint}
          </div>
        )
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
        right: 16,
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

export default function SignUpForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    marketingOptIn: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | validating | submitting | success
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const busy = status !== "idle" || Boolean(socialLoading);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
      await registerAccount({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        marketingOptIn: values.marketingOptIn,
      });
      setStatus("success");
      redirectTimer.current = setTimeout(
        () => router.push(AUTH_ROUTES.afterLogin),
        1200
      );
    } catch (err) {
      setFormError(err?.message || "We couldn't create your account. Please try again.");
      setStatus("idle");
    }
  };

  const handleSocial = async (provider) => {
    if (busy) return;
    setFormError("");
    setSocialLoading(provider);
    try {
      await signUpWithProvider(provider);
      router.push(AUTH_ROUTES.afterLogin);
    } catch (err) {
      setFormError(err?.message || "Social sign-up failed. Please try again.");
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
          maxWidth: 520,
          padding: "18px 28px",
          border: "1px solid #DDDDDD",
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
          Book courses, manage your bookings, and track your training
        </p>

        <form className="contact-form pt-15" onSubmit={handleSubmit} noValidate>
          {status === "success" && (
            <div
              role="status"
              className="text-14 rounded-8 px-15 py-10 mb-15"
              style={{ background: "#E6F8EE", color: "#0B7A43" }}
            >
              Your account has been created. Taking you to the home page…
            </div>
          )}
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

          <div className="row x-gap-15">
            <div className="col-sm-6">
              <Field
                id="signup-first-name"
                className="mb-10"
                label="First name"
                icon={<UserIcon />}
                error={fieldErrors.firstName}
                type="text"
                name="firstName"
                autoComplete="given-name"
                placeholder="First name"
                value={values.firstName}
                onChange={handleChange}
                disabled={busy}
              />
            </div>
            <div className="col-sm-6">
              <Field
                id="signup-last-name"
                className="mb-10"
                label="Last name"
                icon={<UserIcon />}
                error={fieldErrors.lastName}
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder="Last name"
                value={values.lastName}
                onChange={handleChange}
                disabled={busy}
              />
            </div>
          </div>

          <Field
            id="signup-email"
            className="mb-10"
            label="Email"
            icon={<MailIcon />}
            error={fieldErrors.email}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
            disabled={busy}
          />

          <div className="row x-gap-15">
            <div className="col-sm-6">
              <Field
                id="signup-password"
                className="mb-10"
                label="Password"
                icon={<LockIcon />}
                error={fieldErrors.password}
                hint={PASSWORD_HINT}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={values.password}
                onChange={handleChange}
                disabled={busy}
                trailing={
                  <PasswordToggle
                    shown={showPassword}
                    onToggle={() => setShowPassword((prev) => !prev)}
                    disabled={busy}
                  />
                }
              />
            </div>
            <div className="col-sm-6">
              <Field
                id="signup-confirm-password"
                className="mb-10"
                label="Confirm password"
                icon={<LockIcon />}
                error={fieldErrors.confirmPassword}
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm password"
                value={values.confirmPassword}
                onChange={handleChange}
                disabled={busy}
                trailing={
                  <PasswordToggle
                    shown={showConfirm}
                    onToggle={() => setShowConfirm((prev) => !prev)}
                    disabled={busy}
                  />
                }
              />
            </div>
          </div>

          <label
            htmlFor="signup-marketing"
            className="d-flex items-center text-14 mb-15"
            style={{ gap: 10, cursor: busy ? "default" : "pointer" }}
          >
            <input
              id="signup-marketing"
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
            <span>Send me learning tips and updates from {PROJECT_NAME}</span>
          </label>

          <button
            type="submit"
            className="button -md -purple-1 text-white fw-500 w-1/1"
            disabled={busy}
            aria-busy={status === "validating" || status === "submitting"}
          >
            {BUTTON_LABELS[status]}
          </button>
        </form>

        <div className="text-14 text-center mt-15 mb-10 d-flex items-center x-gap-15">
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

        <p className="text-14 text-center mt-15">
          Already have an account?{" "}
          <Link href={AUTH_ROUTES.login} className="text-purple-1 fw-500">
            Log in
          </Link>
        </p>

        <p className="text-13 text-center mt-8" style={{ color: MUTED }}>
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
  );
}
