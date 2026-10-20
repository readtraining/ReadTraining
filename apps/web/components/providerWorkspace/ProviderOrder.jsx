"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { addOrderNote, addonBooking, cancelOrder, customerName, decideRefund, learnerName, markOrderPaid, payInvoice, refundOrder, sendConfirmation, timeRange, uploadInvoice, upsellBooking, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { focusFirstError } from "@/lib/focusFirstError";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { Choice, Loading, ORDER_TONE, Pill, RowMenu, formatDay, formatWhen } from "./providerParts";
import { formatOrderDay } from "./moneyParts";
import { dayRange } from "./ProviderCohorts";
import { MoveSheet, ResitSheet, bookingPlan, cohortChoices } from "./ProviderCohort";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { methodName } from "@/lib/taxonomy";
import { EmptyState } from "@/components/states/States";
import DateField from "@/components/admin/DateField";

// Order details, as Hurak's: the order (amount, number, status, sales channel, payment method, purchase date, card), billing
// details, the timeline with notes, the invoice (upload it, record when it was paid), the enrolled students (one card per
// booking: reference, course, delivery, venue, dates, timings, price, pricing plan, learner, View cohort, and Reschedule / Resit /
// Upsell / Addon) and the earning details. Actions: Initiate refund (full or partial), Send confirmation mail; an unpaid order can
// be marked paid, its link sent again or cancelled; a disputed one answered with evidence.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ProviderOrder({ reference }) {
  const data = useProvider();
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(null); // cancel | refund | evidence | confirm | invoice | upsell | addon | plan | approve | decline
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState("");
  const [moving, setMoving] = useState(null);
  const [resit, setResit] = useState(null);
  const sheetRef = useRef(null);
  const noteRef = useRef(null);
  const invoiceRef = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  if (!data) return <Loading rows={3} />;
  const o = data.orders.find((x) => x.ref === reference);
  if (!o) {
    return <EmptyState title={`Order ${reference} was not found.`} action={{ href: "/provider/orders", label: "Back to orders" }} />;
  }

  const m = o.money;
  const left = Math.max(0, o.total - o.refunded);
  const enrolled = data.enrolments.filter((e) => e.orderRef === o.ref && !e.resitOf);
  const canRefund = ["paid", "partial"].includes(o.status) && left > 0;
  const share = o.channel === "marketplace" ? 100 - pw.fee.commission : 100;
  const request = data.refunds.find((r) => r.orderRef === o.ref && r.status === "open");
  const say = (message) => setToast({ message });
  const open = (kind, start = {}) => {
    setErrors({});
    setForm(start);
    setSheet(kind);
  };
  const close = () => setSheet(null);
  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const lineOf = (e) => o.lines.find((l) => l.courseId === e.courseId && l.learnerIds.includes(e.learnerId));
  const packOf = (courseId) => {
    const c = data.byId.course[courseId];
    return c?.pricing.type === "tiered" ? data.byId.pack[c.pricing.packageId] : null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (sheet === "cancel" && !form.reason?.trim()) err.reason = "Say why the order is cancelled. The customer sees this.";
    if (sheet === "refund") {
      const amount = Number(form.amount);
      if (!form.amount || Number.isNaN(amount) || amount <= 0) err.amount = "Enter the amount to refund, like 95.";
      else if (amount > left) err.amount = `You can refund up to ${formatPrice(left)}.`;
      if (!form.notes?.trim()) err.notes = "Add a note about the refund. The customer sees this.";
    }
    if (sheet === "evidence" && !form.message?.trim()) err.message = "Explain what happened, for example that the learner attended.";
    if (sheet === "confirm" && !EMAIL_RE.test(String(form.email || "").trim())) err.email = "Enter an email address in the correct format, like name@example.com.";
    if (sheet === "invoice" && !form.date) err.date = "Enter the date the invoice was paid.";
    if (sheet === "upsell" && !form.plan) err.plan = "Choose the new plan.";
    if (sheet === "decline" && !form.note?.trim()) err.note = "Tell the learner why. For example, your policy offers a date change instead.";
    if (sheet === "addon") {
      if (!form.courseId) err.courseId = "Choose the course to add.";
      const price = Number(form.price);
      if (form.price === "" || form.price === undefined || Number.isNaN(price) || price < 0) err.price = "Enter the price, like 49.";
    }
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(sheetRef.current);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    if (sheet === "cancel") { cancelOrder(o.ref, form.reason.trim()); say("Order cancelled. The places are free again."); }
    if (sheet === "refund") { refundOrder(o.ref, Number(form.amount), form.notes.trim(), form.learner || undefined); say(`${formatPrice(Number(form.amount))} refunded to the customer`); }
    if (sheet === "evidence") { addOrderNote(o.ref, `Evidence sent to the card company: ${form.message.trim()}${form.file ? ` (attached: ${form.file})` : ""}`); say("Evidence sent. We will tell you the outcome."); }
    if (sheet === "confirm") { sendConfirmation(o.ref, form.email.trim()); say(`Order confirmation sent to ${form.email.trim()}`); }
    if (sheet === "invoice") { payInvoice(o.ref, form.date); say("Invoice payment recorded"); }
    if (sheet === "upsell") { upsellBooking(form.enrolment.id, form.plan, form.difference); say(`Upgraded. Payment link for ${formatPrice(form.difference)} sent to ${o.customer.email}`); }
    if (sheet === "approve") { decideRefund(request.id, true, form.note?.trim() || ""); say(`${formatPrice(request.amount)} refunded to the customer`); }
    if (sheet === "decline") { decideRefund(request.id, false, form.note.trim()); say("Refund request declined. The learner has been told why."); }
    if (sheet === "addon") { addonBooking(form.enrolment.id, form.courseId, Number(form.price)); say(`Add-on added. Payment link for ${formatPrice(Number(form.price))} sent to ${o.customer.email}`); }
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
  const pickLearner = (id) => {
    const line = o.lines.find((l) => l.learnerIds.includes(id));
    setForm((f) => ({ ...f, learner: id, type: id ? "partial" : f.type, amount: id && line ? String(Math.min(line.price, left)) : String(left) }));
  };
  const chooseUpsell = (e) => {
    const pack = packOf(e.courseId);
    const now = bookingPlan(data, e);
    const order = pw.tiers.map((t) => t.key);
    const higher = order.filter((t) => order.indexOf(t) > order.indexOf(now || "saver"));
    open("upsell", { enrolment: e, plan: "", difference: 0, options: higher.map((t) => ({ value: t, label: `${pw.tiers.find((x) => x.key === t).label}: ${formatPrice(pack.tiers[t].price)} (+${formatPrice(pack.tiers[t].price - pack.tiers[now || "saver"].price)})` })), from: now || "saver", pack });
  };

  const Err = ({ k }) => (errors[k] ? <p className="rt-q__err" id={`rt-pws-ord-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p> : null);
  const aria = (k) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `rt-pws-ord-${k}-e` : undefined });
  const titles = { approve: "Approve the refund request", decline: "Decline the refund request", cancel: "Cancel this order", refund: "Initiate refund", evidence: "Send evidence", confirm: "Send confirmation mail", invoice: "Pay invoice detail", upsell: "Upsell", addon: "Addon", plan: "Pricing plan" };
  const sheetPack = sheet === "plan" ? form.pack : null;

  return (
    <div className="rt-acc__stack">
      <div className="rt-pws-ord__actions">
        {o.status === "incomplete" && (
          <>
            <button type="button" className="button -sm -purple-1 text-white" onClick={() => { markOrderPaid(o.ref); say("Order marked as paid"); }}>Mark as paid</button>
            {o.payment === "link" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => resend(`Payment link sent again to ${o.customer.email}.`, "Payment link sent again")}>Resend payment link</button>}
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open("cancel")}>Cancel order</button>
          </>
        )}
        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open("confirm", { email: o.customer.email })}>Send confirmation mail</button>
        {canRefund && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open("refund", { amount: String(left), learner: "", type: "full", notes: "" })}>Initiate refund</button>}
        {o.status === "dispute" && <button type="button" className="button -sm -purple-1 text-white" onClick={() => open("evidence")}>Send evidence</button>}
      </div>

      {request && (
        <section className="rt-acc__card rt-pws-money__alert" aria-labelledby="rt-pws-ord-req">
          <h2 className="rt-acc__h2" id="rt-pws-ord-req">Refund request</h2>
          <p className="rt-acc__note">{learnerName(data.byId.learner[request.learnerId])} asked for {formatPrice(request.amount)} back on {formatWhen(request.at)}. Reply within 3 working days.</p>
          <blockquote className="rt-pws-ord__reason">{request.reason}</blockquote>
          <div className="rt-pws-ord__actions">
            <button type="button" className="button -sm -purple-1 text-white" onClick={() => open("approve", { note: "" })}>Approve refund</button>
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open("decline", { note: "" })}>Decline</button>
          </div>
        </section>
      )}

      {o.status === "dispute" && (
        <section className="rt-acc__card rt-pws-money__alert" aria-labelledby="rt-pws-ord-disp">
          <h2 className="rt-acc__h2" id="rt-pws-ord-disp">The customer has disputed this payment</h2>
          <p className="rt-acc__note">Their card company has taken {formatPrice(o.total)} back while it decides. Send evidence within 7 days, for example the register showing the learner attended, your terms and any emails.</p>
        </section>
      )}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-pws-ord-det">
          <h2 className="rt-acc__h2" id="rt-pws-ord-det">Order details</h2>
          <dl className="rt-adm-dl">
            <div><dt>Order amount</dt><dd className="rt-adm-strong">{formatPrice(o.total)}</dd></div>
            <div><dt>Order no</dt><dd>{o.ref}</dd></div>
            <div><dt>Order status</dt><dd><Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill></dd></div>
            <div><dt>Sales channel</dt><dd>{pw.channels[o.channel]}</dd></div>
            <div><dt>Payment method</dt><dd>{pw.paymentMethods[o.payment]}</dd></div>
            <div><dt>Purchase date</dt><dd>{formatOrderDay(o.at)}</dd></div>
            <div><dt>Card number</dt><dd>{["card", "link"].includes(o.payment) && o.status !== "incomplete" ? `•••• ${o.card || String(1000 + (Number(o.ref.replace(/\D/g, "")) * 7919) % 9000)}` : "—"}</dd></div>
          </dl>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-pws-ord-bill">
          <h2 className="rt-acc__h2" id="rt-pws-ord-bill">Billing details</h2>
          <dl className="rt-adm-dl">
            <div><dt>Name</dt><dd>{customerName(o.customer)}{o.customer.company && <small className="rt-pws-ord__sub">{o.customer.company}</small>}</dd></div>
            <div><dt>Email</dt><dd><a href={`mailto:${o.customer.email}`}>{o.customer.email}</a></dd></div>
            <div><dt>Contact no.</dt><dd>{o.customer.phone ? <a href={`tel:${o.customer.phone.replace(/\s/g, "")}`}>{o.customer.phone}</a> : "—"}</dd></div>
            <div><dt>Address</dt><dd>{o.customer.address || "—"}</dd></div>
            <div><dt>City</dt><dd>{o.customer.city || "—"}</dd></div>
            <div><dt>Postcode</dt><dd>{o.customer.postcode || "—"}</dd></div>
          </dl>
        </section>
      </div>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-pws-ord-time">
          <h2 className="rt-acc__h2" id="rt-pws-ord-time">Timeline</h2>
          <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
            <div className="rt-field">
              <label htmlFor="rt-pws-ord-note" className="rt-sr">Add a note for your team</label>
              {noteErr && <p className="rt-q__err" id="rt-pws-ord-note-e"><span className="rt-sr">Error: </span>{noteErr}</p>}
              <textarea id="rt-pws-ord-note" rows={3} maxLength={1000} placeholder="Add a note for your team (the customer does not see it)" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" aria-invalid={noteErr ? true : undefined} aria-describedby={noteErr ? "rt-pws-ord-note-e" : undefined} />
            </div>
            <button type="submit" className="button -sm -outline-purple-1 text-purple-1">Add note</button>
          </form>
          <ol className="rt-pws-coh__timeline rt-adm-mt">
            {o.notes.map((n, i) => <li key={`${n.at}-${i}`}><p>{n.text}</p><small>by {n.who} · {formatWhen(n.at)}</small></li>)}
            <li><p>Order placed{o.channel === "manual" ? "" : ` on ${pw.channels[o.channel]}`}</p><small>by {o.channel === "manual" ? o.bookedBy || "your team" : customerName(o.customer)} · {formatWhen(o.at)}</small></li>
          </ol>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-pws-ord-inv">
          <h2 className="rt-acc__h2" id="rt-pws-ord-inv">Invoice</h2>
          {o.invoice?.file ? (
            <div className="rt-pws-ord__invoice">
              <i className="icon-document text-18" aria-hidden="true"></i>
              <span><b>{o.invoice.file}</b><small>{o.invoice.paidOn ? `Paid on ${formatDay(Date.parse(`${o.invoice.paidOn}T12:00:00Z`))}` : "Not paid yet"}</small></span>
            </div>
          ) : <p className="rt-acc__note">No invoice uploaded.</p>}
          <div className="rt-pws-coh__heroactions">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => invoiceRef.current?.click()}>{o.invoice?.file ? "Replace invoice" : "Upload invoice"}</button>
            {o.invoice?.file && !o.invoice.paidOn && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open("invoice", { date: "" })}>Pay invoice detail</button>}
          </div>
          <input ref={invoiceRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="rt-sr" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return say("The invoice must be a PDF, JPG or PNG."); uploadInvoice(o.ref, f.name); say("Invoice uploaded"); }} />
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-pws-ord-stu">
        <h2 className="rt-acc__h2" id="rt-pws-ord-stu">Enrolled students</h2>
        <div className="rt-pws-ord__bookings">
          {enrolled.map((e) => {
            const c = data.byId.course[e.courseId];
            const k = data.byId.cohort[e.cohortId];
            const line = lineOf(e);
            const plan = bookingPlan(data, e);
            const pack = packOf(e.courseId);
            const name = learnerName(e.learner);
            const cancelled = e.status === "cancelled";
            const higher = pack && pw.tiers.findIndex((t) => t.key === (plan || "saver")) < pw.tiers.length - 1;
            return (
              <article key={e.id} className="rt-pws-ord__booking">
                <div className="rt-pws-ord__bookhead">
                  <div>
                    <span className="rt-pws-ord__ref">Booking reference <b>{e.id.replace(/^E/, "B-")}</b></span>
                    {cancelled && <Pill tone="muted">Cancelled</Pill>}
                  </div>
                  {!cancelled && o.status !== "cancelled" && (
                    <RowMenu label={`Actions for ${name}'s booking`} items={[
                      ...(k ? [{ label: "Reschedule", onClick: () => setMoving(e) }, { label: "Resit", onClick: () => setResit(e) }] : []),
                      ...(higher ? [{ label: "Upsell", onClick: () => chooseUpsell(e) }] : []),
                      { label: "Addon", onClick: () => open("addon", { enrolment: e, courseId: "", price: "" }) },
                    ]} />
                  )}
                </div>
                <dl className="rt-pws-ord__bookdl">
                  <div><dt>Course title</dt><dd>{c ? <Link href={`/provider/courses/${c.id}`}>{c.title}</Link> : "Course removed"}</dd></div>
                  <div><dt>Delivery method</dt><dd>{methodName(c?.format) || "—"}</dd></div>
                  {k && <div><dt>Venue</dt><dd>{k.venue ? `${k.venue.name}, ${k.venue.street}, ${k.venue.city} ${k.venue.postcode}` : "Online"}</dd></div>}
                  {k && <div><dt>Course date</dt><dd>{dayRange(k.first, k.last)}</dd></div>}
                  {k && <div><dt>Course timings</dt><dd>{[...new Set(k.sessions.map((s) => timeRange(s)))].join(", ")}</dd></div>}
                  <div><dt>Course price</dt><dd>{formatPrice(line?.price ?? 0)}</dd></div>
                  <div><dt>Pricing plan</dt><dd>{plan && pack ? <button type="button" className="rt-cd__link" onClick={() => open("plan", { pack, plan })}>{pw.tiers.find((t) => t.key === plan)?.label}</button> : "—"}</dd></div>
                  <div><dt>Learner</dt><dd>{e.learner ? <><Link href={`/provider/learners/${e.learnerId}`}>{name}</Link><small>{e.learner.email}{e.learner.phone ? ` · ${e.learner.phone}` : ""}</small></> : "Name pending"}</dd></div>
                  {e.addons?.length > 0 && <div><dt>Add-ons</dt><dd>{e.addons.map((a) => data.byId.course[a.courseId]?.title).join(", ")}</dd></div>}
                </dl>
                {k && <Link href={`/provider/cohorts/${k.id}`} className="button -sm -outline-purple-1 text-purple-1">View cohort</Link>}
              </article>
            );
          })}
          {!enrolled.length && <p className="rt-acc__note">No students on this order. Places that were refunded or cancelled no longer show.</p>}
        </div>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-pws-ord-earn">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ord-earn">Earning details</h2>
          <Link href="/help-centre" className="rt-cd__link">Learn more</Link>
        </div>
        <dl className="rt-adm-dl rt-pws-money__dl">
          <div><dt>Gross</dt><dd>{formatPrice(o.total)}</dd></div>
          {o.refunded > 0 && <div><dt>Refunded</dt><dd>−{formatPrice(o.refunded)}</dd></div>}
          <div><dt>Transaction fee</dt><dd>{m.fee ? `−${formatPrice(m.fee)}` : formatPrice(0)}</dd></div>
          <div className="-total"><dt>Your earning</dt><dd>{m.gross ? formatPrice(m.net) : formatPrice(0)}</dd></div>
          <div><dt>Order status</dt><dd>{o.status === "incomplete" ? "Payment due" : pw.orderStatuses[o.status]}</dd></div>
        </dl>
        <p className="rt-acc__note rt-adm-mt">Your earning share is {share}% of the net{o.channel === "marketplace" ? ` (ReadTraining's commission is ${pw.fee.commission}%)` : ""}.</p>
      </section>

      <MoveSheet enrolment={moving} options={moving ? cohortChoices(data, moving) : []} course={moving ? data.byId.course[moving.courseId] : null} onClose={() => setMoving(null)} onSaved={(msg) => { setMoving(null); say(msg); }} />
      <ResitSheet enrolment={resit} options={resit ? cohortChoices(data, resit) : []} course={resit ? data.byId.course[resit.courseId] : null} onClose={() => setResit(null)} onSaved={(msg) => { setResit(null); say(msg); }} />

      <Sheet open={Boolean(sheet)} onClose={close} title={titles[sheet] || ""} closeLabel="Close">
        {sheet === "plan" ? (
          <div className="rt-q__form">
            <p className="rt-acc__note">{sheetPack?.name}</p>
            <dl className="rt-adm-dl">
              {pw.tiers.map((t) => <div key={t.key}><dt>{t.label}{t.key === form.plan ? " (this booking)" : ""}</dt><dd>{formatPrice(sheetPack?.tiers[t.key].price || 0)}</dd></div>)}
            </dl>
          </div>
        ) : (
          <form className="rt-q__form" onSubmit={submit} noValidate ref={sheetRef}>
            {(sheet === "approve" || sheet === "decline") && (
              <>
                <p className="rt-acc__note">{sheet === "approve" ? `${formatPrice(request?.amount || 0)} goes back to the customer and the learner's place is freed.` : "The learner sees your reason."}</p>
                <div className="rt-field">
                  <label htmlFor="rt-pws-ord-rnote">{sheet === "approve" ? "Note to the learner (optional)" : "Reason"}</label>
                  <Err k="note" />
                  <textarea id="rt-pws-ord-rnote" rows={3} maxLength={500} value={form.note || ""} onChange={field("note")} autoComplete="off" {...aria("note")} />
                </div>
              </>
            )}
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
                <p className="rt-acc__note">Up to {formatPrice(left)} can be refunded. The transaction fee is not returned by the card company.</p>
                <Choice name="rt-pws-ord-type" legend="Refund type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v, learner: v === "full" ? "" : f.learner, amount: v === "full" ? String(left) : f.amount }))} options={[{ value: "full", label: `Full refund (${formatPrice(left)})` }, { value: "partial", label: "Partial refund" }]} />
                {form.type === "partial" && (
                  <>
                    <div className="rt-field">
                      <label htmlFor="rt-pws-ord-learner">For one student (optional)</label>
                      <FieldSelect id="rt-pws-ord-learner" label="For one student" value={form.learner || ""} onChange={pickLearner} options={[{ value: "", label: "Not for one student (places stay booked)" }, ...enrolled.map((e) => ({ value: e.learnerId, label: `${learnerName(e.learner)}'s place on ${e.course?.title}` }))]} />
                    </div>
                    <div className="rt-field">
                      <label htmlFor="rt-pws-ord-amount">Refund amount (£)</label>
                      <Err k="amount" />
                      <input id="rt-pws-ord-amount" type="number" inputMode="decimal" min="0" step="0.01" value={form.amount || ""} onChange={field("amount")} autoComplete="off" {...aria("amount")} />
                    </div>
                  </>
                )}
                <div className="rt-field">
                  <label htmlFor="rt-pws-ord-notes">Refund notes</label>
                  <Err k="notes" />
                  <textarea id="rt-pws-ord-notes" rows={3} maxLength={500} value={form.notes || ""} onChange={field("notes")} autoComplete="off" {...aria("notes")} />
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
            {sheet === "confirm" && (
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-email">Send to</label>
                <p className="rt-field__hint">The customer's email. Change it to send the confirmation to someone else.</p>
                <Err k="email" />
                <input id="rt-pws-ord-email" type="email" value={form.email || ""} onChange={field("email")} autoComplete="off" spellCheck={false} {...aria("email")} />
              </div>
            )}
            {sheet === "invoice" && (
              <div className="rt-field">
                <label htmlFor="rt-pws-ord-date">Date the invoice was paid</label>
                <Err k="date" />
                <DateField id="rt-pws-ord-date" value={form.date || ""} onChange={(v) => field("date")({ target: { value: v } })} invalid={Boolean(errors.date)} describedBy={errors.date ? "rt-pws-ord-date-e" : undefined} />
              </div>
            )}
            {sheet === "upsell" && (
              <>
                <p className="rt-acc__note">{learnerName(form.enrolment?.learner)} is on the {pw.tiers.find((t) => t.key === form.from)?.label} plan. We send the customer a payment link for the difference.</p>
                <div className="rt-field">
                  <label htmlFor="rt-pws-ord-plan">New plan</label>
                  <Err k="plan" />
                  <FieldSelect id="rt-pws-ord-plan" label="New plan" placeholder="Choose a plan" value={form.plan || ""} onChange={(v) => setForm((f) => ({ ...f, plan: v, difference: f.pack.tiers[v].price - f.pack.tiers[f.from].price }))} options={form.options || []} invalid={Boolean(errors.plan)} describedBy={errors.plan ? "rt-pws-ord-plan-e" : undefined} />
                </div>
              </>
            )}
            {sheet === "addon" && (
              <>
                <p className="rt-acc__note">Add another course to {learnerName(form.enrolment?.learner)}'s booking. We send the customer a payment link for it.</p>
                <div className="rt-field">
                  <label htmlFor="rt-pws-ord-addon">Course</label>
                  <Err k="courseId" />
                  <FieldSelect id="rt-pws-ord-addon" label="Course" placeholder="Choose a course" value={form.courseId || ""} onChange={(v) => setForm((f) => ({ ...f, courseId: v, price: String(data.byId.course[v]?.pricing.price ?? "") }))} options={data.courses.filter((c) => c.status === "approved" && c.id !== form.enrolment?.courseId).map((c) => ({ value: c.id, label: c.title }))} invalid={Boolean(errors.courseId)} describedBy={errors.courseId ? "rt-pws-ord-courseId-e" : undefined} />
                </div>
                <div className="rt-field">
                  <label htmlFor="rt-pws-ord-price">Price (£)</label>
                  <Err k="price" />
                  <input id="rt-pws-ord-price" type="number" inputMode="decimal" min="0" step="0.01" value={form.price ?? ""} onChange={field("price")} autoComplete="off" {...aria("price")} />
                </div>
              </>
            )}
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Saving…" : { approve: "Approve and refund", decline: "Decline request", cancel: "Cancel the order", refund: "Initiate refund", evidence: "Send evidence", confirm: "Send", invoice: "Save", upsell: form.plan ? `Upsell and send link for ${formatPrice(form.difference)}` : "Upsell", addon: "Add and send payment link" }[sheet]}
            </button>
          </form>
        )}
      </Sheet>
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
