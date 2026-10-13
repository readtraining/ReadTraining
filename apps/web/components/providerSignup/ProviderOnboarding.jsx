"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BasketSteps from "@/components/basket/BasketSteps";
import { providerSignup } from "@/data/providerSignup";
import { useAuthUser } from "@/lib/auth/authClient";
import { getApplicationFor, submitProviderApplication } from "@/lib/providerApplication";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

const o = providerSignup.onboarding;
const EMPTY = { name: "", company: "", vat: "", city: "", website: "", phone: "", subjects: [], methods: [], courses: "", body: "", centre: "", accExpiry: "", cover: "", insExpiry: "", files: [] };
const COMPANY_RE = /^([0-9]{8}|[A-Z]{2}[0-9]{6})$/i;
const today = () => new Date().toISOString().slice(0, 10);

// What each step needs before "Continue". Documents must be in date (the admin can't approve a provider with an expired one).
function validate(step, v) {
  const e = {};
  if (step === 0) {
    if (!v.name.trim()) e.name = "Enter your training company's name.";
    if (!v.company.trim()) e.company = "Enter your Companies House number.";
    else if (!COMPANY_RE.test(v.company.replace(/\s/g, ""))) e.company = "Enter a Companies House number in the correct format, like 12345678 or SC123456.";
    if (!v.vat) e.vat = "Select whether you're VAT registered.";
    if (!v.city.trim()) e.city = "Enter the town or city you're based in.";
    if (v.website.trim() && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v.website.trim())) e.website = "Enter a website address, like www.example.co.uk.";
    if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a phone number, like 0161 496 0000.";
  }
  if (step === 1) {
    if (!v.subjects.length) e.subjects = "Choose at least one subject.";
    if (!v.methods.length) e.methods = "Choose at least one way you deliver training.";
    if (!v.courses) e.courses = "Select how many courses you run.";
  }
  if (step === 2) {
    if (!v.body.trim()) e.body = "Enter your awarding body or accreditation.";
    if (!v.centre.trim()) e.centre = "Enter your centre or approval number.";
    if (!v.accExpiry) e.accExpiry = "Enter the date your accreditation expires.";
    else if (v.accExpiry <= today()) e.accExpiry = "This date has passed. Your accreditation must be in date.";
    if (!v.cover) e.cover = "Select your public liability cover.";
    if (!v.insExpiry) e.insExpiry = "Enter the date your insurance expires.";
    else if (v.insExpiry <= today()) e.insExpiry = "This date has passed. Your insurance must be in date.";
  }
  if (step === 3 && !v.agree) e.agree = "Confirm your details and agree to the provider terms.";
  return e;
}

// Provider onboarding (/provider/onboarding, after "Become a provider"): four steps on one card with the booking steps indicator:
// your organisation > what you teach > accreditation and insurance > review and submit, then a reference and what happens next.
// An account that has already applied sees its application's status instead. DEMO: the application is stored in this browser
// (lib/providerApplication.js) and shows in Admin > Providers > Applications.
export default function ProviderOnboarding() {
  const person = useAuthUser();
  const [step, setStep] = useState(0);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [existing, setExisting] = useState(undefined);
  const formRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => {
    if (person) setExisting(getApplicationFor(person.id));
  }, [person]);
  useEffect(() => {
    headRef.current?.focus();
  }, [step, status]);

  // a field's error clears as soon as it is changed; the rest stay until the next "Continue"
  const clear = (k) => setErrors((x) => (x[k] ? Object.fromEntries(Object.entries(x).filter(([key]) => key !== k)) : x));
  const set = (k) => (e) => {
    clear(k);
    setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  };
  const toggle = (k, value) => {
    clear(k);
    setV((x) => ({ ...x, [k]: x[k].includes(value) ? x[k].filter((y) => y !== value) : [...x[k], value] }));
  };
  const next = (e) => {
    e.preventDefault();
    const found = validate(step, v);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    if (step < 3) return setStep(step + 1);
    setStatus("sending");
    submitProviderApplication(person.id, { name: person.name, email: person.email }, { ...v, company: v.company.replace(/\s/g, "") }).then((app) => {
      setExisting(app);
      setStatus("done");
      trackEvent("provider_application_sent", { subjects: v.subjects.length });
    });
  };

  if (!person || existing === undefined) return <div className="rt-acc__card rt-po__card"><p className="rt-po__wait">Loading…</p></div>;

  if (status === "done" || existing) {
    const a = existing;
    return (
      <div className="rt-acc__card rt-po__card" role="status">
        <h2 className="rt-po__h2" tabIndex={-1} ref={headRef}>{status === "done" ? o.done.title : o.pending.title}</h2>
        <p className="rt-po__text">
          {status === "done"
            ? o.done.text.replace("{ref}", a.reference).replace("{email}", person.email)
            : o.pending.text.replace("{date}", formatDate(new Date(a.submittedAt).toISOString().slice(0, 10))).replace("{ref}", a.reference)}
        </p>
        <ol className="rt-po__next">
          {o.done.next.map((x) => <li key={x}>{x}</li>)}
        </ol>
        <Link href={o.done.cta.href} className="button -md -outline-purple-1 text-purple-1">{o.done.cta.label}</Link>
      </div>
    );
  }

  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-po-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;
  const aria = (k, hint) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": [hint && `rt-po-${k}-hint`, errors[k] && `rt-po-${k}-e`].filter(Boolean).join(" ") || undefined });
  const text = (k, label, props = {}, hint) => (
    <div className="rt-field">
      <label htmlFor={`rt-po-${k}`}>{label}</label>
      {hint && <small className="rt-field__hint" id={`rt-po-${k}-hint`}>{hint}</small>}
      {err(k)}
      {props.options ? (
        <select id={`rt-po-${k}`} value={v[k]} onChange={set(k)} {...aria(k, hint)}>
          <option value="">Select</option>
          {props.options.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      ) : (
        <input id={`rt-po-${k}`} value={v[k]} onChange={set(k)} {...aria(k, hint)} {...props} />
      )}
    </div>
  );
  const checks = (k, legend, items, hint) => (
    <fieldset className="rt-po__set" aria-describedby={[hint && `rt-po-${k}-hint`, errors[k] && `rt-po-${k}-e`].filter(Boolean).join(" ") || undefined}>
      <legend>{legend}</legend>
      {hint && <small className="rt-field__hint" id={`rt-po-${k}-hint`}>{hint}</small>}
      {err(k)}
      <div className="rt-po__checks">
        {items.map((it) => {
          const value = typeof it === "string" ? it : it.value;
          const label = typeof it === "string" ? it : it.label;
          const id = `rt-po-${k}-${value.replace(/[^a-z0-9]/gi, "")}`;
          return (
            <label key={value} className="rt-po__check" htmlFor={id}>
              <input id={id} type="checkbox" className="rt-fp__check" checked={v[k].includes(value)} onChange={() => toggle(k, value)} aria-invalid={errors[k] ? true : undefined} />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
  const row = (label, value, to) => (
    <div className="rt-po__row">
      <dt>{label}</dt>
      <dd>{value || "Not given"}</dd>
      <dd><button type="button" className="rt-po__change" onClick={() => setStep(to)}>{o.review.change}<span className="rt-sr"> {label.toLowerCase()}</span></button></dd>
    </div>
  );
  const methodLabel = (m) => providerSignup.methods.find((x) => x.value === m)?.label || m;

  return (
    <div className="rt-acc__card rt-po__card">
      <BasketSteps steps={o.steps} current={step} label="Application progress" />
      <form className="rt-q__form rt-po__form" onSubmit={next} noValidate ref={formRef}>
        <h2 className="rt-po__h2" tabIndex={-1} ref={headRef}>{o.stepTitles[step]}</h2>

        {step === 0 && (
          <>
            {text("name", o.org.name, { type: "text", autoComplete: "organization" })}
            <div className="rt-contact__pair">
              {text("company", o.org.company, { type: "text", autoCapitalize: "characters", spellCheck: false }, o.org.companyHint)}
              {text("vat", o.org.vat, { options: o.org.vats })}
            </div>
            <div className="rt-contact__pair">
              {text("city", o.org.city, { type: "text", autoComplete: "address-level2" })}
              {text("phone", o.org.phone, { type: "tel", autoComplete: "tel" })}
            </div>
            {text("website", o.org.website, { type: "url", inputMode: "url", autoComplete: "url", spellCheck: false })}
          </>
        )}

        {step === 1 && (
          <>
            {checks("subjects", o.teach.subjects, providerSignup.subjects, o.teach.subjectsHint)}
            {checks("methods", o.teach.methods, providerSignup.methods)}
            {text("courses", o.teach.courses, { options: o.teach.coursesOptions })}
          </>
        )}

        {step === 2 && (
          <>
            <p className="rt-acc__note">{o.docs.intro}</p>
            <div className="rt-contact__pair">
              {text("body", o.docs.body, { type: "text" }, o.docs.bodyHint)}
              {text("centre", o.docs.centre, { type: "text", spellCheck: false })}
            </div>
            {text("accExpiry", o.docs.accExpiry, { type: "date", min: today() })}
            <div className="rt-contact__pair">
              {text("cover", o.docs.cover, { options: o.docs.covers })}
              {text("insExpiry", o.docs.insExpiry, { type: "date", min: today() })}
            </div>
            <div className="rt-field">
              <label htmlFor="rt-po-files">{o.docs.files}</label>
              <small className="rt-field__hint" id="rt-po-files-hint">{o.docs.filesHint}</small>
              <input id="rt-po-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" aria-describedby="rt-po-files-hint" onChange={(e) => setV((x) => ({ ...x, files: [...e.target.files].map((f) => f.name) }))} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <dl className="rt-po__review">
              {row(o.org.name, v.name, 0)}
              {row(o.org.company, v.company.toUpperCase(), 0)}
              {row(o.org.vat, v.vat, 0)}
              {row("Based in", v.city, 0)}
              {row(o.org.phone, v.phone, 0)}
              {row(o.teach.subjects, v.subjects.join(", "), 1)}
              {row(o.teach.methods, v.methods.map(methodLabel).join(", "), 1)}
              {row(o.teach.courses, v.courses, 1)}
              {row("Accreditation", `${v.body} ${v.centre}, expires ${formatDate(v.accExpiry)}`, 2)}
              {row("Insurance", `${v.cover}, expires ${formatDate(v.insExpiry)}`, 2)}
              {row("Certificates", v.files.join(", "), 2)}
            </dl>
            <p className="rt-acc__note">{o.review.fee}</p>
            <div className="rt-lic__consent">
              {err("agree")}
              <label className="rt-po__check" htmlFor="rt-po-agree">
                <input id="rt-po-agree" type="checkbox" className="rt-fp__check" checked={Boolean(v.agree)} onChange={set("agree")} aria-invalid={errors.agree ? true : undefined} aria-describedby={errors.agree ? "rt-po-agree-e" : undefined} />
                <span>{o.review.agree}</span>
              </label>
            </div>
          </>
        )}

        <div className="rt-po__actions">
          {step > 0 && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => { setErrors({}); setStep(step - 1); }}>{o.back}</button>}
          <button type="submit" className="button -md -purple-1 text-white" disabled={status === "sending"} aria-busy={status === "sending"}>
            {step < 3 ? o.next : status === "sending" ? o.sending : o.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
