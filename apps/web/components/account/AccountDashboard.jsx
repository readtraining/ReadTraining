"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { bookingState, calendarFile, firstDate, getBookings, getCertificates } from "@/lib/account";
import { useMe } from "@/lib/useMe";
import { courseHref } from "@/data/courseSlugs";
import { formatDay } from "@/lib/format";
import { savedCourseIds } from "@/lib/wishlist";
import BookingRow, { placeOf, whenOf } from "./BookingRow";
import { Stats } from "@/components/admin/adminParts";
import { EmptyState } from "@/components/states/States";
import { CertPill } from "@/components/businessAccount/bizParts";
import { DownloadCertificate, useCertificateDownload } from "@/components/businessAccount/BizCertificate";

const copy = account.dashboard;
const Arrow = () => <i className="icon-arrow-right text-12" aria-hidden="true"></i>;

// The dashboard's heading: "Hello, Sam" (the saved profile's first name, or the sign-in record's while it loads).
export function Greeting() {
  const { person, data } = useMe();
  const name = data?.profile.firstName || person?.firstName;
  return <>{name ? copy.greeting.replace("{name}", name) : account.title}</>;
}

// The account home (Find a course is in the page head), in the order people come for (Baymard: what is coming up first): the next
// course with its practical details and actions; four numbers that link to their pages, each with a short line; the courses after
// that one (never the next one again); the certificates (renew the ones that are due, download any) beside quick help.
export default function AccountDashboard() {
  const [data, setData] = useState(null);
  const { person, data: me } = useMe();
  const myName = me ? `${me.profile.firstName} ${me.profile.lastName}`.trim() : person?.name || "";
  const cert = useCertificateDownload();
  useEffect(() => {
    const bookings = getBookings();
    const upcoming = bookings.filter((b) => bookingState(b) === "upcoming" || bookingState(b) === "requested").sort((a, b) => (firstDate(a) < firstDate(b) ? -1 : 1));
    setData({
      upcoming,
      completed: bookings.filter((b) => bookingState(b) === "past").length,
      certificates: getCertificates(),
      saved: savedCourseIds().length,
    });
  }, []);
  if (!data) return null;

  const next = data.upcoming.find((b) => bookingState(b) === "upcoming");
  const nextLine = next && [...next.lines].sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const later = data.upcoming.filter((b) => b !== next);
  const renew = data.certificates.filter((c) => c.state !== "valid").length;
  const s = copy.stats;
  const stats = [
    { label: s.upcoming.label, value: data.upcoming.length, icon: "icon-calendar", href: "/account/learning", hint: s.upcoming.hint(nextLine && nextLine.mode !== "ondemand" ? formatDay(nextLine.date) : "") },
    { label: s.completed.label, value: data.completed, icon: "icon-check", href: "/account/learning?tab=completed", hint: s.completed.hint },
    { label: s.certificates.label, value: data.certificates.length, icon: "icon-badge", href: "#rt-acc-cert-h", hint: s.certificates.hint(renew) },
    { label: s.saved.label, value: data.saved, icon: "icon-bookmark", href: "/account/saved", hint: s.saved.hint(data.saved) },
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
              {nextLine.postcode && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextLine.postcode)}`} target="_blank" rel="noopener" className="fb-textlink">{account.detail.actions.map}<Arrow /></a>}
            </div>
          </div>
        ) : (
          <EmptyState inCard title={copy.next.none} action={{ href: copy.next.cta.href, label: copy.next.cta.label }} />
        )}
      </section>

      <Stats items={stats} iconSize={18} />

      {later.length > 0 && (
        <section className="rt-acc__card" aria-labelledby="rt-acc-up-h">
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id="rt-acc-up-h">{copy.upcoming.title}</h2>
            <Link href="/account/learning" className="fb-textlink">{copy.upcoming.all}<Arrow /></Link>
          </div>
          <div className="rt-acc__rows">{later.slice(0, 3).map((b) => <BookingRow key={b.reference} booking={b} />)}</div>
        </section>
      )}

      <div className="rt-acc__duo">
        <section className="rt-acc__card" aria-labelledby="rt-acc-cert-h">
          <h2 className="rt-acc__h2" id="rt-acc-cert-h">{copy.certificates.title}</h2>
          <p className="rt-acc__note">{copy.certificates.text}</p>
          {data.certificates.length ? (
            <ul className="rt-acc__certs rt-biz__rows">
              {data.certificates.map((c) => (
                <li key={c.number}>
                  <div>
                    <b>{c.title}</b>
                    <span>{c.number}</span>
                    <span>{c.state === "expired" ? "Expired" : "Expires"} {formatDay(c.expires)}</span>
                    <DownloadCertificate cert={{ ...c, learner: myName }} onDownload={cert.download} />
                  </div>
                  <div className="rt-acc__certside">
                    <CertPill state={c.state} />
                    {c.state !== "valid" && <Link href={courseHref(c.courseId)} className="fb-textlink">{copy.certificates.renew}<span className="rt-sr"> {c.title}</span><Arrow /></Link>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState inCard title={copy.certificates.none} />
          )}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-acc-help-h">
          <h2 className="rt-acc__h2" id="rt-acc-help-h">{copy.help.title}</h2>
          <ul className="rt-acc__helplinks rt-acc__helplist">
            {copy.help.items.map((h) => (
              <li key={h.href}><Link href={h.href} className="fb-textlink">{h.label}<Arrow /></Link></li>
            ))}
          </ul>
        </section>
      </div>
      {cert.page}
    </div>
  );
}
