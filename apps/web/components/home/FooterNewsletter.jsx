"use client";
import React, { useRef, useState } from "react";
import { EMAIL_PATTERN } from "@/lib/auth/authClient";

// The footer's "Course alerts and offers" sign-up: our own check (no browser pop-up), an inline message under the box and a
// thank-you once sent. DEMO: nothing is stored until there is a mailing-list backend.
export default function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter an email address like name@example.com");
      inputRef.current?.focus();
      return;
    }
    setError("");
    setSent(true);
  };

  if (sent) {
    return (
      <p className="rt-footer__news rt-footer__newsDone" role="status">
        <i className="icon-check text-12" aria-hidden="true"></i> Thanks. We&rsquo;ll email you course alerts and offers.
      </p>
    );
  }
  return (
    <form className="rt-footer__news" onSubmit={submit} noValidate>
      <label htmlFor="footer-email" className="rt-footer__newsLabel">Course alerts and offers</label>
      <div className="rt-footer__newsRow">
        <input
          ref={inputRef}
          id="footer-email"
          type="email"
          autoComplete="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "footer-email-err" : undefined}
        />
        <button type="submit" aria-label="Subscribe"><i className="icon-arrow-right text-14" aria-hidden="true"></i></button>
      </div>
      {error && <p id="footer-email-err" className="rt-footer__newsErr">{error}</p>}
    </form>
  );
}
