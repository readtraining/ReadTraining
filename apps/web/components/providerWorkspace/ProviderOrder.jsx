"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { addOrderNote, cancelOrder, customerName, learnerName, markOrderPaid, refundOrder, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { focusFirstError } from "@/lib/focusFirstError";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { Loading, ORDER_TONE, Pill, formatWhen, shortDay } from "./providerParts";
import { formatOrderDay } from "./moneyParts";

// One order: who paid, what for and who is going, where the money is (the sale, our card fee and commission, refunds, what you
// earn and the payout it is in), and the history. The actions follow the status: an unpaid order can be marked paid, its link
// sent again or cancelled; a paid one refunded (all of it, or one learner's place) and its emails sent again; a disputed one
// answered with evidence. Every action leaves a note in the history.

const PAYMENT_LABEL = { card: "Card", link: "Payment link", offline: "Paid another way", free: "Booked for free" };

export default function ProviderOrder({ reference }) {
  const data = useProvider();
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(null); // "cancel" | "refund" | "evidence"
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState("");
  const sheetRef = useRef(null);
  const noteRef = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  if (!data) return <Loading rows={3} />;
  const o = data.orders.find((x) => x.ref === reference);
  if (!o) {
    return <p className="rt-acc__card rt-acc__empty">Order {reference} was not found. <Link href="/provider/orders">Back to orders</Link></p>;
  }

  const m = o.money;
  const left = Math.max(0, o.total - o.refunded);
  const payout = data.payouts.find((p) => p.orders.includes(o.ref));
  const enrolled = data.enrolments.filter((e) => e.orderRef === o.ref);
  const canRefund = ["paid", "partial"].includes(o.status) && left > 0;
  const say = (message) => setToast({ message });
  const open = (kind, start = {}) => {
    setErrors({});
    setForm(start);
    setSheet(kind);
  };
  const close = () => setSheet(null);
  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (sheet === "cancel" && !form.reason?.trim()) err.reason = "Say why the order is cancelled. The customer sees this.";
    if (sheet === "refund") {
      const amount = Number(form.amount);
      if (!form.amount || Number.isNaN(amount) || amount <= 0) err.amount = "Enter the amount to refund, like 95.";
      else if (amount > left) err.amount = `You can refund up to ${formatPrice(left)}.`;
      if (!form.reason?.trim()) err.reason = "Say why you are refunding. The customer sees this.";
    }
    if (sheet === "evidence" && !form.message?.trim()) err.message = "Explain what happened, for example that the learner attended.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(sheetRef.current);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    if (sheet === "cancel") {
      cancelOrder(o.ref, form.reason.trim());
      say("Order cancelled. The places are free again.");
    }
    if (sheet === "refund") {
      refundOrder(o.ref, Number(form.amount), form.reason.trim(), form.learner || undefined);
      say(`${formatPrice(Number(form.amount))} refunded to the customer`);
    }
    if (sheet === "evidence") {
      addOrderNote(o.ref, `Evidence sent to the card company: ${form.message.trim()}${form.file ? ` (attached: ${form.file})` : ""}`);
      say("Evidence sent. We will tell you the outcome.");
    }
    setBusy(false);
    close();
  };
  const saveNote = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setNoteErr("Write the note first.");
      return focusFirstError(noteRef.current);
    }
    addOrderNote(o.ref, note.trim());
    setNote("");
    setNoteErr("");
    say("Note added");
  };
  const resend = (text, message) => {
    addOrderNote(o.ref, text);
    say(message);
  };
  // the learner whose place a refund removes: picking one fills in their line's price
  const pickLearner = (e) => {
    const id = e.target.value;
    const line = o.lines.find((l) => l.learnerIds.includes(id));
    setForm((f) => ({ ...f, learner: id, amount: id && line ? String(Math.min(line.price, left)) : String(left) }));
  };

  const Err = ({ k }) => (errors[k] ? <p className="rt-q__err" id={`rt-pws-ord-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p> : null);
  const aria = (k) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `rt-pws-ord-${k}-e` : undefined });

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-adm-hero" aria-label="Order">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill>
            <span className="rt-adm-item__when">{pw.channels[o.channel]} · {formatOrderDay(o.at)}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">Order {o.ref}</h2>
          <p className="rt-acc__note">{customerName(o.customer)}{o.customer.company && `, ${o.customer.company}`} · {formatPrice(o.total)} · {PAYMENT_LABEL[o.payment]}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {o.status === "incomplete" && (
            <>
              <button type="button" className="button -sm -purple-1 text-white" onClick={() => { markOrderPaid(o.ref); say("Order marked as paid"); }}>Mark as paid</button>
              {o.payment === "link" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => resend(`Payment link sent again to ${o.customer.email}.`, "Payment link sent again")}>Resend payment link</button>}
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open("cancel")}>Cancel order</button>
            </>
          )}
          {canRefund && (
            <>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => resend("Joining instructions sent again to each learner.", "Joining instructions sent again")}>Resend joining instructions</button>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => resend(`Receipt sent again to ${o.customer.email}.`, "Receipt sent again")}>Resend receipt</button>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-adm-danger" onClick={() => open("refund", { amount: String(left), learner: "" })}>Refund</button>
            </>
          )}
          {o.status === "dispute" && <button type="button" className="button -sm -purple-1 text-white" onClick={() => open("evidence")}>Send evidence</button>}
        </div>
      </section>

      {o.status === "dispute" && (
        <section className="rt-acc__card rt-pws-money__alert" aria-labelledby="rt-pws-ord-disp">
          <h2 className="rt-acc__h2" id="rt-pws-ord-disp">The customer has disputed this payment</h2>
          <p className="rt-acc__note">Their card company has taken {formatPrice(o.total)} back while it decides. Send evidence within 7 days, for example the register showing the learner attended, your terms and any emails. If the dispute is lost, the money and a £15 dispute fee come off your next payout.</p>
        </section>
      )}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-pws-ord-cust">
          <h2 className="rt-acc__h2" id="rt-pws-ord-cust">Customer</h2>
          <dl className="rt-adm-dl">
            <div><dt>Name</dt><dd>{customerName(o.customer)}</dd></div>
            {o.customer.company && <div><dt>Company</dt><dd>{o.customer.company}</dd></div>}
            <div><dt>Email</dt><dd><a href={`mailto:${o.customer.email}`}>{o.customer.email}</a></dd></div>
            {o.customer.phone && <div><dt>Phone</dt><dd><a href={`tel:${o.customer.phone.replace(/\s/g, "")}`}>{o.customer.phone}</a></dd></div>}
            {(o.customer.address || o.customer.city) && <div><dt>Address</dt><dd>{[o.customer.address, o.customer.city, o.customer.postcode].filter(Boolean).join(", ")}</dd></div>}
          </dl>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-pws-ord-money">
          <h2 className="rt-acc__h2" id="rt-pws-ord-money">Money</h2>
          {m.held ? (
            <p className="rt-acc__note">{formatPrice(m.held)} is held while the dispute is open. Nothing from this order is paid out until it is settled.</p>
          ) : !m.gross ? (
            <p className="rt-acc__note">{o.status === "cancelled" ? "This order was cancelled before it was paid. No money moved." : "Nothing has been paid yet. Your earnings show here once the order is paid."}</p>
          ) : (
            <dl className="rt-adm-dl rt-pws-money__dl">
              <div><dt>Order total</dt><dd>{formatPrice(m.gross)}</dd></div>
              {o.refunded > 0 && <div><dt>Refunded</dt><dd>−{formatPrice(o.refunded)}</dd></div>}
              {m.fee > 0 && <div><dt>Card fee ({pw.fee.card}%)</dt><dd>−{formatPrice(m.fee)}</dd></div>}
              {m.commission > 0 && <div><dt>Commission ({pw.fee.commission}%)</dt><dd>−{formatPrice(m.commission)}</dd></div>}
              <div className="-total"><dt>You earn</dt><dd>{formatPrice(m.net)}</dd></div>
              <div><dt>Payout</dt><dd>{payout ? <><Link href="/provider/payouts">{payout.id}</Link>, {payout.status === "paid" ? "paid" : "due"} {shortDay(payout.date)}</> : "In your next payout"}</dd></div>
            </dl>
          )}
          {o.channel !== "marketplace" && m.gross > 0 && <p className="rt-acc__note rt-adm-mt">No commission: this order did not come through ReadTraining.</p>}
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-pws-ord-lines">
        <h2 className="rt-acc__h2" id="rt-pws-ord-lines">Courses and learners</h2>
        {o.lines.map((l, i) => {
          const c = data.byId.course[l.courseId];
          const k = data.byId.cohort[l.cohortId];
          const plan = l.plan ? pw.tiers.find((t) => t.key === l.plan)?.label : "";
          return (
            <div key={i} className="rt-adm-line">
              <div className="rt-adm-line__top">
                <div>
                  {c ? <Link href={`/provider/courses/${c.id}`} className="rt-adm-strong">{c.title}</Link> : <strong>Course removed</strong>}
                  <small>
                    {k ? <Link href={`/provider/cohorts/${k.id}`}>{shortDay(k.first)}{k.last !== k.first ? ` to ${shortDay(k.last)}` : ""}{k.venue ? `, ${k.venue.city}` : ", online"}</Link> : "On demand"}
                    {plan && ` · ${plan} plan`}
                  </small>
                </div>
                <div className="rt-adm-line__price"><strong>{formatPrice(l.price * l.qty)}</strong><small>{l.qty} × {formatPrice(l.price)}</small></div>
              </div>
              <ul className="rt-pws-ord__people">
                {l.learnerIds.map((id) => {
                  const p = data.byId.learner[id];
                  const still = enrolled.some((e) => e.learnerId === id && e.courseId === l.courseId);
                  return <li key={id}>{p ? <Link href={`/provider/learners/${id}`}>{learnerName(p)}</Link> : "Learner"}{!still && <span className="rt-adm-muted"> · place refunded or cancelled</span>}</li>;
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-pws-ord-notes">
        <h2 className="rt-acc__h2" id="rt-pws-ord-notes">History and notes</h2>
        <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
          <div className="rt-field">
            <label htmlFor="rt-pws-ord-note" className="rt-sr">Add a note for your team</label>
            {noteErr && <p className="rt-q__err" id="rt-pws-ord-note-e"><span className="rt-sr">Error: </span>{noteErr}</p>}
            <textarea id="rt-pws-ord-note" rows={3} maxLength={1000} placeholder="Add a note for your team (the customer does not see it)" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" aria-invalid={noteErr ? true : undefined} aria-describedby={noteErr ? "rt-pws-ord-note-e" : undefined} />
          </div>
          <button type="submit" className="button -sm -outline-purple-1 text-purple-1">Add note</button>
        </form>
        <ul className="rt-adm-timeline rt-adm-mt">
          {o.notes.map((n, i) => <li key={`${n.at}-${i}`}><span>{n.text}</span><small>{n.who} · {formatWhen(n.at)}</small></li>)}
          <li><span>Order placed{o.channel === "manual" ? " by your team" : ` on ${pw.channels[o.channel]}`}</span><small>{formatWhen(o.at)}</small></li>
        </ul>
      </section>

      <Sheet open={Boolean(sheet)} onClose={close} title={sheet === "cancel" ? "Cancel this order" : sheet === "refund" ? "Refund" : "Send evidence"} closeLabel="Close">
        <form className="rt-q__form" onSubmit={submit} noValidate ref={sheetRef}>
          {sheet === "cancel" && (
            <>
              <p className="rt-acc__note">The order has not been paid. Cancelling frees the places and tells the customer.</p>
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-reason">Reason</label>
                <Err k="reason" />
                <textarea id="rt-pws-ord-reason" rows={3} maxLength={500} value={form.reason || ""} onChange={field("reason")} autoComplete="off" {...aria("reason")} />
              </div>
            </>
          )}
          {sheet === "refund" && (
            <>
              <p className="rt-acc__note">Up to {formatPrice(left)} can be refunded. The card fee is not returned by the card company, so it stays as a cost.</p>
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-learner">What to refund</label>
                <select id="rt-pws-ord-learner" value={form.learner || ""} onChange={pickLearner} autoComplete="off">
                  <option value="">Part or all of the order (places stay booked unless it is all)</option>
                  {enrolled.map((e) => <option key={e.id} value={e.learnerId}>{learnerName(e.learner)}'s place on {e.course?.title}</option>)}
                </select>
              </div>
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-amount">Amount (£)</label>
                <Err k="amount" />
                <input id="rt-pws-ord-amount" type="number" inputMode="decimal" min="0" step="0.01" value={form.amount || ""} onChange={field("amount")} autoComplete="off" {...aria("amount")} />
              </div>
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-reason">Reason</label>
                <Err k="reason" />
                <textarea id="rt-pws-ord-reason" rows={3} maxLength={500} value={form.reason || ""} onChange={field("reason")} autoComplete="off" {...aria("reason")} />
              </div>
            </>
          )}
          {sheet === "evidence" && (
            <>
              <p className="rt-acc__note">We send this to the card company with the booking details we hold.</p>
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-message">What happened</label>
                <Err k="message" />
                <textarea id="rt-pws-ord-message" rows={5} maxLength={2000} value={form.message || ""} onChange={field("message")} autoComplete="off" {...aria("message")} />
              </div>
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-file">Attach a file (optional)</label>
                <p className="rt-acc__note" id="rt-pws-ord-file-h">The signed register, a certificate or emails. PDF, JPG or PNG.</p>
                <input id="rt-pws-ord-file" type="file" accept=".pdf,.jpg,.jpeg,.png" aria-describedby="rt-pws-ord-file-h" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0]?.name || "" }))} />
              </div>
            </>
          )}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>
            {busy ? "Saving…" : sheet === "cancel" ? "Cancel the order" : sheet === "refund" ? `Refund ${form.amount && !Number.isNaN(Number(form.amount)) ? formatPrice(Number(form.amount)) : ""}`.trim() : "Send evidence"}
          </button>
        </form>
      </Sheet>
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
