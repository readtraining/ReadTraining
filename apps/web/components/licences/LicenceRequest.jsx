"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import CatalogueDropdown from "@/components/courses/CatalogueDropdown";
import { licencesHub } from "@/data/licences";
import { trackEvent } from "@/lib/analytics";
import { validPostcode } from "@/lib/checkout";
import { submitLicenceRequest } from "@/lib/licences";
import { focusFirstError } from "@/lib/focusFirstError";

const copy = licencesHub.request;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const Ctx = createContext({ open: () => {} });

// Opens the page's request pop-up from anywhere on a licence page (hero, phone bar, dark band, CSCS card finder).
export const useLicenceRequest = () => useContext(Ctx);
export function RequestButton({ preset, className, children }) {
  const { open } = useLicenceRequest();
  return <button type="button" className={className} onClick={() => open(preset)}>{children}</button>;
}

const blank = (kind, preset = {}) => ({
  type: preset.type || "", application: "", experience: "", truck: "", people: "1",
  firstName: "", lastName: "", email: "", phone: "", postcode: "", notes: "", consent: false, kind,
});

function validate(v, kind) {
  const e = {};
  if (kind === "service") {
    if (!v.type) e.type = "Select what you need.";
    if (!v.application) e.application = "Select the type of application.";
  } else {
    if (!v.truck) e.truck = "Select the type of truck.";
    if (!v.experience) e.experience = "Select your experience.";
    const n = Number(v.people);
    if (!Number.isInteger(n) || n < 1) e.people = "Enter a whole number of 1 or more.";
  }
  if (!v.firstName.trim()) e.firstName = "Enter your first name.";
  if (!v.lastName.trim()) e.lastName = "Enter your last name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
  if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a phone number, like 07700 900 982.";
  if (kind === "training") {
    if (!v.postcode.trim()) e.postcode = "Enter the postcode where training is needed.";
    else if (!validPostcode(v.postcode)) e.postcode = "Enter a real postcode, like SW1A 1AA.";
  }
  if (kind === "service" && !v.consent) e.consent = "Confirm that we can apply on your behalf.";
  return e;
}

// The licence page's one pop-up (the site's dialog shell, Sheet) with one of two forms in the GOV.UK pattern:
// - "service" (CSCS cards, Personal Licence): we apply for you. What you need, the type of application, your details and consent;
//   sent, it gives a reference and says a secure payment link and the document list follow by email. Payment is not taken in the
//   basket because the basket holds dated course places only.
// - "training" (forklift, no course in the catalogue yet): a training request for a quote, as the course page's group quote.
// `licence` gives the title, the service (price, choices) or training choices.
export default function LicenceRequest({ licence, children }) {
  const kind = licence.service ? "service" : "training";
  const options = licence.service || licence.training;
  const [isOpen, setOpen] = useState(false);
  const [v, setV] = useState(() => blank(kind));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [ref, setRef] = useState("");
  const formRef = useRef(null);
  const doneRef = useRef(null);

  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  const open = (preset = {}) => {
    setV((x) => (status === "sent" ? blank(kind, preset) : { ...x, type: preset.type || x.type }));
    if (status === "sent") setStatus("idle");
    setErrors({});
    setOpen(true);
    trackEvent("licence_request_open", { licence: licence.slug, kind });
  };
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const found = validate(v, kind);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setStatus("sending");
    try {
      setRef((await submitLicenceRequest(kind, { ...v, licence: licence.slug })).reference);
      setStatus("sent");
      trackEvent("licence_request_sent", { licence: licence.slug, kind });
    } catch {
      setStatus("failed");
    }
  };

  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-lr-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;
  const field = (k, label, props = {}, hint) => {
    const id = `rt-lr-${k}`;
    const by = [hint && `${id}-hint`, errors[k] && `${id}-e`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
        {err(k)}
        {props.options ? (
          // the site's own dropdown (as the catalogue's), not the browser's native list
          <CatalogueDropdown className="rt-field-dd" id={id} label={label} placeholder="Select" options={props.options.map((o) => ({ value: o, label: o }))} value={v[k]} onChange={(value) => setV((x) => ({ ...x, [k]: value }))} clearable={false} invalid={Boolean(errors[k])} describedBy={by} openOnHover={false} />
        ) : (
          <input id={id} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={by} {...props} />
        )}
      </div>
    );
  };
  const c = copy[kind];
  const title = status === "sent" ? c.doneTitle : kind === "service" ? `${c.title} · ${options.price}` : c.title;

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Sheet open={isOpen} onClose={() => setOpen(false)} title={title} closeLabel="Close" className="rt-lic__sheet">
        {status === "sent" ? (
          <div className="rt-lic__done" role="status">
            <p tabIndex={-1} ref={doneRef}>{c.doneText.replace("{ref}", ref).replace("{email}", v.email.trim()).replace("{price}", options.price || "")}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => setOpen(false)}>{copy.close}</button>
          </div>
        ) : (
          <form className="rt-q__form rt-lic__sheetform" onSubmit={submit} noValidate ref={formRef}>
            <p className="rt-acc__note">{kind === "service" ? options.formNote : c.note}</p>
            {kind === "service" ? (
              <>
                {field("type", options.typeLabel, { options: options.types })}
                {field("application", c.application, { options: options.applications })}
              </>
            ) : (
              <>
                <div className="rt-contact__pair">
                  {field("truck", c.truck, { options: options.trucks })}
                  {field("experience", c.experience, { options: options.experience })}
                </div>
                {field("people", c.people, { type: "number", min: 1, max: 50, inputMode: "numeric", className: "rt-ck__short" })}
              </>
            )}
            <div className="rt-contact__pair">
              {field("firstName", "First name", { type: "text", autoComplete: "given-name" })}
              {field("lastName", "Last name", { type: "text", autoComplete: "family-name" })}
            </div>
            <div className="rt-contact__pair">
              {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false })}
              {field("phone", "Phone number", { type: "tel", autoComplete: "tel" })}
            </div>
            {kind === "training" && field("postcode", c.postcode, { type: "text", autoComplete: "postal-code", autoCapitalize: "characters", spellCheck: false, className: "rt-ck__short" })}
            <div className="rt-field">
              <label htmlFor="rt-lr-notes">{c.notes}</label>
              <textarea id="rt-lr-notes" rows={3} maxLength={1000} value={v.notes} onChange={set("notes")} />
            </div>
            {kind === "service" && (
              <div className="rt-lic__consent">
                {err("consent")}
                <label className="rt-bk__check" htmlFor="rt-lr-consent">
                  <input id="rt-lr-consent" type="checkbox" checked={v.consent} onChange={set("consent")} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "rt-lr-consent-e" : undefined} />
                  <span>{c.consent}</span>
                </label>
              </div>
            )}
            {status === "failed" && <p className="rt-q__err" role="alert">{copy.failed}</p>}
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "sending"} aria-busy={status === "sending"}>{status === "sending" ? copy.sending : c.submit}</button>
            <p className="rt-benefit__text rt-contact__privacy">{copy.privacy.text} <Link href={copy.privacy.href}>{copy.privacy.label}</Link>.</p>
          </form>
        )}
      </Sheet>
    </Ctx.Provider>
  );
}
