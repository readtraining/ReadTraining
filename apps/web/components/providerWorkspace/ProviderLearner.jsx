"use client";

import React from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { learnerName, timeRange, useProvider } from "@/lib/providerWorkspace";
import { ORDER_TONE, Loading, Pill, RowMenu } from "./providerParts";
import { dayRange } from "./ProviderCohorts";
import { money } from "./charts";

// Student profile: Hurak's details (name, phone, town, email) and its booking cards (course, dates and times, venue's full address,
// booking reference, order number and status, View cohort / Order details), in our layout: a header with the learner's numbers,
// then the bookings as a timeline, newest first.
export default function ProviderLearner({ learnerId }) {
  const data = useProvider();
  if (!data) return <Loading rows={2} />;
  const l = data.byId.learner[learnerId];
  if (!l) return <p className="rt-acc__card rt-acc__empty">This learner was not found. <Link href="/provider/learners">Back to learners</Link></p>;

  const orderOf = (ref) => data.orders.find((o) => o.ref === ref);
  const list = data.enrolments.filter((e) => e.learnerId === l.id).sort((a, b) => (orderOf(b.orderRef)?.at || 0) - (orderOf(a.orderRef)?.at || 0));
  const lineOf = (e) => orderOf(e.orderRef)?.lines.find((x) => x.courseId === e.courseId && x.learnerIds.includes(e.learnerId));
  const spent = list.filter((e) => e.status !== "cancelled").reduce((t, e) => t + (lineOf(e)?.price || 0), 0);
  const stats = [
    { label: "Bookings", value: list.length },
    { label: "Courses", value: new Set(list.map((e) => e.courseId)).size },
    { label: "Certificates", value: list.filter((e) => e.certificate).length },
    { label: "Booked value", value: money(spent) },
  ];
  const initials = `${l.first[0] || ""}${l.last[0] || ""}`.toUpperCase();

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-lr-head" aria-label="Student">
        <div className="rt-lr-head__top">
          <span className="rt-lr-avatar -lg" aria-hidden="true">{initials}</span>
          <div className="rt-lr-head__who">
            <h2 className="rt-lr-head__name">{learnerName(l)}</h2>
            <ul className="rt-lr-head__contact">
              <li><span>Phone</span>{l.phone ? <a href={`tel:${l.phone.replace(/\s/g, "")}`}>{l.phone}</a> : "—"}</li>
              <li><span>Town</span>{l.town || "—"}</li>
              <li><span>Email</span><a href={`mailto:${l.email}`}>{l.email}</a></li>
            </ul>
          </div>
          <Link href={`/provider/orders/new?learner=${l.id}`} className="button -sm -purple-1 text-white">Create order</Link>
        </div>
        <dl className="rt-lr-head__stats">
          {stats.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
        </dl>
      </section>

      <section aria-labelledby="rt-pws-lrn-bk">
        <h2 className="rt-lr-h" id="rt-pws-lrn-bk">Bookings</h2>
        {list.length ? (
          <ol className="rt-lr-timeline">
            {list.map((e) => {
              const k = e.cohort;
              const o = orderOf(e.orderRef);
              return (
                <li key={e.id} className={e.status === "cancelled" ? "is-cancelled" : undefined}>
                  <span className="rt-lr-timeline__dot" aria-hidden="true"></span>
                  <article className="rt-acc__card rt-lr-booking">
                    <div className="rt-lr-booking__head">
                      <div>
                        <p className="rt-lr-booking__when">{k ? `${dayRange(k.first, k.last)} · ${[...new Set(k.sessions.map((s) => timeRange(s)))].join(", ")}` : "On demand: starts when booked"}</p>
                        <h3 className="rt-lr-booking__course">{e.course ? <Link href={`/provider/courses/${e.course.id}`}>{e.course.title}</Link> : "Course removed"}</h3>
                      </div>
                      <div className="rt-lr-booking__side">
                        {o && <Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill>}
                        <RowMenu label={`Actions for ${e.course?.title || "this booking"}`} items={[
                          ...(k ? [{ label: "View cohort", href: `/provider/cohorts/${k.id}` }] : []),
                          { label: "Order details", href: `/provider/orders/${e.orderRef}` },
                        ]} />
                      </div>
                    </div>
                    <dl className="rt-lr-booking__facts">
                      {k && <div className="-wide"><dt>Venue</dt><dd>{k.venue ? `${k.venue.name}, ${k.venue.street}, ${k.venue.city} ${k.venue.postcode}` : "Online"}</dd></div>}
                      <div><dt>Booking reference</dt><dd>{e.id.replace(/^E/, "B-")}</dd></div>
                      <div><dt>Order number</dt><dd><Link href={`/provider/orders/${e.orderRef}`}>{e.orderRef}</Link></dd></div>
                      {e.status === "cancelled" && <div><dt>Place</dt><dd>Cancelled</dd></div>}
                    </dl>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rt-acc__card rt-acc__note">No bookings at the moment. Their past places may have been refunded or cancelled.</p>
        )}
      </section>
    </div>
  );
}
