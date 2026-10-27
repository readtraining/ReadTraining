"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { topBar } from "@/data/home";
import { bookingState, calendarFile, cancellableLines, getBooking } from "@/lib/account";
import { demoCourseHref } from "@/data/demoCourses";
import { formatDay, formatPrice } from "@/lib/format";
import { StatusPill, placeOf, whenOf } from "./BookingRow";
import { EmptyState } from "@/components/states/States";

const copy = account.detail;

// One booking: its status and reference, a state banner (cancellation requested / cancelled with the refund), each course with when,
// where (directions), the provider, who attends, joining instructions and Add to calendar, the payment, and the booking's actions:
// print a receipt, request a date change (the contact form with the reference filled in) and cancel (only while something can be).
// ?print=1 (Receipt in Purchase history) opens the print window straight away, where "Save as PDF" downloads the receipt.
export default function BookingDetail({ reference }) {
  const [booking, setBooking] = useState(undefined);
  useEffect(() => setBooking(getBooking(reference)), [reference]);
  useEffect(() => {
    if (!booking || new URLSearchParams(window.location.search).get("print") !== "1") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("print");
    window.history.replaceState(window.history.state, "", url);
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, [booking]);
  if (booking === undefined) return null;
  if (!booking) {
    return (
      <EmptyState large icon="icon-calendar" headingLevel={2} title={copy.notFound.title} text={copy.notFound.text} action={{ href: copy.notFound.cta.href, label: copy.notFound.cta.label }} />
    );
  }

  const state = bookingState(booking);
  const canCancel = cancellableLines(booking).length > 0;
  const change = `/contact-us?topic=booking&reference=${booking.reference}#contact-form`;
  const tel = topBar.phone.replace(/\s+/g, "");

  return (
    <div className="rt-acc__stack">
      <Link href="/account/purchases" className="fb-textlink rt-acc__back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{copy.back}</Link>

      <section className="rt-acc__card rt-acc__summary" aria-label="Booking summary">
        <div className="rt-acc__sumtop">
          <p className="rt-acc__ref">{copy.booked.replace("{date}", formatDay(booking.bookedAt))}{booking.company ? ` · ${booking.company}` : ""}</p>
          <StatusPill booking={booking} />
        </div>
        {state === "requested" && <p className="rt-acc__banner -requested" role="status">{copy.requested.replace("{ref}", booking.cancellation.reference)}</p>}
        {state === "cancelled" && (
          <p className="rt-acc__banner -cancelled">
            {copy.cancelled.replace("{date}", formatDay(booking.cancelledAt))}{booking.refund ? ` ${copy.refunded.replace("{amount}", formatPrice(booking.refund))}` : ""}
          </p>
        )}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-acc-courses-h">
        <h2 className="rt-acc__h2" id="rt-acc-courses-h">{copy.courses}</h2>
        <div className="rt-acc__lines">
          {booking.lines.map((l, i) => (
            <article key={`${l.courseId}-${i}`} className="rt-acc__line">
              <div className="rt-acc__linetop">
                <h3 className="rt-acc__h3"><Link href={demoCourseHref(l.courseId)}>{l.title}</Link></h3>
                <strong>{formatPrice(l.total)}</strong>
              </div>
              <ul className="rt-bk__facts">
                <li><i className="icon-calendar" aria-hidden="true"></i><span>{whenOf(l)}{l.mode !== "ondemand" ? ` · ${l.time}` : ""}</span></li>
                <li><i className="icon-location" aria-hidden="true"></i><span>{placeOf(l)}{l.postcode ? ` ${l.postcode}` : ""}</span></li>
                <li><i className="icon-person-3" aria-hidden="true"></i><span>Provided by {l.provider}</span></li>
              </ul>
              <p className="rt-acc__attending"><b>{copy.attending}:</b> {l.delegates.join(", ")} ({l.quantity} × {formatPrice(l.unit)})</p>
              {state === "upcoming" && <p className="rt-acc__note">{copy.joining}</p>}
              {state === "upcoming" && l.mode !== "ondemand" && (
                <div className="rt-acc__lineactions">
                  <a href={calendarFile(booking, l)} download={`${booking.reference}-${i + 1}.ics`} className="fb-textlink">{copy.actions.calendar}<span className="rt-sr"> for {l.title}</span></a>
                  {l.postcode && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.postcode)}`} target="_blank" rel="noopener" className="fb-textlink">{copy.actions.map}<span className="rt-sr"> to {l.venue}</span></a>}
                </div>
              )}
              {l.certificate && <p className="rt-acc__note">Certificate {l.certificate.number}, valid until {formatDay(l.certificate.expires)}.</p>}
            </article>
          ))}
        </div>
        <div className="rt-bk__total">
          <span>{copy.paid[booking.method] || "Paid"}{booking.walletUsed > 0 && booking.method !== "wallet" ? ` and ${formatPrice(booking.walletUsed)} from your wallet` : ""}</span>
          <strong>{formatPrice(booking.total)}</strong>
        </div>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-acc-manage-h">
        <h2 className="rt-acc__h2" id="rt-acc-manage-h">Manage this booking</h2>
        <div className="rt-acc__actions">
          {state === "upcoming" && <Link href={change} className="button -md -outline-purple-1 text-purple-1">{copy.actions.change}</Link>}
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => window.print()}>{copy.actions.receipt}</button>
          {canCancel && <Link href={`/account/bookings/${booking.reference}/cancel`} className="button -md -outline-dark-1 text-dark-1 rt-acc__cancelbtn">{copy.actions.cancel}</Link>}
        </div>
        <p className="rt-acc__note">
          {copy.help.text} <a href={`tel:${tel}`}>{topBar.phone}</a> {copy.help.or} <Link href={change}>{copy.help.message}</Link>.
        </p>
      </section>
    </div>
  );
}
