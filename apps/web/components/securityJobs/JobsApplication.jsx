"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BasketSteps from "@/components/basket/BasketSteps";
import { Ticks } from "@/components/marketing/parts";
import { securityJobs } from "@/data/securityJobs";
import { trackEvent } from "@/lib/analytics";
import { validPostcode } from "@/lib/checkout";
import { submitApplication, validLicenceNumber } from "@/lib/securityJobs";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

const copy = securityJobs.application;
const q = copy.check;
const f = copy.form;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY = { firstName: "", lastName: "", email: "", phone: "", postcode: "", licenceType: "", licenceNumber: "", licenceExpiry: "", roles: [], shifts: [], start: "", travel: "", gaps: "", notes: "", consent: false };
const LAST = copy.steps.length - 1;

// The eligibility result: known as soon as a licence or right-to-work "No" is given, otherwise once all three are answered.
const resultOf = (a) => (a.licence === "no" ? "noLicence" : a.work === "no" ? "noWork" : q.questions.every((x) => a[x.key]) ? (a.history === "partly" ? "partly" : "ready") : null);
const canApply = (r) => r === "ready" || r === "partly";

// The checks for one step; the form only moves on when its step has none.
function validate(step, v, a) {
  const e = {};
  if (step === 0) {
    q.questions.forEach((x) => { if (!a[x.key]) e[x.key] = `Answer: ${x.q}`; });
  }
  if (step === 1) {
    if (!v.firstName.trim()) e.firstName = "Enter your first name.";
    if (!v.lastName.trim()) e.lastName = "Enter your last name.";
    if (!v.email.trim()) e.email = "Enter your email address.";
    else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
    if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a phone number, like 07700 900 982.";
    if (!v.postcode.trim()) e.postcode = "Enter your postcode.";
    else if (!validPostcode(v.postcode)) e.postcode = "Enter a real postcode, like SW1A 1AA.";
  }
  if (step === 2) {
    if (!v.licenceType) e.licenceType = "Select your licence type.";
    if (!v.licenceExpiry) e.licenceExpiry = "Enter when your licence expires.";
    else if (v.licenceExpiry < new Date().toISOString().slice(0, 7)) e.licenceExpiry = "Your licence has expired. You need a current licence to apply.";
    if (!v.licenceNumber.trim()) e.licenceNumber = "Enter your licence number.";
    else if (!validLicenceNumber(v.licenceNumber)) e.licenceNumber = "Enter the 16-digit number on your licence.";
  }
  if (step === 3) {
    if (!v.roles.length) e.roles = "Choose at least one type of role.";
    if (!v.shifts.length) e.shifts = "Choose at least one shift you can work.";
    if (!v.start) e.start = "Select when you could start.";
    if (!v.travel) e.travel = "Select how far you can travel.";
    if (a.history === "partly" && !v.gaps.trim()) e.gaps = "Tell us about the gaps in your five-year history.";
    if (!v.consent) e.consent = "Confirm how we may share your details.";
  }
  return e;
}

// The application (#application): a framed card with a sidebar on desktop (what happens next). Four steps with the booking
// stepper on top (.rt-bk__steps): 1) the three eligibility questions (segmented buttons, .fb-seg), where a licence or right-to-work
// "No" says why, links to the next step and offers no way on, so an ineligible application can never be sent; 2) about you;
// 3) your SIA licence; 4) the work you want, consent and send. Each step uses the site's GOV.UK form pattern (labels above, a
// message under each field, the first one focused on errors) and is checked before the next one opens; the
// answers stay when going back. Sent through lib/securityJobs.js (simulated), then a reference.
export default function JobsApplication() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState({});
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [ref, setRef] = useState("");
  const cardRef = useRef(null);
  const headRef = useRef(null);
  const formRef = useRef(null);
  const doneRef = useRef(null);
  const moved = useRef(false);

  const result = resultOf(a);
  const blocked = result && !canApply(result);

  // after Continue / Back: bring the card's top into view and move focus to the step's heading
  useEffect(() => {
    if (!moved.current) return;
    cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    headRef.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  const answer = (key, val) => {
    const next = { ...a, [key]: val };
    setA(next);
    const r = resultOf(next);
    // a "No" that rules the application out replaces the error summary with the reason and the next step
    setErrors((x) => { if (r && !canApply(r)) return {}; const { [key]: _, ...rest } = x; return rest; });
    if (r && !canApply(r) && r !== result) trackEvent("security_jobs_blocked", { reason: r });
  };
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const toggle = (k, item) => setV((x) => ({ ...x, [k]: x[k].includes(item) ? x[k].filter((i) => i !== item) : [...x[k], item] }));
  const go = (to) => {
    moved.current = true;
    setErrors({});
    setStep(to);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    const found = validate(step, v, a);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    if (step < LAST) {
      trackEvent("security_jobs_step", { step: step + 2, name: copy.titles[step + 1] });
      return go(step + 1);
    }
    if (!canApply(result)) return go(0); // answers changed: never send an ineligible application
    setStatus("sending");
    try {
      setRef((await submitApplication({ ...v, eligibility: a })).reference);
      setStatus("sent");
      trackEvent("security_jobs_sent", { licence: v.licenceType });
    } catch {
      setStatus("failed");
    }
  };

  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-sj-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;
  const field = (k, label, props = {}, hint) => {
    const id = `rt-sj-${k}`;
    const by = [hint && `${id}-hint`, errors[k] && `${id}-e`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
        {err(k)}
        {props.options ? (
          <FieldSelect id={id} label={label} value={v[k]} onChange={(value) => set(k)({ target: { value } })} options={props.options} invalid={Boolean(errors[k])} describedBy={by} />
        ) : (
          <input id={id} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={by} {...props} />
        )}
      </div>
    );
  };
  const checks = (k, legend, items) => (
    <fieldset className="rt-jobs__fs" aria-describedby={errors[k] ? `rt-sj-${k}-e` : undefined}>
      <legend>{legend}</legend>
      {err(k)}
      <div className="rt-jobs__checks">
        {items.map((item, i) => (
          <label key={item} className="rt-bk__check" htmlFor={`rt-sj-${k}-${i}`}>
            <input id={`rt-sj-${k}-${i}`} type="checkbox" checked={v[k].includes(item)} onChange={() => toggle(k, item)} />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const r = result && q.results[result];
  const aside = copy.aside;

  return (
    <section className="fb-section -lavender rt-jobs__anchor" id="application" aria-labelledby="rt-jobs-apply-h">
      <div className="container">
        <div className="fb-head -center">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{copy.eyebrow}</div>
          <h2 className="fb-title" id="rt-jobs-apply-h">{copy.title}</h2>
          <p className="fb-lede">{copy.text}</p>
        </div>

        <div className="rt-jobs__apply">
          <div className="fb-frame rt-jobs__card rt-jobs__anchor" ref={cardRef}>
            <div className="fb-frame__body">
              {status === "sent" ? (
                <div className="rt-jobs__done" role="status">
                  <span className="rt-ck__tick" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  </span>
                  <h3 className="rt-acc__h2" tabIndex={-1} ref={doneRef}>{copy.done.title}</h3>
                  <p className="rt-acc__lead">{copy.done.text.replace("{ref}", ref).replace("{email}", v.email.trim())}</p>
                  <a href="#top" className="fb-textlink">{copy.done.again}</a>
                </div>
              ) : (
                <form className="rt-jobs__form" onSubmit={submit} noValidate ref={formRef}>
                  <BasketSteps steps={copy.steps} current={step} label={copy.progressLabel} />
                  <div className="rt-jobs__stephead">
                    <span>Step {step + 1} of {copy.steps.length}</span>
                    <h3 tabIndex={-1} ref={headRef}>{copy.titles[step]}</h3>
                  </div>

                  {step === 0 && (
                    <>
                      <p className="rt-jobs__checklead">{q.lead}</p>
                      <ol className="rt-jobs__qs">
                        {q.questions.map((x, i) => (
                          <li key={x.key} className={errors[x.key] ? "is-error" : undefined}>
                            <span className="rt-jobs__qn" aria-hidden="true">{i + 1}</span>
                            <span className="rt-jobs__qtext" id={`rt-sj-q-${x.key}`}>{x.q}</span>
                            <div className="fb-seg rt-jobs__seg" role="group" aria-labelledby={`rt-sj-q-${x.key}`}>
                              {x.options.map(([val, label], j) => (
                                <button key={val} id={`rt-sj-q-${x.key}-${j}`} type="button" className="fb-seg__btn" aria-pressed={a[x.key] === val} onClick={() => answer(x.key, val)}>{label}</button>
                              ))}
                            </div>
                            {err(x.key)}
                          </li>
                        ))}
                      </ol>
                      <div className={`rt-jobs__verdict${r ? (canApply(result) ? " -ok" : " -no") : ""}`} aria-live="polite">
                        {r ? (
                          <>
                            <div><b>{r.title}</b><span>{r.text}</span></div>
                            {r.cta && <a href={r.cta.href} className="button -sm -outline-purple-1 text-purple-1">{r.cta.label}</a>}
                          </>
                        ) : (
                          <span>{q.pending}</span>
                        )}
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="rt-contact__pair">
                        {field("firstName", "First name", { type: "text", autoComplete: "given-name" })}
                        {field("lastName", "Last name", { type: "text", autoComplete: "family-name" })}
                      </div>
                      <div className="rt-contact__pair">
                        {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false })}
                        {field("phone", "Phone number", { type: "tel", autoComplete: "tel" })}
                      </div>
                      {field("postcode", "Postcode", { type: "text", autoComplete: "postal-code", autoCapitalize: "characters", spellCheck: false, className: "rt-ck__short" }, "We use it to find roles near you.")}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="rt-contact__pair">
                        {field("licenceType", "Licence type", { options: f.licenceTypes })}
                        {field("licenceExpiry", "Expiry date", { type: "month" }, "As shown on your licence.")}
                      </div>
                      {field("licenceNumber", "Licence number", { type: "text", inputMode: "numeric", autoComplete: "off", spellCheck: false }, "The 16-digit number on the front of your licence.")}
                    </>
                  )}

                  {step === 3 && (
                    <>
                      {checks("roles", "Roles you are interested in", f.roles)}
                      {checks("shifts", "Shifts you can work", f.shifts)}
                      <div className="rt-contact__pair">
                        {field("start", "When could you start?", { options: f.start })}
                        {field("travel", "How far can you travel?", { options: f.travel })}
                      </div>
                      {a.history === "partly" && (
                        <div className="rt-field">
                          <label htmlFor="rt-sj-gaps">Gaps in your five-year history</label>
                          <small className="rt-field__hint" id="rt-sj-gaps-hint">{f.gapsHint}</small>
                          {err("gaps")}
                          <textarea id="rt-sj-gaps" rows={3} maxLength={1000} value={v.gaps} onChange={set("gaps")} aria-invalid={errors.gaps ? true : undefined} aria-describedby={`rt-sj-gaps-hint${errors.gaps ? " rt-sj-gaps-e" : ""}`} />
                        </div>
                      )}
                      <div className="rt-field">
                        <label htmlFor="rt-sj-notes">Anything else we should know? (optional)</label>
                        <textarea id="rt-sj-notes" rows={3} maxLength={1000} value={v.notes} onChange={set("notes")} />
                      </div>
                      <div className="rt-jobs__consent">
                        {err("consent")}
                        <label className="rt-bk__check" htmlFor="rt-sj-consent">
                          <input id="rt-sj-consent" type="checkbox" checked={v.consent} onChange={set("consent")} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "rt-sj-consent-e" : undefined} />
                          <span>{f.consent}</span>
                        </label>
                      </div>
                      {status === "failed" && <p className="rt-q__err" role="alert">We could not send your application. Please try again, or call us.</p>}
                    </>
                  )}

                  {!(step === 0 && blocked) && (
                    <div className="rt-jobs__nav">
                      {step > 0 && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => go(step - 1)}>{f.back}</button>}
                      <button type="submit" className="button -md -purple-1 text-white" disabled={status === "sending"} aria-busy={status === "sending"}>
                        {step < LAST ? f.next : status === "sending" ? f.sending : f.submit}
                      </button>
                    </div>
                  )}
                  {step === LAST && <p className="rt-benefit__text rt-contact__privacy">{f.privacy.text} <Link href={f.privacy.link.href}>{f.privacy.link.label}</Link>.</p>}
                </form>
              )}
            </div>
          </div>

          <aside className="rt-jobs__aside" aria-labelledby="rt-jobs-aside-h">
            <h3 id="rt-jobs-aside-h">{aside.title}</h3>
            <ol className="rt-jobs__asidesteps">
              {aside.steps.map((s, i) => (
                <li key={s}><span className="rt-jobs__qn" aria-hidden="true">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
            <Ticks items={aside.points} />
            <p className="rt-jobs__asidehelp">{aside.help.text} <a href={aside.help.href} className="fb-textlink">{aside.help.label}</a></p>
          </aside>
        </div>
      </div>
    </section>
  );
}
