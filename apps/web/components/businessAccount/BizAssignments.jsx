"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { businessAccount as biz } from "@/data/businessAccount";
import { assignPlace, getBusiness, unassignPlace } from "@/lib/businessAccount";
import { formatDateRange } from "@/lib/format";
import { Avatar } from "@/components/marketing/parts";
import { PlacesBar } from "./bizParts";

const copy = biz.assignments;

// One upcoming course's places: who has one (Remove frees it again) and each place still free, with a learner to choose and Assign
// (the /for-business page's "Assign now / Hold for later" list, working).
function PlaceCard({ p, learners, highlight, onChange }) {
  const [pick, setPick] = useState({});
  const free = learners.filter((l) => !p.assigned.includes(l.id));
  const byId = Object.fromEntries(learners.map((l) => [l.id, l]));
  const assign = (slot) => {
    const id = pick[slot];
    if (!id) return;
    assignPlace(p.id, id);
    setPick((x) => ({ ...x, [slot]: "" }));
    onChange(`${byId[id].name} now has a place on ${p.title}.`);
  };
  const remove = (id) => {
    unassignPlace(p.id, id);
    onChange(`${byId[id].name}'s place on ${p.title} is free again.`);
  };
  return (
    <section id={`place-${p.id}`} className={`rt-acc__card rt-biz__place${highlight ? " is-highlight" : ""}`} aria-labelledby={`rt-biz-p-${p.id}`}>
      <div className="rt-acc__linetop">
        <div>
          <h2 className="rt-acc__h3" id={`rt-biz-p-${p.id}`}>{p.title}</h2>
          <p className="rt-acc__note rt-biz__meta">{formatDateRange(p.date, p.endDate)} · {p.time} · {p.venue ? `${p.venue}, ${p.city}` : "Live online"} · Ref {p.reference}</p>
        </div>
      </div>
      <PlacesBar purchase={p} />
      <ul className="fb-list rt-biz__places">
        {p.assigned.map((id) => (
          <li key={id} className="fb-list__row">
            <Avatar name={byId[id].name} />
            <div className="fb-list__main"><b>{byId[id].name}</b><span>{byId[id].email}</span></div>
            <span className="rt-pill rt-acc__status -completed">{copy.assigned}</span>
            <button type="button" className="rt-biz__remove" onClick={() => remove(id)}>{copy.unassign}<span className="rt-sr"> {byId[id].name} from {p.title}</span></button>
          </li>
        ))}
        {Array.from({ length: p.free }, (_, i) => (
          <li key={`free-${i}`} className="fb-list__row rt-biz__freeslot">
            <Avatar ghost />
            <div className="fb-list__main"><b>{copy.unassigned} {i + 1}</b><span>{p.title}</span></div>
            {free.length ? (
              <div className="rt-biz__assign">
                <label className="rt-field">
                  <span className="rt-sr">{copy.choose} for {copy.unassigned.toLowerCase()} {i + 1}</span>
                  <select value={pick[i] || ""} onChange={(e) => setPick((x) => ({ ...x, [i]: e.target.value }))}>
                    <option value="">{copy.choose}</option>
                    {free.map((l) => <option key={l.id} value={l.id}>{l.name}{l.status === "invited" ? " (invited)" : ""}</option>)}
                  </select>
                </label>
                <button type="button" className="button -md -purple-1 text-white" disabled={!pick[i]} onClick={() => assign(i)}>{copy.assign}</button>
              </div>
            ) : (
              <span className="rt-biz__muted">{copy.none}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Team training assignments: every upcoming course the team has places on, each with its places bar, the learners who have a place
// and the places still free. Filter to the courses with places to assign; ?place= (from the dashboard and bookings) scrolls to one.
export default function BizAssignments() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [focus, setFocus] = useState(null);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    setData(getBusiness());
    const place = new URLSearchParams(window.location.search).get("place");
    if (place) {
      setFocus(place);
      setTimeout(() => document.getElementById(`place-${place}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, []);
  if (!data) return null;
  const upcoming = data.purchases.filter((p) => p.state === "upcoming").sort((a, b) => (a.date < b.date ? -1 : 1));
  const shown = filter === "open" ? upcoming.filter((p) => p.free > 0) : upcoming;
  const changed = (msg) => {
    setData(getBusiness());
    setAnnounce(msg);
  };

  if (!upcoming.length) {
    return (
      <div className="rt-bk__empty rt-acc__emptybox">
        <span className="rt-bk__emptyicon" aria-hidden="true"><i className="icon-list text-24"></i></span>
        <h2>{copy.empty.title}</h2>
        <p>{copy.empty.text}</p>
        <Link href={copy.empty.cta.href} className="button -md -purple-1 text-white">{copy.empty.cta.label}</Link>
      </div>
    );
  }
  return (
    <div className="rt-acc__stack">
      <div className="rt-biz__bar">
        <div className="rt-acc__tabs" role="group" aria-label="Show courses">
          {[["all", upcoming.length], ["open", upcoming.filter((p) => p.free > 0).length]].map(([k, n]) => (
            <button key={k} type="button" className={`rt-tr__filter${filter === k ? " is-on" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{copy.filters[k]}<span className="rt-tr__filter-n">{n}</span></button>
          ))}
        </div>
        <Link href="/business/learners?add=1" className="fb-textlink">{copy.addLearner}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </div>
      <p className="rt-sr" aria-live="polite">{announce}</p>
      {shown.map((p) => <PlaceCard key={p.id} p={p} learners={data.learners} highlight={focus === p.id} onChange={changed} />)}
    </div>
  );
}
