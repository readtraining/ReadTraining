"use client";

import React from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { learnerName, useProvider } from "@/lib/providerWorkspace";
import { COHORT_TONE, Loading, Pill, shortDay } from "./providerParts";
import { formatOrderDay } from "./moneyParts";

// One learner: contact details, and every booking with you (the dates or their progress on an on-demand course, the order,
// attendance, result and certificate). "Book onto another course" starts a new order with them as the customer.
const RESULT = { pass: "Passed", fail: "Not yet passed" };

export default function ProviderLearner({ learnerId }) {
  const data = useProvider();
  if (!data) return <Loading rows={2} />;
  const l = data.byId.learner[learnerId];
  if (!l) return <p className="rt-acc__card rt-acc__empty">This learner was not found. <Link href="/provider/learners">Back to learners</Link></p>;

  const mine = data.enrolments.filter((e) => e.learnerId === l.id);
  const orderAt = (ref) => data.orders.find((o) => o.ref === ref)?.at || 0;
  const list = [...mine].sort((a, b) => orderAt(b.orderRef) - orderAt(a.orderRef));
  const certs = mine.filter((e) => e.certificate).length;

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-adm-hero" aria-label="Learner">
        <div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{learnerName(l)}</h2>
          <p className="rt-acc__note">
            <a href={`mailto:${l.email}`}>{l.email}</a>
            {l.phone && <> · <a href={`tel:${l.phone.replace(/\s/g, "")}`}>{l.phone}</a></>}
            {l.company && ` · ${l.company}`}
          </p>
          <p className="rt-acc__note">{mine.length} {mine.length === 1 ? "booking" : "bookings"} · {certs} {certs === 1 ? "certificate" : "certificates"}</p>
        </div>
        <div className="rt-adm-hero__actions">
          <Link href={`/provider/orders/new?learner=${l.id}`} className="button -sm -purple-1 text-white">Book onto another course</Link>
        </div>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-pws-lrn-bk">
        <h2 className="rt-acc__h2 rt-adm-tabletitle" id="rt-pws-lrn-bk">Bookings</h2>
        {list.length ? (
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Course</th><th scope="col">Dates</th><th scope="col">Order</th><th scope="col">Attended</th><th scope="col">Result</th><th scope="col">Certificate</th></tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const k = e.cohort;
                return (
                  <tr key={e.id}>
                    <td data-label="Course">{e.course ? <Link href={`/provider/courses/${e.course.id}`} className="rt-adm-strong">{e.course.title}</Link> : "Course removed"}</td>
                    <td data-label="Dates">
                      {k ? (
                        <><Link href={`/provider/cohorts/${k.id}`}>{shortDay(k.first)}{k.last !== k.first ? ` to ${shortDay(k.last)}` : ""}</Link><small><Pill tone={COHORT_TONE[k.status]}>{pw.cohortStatuses[k.status]}</Pill></small></>
                      ) : (
                        <>On demand<small>{e.progress ?? 0}% done</small></>
                      )}
                    </td>
                    <td data-label="Order"><Link href={`/provider/orders/${e.orderRef}`}>{e.orderRef}</Link><small>{formatOrderDay(orderAt(e.orderRef))}</small></td>
                    <td data-label="Attended">{e.attended === true ? "Yes" : e.attended === false ? "No" : "Not yet"}</td>
                    <td data-label="Result">{RESULT[e.result] || (k ? "Not recorded" : (e.progress ?? 0) >= 100 ? "Completed" : "In progress")}</td>
                    <td data-label="Certificate">{e.certificate ? <>{e.certificate.no}<small>Issued {formatOrderDay(e.certificate.issued)}</small></> : "None yet"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="rt-acc__note">No bookings at the moment. Their past places may have been refunded or cancelled.</p>
        )}
      </section>
    </div>
  );
}
