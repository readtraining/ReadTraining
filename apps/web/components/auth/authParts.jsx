"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { EyeIcon, EyeOffIcon, FacebookIcon, GoogleIcon } from "@/components/others/authIcons";
import GoogleButton, { useGoogleButton } from "./GoogleButton";

// The one card every sign-in page uses (log in, sign up, forgot and reset password), built from the design system
// (DESIGN-SYSTEM.md): a soft page tint, one white card, the logo, an app-scale title, .rt-field inputs with the message ABOVE
// the input, the catalogue's checkbox, the template's buttons. Styles: "AUTH PAGES" in custom.scss.

export function AuthPage({ title, lead, children, footer }) {
  return (
    <div className="rt-home rt-auth">
      <main className="rt-auth__card" id="rt-auth-main">
        <Link href="/" className="rt-auth__logo" aria-label="ReadTraining home">
          <Image width={150} height={38} src="/assets/img/general/readtraining-logo-dark.svg" alt="" priority />
        </Link>
        {title && <h1 className="rt-auth__h1">{title}</h1>}
        {lead && <p className="rt-auth__lead">{lead}</p>}
        {children}
        {footer && <div className="rt-auth__foot">{footer}</div>}
      </main>
    </div>
  );
}

// A field: label (with an optional link on the right), the error above the input, a leading icon, an optional button inside the
// input on the right (show / hide password), and a hint under it.
export function AuthField({ id, label, labelAside, hint, icon, error, trailing, ...input }) {
  const describedBy = [error && `${id}-e`, hint && `${id}-h`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="rt-field rt-auth__field">
      <div className="rt-auth__labelrow">
        <label htmlFor={id}>{label}</label>
        {labelAside}
      </div>
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      <div className={`rt-auth__control${icon ? " -icon" : ""}${trailing ? " -trailing" : ""}`}>
        {icon && <span className="rt-auth__icon" aria-hidden="true">{icon}</span>}
        <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
        {trailing}
      </div>
      {hint && <p className="rt-auth__hint" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}

export function PasswordToggle({ shown, onToggle, disabled }) {
  return (
    <button type="button" className="rt-auth__toggle" onClick={onToggle} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} disabled={disabled}>
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

// A message about the whole form from the server (wrong password, link expired, account created), or a calm "info" note
// that isn't a problem with what the person did (signed out elsewhere). Field problems never go here: they sit above their field.
export function AuthNotice({ tone = "error", children }) {
  return <div className={`rt-auth__notice -${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

// The site's one checkbox style (the catalogue's .rt-fp__check).
export function AuthCheck({ id, label, ...input }) {
  return (
    <label htmlFor={id} className="rt-fp__opt rt-auth__check">
      <input id={id} type="checkbox" className="rt-fp__check" {...input} />
      <span>{label}</span>
    </label>
  );
}

// Google and Facebook. Where Google's own button can be used (the site's address and localhost) it takes Google's cell, so
// Google names our site; elsewhere (Vercel previews) our own Google button goes through Supabase as before.
export function SocialSignIn({ onSocial, disabled, onError, signingUp = false }) {
  const googleHere = useGoogleButton();
  const [googleFailed, setGoogleFailed] = useState(false);
  return (
    <>
      <p className="rt-auth__or"><span>Or continue with</span></p>
      <div className="rt-auth__social">
        {googleHere && !googleFailed ? (
          <GoogleButton signingUp={signingUp} onError={onError} onUnavailable={() => setGoogleFailed(true)} />
        ) : (
          <button type="button" className="rt-auth__socialbtn" onClick={() => onSocial("google")} disabled={disabled}><GoogleIcon /> Google</button>
        )}
        <button type="button" className="rt-auth__socialbtn" onClick={() => onSocial("facebook")} disabled={disabled}><FacebookIcon /> Facebook</button>
      </div>
    </>
  );
}
