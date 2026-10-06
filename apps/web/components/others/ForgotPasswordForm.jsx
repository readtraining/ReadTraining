"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import {
  AUTH_ROUTES,
  EMAIL_PATTERN,
  requestPasswordReset,
} from "@/lib/auth/authClient";

const PROJECT_NAME = "ReadTraining";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;

    if (!email.trim()) return setError("Enter your email address.");
    if (!EMAIL_PATTERN.test(email.trim()))
      return setError("Enter a valid email address.");

    setError("");
    setStatus("sending");
    try {
      await requestPasswordReset({ email: email.trim() });
      setStatus("sent");
    } catch (err) {
      setError(err?.message || "We couldn't send the reset email. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <div
      className="d-flex items-center justify-center px-20 py-40"
      style={{ minHeight: "100vh", background: "var(--color-light-4)" }}
    >
      <div
        className="bg-white shadow-1 rounded-16 px-40 py-40 md:px-25 md:py-30"
        style={{ width: "100%", maxWidth: 480 }}
      >
        <div className="d-flex justify-center mb-30">
          <Link href="/" aria-label={`${PROJECT_NAME} home`}>
            <Image
              width={176}
              height={44}
              src="/assets/img/general/readtraining-logo-dark.svg"
              alt={PROJECT_NAME}
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </Link>
        </div>

        {status === "sent" ? (
          <div role="status" className="text-center">
            <h1 className="text-24 lh-13 fw-700 text-dark-1">Check your email</h1>
            <p className="text-15 mt-15" style={{ overflowWrap: "anywhere" }}>
              We&apos;ve sent a password reset link to{" "}
              <span className="fw-500 text-dark-1">{email.trim()}</span>. If you
              don&apos;t see it in your inbox, check your spam or trash folder.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-24 lh-13 fw-700 text-dark-1 text-center">
              Forgot your password?
            </h1>
            <p className="text-15 text-center mt-10">
              Enter your email and we&apos;ll send a reset link
            </p>

            <form className="contact-form pt-30" onSubmit={handleSubmit} noValidate>
              <div className="mb-20">
                <label
                  htmlFor="forgot-email"
                  className="text-16 lh-1 fw-500 text-dark-1 mb-10 d-block"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={status === "sending"}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "forgot-email-error" : undefined}
                />
                {error && (
                  <div
                    id="forgot-email-error"
                    role="alert"
                    className="text-13 mt-5"
                    style={{ color: "var(--color-red-3)" }}
                  >
                    {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="button -md -purple-1 text-white fw-500 w-1/1"
                disabled={status === "sending"}
                aria-busy={status === "sending"}
              >
                {status === "sending" ? "Sending" : "Reset password"}
              </button>
            </form>
          </>
        )}

        <p className="text-15 text-center mt-30">
          <Link href={AUTH_ROUTES.login} className="text-purple-1 fw-500">
            Back to Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
