"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { bookingState, calendarFile, firstDate, getBookings, getCertificates, getProfile } from "@/lib/account";
import { getCoursesByIds } from "@/lib/courses";
import { courseHref } from "@/data/courseSlugs";
import { formatDate, formatPrice } from "@/lib/format";
import { savedCourseIds } from "@/lib/wishlist";
import BookingRow, { placeOf, whenOf } from "./BookingRow";
import { Stats } from "@/components/admin/adminParts";

const copy = account.dashboard;
const CERT_LABEL = { valid: "Valid", renew: "Renew soon", expired: "Expired" };

// The dashboard's heading: "Hello, Sam" (the name is read in the browser).
export function Greeting() {
  const [name, setName] = useState("");
  useEffect(() => setName(getProfile().firstName), []);
  return <>{name ? copy.greeting.replace("{name}", name) : account.title}</>;
}

// The account home, in the order people come for (Baymard: checking what is coming up first): the next course with its practical
// details and actions, four counts, the upcoming bookings, certificates with renewal reminders, saved courses and quick help.
export default function AccountDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const bookings = getBookings();
    const upcoming = bookings.filter((b) => bookingState(b) === "upcoming" || bookingState(b) === "requested").sort((a, b) => (firstDate(a) < firstDate(b) ? -1 : 1));
    setData({
      upcoming,
      completed: bookings.filter((b) => bookingState(b) === "past").length,
      certificates: getCertificates(),
      saved: getCoursesByIds(savedCourseIds()),
    });
  }, []);
  if (!data) return null;

  const next = data.upcoming.find((b) => bookingState(b) === "upcoming");
  const nextLine = next && [...next.lines].sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const stats = [
    [copy.stats.upcoming, data.upcoming.length, "icon-calendar"],
    [copy.stats.completed, data.completed, "icon-check"],
    [copy.stats.certificates, data.certificates.length, "icon-badge"],
    [copy.stats.saved, data.saved.length, "icon-bookmark"],
  ];

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-acc__next" aria-labelledby="rt-acc-next-h">
        <h2 className="rt-acc__h2" id="rt-acc-next-h">{copy.next.title}</h2>
        {next ? (
          <div className="rt-acc__nextbody">
            <div>
              <p className="rt-acc__nexttitle">{nextLine.title}</p>
              <ul className="rt-bk__facts">
                <li><i className="icon-calendar" aria-hidden="true"></i><span>{whenOf(nextLine)}{nextLine.mode !== "ondemand" ? ` · ${nextLine.time}` : ""}</span></li>
                <li><i className="icon-location" aria-hidden="true"></i><span>{placeOf(nextLine)}{nextLine.postcode ? ` ${nextLine.postcode}` : ""}</span></li>
                <li><i className="icon-person-3" aria-hidden="true"></i><span>Provided by {nextLine.provider} · {nextLine.delegates.length} {nextLine.delegates.length === 1 ? "delegate" : "delegates"}</span></li>
              </ul>
              <p className="rt-acc__note">{account.detail.joining}</p>
            </div>
            <div className="rt-acc__actions">
              <Link href={`/account/bookings/${next.reference}`} className="button -md -purple-1 text-white">{account.bookings.view}</Link>
              {nextLine.mode !== "ondemand" && <a href={calendarFile(next, nextLine)} download={`${next.reference}.ics`} className="button -md -outline-purple-1 text-purple-1">{account.detail.actions.calendar}</a>}
              {nextLine.postcode && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextLine.postcode)}`} target="_blank" rel="noopener" className="fb-textlink">{account.detail.actions.map}<i className="icon-arrow-right text-12" aria-hidden="true"></i></a>}
            </div>
          </div>
        ) : (
          <div className="rt-acc__none">
            <p>{copy.next.none}</p>
            <Link href={copy.next.cta.href} className="button -md -purple-1 text-white">{copy.next.cta.label}</Link>
          </div>
        )}
      </section>

      <Stats items={stats.map(([label, value, icon]) => ({ label, value, icon }))} iconSize={18} />

      <section className="rt-acc__card" aria-labelledby="rt-acc-up-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-acc-up-h">{copy.upcoming.title}</h2>
          <Link href="/account/learning" className="fb-textlink">{copy.upcoming.all}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </div>
        {data.upcoming.length ? (
          <div className="rt-acc__rows">{data.upcoming.slice(0, 3).map((b) => <BookingRow key={b.reference} booking={b} />)}</div>
        ) : (
          <p className="rt-acc__empty">{copy.next.none}</p>
        )}
      </section>

      <div className="rt-acc__duo">
        <section className="rt-acc__card" aria-labelledby="rt-acc-cert-h">
          <h2 className="rt-acc__h2" id="rt-acc-cert-h">{copy.certificates.title}</h2>
          <p className="rt-acc__note">{copy.certificates.text}</p>
          {data.certificates.length ? (
            <ul className="rt-acc__certs">
              {data.certificates.map((c) => (
                <li key={c.number}>
                  <div>
                    <b>{c.title}</b>
                    <span>{c.number} · {c.state === "expired" ? "Expired" : "Expires"} {formatDate(c.expires)}</span>
                  </div>
                  <div className="rt-acc__certside">
                    <span className={`rt-pill rt-acc__status -${c.state === "valid" ? "completed" : c.state === "renew" ? "requested" : "cancelled"}`}>{CERT_LABEL[c.state]}</span>
                    {c.state !== "valid" && <Link href={courseHref(c.courseId)} className="fb-textlink">{copy.certificates.renew}<span className="rt-sr"> {c.title}</span><i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__empty">{copy.certificates.none}</p>
          )}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-acc-saved-h">
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id="rt-acc-saved-h">{copy.saved.title}</h2>
            {data.saved.length > 0 && <Link href="/account/saved" className="fb-textlink">{copy.saved.all}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
          </div>
          {data.saved.length ? (
            <ul className="rt-acc__saved">
              {data.saved.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link href={c.detailsHref || courseHref(c.id)}>{c.title}</Link>
                  <span>From {formatPrice(c.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__empty">{copy.saved.none}</p>
          )}
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-acc-help-h">
        <h2 className="rt-acc__h2" id="rt-acc-help-h">{copy.help.title}</h2>
        <ul className="rt-acc__helplinks">
          {copy.help.items.map((h) => (
            <li key={h.href}><Link href={h.href} className="fb-textlink">{h.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
