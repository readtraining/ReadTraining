"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { submitContact } from "@/lib/contact";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE = 1500;
const EMPTY = { topic: "", reference: "", name: "", email: "", phone: "", company: "", message: "" };

const validate = (v) => {
  const e = {};
  if (!v.topic) e.topic = "Select what your message is about.";
  if (!v.name.trim()) e.name = "Enter your full name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
  if (!v.message.trim()) e.message = "Enter your message.";
  return e;
};

// The contact form, in the site's form fields (.rt-field, as the group quote form) and the GOV.UK patterns: labels above the
// fields, "(optional)" instead of asterisks, checked on submit; on errors an inline message under each field (the first field
// with one gets the focus) and "Error: " before the page title. The booking reference shows
// only for booking questions and the company only for business and provider ones. `?topic=` (the route tiles' links) chooses
// the topic. Short fields sit in pairs from 576px (name | email, phone | topic), so the card stays compact. Sent through lib/contact.js
// (simulated until the endpoint exists), then a confirmation with a reference.
export default function ContactForm({ form }) {
  const params = useSearchParams();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [reference, setReference] = useState("");
  const formRef = useRef(null);
  const baseTitle = useRef("");

  // a route tile's link (?topic=…#contact-form) chooses the topic; the account's booking links add ?reference=
  const asked = params.get("topic");
  const askedRef = params.get("reference");
  useEffect(() => {
    if (asked && form.topics.some((t) => t.value === asked)) setValues((v) => ({ ...v, topic: asked, reference: askedRef || v.reference }));
  }, [asked, askedRef, form.topics]);

  // "Error: " before the page title while the form shows errors
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^Error: /, "");
    document.title = Object.keys(errors).length ? `Error: ${baseTitle.current}` : baseTitle.current;
  }, [errors]);

  const set = (k) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [k]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(formRef.current);
      return;
    }
    setStatus("sending");
    try {
      const res = await submitContact(values);
      setReference(res.reference);
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className="fb-frame">
        <div className="fb-frame__body rt-contact__done" role="status">
          <span className="rt-benefit__icon" aria-hidden="true"><i className="icon-check text-16"></i></span>
          <h2 className="rt-contact__form-title">{form.sent.title}</h2>
          <p className="rt-contact__ref">Your reference: <strong>{reference}</strong></p>
          <p className="rt-benefit__text">{form.sent.text.replace("{email}", values.email.trim())}</p>
          <p className="rt-benefit__text">{form.sent.urgent}</p>
        </div>
      </div>
    );
  }

  const showReference = values.topic === "booking";
  const showCompany = values.topic === "business" || values.topic === "provider";
  const field = (name, label, props = {}, hint) => {
    const describedBy = [hint && `rt-c-${name}-hint`, errors[name] && `rt-c-${name}-e`].filter(Boolean).join(" ") || undefined;
    const common = { id: `rt-c-${name}`, name, value: values[name], onChange: set(name), "aria-invalid": errors[name] ? true : undefined, "aria-describedby": describedBy };
    return (
      <div className="rt-field">
        <label htmlFor={`rt-c-${name}`}>{label}</label>
        {hint && <small className="rt-field__hint" id={`rt-c-${name}-hint`}>{hint}</small>}
        {errors[name] && <p className="rt-q__err" id={`rt-c-${name}-e`}><span className="rt-sr">Error: </span>{errors[name]}</p>}
        {props.as === "textarea" ? <textarea rows={4} maxLength={MAX_MESSAGE} {...common} /> : props.as === "select" ? (
          <FieldSelect id={common.id} label={label} placeholder="Select a topic" value={common.value} onChange={(value) => set(name)({ target: { value } })} options={form.topics} invalid={Boolean(errors[name])} describedBy={describedBy} />
        ) : <input {...common} {...props} />}
      </div>
    );
  };

  return (
    <div className="fb-frame" id="contact-form">
      <div className="fb-frame__body rt-contact__form">
        <h2 className="rt-contact__form-title">{form.title}</h2>
        <form className="rt-q__form" onSubmit={onSubmit} noValidate ref={formRef}>
          <div className="rt-contact__pair">
            {field("name", "Full name", { type: "text", autoComplete: "name" })}
            {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false })}
          </div>
          <div className="rt-contact__pair">
            {field("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
            {field("topic", "Your message is about", { as: "select" })}
          </div>
          {showReference && field("reference", "Booking reference (optional)", { type: "text", autoComplete: "off" })}
          {showCompany && field("company", "Company (optional)", { type: "text", autoComplete: "organization" })}
          {field("message", "Your message", { as: "textarea" }, "Include the course name and dates if it is about a course.")}
          {status === "failed" && <p className="rt-q__err" role="alert">We could not send your message. Please try again, or call us.</p>}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block rt-q__submit" disabled={status === "sending"} aria-busy={status === "sending"}>
            {status === "sending" ? "Sending" : form.submit}
          </button>
          <p className="rt-benefit__text rt-contact__privacy">
            {form.privacy.text} <Link href={form.privacy.link.href}>{form.privacy.link.label}</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
