"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { businessAccount as biz } from "@/data/businessAccount";
import { getBusiness } from "@/lib/businessAccount";
import { courseHref } from "@/lib/courses";
import { formatDate, formatPrice } from "@/lib/format";
import BookingRow from "@/components/account/BookingRow";
import { CertPill, PlacesBar, asBooking, certLine } from "./bizParts";

const copy = biz.dashboard;

// The Business account home, in Hurak's "Training overview" order: four counts (learners, places to assign, valid certificates,
// renewals due), the places still to assign with Assign, the renewals coming up with Book renewal, the upcoming training, the
// credit account at a glance, and quick actions (book for the team, add a learner, a group quote).
export default function BizDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => setData(getBusiness()), []);
  if (!data) return null;

  const upcoming = data.purchases.filter((p) => p.state === "upcoming").sort((a, b) => (a.date < b.date ? -1 : 1));
  const toAssign = upcoming.filter((p) => p.free > 0);
  const renewals = data.certificates.filter((c) => c.state !== "valid");
  const stats = [
    [copy.stats.learners, data.learners.length, "icon-person-3"],
    [copy.stats.unassigned, toAssign.reduce((s, p) => s + p.free, 0), "icon-list"],
    [copy.stats.certificates, data.certificates.filter((c) => c.state === "valid").length, "icon-badge"],
    [copy.stats.renewals, data.certificates.filter((c) => c.state === "renew").length, "icon-calendar"],
  ];
  const usedPct = Math.min(100, (data.credit.used / data.credit.limit) * 100);

  return (
    <div className="rt-acc__stack">
      <ul className="rt-tps__keyfacts rt-acc__stats">
        {stats.map(([label, n, icon]) => (
          <li key={label} className="rt-tps__keyfact">
            <span className="rt-benefit__icon" aria-hidden="true"><i className={`${icon} text-18`}></i></span>
            <span className="rt-tps__keyfact-text"><strong>{n}</strong><span className="rt-sr">, </span><span>{label}</span></span>
          </li>
        ))}
      </ul>

      <section className="rt-acc__card" aria-labelledby="rt-biz-assign-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-biz-assign-h">{copy.assign.title}</h2>
          <Link href="/business/assignments" className="fb-textlink">{biz.nav[2].label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </div>
        <p className="rt-acc__note rt-biz__lead">{copy.assign.text}</p>
        {toAssign.length ? (
          <ul className="rt-biz__assignlist">
            {toAssign.map((p) => (
              <li key={p.id}>
                <div className="rt-biz__assignmain">
                  <b>{p.title}</b>
                  <span>{formatDate(p.date)} · {p.venue ? p.city : "Live online"}</span>
                  <PlacesBar purchase={p} />
                </div>
                <Link href={`/business/assignments?place=${p.id}`} className="button -md -purple-1 text-white">{copy.assign.cta}<span className="rt-sr"> places on {p.title}</span></Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rt-acc__empty">{copy.assign.none}</p>
        )}
      </section>

      <div className="rt-acc__duo">
        <section className="rt-acc__card" aria-labelledby="rt-biz-renew-h">
          <h2 className="rt-acc__h2" id="rt-biz-renew-h">{copy.renewals.title}</h2>
          {renewals.length ? (
            <ul className="rt-acc__certs">
              {renewals.map((c) => (
                <li key={c.number}>
                  <div><b>{c.learner}</b><span>{c.title}</span><span>{certLine(c)}</span></div>
                  <div className="rt-acc__certside">
                    <CertPill state={c.state} />
                    <Link href={courseHref(c.courseId)} className="fb-textlink">{copy.renewals.cta}<span className="rt-sr"> for {c.learner}</span><i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__empty">{copy.renewals.none}</p>
          )}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-biz-credit-h">
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id="rt-biz-credit-h">{copy.billing.title}</h2>
            <Link href="/business/billing" className="fb-textlink">{copy.billing.cta}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
          </div>
          <dl className="rt-bk__sums">
            <div><dt>{biz.billing.credit.available}</dt><dd>{formatPrice(data.credit.available)}</dd></div>
            <div><dt>{biz.billing.credit.used}</dt><dd>{formatPrice(data.credit.used)} of {formatPrice(data.credit.limit)}</dd></div>
          </dl>
          <div className="rt-biz__meter" role="img" aria-label={`${Math.round(usedPct)}% of your credit used`}><span style={{ width: `${usedPct}%` }}></span></div>
          {data.credit.due > 0 && <p className="rt-acc__note">{biz.billing.credit.due}: <b className="rt-biz__strong">{formatPrice(data.credit.due)}</b>, next due {formatDate(data.credit.dueDate)}</p>}
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-biz-up-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-biz-up-h">{copy.upcoming.title}</h2>
          <Link href="/business/bookings" className="fb-textlink">{copy.upcoming.all}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </div>
        <div className="rt-acc__rows">
          {upcoming.slice(0, 3).map((p) => (
            <BookingRow key={p.id} booking={asBooking(p)} href={`/business/assignments?place=${p.id}`} go={biz.bookings.manage} sub={`${p.assigned.length} of ${p.places} places assigned · Ref ${p.reference}`} />
          ))}
        </div>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-biz-act-h">
        <h2 className="rt-acc__h2" id="rt-biz-act-h">{copy.actions.title}</h2>
        <div className="rt-acc__actions">
          {copy.actions.items.map((a) => (
            <Link key={a.href} href={a.href} className={a.primary ? "button -md -purple-1 text-white" : "button -md -outline-purple-1 text-purple-1"}>{a.label}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
