"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { addOrderNote, resendConfirmation, useAdmin } from "@/lib/admin";
import { courseHref } from "@/data/courseSlugs";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDateRange, formatPrice } from "@/lib/format";
import { Pill, formatWhen } from "./adminParts";
import { MONEY_TONE } from "./AdminOrders";
import { EmptyState } from "@/components/states/States";

const copy = A.orders;
const d = copy.detail;
const STEPS = ["paid", "delivered", "transferred", "paidout"];

// The money state as four steps (the booking stepper's look): done steps ticked, the current one filled; Reversed replaces them.
function MoneySteps({ money }) {
  if (money === "reversed") return <Pill tone="muted">{copy.money.reversed}</Pill>;
  const at = STEPS.indexOf(money);
  return (
    <ol className="rt-bk__steps rt-adm-money" aria-label="Where the money is">
      {STEPS.map((s, i) => (
        <li key={s} className={`rt-bk__step is-${i < at ? "done" : i === at ? "current" : "todo"}`} aria-current={i === at ? "step" : undefined}>
          <span className="rt-bk__stepn" aria-hidden="true">{i + 1}</span>
          <span className="rt-bk__stepl">{copy.money[s]}</span>
        </li>
      ))}
    </ol>
  );
}

// One order: what was booked (course, provider, dates, delegates, price) with where its money is, the customer, the payment (and
// purchase order and invoice for invoiced business orders), the timeline of everything that happened (newest first), "Resend
// confirmation", and the team's notes. Changes are kept with an audit entry (lib/admin.js) and announced.
export default function AdminOrder({ reference }) {
  const data = useAdmin();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [said, setSaid] = useState("");
  const noteRef = useRef(null);
  if (!data) return null;
  const o = data.orders.find((x) => x.ref === reference);
  if (!o) return <EmptyState title="This order was not found." action={{ href: "/admin/orders", label: d.back }} />;
  const change = data.changes.find((c) => c.ref === o.ref);

  const saveNote = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setNoteError("Write the note first.");
      return focusFirstError(noteRef.current);
    }
    setNoteError("");
    addOrderNote(o, note.trim());
    setNote("");
    setSaid("Note added");
  };

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/orders" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label="Order">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={o.state === "cancelled" ? "muted" : o.state === "upcoming" ? "info" : "ok"}>{copy.tabs[o.state]}</Pill>
            <span className="rt-adm-item__when">Booked {formatWhen(o.booked)}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{o.ref}</h2>
          <p className="rt-acc__note">{o.buyer.name} · {formatPrice(o.total)} · {copy.methods[o.method]}</p>
          {change && <p className="rt-acc__note"><Link href="/admin/changes">{A.changes.types[change.type]}: {A.changes.statuses[change.status]}</Link></p>}
        </div>
        <div className="rt-adm-hero__actions">
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { resendConfirmation(o); setSaid(d.resent); }}>{d.resend}</button>
        </div>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-adm-lines-h">
        <h2 className="rt-acc__h2" id="rt-adm-lines-h">{d.lines}</h2>
        {o.lines.map((l) => (
          <div key={l.title} className="rt-adm-line">
            <div className="rt-adm-line__top">
              <div>
                <Link href={courseHref(l.courseId)} className="rt-adm-strong">{l.title}</Link>
                <small>{formatDateRange(l.date, l.endDate)} · {l.provider} · {l.city}</small>
              </div>
              <div className="rt-adm-line__price"><strong>{formatPrice(l.unit * l.qty)}</strong><small>{l.qty} × {formatPrice(l.unit)}</small></div>
            </div>
            <MoneySteps money={l.money} />
            <p className="rt-acc__note"><strong>{d.delegates}:</strong> {l.delegates.join(", ")}{l.qty > l.delegates.length ? ` and ${l.qty - l.delegates.length} more` : ""}</p>
          </div>
        ))}
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-buyer-h">
          <h2 className="rt-acc__h2" id="rt-adm-buyer-h">{d.buyer}</h2>
          <dl className="rt-adm-dl">
            <div><dt>Name</dt><dd>{o.buyer.name}</dd></div>
            <div><dt>Email</dt><dd>{o.buyer.email}</dd></div>
            {o.buyer.company && <div><dt>Company</dt><dd>{o.buyer.company}</dd></div>}
          </dl>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-pay-h">
          <h2 className="rt-acc__h2" id="rt-adm-pay-h">{d.payment}</h2>
          <dl className="rt-adm-dl">
            <div><dt>Method</dt><dd>{copy.methods[o.method]}</dd></div>
            <div><dt>Total</dt><dd>{formatPrice(o.total)}</dd></div>
            {o.po && <div><dt>{d.po}</dt><dd>{o.po}</dd></div>}
            {o.invoice && <div><dt>{d.invoice}</dt><dd>{o.invoice}</dd></div>}
          </dl>
        </section>
      </div>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-time-h">
          <h2 className="rt-acc__h2" id="rt-adm-time-h">{d.timeline}</h2>
          <ol className="rt-adm-timeline">
            {o.events.map((e) => <li key={`${e.at}-${e.text}`}><span>{e.text}</span><small>{formatWhen(e.at)}</small></li>)}
          </ol>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-onotes-h">
          <h2 className="rt-acc__h2" id="rt-adm-onotes-h">{d.notes}</h2>
          <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
            <div className="rt-field">
              <label htmlFor="rt-adm-onote" className="rt-sr">{A.providers.detail.notePlaceholder}</label>
              {noteError && <p className="rt-q__err" id="rt-adm-onote-e"><span className="rt-sr">Error: </span>{noteError}</p>}
              <textarea id="rt-adm-onote" rows={3} maxLength={1000} placeholder={A.providers.detail.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={noteError ? true : undefined} aria-describedby={noteError ? "rt-adm-onote-e" : undefined} />
            </div>
            <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{A.providers.detail.addNote}</button>
          </form>
          {o.notes.length > 0 && (
            <ul className="rt-adm-notes">
              {o.notes.map((n) => <li key={n.at}><p>{n.text}</p><small>{n.who} · {formatWhen(n.at)}</small></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
