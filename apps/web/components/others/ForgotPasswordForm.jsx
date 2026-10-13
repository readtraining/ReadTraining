"use client";

import Link from "next/link";
import React, { useRef, useState } from "react";
import { AuthField, AuthPage } from "@/components/auth/authParts";
import { AUTH_ROUTES, EMAIL_PATTERN, requestPasswordReset } from "@/lib/auth/authClient";
import { focusFirstError } from "@/lib/focusFirstError";
import { MailIcon } from "./authIcons";

// Forgot password (/forgot-password): the shared auth card; the email is checked here, the message sits above the field and the
// field gets the focus, then "Check your email".
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const formRef = useRef(null);

  const fail = (message) => {
    setError(message);
    focusFirstError(formRef.current);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!email.trim()) return fail("Enter your email address.");
    if (!EMAIL_PATTERN.test(email.trim())) return fail("Enter a valid email address.");
    setError("");
    setStatus("sending");
    try {
      await requestPasswordReset({ email: email.trim() });
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      fail(err?.message || "We couldn't send the reset email. Please try again.");
    }
  };

  return (
    <AuthPage
      title={status === "sent" ? "Check your email" : "Forgot your password?"}
      lead={status === "sent" ? null : "Enter your email and we'll send you a reset link."}
      footer={<p><Link href={AUTH_ROUTES.login}>Back to log in</Link></p>}
    >
      {status === "sent" ? (
        <p className="rt-auth__done" role="status">
          We&apos;ve sent a password reset link to <b>{email.trim()}</b>. If you don&apos;t see it in your inbox, check your spam or
          junk folder.
        </p>
      ) : (
        <form className="rt-auth__form" onSubmit={handleSubmit} noValidate ref={formRef}>
          <AuthField
            id="forgot-email"
            label="Email"
            icon={<MailIcon />}
            error={error}
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
          />
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "sending"} aria-busy={status === "sending"}>
            {status === "sending" ? "Sending" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthPage>
  );
}
