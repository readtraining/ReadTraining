"use client";

import React, { useEffect, useState } from "react";
import { businessAccount as biz } from "@/data/businessAccount";
import { getBusiness } from "@/lib/businessAccount";
import BookingRow from "@/components/account/BookingRow";
import { asBooking } from "./bizParts";
import { EmptyState } from "@/components/states/States";

const copy = biz.bookings;
const TABS = ["upcoming", "past", "cancelled"];

// Business booking history: every course the team booked, as the customer account's booking cards, under Upcoming / Past / Cancelled
// (the tab kept in the address). Each card says how many places are assigned, who booked it, the purchase order and the invoice;
// an upcoming one opens its places to assign.
export default function BizBookings() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("upcoming");
  useEffect(() => {
    setData(getBusiness());
    const asked = new URLSearchParams(window.location.search).get("tab");
    if (TABS.includes(asked)) setTab(asked);
  }, []);
  if (!data) return null;
  const groups = Object.fromEntries(TABS.map((t) => [t, data.purchases.filter((p) => p.state === t)]));
  groups.upcoming.sort((a, b) => (a.date < b.date ? -1 : 1));
  groups.past.sort((a, b) => (a.date > b.date ? -1 : 1));
  const pick = (t) => {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(window.history.state, "", url);
    } catch {}
  };
  const sub = (p) => [`${p.places} ${p.places === 1 ? "place" : "places"}${p.state === "upcoming" ? ` · ${p.assigned.length} assigned` : ""}`, `Booked by ${p.bookedByName}`, p.po && p.po, p.invoice].filter(Boolean).join(" · ");

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__tabs" role="group" aria-label="Show bookings">
        {TABS.map((t) => (
          <button key={t} type="button" className={`rt-tr__filter${tab === t ? " is-on" : ""}`} aria-pressed={tab === t} onClick={() => pick(t)}>{copy.tabs[t]}<span className="rt-tr__filter-n">{groups[t].length}</span></button>
        ))}
      </div>
      <p className="rt-sr" aria-live="polite">{`${groups[tab].length} ${copy.tabs[tab].toLowerCase()} ${groups[tab].length === 1 ? "booking" : "bookings"}`}</p>
      {groups[tab].length ? (
        <div className="rt-acc__rows">
          {groups[tab].map((p) => (
            <BookingRow key={p.id} booking={asBooking(p)} sub={sub(p)} href={p.state === "upcoming" ? `/business/assignments?place=${p.id}` : `/business/billing?invoice=${p.invoice}`} go={p.state === "upcoming" ? copy.manage : "View invoice"} />
          ))}
        </div>
      ) : (
        <EmptyState title={copy.empty[tab]} />
      )}
    </div>
  );
}
