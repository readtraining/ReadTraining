"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { businessAccount as biz } from "@/data/businessAccount";
import { assignPlace, getBusiness, unassignPlace } from "@/lib/businessAccount";
import { formatDateRange } from "@/lib/format";
import { modeLabel } from "@/lib/courseModes";
import { Avatar } from "@/components/marketing/parts";
import { PlacesBar } from "./bizParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import Sheet from "@/components/testPrep/runner/Sheet";
import { EmptyState } from "@/components/states/States";

const copy = biz.assignments;

// One upcoming course's places: the type, the places bar, who has a place (Remove frees it again; a long list folds to the first
// few with Show all) and one row for the places still free, whose Assign learners opens a list to tick several people at once
// (up to the places left).
const FOLD = 3;
function PlaceCard({ p, learners, highlight, onChange }) {
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState([]);
  const [all, setAll] = useState(false);
  const pickRef = useRef(null);
  const free = learners.filter((l) => !p.assigned.includes(l.id));
  const byId = Object.fromEntries(learners.map((l) => [l.id, l]));
  const shownAssigned = all ? p.assigned : p.assigned.slice(0, FOLD);
  const toggle = (id) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < p.free ? [...c, id] : c));
  const assign = () => {
    for (const id of chosen) assignPlace(p.id, id);
    const names = chosen.map((id) => byId[id].name);
    setPicking(false);
    setChosen([]);
    onChange(`${names.join(", ")} ${names.length === 1 ? "now has a place" : "now have places"} on ${p.title}.`);
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
      <div className="rt-biz__tags"><span className="rt-biz__tag">{modeLabel(p.mode)}</span></div>
      <PlacesBar purchase={p} />
      <ul className="fb-list rt-biz__places">
        {shownAssigned.map((id) => (
          <li key={id} className="fb-list__row">
            <Avatar name={byId[id].name} />
            <div className="fb-list__main"><b>{byId[id].name}</b><span title={byId[id].email}>{byId[id].email}</span></div>
            <span className="rt-pill rt-acc__status -completed">{copy.assigned}</span>
            <button type="button" className="rt-biz__remove" onClick={() => remove(id)}>{copy.unassign}<span className="rt-sr"> {byId[id].name} from {p.title}</span></button>
          </li>
        ))}
        {p.assigned.length > FOLD && (
          <li className="fb-list__row rt-biz__foldrow">
            <button type="button" className="rt-cd__link" aria-expanded={all} onClick={() => setAll((x) => !x)}>{all ? copy.fewer : copy.showAll(p.assigned.length)}</button>
          </li>
        )}
        {p.free > 0 && (
          <li className="fb-list__row rt-biz__freeslot">
            <Avatar ghost />
            <div className="fb-list__main"><b>{copy.freeTitle(p.free)}</b><span>{free.length ? copy.freeText : copy.none}</span></div>
            {free.length > 0 && <button type="button" ref={pickRef} className="button -md -purple-1 text-white" aria-haspopup="dialog" onClick={() => { setChosen([]); setPicking(true); }}>{copy.assignMany}<span className="rt-sr"> to {p.title}</span></button>}
          </li>
        )}
      </ul>

      <Sheet open={picking} onClose={() => setPicking(false)} title={copy.pickTitle(p.title)} closeLabel="Close" fallbackFocus={pickRef}>
        <div className="rt-biz__sheetform">
          <p className="rt-acc__note">{copy.pickText(p.free)}</p>
          <fieldset className="rt-biz__picklist">
            <legend className="rt-sr">{copy.choose}</legend>
            {free.map((l) => {
              const on = chosen.includes(l.id);
              const full = !on && chosen.length >= p.free;
              return (
                <label key={l.id} className={`rt-biz__pick${on ? " is-on" : ""}${full ? " is-full" : ""}`}>
                  <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(l.id)} />
                  <span><b>{l.name}</b><small>{[l.job, l.status === "invited" ? "Invited" : ""].filter(Boolean).join(" · ")}</small></span>
                </label>
              );
            })}
          </fieldset>
          <p className="rt-acc__note" aria-live="polite">{copy.picked(chosen.length, p.free)}</p>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" disabled={!chosen.length} onClick={assign}>{copy.assignN(chosen.length)}</button>
        </div>
      </Sheet>
    </section>
  );
}

// Team training assignments: every upcoming course the team has places on, each with its places bar, the learners who have a place
// and the places still free. As Hurak's Courses page: the course type, a title search, Clear filter and how many courses match, and
// each course tagged with its type. Filter to the courses with places to assign; ?place= (from the dashboard
// and bookings) scrolls to one.
export default function BizAssignments() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
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
  const needle = q.trim().toLowerCase();
  const matching = upcoming.filter((p) => (!type || p.mode === type) && (!needle || p.title.toLowerCase().includes(needle)));
  const shown = filter === "open" ? matching.filter((p) => p.free > 0) : matching;
  const types = [...new Set(upcoming.map((p) => p.mode))];
  const filtered = Boolean(type || needle || filter !== "all");
  const clear = () => { setType(""); setQ(""); setFilter("all"); };
  const changed = (msg) => {
    setData(getBusiness());
    setAnnounce(msg);
  };

  if (!upcoming.length) {
    return (
      <EmptyState large icon="icon-list" headingLevel={2} title={copy.empty.title} text={copy.empty.text} action={{ href: copy.empty.cta.href, label: copy.empty.cta.label }} />
    );
  }
  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__card rt-biz__toolbar rt-biz__coursefilters">
        <div className="rt-field">
          <label className="rt-sr" htmlFor="rt-biz-type">{copy.type}</label>
          <FieldSelect id="rt-biz-type" label={copy.type} placeholder={copy.allTypes} value={type} onChange={setType} options={[{ value: "", label: copy.allTypes }, ...types.map((m) => ({ value: m, label: modeLabel(m) }))]} compact />
        </div>
        <label className="rt-field rt-biz__search">
          <span className="rt-sr">{copy.search}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.search} autoComplete="off" />
        </label>
      </div>
      <div className="rt-biz__bar">
        <div className="rt-acc__tabs" role="group" aria-label="Show courses">
          {[["all", matching.length], ["open", matching.filter((p) => p.free > 0).length]].map(([k, n]) => (
            <button key={k} type="button" className={`rt-tr__filter${filter === k ? " is-on" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{copy.filters[k]}<span className="rt-tr__filter-n">{n}</span></button>
          ))}
        </div>
        <Link href="/business/learners?add=1" className="fb-textlink">{copy.addLearner}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </div>
      <div className="rt-biz__found">
        <b>{copy.found(shown.length)}</b>
        {filtered && <button type="button" className="rt-cd__link" onClick={clear}>{copy.clear}</button>}
      </div>
      <p className="rt-sr" aria-live="polite">{announce || copy.found(shown.length)}</p>
      {shown.length ? shown.map((p) => <PlaceCard key={p.id} p={p} learners={data.learners} highlight={focus === p.id} onChange={changed} />) : <EmptyState inCard title={copy.noMatch} />}
    </div>
  );
}
