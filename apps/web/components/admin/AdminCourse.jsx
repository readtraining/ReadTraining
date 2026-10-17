"use client";

import React, { useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { setOfferingStatus, setPreCourse, useAdmin } from "@/lib/admin";
import { courseHref } from "@/data/courseSlugs";
import { formatPrice } from "@/lib/format";
import { Pill } from "./adminParts";
import { modeLabel } from "@/lib/courseModes";
import { EmptyState } from "@/components/states/States";

const copy = A.catalogue;
const d = copy.detail;

// One course: what it is (category, duration, level, validity, study methods, "From" price), the pre-course e-learning flag
// (a switch, with what it changes), and its offerings, one per provider (modes, from price, upcoming dates, Live or Paused, with
// Pause / Resume). Changes are kept with an audit entry and announced.
export default function AdminCourse({ id }) {
  const data = useAdmin();
  const [said, setSaid] = useState("");
  if (!data) return null;
  const c = data.catalogue.find((x) => String(x.id) === String(id));
  if (!c) return <EmptyState title="This course was not found." action={{ href: "/admin/catalogue", label: d.back }} />;

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/catalogue" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label={d.about}>
        <div>
          <div className="rt-adm-item__top">
            <Pill tone="info">{c.category}</Pill>
            {c.preCourse && <Pill tone="warn">{copy.preCourse}</Pill>}
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{c.title}</h2>
          <p className="rt-acc__note">{c.duration} · {c.validity} · From {formatPrice(c.from)} · {c.upcoming} upcoming dates</p>
        </div>
        <div className="rt-adm-hero__actions">
          <Link href={courseHref(c.id)} className="fb-textlink">{d.publicPage}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></Link>
        </div>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-adm-pre-h">
        <h2 className="rt-acc__h2" id="rt-adm-pre-h">{copy.preCourse}</h2>
        <label className="rt-bk__check rt-adm-switch" htmlFor="rt-adm-pre">
          <input id="rt-adm-pre" type="checkbox" checked={c.preCourse} onChange={(e) => { setPreCourse(c, e.target.checked); setSaid(e.target.checked ? "Pre-course e-learning on" : "Pre-course e-learning off"); }} />
          <span>Learners must complete online work before the course starts</span>
        </label>
        <p className="rt-acc__note">{copy.preCourseNote}</p>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-adm-off-h">
        <h2 className="rt-acc__h2" id="rt-adm-off-h">{d.offerings}</h2>
        <p className="rt-acc__note rt-adm-tablenote">{d.offeringsNote}</p>
        <table className="rt-biz__table rt-adm-table">
          <thead>
            <tr><th scope="col">Provider</th><th scope="col">How it runs</th><th scope="col">From</th><th scope="col">Upcoming dates</th><th scope="col">Status</th><th scope="col"><span className="rt-sr">Action</span></th></tr>
          </thead>
          <tbody>
            {c.offerings.map((o) => (
              <tr key={o.provider}>
                <td data-label="Provider"><span className="rt-adm-strong">{o.provider}</span></td>
                <td data-label="How it runs">{o.modes.map(modeLabel).join(", ")}</td>
                <td data-label="From">{formatPrice(o.from)}</td>
                <td data-label="Upcoming dates">{o.sessions}</td>
                <td data-label="Status"><Pill tone={o.status === "paused" ? "muted" : "ok"}>{o.status === "paused" ? d.paused : d.live}</Pill></td>
                <td className="rt-biz__act">
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { const next = o.status === "paused" ? "live" : "paused"; setOfferingStatus(c, o, next); setSaid(`${o.provider}: ${next === "paused" ? "paused" : "live again"}`); }} aria-label={`${o.status === "paused" ? d.resume : d.pause} ${o.provider}`}>
                    {o.status === "paused" ? d.resume : d.pause}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
