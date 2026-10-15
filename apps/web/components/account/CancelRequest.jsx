"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { cancellableLines, getBooking, getProfile, requestCancellation } from "@/lib/account";
import { formatPrice } from "@/lib/format";
import { placeOf, whenOf } from "./BookingRow";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

const copy = account.cancel;

// The cancellation request, as the large booking sites and airlines do it: first the alternative (a free date change up to 7 days
// before), then which courses and why, the refund policy in plain words before anything is sent, an "I understand" box and the
// request button. It is a request, not an instant refund: each training provider sets its own refund policy (our terms), so the
// booking shows "Cancellation requested" until the provider decides. The GOV.UK form patterns as the rest of the site.
export default function CancelRequest({ reference }) {
  const [booking, setBooking] = useState(undefined);
  const [chosen, setChosen] = useState([]);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [request, setRequest] = useState(null);
  const formRef = useRef(null);
  const doneRef = useRef(null);

  useEffect(() => {
    const b = getBooking(reference);
    setBooking(b);
    const open = b ? cancellableLines(b) : [];
    if (open.length === 1) setChosen([open[0].index]); // one course: nothing to choose
  }, [reference]);
  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  if (booking === undefined) return null;
  const back = <Link href={booking ? `/account/bookings/${booking.reference}` : "/account/bookings"} className="fb-textlink rt-acc__back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{account.cancel.done.back}</Link>;
  const open = booking ? cancellableLines(booking) : [];
  if (!booking || open.length === 0) {
    const msg = booking ? copy.closed : account.detail.notFound;
    return (
      <div className="rt-acc__stack">
        {back}
        <div className="rt-bk__empty rt-acc__emptybox">
          <span className="rt-bk__emptyicon" aria-hidden="true"><i className="icon-calendar text-24"></i></span>
          <h2>{msg.title}</h2>
          <p>{msg.text}</p>
          <Link href="/contact-us?topic=booking#contact-form" className="button -md -purple-1 text-white">Contact us</Link>
        </div>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="rt-acc__stack">
        <section className="rt-acc__card rt-acc__done" role="status">
          <span className="rt-ck__tick -requested" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
          </span>
          <h2 className="rt-acc__h2" tabIndex={-1} ref={doneRef}>{copy.done.title}</h2>
          <p className="rt-acc__lead">{copy.done.text.replace("{ref}", request.reference).replace("{email}", getProfile().email)}</p>
          <Link href={`/account/bookings/${booking.reference}`} className="button -md -purple-1 text-white">{copy.done.back}</Link>
        </section>
      </div>
    );
  }

  const change = `/contact-us?topic=booking&reference=${booking.reference}#contact-form`;
  const toggle = (i) => setChosen((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!chosen.length) found.lines = "Choose at least one course to cancel.";
    if (!reason) found.reason = "Select why you are cancelling.";
    if (!agree) found.agree = "Confirm you understand how the refund works.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setStatus("sending");
    try {
      setRequest(await requestCancellation(booking.reference, { lines: chosen, reason, details: details.trim() }));
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="rt-acc__stack">
      {back}
      <section className="rt-acc__card rt-acc__instead" aria-labelledby="rt-cx-instead-h">
        <h2 className="rt-acc__h3" id="rt-cx-instead-h">{copy.instead.title}</h2>
        <p className="rt-acc__note">{copy.instead.text}</p>
        <Link href={change} className="fb-textlink">{copy.instead.cta}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </section>

      <form className="rt-acc__card rt-acc__form" onSubmit={submit} noValidate ref={formRef}>
        <h2 className="rt-acc__h2">Booking {booking.reference}</h2>

        <fieldset className="rt-acc__fs" aria-describedby={errors.lines ? "rt-cx-lines-e" : undefined}>
          <legend>{copy.which}</legend>
          {errors.lines && <p className="rt-q__err" id="rt-cx-lines-e"><span className="rt-sr">Error: </span>{errors.lines}</p>}
          <div className="rt-acc__cxlines">
            {open.map((l) => (
              <label key={l.index} className={`rt-acc__cxline${chosen.includes(l.index) ? " is-on" : ""}`} htmlFor={`rt-cx-line-${l.index}`}>
                <input id={`rt-cx-line-${l.index}`} type="checkbox" checked={chosen.includes(l.index)} onChange={() => toggle(l.index)} />
                <span>
                  <b>{l.title}</b>
                  <small>{whenOf(l)} · {placeOf(l)} · {l.delegates.length} {l.delegates.length === 1 ? "delegate" : "delegates"} · {formatPrice(l.total)}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rt-field">
          <label htmlFor="rt-cx-reason">{copy.reasons.label}</label>
          {errors.reason && <p className="rt-q__err" id="rt-cx-reason-e"><span className="rt-sr">Error: </span>{errors.reason}</p>}
          <FieldSelect id="rt-cx-reason" label={copy.reasons.label} placeholder="Select a reason" value={reason} onChange={setReason} options={copy.reasons.options} invalid={Boolean(errors.reason)} describedBy={errors.reason ? "rt-cx-reason-e" : undefined} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-cx-details">{copy.details}</label>
          <textarea id="rt-cx-details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>

        <div className="rt-acc__refund">
          <h3 className="rt-acc__h3">{copy.refund.title}</h3>
          <p>{copy.refund.text}</p>
          <p className="rt-acc__note">{copy.refund.fee}</p>
        </div>

        <div className="rt-acc__agree">
          {errors.agree && <p className="rt-q__err" id="rt-cx-agree-e"><span className="rt-sr">Error: </span>{errors.agree}</p>}
          <label className="rt-bk__check" htmlFor="rt-cx-agree">
            <input id="rt-cx-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={errors.agree ? true : undefined} aria-describedby={errors.agree ? "rt-cx-agree-e" : undefined} />
            <span>{copy.confirm}</span>
          </label>
        </div>

        {status === "failed" && <p className="rt-q__err" role="alert">We could not send your request. Please try again, or call us.</p>}
        <button type="submit" className="button -md -purple-1 text-white" disabled={status === "sending"} aria-busy={status === "sending"}>{status === "sending" ? copy.sending : copy.submit}</button>
      </form>
    </div>
  );
}
