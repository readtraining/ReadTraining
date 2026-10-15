"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CERT_EXAMPLE, checkCertificate, normaliseCertNumber } from "@/lib/certificates";
import CheckerResult from "./CheckerResult";
import { focusFirstError } from "@/lib/focusFirstError";

const EMPTY = { number: "", surname: "" };

const validate = (v, e) => {
  const found = {};
  if (!v.number.trim()) found.number = e.numberEmpty;
  else if (!normaliseCertNumber(v.number)) found.number = e.numberFormat;
  if (!v.surname.trim()) found.surname = e.surnameEmpty;
  return found;
};

// The certificate checker card, in the contact form's card and fields (.rt-contact__form, .rt-field) and its GOV.UK patterns:
// labels and hints above the fields, checked on submit, an inline message under each label (the first field with one gets
// the focus) and "Error: " before the page title. "Where do I find the certificate number?"
// opens a drawing of a certificate with the number marked. `?number=` (a link or QR code on a certificate) fills the number.
// Checked through lib/certificates.js (simulated until the endpoint exists); the result replaces the form in the same card.
export default function CheckerCard({ form, result }) {
  const params = useSearchParams();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | checking | done | failed
  const [outcome, setOutcome] = useState(null);
  const formRef = useRef(null);
  const numberRef = useRef(null);
  const focusNumber = useRef(false);
  const baseTitle = useRef("");

  const given = params.get("number");
  useEffect(() => {
    if (given) setValues((v) => ({ ...v, number: given.slice(0, 20) }));
  }, [given]);

  // "Error: " before the page title while the form shows errors
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^Error: /, "");
    document.title = Object.keys(errors).length ? `Error: ${baseTitle.current}` : baseTitle.current;
  }, [errors]);

  // back from a result: focus the first field once the form is drawn again
  useEffect(() => {
    if (status === "idle" && focusNumber.current) {
      focusNumber.current = false;
      numberRef.current?.focus();
    }
  }, [status]);

  const set = (k) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [k]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, form.errors);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(formRef.current);
      return;
    }
    setStatus("checking");
    try {
      const res = await checkCertificate(values);
      setOutcome({ ...res, checkedAt: new Date() });
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  };

  const backToForm = (keep) => () => {
    if (!keep) setValues(EMPTY);
    setOutcome(null);
    focusNumber.current = true;
    setStatus("idle");
  };

  if (status === "done") return <CheckerResult outcome={outcome} copy={result} onAgain={backToForm(false)} onRetry={backToForm(true)} />;

  const field = (name, props) => {
    const { label, hint } = form[name];
    const describedBy = [`rt-cert-${name}-hint`, errors[name] && `rt-cert-${name}-e`].filter(Boolean).join(" ");
    return (
      <div className="rt-field">
        <label htmlFor={`rt-cert-${name}`}>{label}</label>
        <small className="rt-field__hint" id={`rt-cert-${name}-hint`}>{hint}</small>
        {errors[name] && <p className="rt-q__err" id={`rt-cert-${name}-e`}><span className="rt-sr">Error: </span>{errors[name]}</p>}
        <input id={`rt-cert-${name}`} name={name} value={values[name]} onChange={set(name)} aria-invalid={errors[name] ? true : undefined} aria-describedby={describedBy} {...props} />
      </div>
    );
  };

  return (
    <div className="fb-frame" id="certificate-checker">
      <div className="fb-frame__body rt-contact__form">
        <h2 className="rt-contact__form-title">{form.title}</h2>
        <form className="rt-q__form" onSubmit={onSubmit} noValidate ref={formRef}>
          {field("number", { type: "text", ref: numberRef, autoComplete: "off", autoCapitalize: "characters", spellCheck: false, maxLength: 20, className: "rt-cert__number" })}
          <details className="rt-cert__where">
            <summary>{form.where.summary}</summary>
            <div className="rt-cert__where-body">
              <div className="rt-cert__sample" aria-hidden="true">
                <span className="rt-cert__sample-brand">Read<b>Training</b></span>
                <span className="rt-cert__sample-kicker">Certificate of achievement</span>
                <span className="rt-cert__sample-name"></span>
                <span className="rt-cert__sample-line"></span>
                <span className="rt-cert__sample-line -short"></span>
                <span className="rt-cert__sample-number">{CERT_EXAMPLE}</span>
              </div>
              <p className="rt-cert__text">{form.where.text}</p>
            </div>
          </details>
          {field("surname", { type: "text", autoComplete: "off", spellCheck: false, maxLength: 80 })}
          {status === "failed" && <p className="rt-q__err" role="alert">{form.errors.failed}</p>}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block rt-q__submit" disabled={status === "checking"} aria-busy={status === "checking"}>
            {status === "checking" ? form.checking : form.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
