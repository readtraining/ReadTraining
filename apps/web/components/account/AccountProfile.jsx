"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { changePassword, getProfile, saveProfile } from "@/lib/account";
import { validPostcode } from "@/lib/checkout";
import { focusFirstError } from "@/lib/focusFirstError";

const copy = account.profile;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v) {
  const e = {};
  if (!v.firstName.trim()) e.firstName = "Enter your first name.";
  if (!v.lastName.trim()) e.lastName = "Enter your last name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
  if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a phone number, like 07700 900 982.";
  if (v.postcode.trim() && !validPostcode(v.postcode)) e.postcode = "Enter a real postcode, like SW1A 1AA.";
  return e;
}
function validatePassword(p) {
  const e = {};
  if (!p.current) e.current = "Enter your current password.";
  if (p.next.length < 8 || !/[a-z]/i.test(p.next) || !/\d/.test(p.next)) e.next = "Enter a new password of at least 8 characters, with a letter and a number.";
  else if (p.confirm !== p.next) e.confirm = "The passwords do not match.";
  return e;
}

// The profile: personal details, billing address and company (these fill in the checkout), the emails people want from us, a
// separate password change, and how to close the account. Two forms, each saved on its own, in the GOV.UK patterns (labels above,
// "(optional)", a message under each field, the first one focused on errors) and a "saved" message that is announced.
export default function AccountProfile() {
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | saving | saved
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwStatus, setPwStatus] = useState("idle");
  const formRef = useRef(null);
  const pwFormRef = useRef(null);
  useEffect(() => setValues(getProfile()), []);
  if (!values) return null;

  const set = (k) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [k]: value }));
    setStatus("idle");
  };
  const save = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setStatus("saving");
    await saveProfile({ ...values, postcode: values.postcode.trim().toUpperCase() });
    setStatus("saved");
  };
  const savePassword = async (e) => {
    e.preventDefault();
    const found = validatePassword(pw);
    setPwErrors(found);
    if (Object.keys(found).length) return focusFirstError(pwFormRef.current);
    setPwStatus("saving");
    await changePassword(pw);
    setPw({ current: "", next: "", confirm: "" });
    setPwStatus("saved");
  };

  const field = (name, label, props = {}, hint) => {
    const id = `rt-pf-${name}`;
    const by = [hint && `${id}-hint`, errors[name] && `${id}-e`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
        {errors[name] && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{errors[name]}</p>}
        <input id={id} value={values[name]} onChange={set(name)} aria-invalid={errors[name] ? true : undefined} aria-describedby={by} {...props} />
      </div>
    );
  };
  const pwField = (name, label, props = {}, hint) => {
    const id = `rt-pw-${name}`;
    const by = [hint && `${id}-hint`, pwErrors[name] && `${id}-e`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
        {pwErrors[name] && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{pwErrors[name]}</p>}
        <input id={id} type="password" value={pw[name]} onChange={(e) => { setPw((p) => ({ ...p, [name]: e.target.value })); setPwStatus("idle"); }} aria-invalid={pwErrors[name] ? true : undefined} aria-describedby={by} {...props} />
      </div>
    );
  };

  return (
    <div className="rt-acc__stack">
      <form className="rt-acc__card rt-acc__form" onSubmit={save} noValidate aria-labelledby="rt-pf-h" ref={formRef}>
        <h2 className="rt-acc__h2" id="rt-pf-h">{copy.personal}</h2>
        <div className="rt-contact__pair">
          {field("firstName", "First name", { type: "text", autoComplete: "given-name" })}
          {field("lastName", "Last name", { type: "text", autoComplete: "family-name" })}
        </div>
        <div className="rt-contact__pair">
          {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false })}
          {field("phone", "Phone number", { type: "tel", autoComplete: "tel" })}
        </div>
        {field("company", copy.company, { type: "text", autoComplete: "organization" })}

        <h3 className="rt-acc__h3 rt-acc__formsub">{copy.address}</h3>
        {field("line1", "Address line 1 (optional)", { type: "text", autoComplete: "address-line1" })}
        {field("line2", "Address line 2 (optional)", { type: "text", autoComplete: "address-line2" })}
        <div className="rt-contact__pair">
          {field("city", "Town or city (optional)", { type: "text", autoComplete: "address-level2" })}
          {field("postcode", "Postcode (optional)", { type: "text", autoComplete: "postal-code", autoCapitalize: "characters", spellCheck: false })}
        </div>

        <fieldset className="rt-acc__fs">
          <legend>{copy.preferences.title}</legend>
          <label className="rt-bk__check" htmlFor="rt-pf-alerts"><input id="rt-pf-alerts" type="checkbox" checked={values.alerts} onChange={set("alerts")} /><span>{copy.preferences.alerts}</span></label>
          <label className="rt-bk__check" htmlFor="rt-pf-offers"><input id="rt-pf-offers" type="checkbox" checked={values.offers} onChange={set("offers")} /><span>{copy.preferences.offers}</span></label>
        </fieldset>

        <div className="rt-acc__formfoot">
          <button type="submit" className="button -md -purple-1 text-white" disabled={status === "saving"} aria-busy={status === "saving"}>{status === "saving" ? "Saving" : copy.save}</button>
          <p className="rt-acc__savedmsg" role="status">{status === "saved" ? copy.saved : ""}</p>
        </div>
      </form>

      <form className="rt-acc__card rt-acc__form" onSubmit={savePassword} noValidate aria-labelledby="rt-pw-h" ref={pwFormRef}>
        <h2 className="rt-acc__h2" id="rt-pw-h">{copy.password.title}</h2>
        {pwField("current", copy.password.current, { autoComplete: "current-password" })}
        <div className="rt-contact__pair">
          {pwField("next", copy.password.next, { autoComplete: "new-password" }, copy.password.hint)}
          {pwField("confirm", copy.password.confirm, { autoComplete: "new-password" })}
        </div>
        <div className="rt-acc__formfoot">
          <button type="submit" className="button -md -outline-purple-1 text-purple-1" disabled={pwStatus === "saving"} aria-busy={pwStatus === "saving"}>{pwStatus === "saving" ? "Saving" : copy.password.title}</button>
          <p className="rt-acc__savedmsg" role="status">{pwStatus === "saved" ? copy.passwordSaved : ""}</p>
        </div>
      </form>

      <section className="rt-acc__card" aria-labelledby="rt-pf-close-h">
        <h2 className="rt-acc__h3" id="rt-pf-close-h">{copy.delete.title}</h2>
        <p className="rt-acc__note">{copy.delete.text}</p>
        <Link href={copy.delete.cta.href} className="fb-textlink">{copy.delete.cta.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </section>
    </div>
  );
}
