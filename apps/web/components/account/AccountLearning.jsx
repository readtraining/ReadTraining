"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { calendarFile, getBookings, getLearning } from "@/lib/account";
import { courseHref } from "@/lib/courses";
import { formatDate } from "@/lib/format";
import { placeOf, whenOf } from "./BookingRow";

const copy = account.learning;
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const TABS = ["upcoming", "completed"];

// My learning (the client's "My learning"): every course booked, one card each (a booking with two courses gives two cards),
// Upcoming (soonest first) and Completed (newest first). A card has when and where, who is attending, the booking's status, Add to
// calendar while it is to come, the certificate once completed, and View booking. Online courses: the training provider emails the
// log-in (we do not run the learning platform), which the card says instead of a button that would lead nowhere.
export default function AccountLearning() {
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const [bookings, setBookings] = useState({});
  useEffect(() => {
    setItems(getLearning());
    setBookings(Object.fromEntries(getBookings().map((b) => [b.reference, b])));
    const asked = new URLSearchParams(window.location.search).get("tab");
    if (TABS.includes(asked)) setTab(asked);
  }, []);
  if (!items) return null;
  const groups = { upcoming: items.filter((i) => i.state === "upcoming"), completed: items.filter((i) => i.state === "completed").reverse() };
  const pick = (t) => {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(window.history.state, "", url);
    } catch {}
  };
  const list = groups[tab];

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__tabs" role="group" aria-label="Show courses">
        {TABS.map((t) => (
          <button key={t} type="button" className={`rt-tr__filter${tab === t ? " is-on" : ""}`} aria-pressed={tab === t} onClick={() => pick(t)}>{copy.tabs[t]}<span className="rt-tr__filter-n">{groups[t].length}</span></button>
        ))}
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${copy.tabs[tab].toLowerCase()} ${list.length === 1 ? "course" : "courses"}`}</p>
      {list.length ? (
        <div className="rt-acc__rows">
          {list.map((l) => {
            const status = l.requested ? ["requested", account.status.requested] : l.state === "upcoming" ? ["confirmed", "Booked"] : ["completed", account.status.completed];
            return (
              <article key={l.key} className="rt-acc__row rt-acc__learn" aria-labelledby={`rt-ln-${l.key}`}>
                <div className="rt-acc__datetile" aria-hidden="true">
                  {l.mode === "ondemand" ? <span className="-any">Any time</span> : <><b>{DAY.format(new Date(`${l.date}T00:00:00Z`))}</b><span>{MONTH.format(new Date(`${l.date}T00:00:00Z`))}</span></>}
                </div>
                <div className="rt-acc__rowmain">
                  <h3 className="rt-acc__rowtitle" id={`rt-ln-${l.key}`}><Link href={courseHref(l.courseId)} className="rt-acc__plainlink">{l.title}</Link></h3>
                  <p className="rt-acc__rowmeta">{whenOf(l)}{l.mode !== "ondemand" && l.time ? ` · ${l.time}` : ""}</p>
                  <p className="rt-acc__rowmeta">{placeOf(l)} · {l.provider}</p>
                  <p className="rt-acc__rowsub">{account.detail.attending}: {l.delegates.join(", ")}</p>
                  {l.mode === "ondemand" && l.state === "upcoming" && <p className="rt-acc__note">Your log-in for the online course is emailed by {l.provider}.</p>}
                  {l.certificate && <p className="rt-acc__note">{copy.certificate.replace("{number}", l.certificate.number).replace("{date}", formatDate(l.certificate.expires))}</p>}
                  <div className="rt-acc__lineactions">
                    <Link href={`/account/bookings/${l.reference}`} className="fb-textlink">{copy.view}<span className="rt-sr"> {l.reference}</span></Link>
                    {l.state === "upcoming" && l.mode !== "ondemand" && bookings[l.reference] && (
                      <a href={calendarFile(bookings[l.reference], l)} download={`${l.reference}.ics`} className="fb-textlink">{account.detail.actions.calendar}<span className="rt-sr"> for {l.title}</span></a>
                    )}
                  </div>
                </div>
                <div className="rt-acc__rowside">
                  <span className={`rt-pill rt-acc__status -${status[0]}`}>{status[1]}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rt-bk__empty rt-acc__emptybox">
          <span className="rt-bk__emptyicon" aria-hidden="true"><i className="icon-online-learning text-24"></i></span>
          <h2>{copy.empty[tab].title}</h2>
          <p>{copy.empty[tab].text}</p>
          <Link href={account.dashboard.next.cta.href} className="button -md -purple-1 text-white">{account.dashboard.next.cta.label}</Link>
        </div>
      )}
    </div>
  );
}
