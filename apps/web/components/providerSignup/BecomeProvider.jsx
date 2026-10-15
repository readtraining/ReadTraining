"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { IconCheck } from "@/components/marketing/parts";
import { BECOME_PROVIDER_HASH, PROVIDER_ONBOARDING_HREF, providerSignup } from "@/data/providerSignup";
import { AUTH_ROUTES, EMAIL_PATTERN, registerAccount, useAuthUser } from "@/lib/auth/authClient";
import { PASSWORD_ERROR, weakPassword } from "@/lib/auth/useSignUpForm";
import { focusFirstError } from "@/lib/focusFirstError";
import { trackEvent } from "@/lib/analytics";

const c = providerSignup.popup;
const LOGIN_HREF = `${AUTH_ROUTES.login}?next=${encodeURIComponent(PROVIDER_ONBOARDING_HREF)}`;
const EMPTY = { firstName: "", lastName: "", email: "", password: "" };

function validate(v) {
  const e = {};
  if (!v.firstName.trim()) e.firstName = "Enter your first name.";
  if (!v.lastName.trim()) e.lastName = "Enter your last name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
  if (!v.password) e.password = "Enter a password.";
  else if (weakPassword(v.password)) e.password = PASSWORD_ERROR;
  return e;
}

// "Become a provider" (as the client's site): a pop-up on the For providers page that creates a normal ReadTraining account
// (the same login learners use), then continues to provider onboarding. Any link to #become-provider opens it, so the page's
// shared hero and call-to-action buttons need no change, and /for-providers#become-provider opens it on arrival (Skill Saver's
// "Join"). Signed in already, it offers to continue with that account; the email link after sign-up lands on the onboarding.
export default function BecomeProvider() {
  const router = useRouter();
  const person = useAuthUser();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [failMsg, setFailMsg] = useState("");
  const [show, setShow] = useState(false);
  const formRef = useRef(null);
  const sentRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.(`a[href="${BECOME_PROVIDER_HASH}"]`);
      if (!a) return;
      e.preventDefault();
      setOpen(true);
      trackEvent("provider_signup_open", {});
    };
    const onHash = () => window.location.hash === BECOME_PROVIDER_HASH && setOpen(true);
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", onHash);
    onHash(); // arriving with /for-providers#become-provider (Skill Saver's "Join")
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  useEffect(() => {
    if (status === "sent") sentRef.current?.focus();
  }, [status]);

  const close = () => {
    setOpen(false);
    if (window.location.hash === BECOME_PROVIDER_HASH) history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  const set = (k) => (e) => {
    setErrors((x) => (x[k] ? Object.fromEntries(Object.entries(x).filter(([key]) => key !== k)) : x));
    setV((x) => ({ ...x, [k]: e.target.value }));
  };
  const submit = async (e) => {
    e.preventDefault();
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setStatus("sending");
    try {
      const res = await registerAccount({ ...v, next: PROVIDER_ONBOARDING_HREF, intent: "provider" });
      trackEvent("provider_signup_created", {});
      if (res.needsConfirmation) setStatus("sent");
      else router.push(PROVIDER_ONBOARDING_HREF);
    } catch (err) {
      setFailMsg(err.message);
      setStatus("failed");
    }
  };

  const field = (k, label, props = {}) => (
    <div className="rt-field">
      <label htmlFor={`rt-bp-${k}`}>{label}</label>
      {errors[k] && <p className="rt-q__err" id={`rt-bp-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>}
      <input id={`rt-bp-${k}`} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `rt-bp-${k}-e` : undefined} {...props} />
    </div>
  );

  let body;
  if (status === "sent") {
    body = (
      <div className="rt-lic__done" role="status">
        <h3 className="rt-bp__h" tabIndex={-1} ref={sentRef}>{c.checkEmail.title}</h3>
        <p>{c.checkEmail.text.replace("{email}", v.email.trim())}</p>
      </div>
    );
  } else if (person) {
    body = (
      <div className="rt-bp__signed">
        <h3 className="rt-bp__h">{c.signedIn.title.replace("{name}", person.name)}</h3>
        <p>{c.signedIn.text}</p>
        <Link href={PROVIDER_ONBOARDING_HREF} className="button -md -purple-1 text-white rt-btn-block">{c.signedIn.cta}</Link>
      </div>
    );
  } else {
    body = (
      <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
        <div className="rt-contact__pair">
          {field("firstName", "First name", { type: "text", autoComplete: "given-name" })}
          {field("lastName", "Last name", { type: "text", autoComplete: "family-name" })}
        </div>
        {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false })}
        <div className="rt-field">
          <label htmlFor="rt-bp-password">Password</label>
          <small className="rt-field__hint" id="rt-bp-password-hint">{PASSWORD_ERROR}</small>
          {errors.password && <p className="rt-q__err" id="rt-bp-password-e"><span className="rt-sr">Error: </span>{errors.password}</p>}
          <div className="rt-bp__pw">
            <input id="rt-bp-password" type={show ? "text" : "password"} value={v.password} onChange={set("password")} autoComplete="new-password" aria-invalid={errors.password ? true : undefined} aria-describedby={`rt-bp-password-hint${errors.password ? " rt-bp-password-e" : ""}`} />
            <button type="button" className="rt-bp__show" onClick={() => setShow((x) => !x)} aria-pressed={show}>{show ? "Hide" : "Show"}<span className="rt-sr"> password</span></button>
          </div>
        </div>
        <p className="rt-bp__terms">
          {c.terms.before} <Link href={AUTH_ROUTES.terms}>{c.terms.terms}</Link> {c.terms.and} <Link href={AUTH_ROUTES.privacy}>{c.terms.privacy}</Link>.
        </p>
        {status === "failed" && <p className="rt-q__err" role="alert">{failMsg}</p>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "sending"} aria-busy={status === "sending"}>{status === "sending" ? c.sending : c.submit}</button>
        <p className="rt-bp__login">{c.login.text} <Link href={LOGIN_HREF}>{c.login.label}</Link></p>
      </form>
    );
  }

  return (
    <Sheet open={open} onClose={close} title={c.title} closeLabel="Close" className="rt-bp__sheet">
      <p className="rt-bp__lead">{c.lead}</p>
      <div className="rt-bp__grid">
        <aside className="rt-bp__for" aria-label={c.forTitle}>
          <b>{c.forTitle}</b>
          <ul>
            {c.for.map((x) => <li key={x}><span className="rt-bp__tick" aria-hidden="true"><IconCheck /></span>{x}</li>)}
          </ul>
        </aside>
        <div>{body}</div>
      </div>
    </Sheet>
  );
}
