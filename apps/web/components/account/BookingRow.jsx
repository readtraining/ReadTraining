import React from "react";
import Link from "next/link";
import { account as copy } from "@/data/account";
import { firstDate, statusOf } from "@/lib/account";
import { modeLabel } from "@/lib/basket";
import { formatDateRange, formatPrice } from "@/lib/format";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });

// A booking's status as the site's pill: Confirmed (purple), Completed (the theme green, as the test pages' "Completed"),
// Cancellation requested (the theme's soft orange) and Cancelled (neutral).
export function StatusPill({ booking }) {
  const s = statusOf(booking);
  return <span className={`rt-pill rt-acc__status -${s}`}>{copy.status[s]}</span>;
}

export const placeOf = (line) => (line.venue ? `${line.venue}, ${line.city}` : modeLabel(line.mode));
export const whenOf = (line) => (line.mode === "ondemand" ? line.time : formatDateRange(line.date, line.endDate));

// One booking in a list (dashboard, My bookings, the Business account's bookings): a date tile, the first course with when and
// where, how many more courses and delegates, the reference, then the status, total and "View booking" (the whole card is the
// link's hit area). `href`, `sub` and `go` replace the link, the line under the details and the link's label (Business account).
export default function BookingRow({ booking, href: to, sub, go }) {
  const first = booking.lines[0];
  const start = firstDate(booking);
  const more = booking.lines.length - 1;
  const delegates = booking.lines.reduce((s, l) => s + (l.quantity || l.delegates.length), 0);
  const href = to || `/account/bookings/${booking.reference}`;
  return (
    <article className="rt-acc__row" aria-labelledby={`rt-acc-row-${booking.reference}`}>
      <div className="rt-acc__datetile" aria-hidden="true">
        {first.mode === "ondemand" ? <span className="-any">Any time</span> : <><b>{DAY.format(new Date(`${start}T00:00:00Z`))}</b><span>{MONTH.format(new Date(`${start}T00:00:00Z`))}</span></>}
      </div>
      <div className="rt-acc__rowmain">
        <h3 className="rt-acc__rowtitle" id={`rt-acc-row-${booking.reference}`}><Link href={href} className="rt-acc__rowlink">{first.title}</Link></h3>
        <p className="rt-acc__rowmeta">{whenOf(first)}{first.mode !== "ondemand" && first.time ? ` · ${first.time}` : ""}</p>
        <p className="rt-acc__rowmeta">{placeOf(first)} · {first.provider}</p>
        <p className="rt-acc__rowsub">
          {sub || (
            <>
              {more > 0 && <span>+ {more} more {more === 1 ? "course" : "courses"} · </span>}
              {delegates} {delegates === 1 ? "delegate" : "delegates"} · Ref {booking.reference}
            </>
          )}
        </p>
      </div>
      <div className="rt-acc__rowside">
        <StatusPill booking={booking} />
        <strong className="rt-acc__rowtotal">{formatPrice(booking.total)}</strong>
        <span className="fb-textlink rt-acc__rowgo" aria-hidden="true">{go || copy.bookings.view}<i className="icon-arrow-right text-12"></i></span>
      </div>
    </article>
  );
}
