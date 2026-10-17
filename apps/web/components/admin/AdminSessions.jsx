"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { cancelSession, markJoiningSent, setSalesClosed, useAdmin } from "@/lib/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { Pill, Search, Tabs, getQuery, setQuery } from "./adminParts";
import { EmptyState } from "@/components/states/States";

const copy = A.sessions;
const TABS = ["upcoming", "week", "cancelled", "venues"];
const PAGE = 25;
const MODE = { classroom: "Classroom", online: "Live online" };

// Seats as the business account's places bar (.fb-stack): booked of capacity, orange from 90% full
function Seats({ s }) {
  const pct = Math.round((s.booked / s.capacity) * 100);
  return (
    <div className="rt-adm-seats" role="img" aria-label={`${s.booked} of ${s.capacity} seats booked`}>
      <span className="rt-adm-seats__n">{s.booked}/{s.capacity}</span>
      <span className="rt-adm-seats__bar"><span className={pct >= 90 ? "-full" : undefined} style={{ width: `${pct}%` }}></span></span>
    </div>
  );
}

// Every dated session: Upcoming, Next 7 days (where joining instructions matter most) and Cancelled, with a search, then each
// session's date, course, provider, place, seats booked, joining instructions (Sent, or Not sent with "Mark sent"; red inside
// 6 days), and the actions: close or open sales, cancel (a reason, then every delegate is told their three choices). 25 at a time.
// Venues: every classroom venue with its capacity, access and upcoming dates.
export default function AdminSessions() {
  const data = useAdmin();
  const [tab, setTab] = useState("upcoming");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [said, setSaid] = useState("");
  const formRef = useRef(null);
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  if (!data) return null;

  const { sessions, venues } = data;
  const groups = {
    upcoming: sessions.filter((s) => !s.cancelled),
    week: sessions.filter((s) => !s.cancelled && s.daysAway <= 7),
    cancelled: sessions.filter((s) => s.cancelled),
  };
  const needle = q.trim().toLowerCase();
  const list = tab === "venues" ? [] : groups[tab].filter((s) => !needle || `${s.course} ${s.provider} ${s.city}`.toLowerCase().includes(needle));
  const tabs = [...["upcoming", "week", "cancelled"].map((t) => ({ key: t, label: copy.tabs[t], count: groups[t].length })), { key: "venues", label: copy.tabs.venues, count: venues.length }];
  const missing = groups.week.filter((s) => !s.joiningSent).length;
  const c = copy.columns;

  const pick = (t) => {
    setTab(t);
    setShown(PAGE);
    setQuery("tab", t === "upcoming" ? "" : t);
  };
  const confirmCancel = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(copy.cancelError);
      return focusFirstError(formRef.current);
    }
    cancelSession(cancelling, reason.trim());
    setSaid(`Cancelled: ${cancelling.course}, ${formatDate(cancelling.date)}`);
    setCancelling(null);
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={pick} label="Show sessions" />
        {tab !== "venues" && <Search value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} label={copy.search} />}
      </div>
      {tab === "week" && missing > 0 && <p className="rt-adm-item__block">{copy.weekMissing.replace("{n}", `${missing} ${missing === 1 ? "session starts" : "sessions start"}`)}</p>}
      <p className="rt-sr" aria-live="polite">{said}</p>

      {tab === "venues" ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr>{Object.values(copy.venueColumns).map((h) => <th key={h} scope="col">{h}</th>)}</tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={`${v.name}-${v.postcode}`}>
                  <td data-label={copy.venueColumns.name}><span className="rt-adm-strong">{v.name}</span></td>
                  <td data-label={copy.venueColumns.address}>{v.city}<small>{v.postcode}</small></td>
                  <td data-label={copy.venueColumns.capacity}>{v.capacity}</td>
                  <td data-label={copy.venueColumns.access}>{v.access}</td>
                  <td data-label={copy.venueColumns.sessions}>{v.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">{c.date}</th><th scope="col">{c.course}</th><th scope="col">{c.where}</th><th scope="col">{c.seats}</th><th scope="col">{c.joining}</th><th scope="col"><span className="rt-sr">{c.actions}</span></th></tr>
            </thead>
            <tbody>
              {list.slice(0, shown).map((s) => (
                <tr key={s.id}>
                  <td data-label={c.date}><span className="rt-adm-strong">{formatDate(s.date)}</span><small>{s.daysAway <= 0 ? "Today" : `In ${s.daysAway} ${s.daysAway === 1 ? "day" : "days"}`}</small></td>
                  <td data-label={c.course}><Link href={`/admin/catalogue/${s.courseId}`} className="rt-adm-strong">{s.course}</Link><small>{s.provider}{s.preCourse ? " · Pre-course e-learning" : ""}</small></td>
                  <td data-label={c.where}>{s.mode === "classroom" ? s.city : MODE.online}<small>{s.mode === "classroom" ? s.postcode : s.time}</small></td>
                  <td data-label={c.seats}>{s.cancelled ? <Pill tone="muted">Cancelled</Pill> : <Seats s={s} />}{s.salesClosed && !s.cancelled && <small>{copy.salesClosed}</small>}</td>
                  <td data-label={c.joining}>
                    {s.cancelled ? <span className="rt-adm-muted">{s.cancelReason}</span> : s.joiningSent ? <Pill tone="ok">{copy.sent}</Pill> : (
                      <span className="rt-adm-cellrow">
                        <Pill tone={s.daysAway <= 6 ? "late" : "muted"}>{copy.notSent}</Pill>
                        <button type="button" className="rt-cd__link" onClick={() => { markJoiningSent(s); setSaid(`Joining instructions marked as sent: ${s.course}`); }}>{copy.markSent}</button>
                      </span>
                    )}
                  </td>
                  <td className="rt-biz__act">
                    {!s.cancelled && (
                      <span className="rt-adm-cellrow -end">
                        <button type="button" className="rt-cd__link" onClick={() => { setSalesClosed(s, !s.salesClosed); setSaid(`${s.salesClosed ? "Sales opened" : "Sales closed"}: ${s.course}`); }}>{s.salesClosed ? copy.openSales : copy.closeSales}</button>
                        <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => { setCancelling(s); setReason(""); setError(""); }}>{copy.cancel}</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > shown && (
            <div className="rt-adm-more">
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setShown((n) => n + PAGE)}>{copy.more} ({list.length - shown} left)</button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title="No sessions here." />
      )}

      <Sheet open={Boolean(cancelling)} onClose={() => setCancelling(null)} title={copy.cancelTitle} closeLabel="Close">
        {cancelling && (
          <form className="rt-q__form rt-biz__sheetform" onSubmit={confirmCancel} noValidate ref={formRef}>
            <p className="rt-acc__note"><strong>{cancelling.course}</strong><br />{formatDate(cancelling.date)} · {cancelling.provider} · {cancelling.city} · {cancelling.booked} booked</p>
            <p className="rt-adm-item__reason">{copy.cancelNote}</p>
            <div className="rt-field">
              <label htmlFor="rt-adm-cancel">{copy.cancelReason}</label>
              {error && <p className="rt-q__err" id="rt-adm-cancel-e"><span className="rt-sr">Error: </span>{error}</p>}
              <textarea id="rt-adm-cancel" rows={3} maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-adm-cancel-e" : undefined} />
            </div>
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{copy.cancelConfirm}</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
