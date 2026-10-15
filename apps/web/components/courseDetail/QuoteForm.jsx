"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { submitQuote } from "@/lib/quote";
import { focusFirstError } from "@/lib/focusFirstError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validate = (v) => {
  const e = {};
  if (!v.name.trim()) e.name = "Enter your name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address, like name@company.co.uk.";
  const n = Number(v.people);
  if (!v.people) e.people = "Enter how many people need training.";
  else if (!Number.isInteger(n) || n < 1) e.people = "Enter a whole number of 1 or more.";
  return e;
};

// Group quote form. The course comes from the page (?course=), so the request always says which course it is about.
export default function QuoteForm({ courseTitle, backHref }) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", people: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const formRef = useRef(null);

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setStatus("sending");
    try {
      await submitQuote({ ...values, course: courseTitle || null });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="rt-q__done" role="status">
        <h2>Thanks, we have your request</h2>
        <p>We will email {values.email.trim()} within one working day with a quote{courseTitle ? ` for ${courseTitle}` : ""}.</p>
        <Link href={backHref} className="rt-cd__link">Back to the course</Link>
      </div>
    );
  }

  const field = (name, label, props = {}, hint) => (
    <div className="rt-field">
      <label htmlFor={`rt-q-${name}`}>{label}</label>
      {hint && <small className="rt-field__hint" id={`rt-q-${name}-h`}>{hint}</small>}
      {errors[name] && <p className="rt-q__err" id={`rt-q-${name}-e`}><span className="rt-sr">Error: </span>{errors[name]}</p>}
      {props.as === "textarea" ? (
        <textarea id={`rt-q-${name}`} name={name} rows={5} value={values[name]} onChange={set(name)} aria-invalid={errors[name] ? true : undefined} aria-describedby={[errors[name] && `rt-q-${name}-e`, hint && `rt-q-${name}-h`].filter(Boolean).join(" ") || undefined} />
      ) : (
        <input id={`rt-q-${name}`} name={name} value={values[name]} onChange={set(name)} aria-invalid={errors[name] ? true : undefined} aria-describedby={[errors[name] && `rt-q-${name}-e`, hint && `rt-q-${name}-h`].filter(Boolean).join(" ") || undefined} {...props} />
      )}
    </div>
  );

  return (
    <form ref={formRef} className="rt-q__form" onSubmit={onSubmit} noValidate>
      {field("name", "Your name", { type: "text", autoComplete: "name" })}
      {field("email", "Work email", { type: "email", autoComplete: "email", inputMode: "email" })}
      {field("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
      {field("people", "How many people need training?", { type: "number", min: 1, inputMode: "numeric" }, "Group quotes start at 6 people.")}
      {field("message", "Anything else we should know? (optional)", { as: "textarea" })}
      {status === "error" && <p className="rt-q__err" role="alert">We could not send your request. Please try again.</p>}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block rt-q__submit" disabled={status === "sending"} aria-busy={status === "sending"}>
        {status === "sending" ? "Sending" : "Get my quote"}
      </button>
    </form>
  );
}
