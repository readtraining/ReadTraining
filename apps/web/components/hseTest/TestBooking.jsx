"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { HSE_PRICE, hseTest } from "@/data/hseTest";
import { allCentres, centreName } from "@/lib/testCentreSearch";
import { EMAIL_PATTERN } from "@/lib/auth/authClient";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { keepSubmission } from "@/lib/inbox";

const copy = hseTest.request;
const Ctx = createContext({ open: () => {} });

// "Book your test" anywhere on the HS&E pages opens the one booking pop-up; `centre` (a centre's slug) preselects it.
export function BookTestButton({ centre, className = "button -md -purple-1 text-white", children }) {
  const { open } = useContext(Ctx);
  return <button type="button" className={className} onClick={() => open(centre)}>{children}</button>;
}

const blank = (centre = "") => ({ type: "", centre, when: "", firstName: "", lastName: "", email: "", phone: "", notes: "" });

function validate(v) {
  const e = {};
  if (!v.type) e.type = "Select the test you need.";
  if (!v.when) e.when = "Select when you'd like to sit the test.";
  if (!v.firstName.trim()) e.firstName = "Enter your first name.";
  if (!v.lastName.trim()) e.lastName = "Enter your last name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
  if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a phone number, like 07700 900 982.";
  return e;
}

// DEMO: the booking request is simulated (a reference number back, kept for Admin > Requests); with a backend it goes to the bookings team.
const sendRequest = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const reference = `HS-${Math.floor(100000 + Math.random() * 900000)}`;
  keepSubmission("test", reference, data);
  return { reference };
};

// The HS&E pages' booking pop-up (Sheet, the site's dialog) with the form in the site's pattern: errors above each field, the
// first invalid field focused, no browser pop-ups. As the client's site, we book the test for the learner: they say which test,
// where and when, and get a reference; the date and a secure payment link follow by email.
export default function TestBooking({ children }) {
  const [isOpen, setOpen] = useState(false);
  const [v, setV] = useState(() => blank());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [ref, setRef] = useState("");
  const formRef = useRef(null);
  const doneRef = useRef(null);
  const centres = allCentres();

  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  const open = (centre = "") => {
    setV((x) => (status === "sent" ? blank(centre) : { ...x, centre: centre || x.centre }));
    if (status === "sent") setStatus("idle");
    setErrors({});
    setOpen(true);
    trackEvent("hse_booking_open", { centre: centre || "none" });
  };
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setStatus("sending");
    try {
      setRef((await sendRequest(v)).reference);
      setStatus("sent");
      trackEvent("hse_booking_sent", { centre: v.centre || "none", test: v.type });
    } catch {
      setStatus("failed");
    }
  };

  const field = (k, label, props = {}) => {
    const id = `rt-hb-${k}`;
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {errors[k] && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>}
        {props.options ? (
          <select id={id} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `${id}-e` : undefined}>
            <option value="">{props.empty || "Select"}</option>
            {props.options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        ) : (
          <input id={id} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `${id}-e` : undefined} {...props} />
        )}
      </div>
    );
  };
  const price = formatPrice(HSE_PRICE);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Sheet open={isOpen} onClose={() => setOpen(false)} title={status === "sent" ? copy.doneTitle : `${copy.title} · ${price}`} closeLabel="Close" className="rt-lic__sheet">
        {status === "sent" ? (
          <div className="rt-lic__done" role="status">
            <p tabIndex={-1} ref={doneRef}>{copy.doneText.replace("{ref}", ref).replace("{email}", v.email.trim()).replace("{price}", price)}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => setOpen(false)}>{copy.close}</button>
          </div>
        ) : (
          <form className="rt-q__form rt-lic__sheetform" onSubmit={submit} noValidate ref={formRef}>
            <p className="rt-acc__note">{copy.note}</p>
            <div className="rt-contact__pair">
              {field("type", copy.type, { options: copy.types })}
              {field("when", copy.when, { options: copy.whens })}
            </div>
            {field("centre", copy.centre, { options: centres.map((c) => ({ value: c.slug, label: `${centreName(c)}, ${c.postcode}` })), empty: copy.centreAny })}
            <div className="rt-contact__pair">
              {field("firstName", "First name", { type: "text", autoComplete: "given-name" })}
              {field("lastName", "Last name", { type: "text", autoComplete: "family-name" })}
            </div>
            <div className="rt-contact__pair">
              {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false })}
              {field("phone", "Phone number", { type: "tel", autoComplete: "tel" })}
            </div>
            <div className="rt-field">
              <label htmlFor="rt-hb-notes">{copy.notes}</label>
              <textarea id="rt-hb-notes" rows={3} maxLength={1000} value={v.notes} onChange={set("notes")} />
            </div>
            {status === "failed" && <p className="rt-q__err" role="alert">{copy.failed}</p>}
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "sending"} aria-busy={status === "sending"}>{status === "sending" ? copy.sending : copy.submit}</button>
            <p className="rt-benefit__text rt-contact__privacy">{copy.privacy.text} <Link href={copy.privacy.href}>{copy.privacy.label}</Link>.</p>
          </form>
        )}
      </Sheet>
    </Ctx.Provider>
  );
}
