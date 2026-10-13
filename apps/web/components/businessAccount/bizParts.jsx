import React from "react";
import { formatDate } from "@/lib/format";

// Shared bits of the Business account pages.

// A purchase in the customer account's booking shape, so it shows as the same booking card (components/account/BookingRow).
export const asBooking = (p) => ({
  reference: p.reference,
  status: p.state === "cancelled" ? "cancelled" : "confirmed",
  total: p.total,
  lines: [{ title: p.title, mode: p.mode, date: p.date, endDate: p.endDate, time: p.time, venue: p.venue, city: p.city, provider: p.provider, quantity: p.places, delegates: [] }],
});

// Places bought, assigned and still free, as the /for-business page's places bar (.fb-stack).
export function PlacesBar({ purchase }) {
  const assigned = purchase.assigned.length;
  const pct = (n) => `${(n / purchase.places) * 100}%`;
  return (
    <div className="fb-stack rt-biz__stack">
      <div className="fb-stack__top">
        <b>{purchase.places} {purchase.places === 1 ? "place" : "places"} bought</b>
        <span>{assigned} assigned · {purchase.free} to assign</span>
      </div>
      <div className="fb-stack__bar" role="img" aria-label={`${assigned} of ${purchase.places} places assigned, ${purchase.free} to assign`}>
        {assigned > 0 && <span className="-assigned" style={{ width: pct(assigned) }}></span>}
        {purchase.free > 0 && <span className="-free" style={{ width: pct(purchase.free) }}></span>}
      </div>
    </div>
  );
}

// A certificate's state as the account's status pill: Valid (green), Renew soon (orange), Expired (neutral).
const CERT = { valid: ["completed", "Valid"], renew: ["requested", "Renew soon"], expired: ["cancelled", "Expired"] };
export const CertPill = ({ state }) => <span className={`rt-pill rt-acc__status -${CERT[state][0]}`}>{CERT[state][1]}</span>;
export const certLine = (c) => `${c.number} · ${c.state === "expired" ? "Expired" : "Expires"} ${formatDate(c.expires)}`;
