"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { createOrder, customerName, learnerName, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { focusFirstError } from "@/lib/focusFirstError";
import { Choice, Loading, Toggle, getQuery, shortDay } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { methodName } from "@/lib/taxonomy";

// A manual order, one page: 1 the customer (find one we already know by email or name, or add a new one), 2 the courses and the
// learners on each (same as the customer, someone already booked with you, or someone new), 3 how it is paid. A summary stays
// beside the form on desktop. "Review order" checks every section, then shows everything once more with "Change" links before
// the order is placed. Card details are never typed here: our payment partner's secure form takes them.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const PHONE = /^\+?[\d\s()-]{10,16}$/;
const MAX_ONLINE = 50;
const CUSTOMER_FIELDS = [
  { key: "first", label: "First name", auto: "given-name", required: true },
  { key: "last", label: "Last name", auto: "family-name", required: true },
  { key: "email", label: "Email", auto: "email", type: "email", required: true },
  { key: "phone", label: "Phone", auto: "tel", type: "tel", required: true, hint: "For example 07700 900123" },
  { key: "company", label: "Company (optional)", auto: "organization" },
  { key: "address", label: "Address line", auto: "address-line1", required: true, wide: true },
  { key: "city", label: "Town or city", auto: "address-level2", required: true },
  { key: "postcode", label: "Postcode", auto: "postal-code", required: true },
];
const emptyCustomer = { first: "", last: "", email: "", phone: "", company: "", address: "", city: "", postcode: "" };
let uid = 0;
const key = () => `k${(uid += 1)}`;
const newPerson = (same = false) => ({ key: key(), mode: same ? "same" : "new", id: "", find: "", first: "", last: "", email: "", phone: "" });
const newLine = () => ({ key: key(), courseId: "", cohortId: "", plan: "", price: "", priceTouched: false, people: [newPerson(true)] });

// one text field in the design system's shape: label, hint, the error above the input
function Field({ id, label, hint, error, wide = false, ...input }) {
  return (
    <div className={`rt-field${wide ? " rt-pws-ord__wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {hint && <p className="rt-acc__note" id={`${id}-h`}>{hint}</p>}
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={[hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(" ") || undefined} {...input} />
    </div>
  );
}
function Select({ id, label, error, hint, value, onChange, options, placeholder }) {
  return (
    <div className="rt-field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="rt-acc__note" id={`${id}-h`}>{hint}</p>}
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      <FieldSelect id={id} label={label} placeholder={placeholder} value={value} onChange={onChange} options={options} invalid={Boolean(error)} describedBy={[hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(" ") || undefined} />
    </div>
  );
}

export default function ProviderNewOrder() {
  const data = useProvider();
  const router = useRouter();
  const formRef = useRef(null);
  const [step, setStep] = useState("edit");
  const [custMode, setCustMode] = useState("find");
  const [custFind, setCustFind] = useState("");
  const [cust, setCust] = useState(emptyCustomer);
  const [lines, setLines] = useState(() => [newLine()]);
  const [payment, setPayment] = useState("card");
  const [receipt, setReceipt] = useState(true);
  const [joining, setJoining] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const prefilled = useRef(false);

  // ?learner=ID (from a learner's page): that person is the customer and the first learner
  useEffect(() => {
    if (!data || prefilled.current) return;
    prefilled.current = true;
    // ?cohort=ID ("Enroll student" on a cohort): the first line is that course and those dates
    const k = data.byId.cohort[getQuery("cohort")];
    if (k) {
      const tiered = data.byId.course[k.courseId]?.pricing.type === "tiered";
      setLines((ls) => [{ ...ls[0], courseId: k.courseId, cohortId: k.id, price: tiered ? "" : String(k.price) }, ...ls.slice(1)]);
    }
    const l = data.byId.learner[getQuery("learner")];
    if (!l) return;
    const past = data.orders.find((o) => o.customer.email.toLowerCase() === l.email.toLowerCase());
    setCust({ ...emptyCustomer, ...(past?.customer || {}), first: l.first, last: l.last, email: l.email, phone: l.phone, company: l.company || past?.customer.company || "" });
    setCustMode("details");
  }, [data]);

  if (!data) return <Loading rows={3} />;

  const courses = data.courses.filter((c) => c.status === "approved");
  const isOnline = (c) => c?.format === "self-paced";
  const cohortsFor = (courseId) => data.cohorts.filter((k) => k.courseId === courseId && k.status === "upcoming" && !k.disabled && k.left > 0).sort((a, b) => a.first.localeCompare(b.first));
  const packFor = (c) => (c?.pricing.type === "tiered" ? data.byId.pack[c.pricing.packageId] : null);
  const listPrice = (line) => {
    const c = data.byId.course[line.courseId];
    if (!c) return "";
    const pack = packFor(c);
    if (pack) return line.plan ? String(pack.tiers[line.plan].price) : "";
    const k = data.byId.cohort[line.cohortId];
    return String(k ? k.price : c.pricing.price);
  };
  // places a line may hold: what is left on its cohort, minus other lines booking the same cohort
  const maxFor = (line) => {
    const c = data.byId.course[line.courseId];
    if (isOnline(c)) return MAX_ONLINE;
    const k = data.byId.cohort[line.cohortId];
    if (!k) return MAX_ONLINE;
    const others = lines.filter((x) => x.key !== line.key && x.cohortId === line.cohortId).reduce((t, x) => t + x.people.length, 0);
    return Math.max(0, k.left - others);
  };

  // ---- people we know (for "find") ----
  const known = (() => {
    const m = new Map();
    data.orders.forEach((o) => m.set(o.customer.email.toLowerCase(), { ...emptyCustomer, ...o.customer }));
    data.learners.forEach((l) => !m.has(l.email.toLowerCase()) && m.set(l.email.toLowerCase(), { ...emptyCustomer, first: l.first, last: l.last, email: l.email, phone: l.phone, company: l.company }));
    return [...m.values()];
  })();
  const matchPeople = (list, text, nameOf) => {
    const t = text.trim().toLowerCase();
    if (t.length < 2) return [];
    return list.filter((p) => `${nameOf(p)} ${p.email}`.toLowerCase().includes(t)).slice(0, 6);
  };

  // ---- changes ----
  const setLine = (k, patch) => setLines((ls) => ls.map((l) => {
    if (l.key !== k) return l;
    const next = { ...l, ...patch };
    if (!next.priceTouched) next.price = listPrice(next);
    return next;
  }));
  const setPerson = (lk, pk, patch) => setLines((ls) => ls.map((l) => (l.key !== lk ? l : { ...l, people: l.people.map((p) => (p.key === pk ? { ...p, ...patch } : p)) })));
  const addPerson = (lk) => setLines((ls) => ls.map((l) => (l.key !== lk ? l : { ...l, people: [...l.people, newPerson()] })));
  const removePerson = (lk, pk) => setLines((ls) => ls.map((l) => (l.key !== lk ? l : { ...l, people: l.people.filter((p) => p.key !== pk) })));
  const copyLine = (l) => setLines((ls) => {
    const i = ls.findIndex((x) => x.key === l.key);
    const copy = { ...l, key: key(), people: l.people.map((p) => ({ ...p, key: key(), mode: p.mode === "same" ? "new" : p.mode, ...(p.mode === "same" ? { first: "", last: "", email: "", phone: "" } : {}) })) };
    return [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)];
  });

  // ---- checks ----
  const check = () => {
    const e = {};
    if (custMode === "find") e["c-find"] = "Find a customer, or add a new one.";
    else {
      CUSTOMER_FIELDS.forEach((f) => {
        const v = cust[f.key].trim();
        if (f.required && !v) e[`c-${f.key}`] = `Enter the customer's ${f.label.toLowerCase()}.`;
      });
      if (cust.email.trim() && !EMAIL.test(cust.email.trim())) e["c-email"] = "Enter an email address like name@example.co.uk.";
      if (cust.phone.trim() && !PHONE.test(cust.phone.trim())) e["c-phone"] = "Enter a UK phone number, like 07700 900123.";
      if (cust.postcode.trim() && !POSTCODE.test(cust.postcode.trim())) e["c-postcode"] = "Enter a full UK postcode, like LS1 4DL.";
    }
    lines.forEach((l, i) => {
      const p = `l${i}`;
      const c = data.byId.course[l.courseId];
      if (!c) e[`${p}-course`] = "Choose a course.";
      if (c && !isOnline(c) && !l.cohortId) e[`${p}-cohort`] = cohortsFor(c.id).length ? "Choose the dates." : "This course has no dates with places left. Add dates first.";
      if (c && packFor(c) && !l.plan) e[`${p}-plan`] = "Choose a plan.";
      if (payment !== "free" && (l.price === "" || Number.isNaN(Number(l.price)) || Number(l.price) < 0)) e[`${p}-price`] = "Enter the price per place, like 95.";
      if (l.people.length > maxFor(l)) e[`${p}-people`] = `Only ${maxFor(l)} ${maxFor(l) === 1 ? "place is" : "places are"} left on these dates. Remove a learner or choose other dates.`;
      const seen = new Set();
      l.people.forEach((x, j) => {
        const q = `${p}-p${j}`;
        let email = "";
        if (x.mode === "same") email = cust.email.trim().toLowerCase();
        if (x.mode === "existing") {
          if (!x.id) e[`${q}-find`] = "Find the learner, or add them as a new learner.";
          else email = data.byId.learner[x.id]?.email.toLowerCase() || "";
        }
        if (x.mode === "new") {
          if (!x.first.trim()) e[`${q}-first`] = "Enter the learner's first name.";
          if (!x.last.trim()) e[`${q}-last`] = "Enter the learner's last name.";
          if (!x.email.trim()) e[`${q}-email`] = "Enter the learner's email. Their joining instructions go there.";
          else if (!EMAIL.test(x.email.trim())) e[`${q}-email`] = "Enter an email address like name@example.co.uk.";
          if (x.phone.trim() && !PHONE.test(x.phone.trim())) e[`${q}-phone`] = "Enter a UK phone number, like 07700 900123.";
          email = x.email.trim().toLowerCase();
        }
        if (email && seen.has(email)) e[`${q}-${x.mode === "existing" ? "find" : x.mode === "new" ? "email" : "same"}`] = "This learner is already on this course in this order.";
        if (email) seen.add(email);
      });
    });
    return e;
  };
  const review = (ev) => {
    ev.preventDefault();
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(formRef.current);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const change = (id) => {
    setStep("edit");
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  const place = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const customer = { ...cust, first: cust.first.trim(), last: cust.last.trim(), email: cust.email.trim(), postcode: cust.postcode.trim().toUpperCase() };
    const ref = createOrder({
      customer,
      payment,
      receipt,
      joining,
      lines: lines.map((l) => ({
        courseId: l.courseId, cohortId: l.cohortId, plan: l.plan, price: Number(l.price) || 0,
        learners: l.people.map((x) => (x.mode === "same" ? { first: customer.first, last: customer.last, email: customer.email, phone: customer.phone } : x.mode === "existing" ? { id: x.id } : { first: x.first.trim(), last: x.last.trim(), email: x.email.trim(), phone: x.phone.trim() })),
      })),
    });
    router.push(`/provider/orders/${ref}`);
  };

  // ---- summary ----
  const places = lines.reduce((t, l) => t + l.people.length, 0);
  const subtotal = lines.reduce((t, l) => t + (Number(l.price) || 0) * l.people.length, 0);
  const total = payment === "free" ? 0 : subtotal;
  const fee = ["card", "link"].includes(payment) ? Math.round(total * pw.fee.card) / 100 : 0;
  const personLabel = (x) => (x.mode === "same" ? `${customerName(cust) || "The customer"} (customer)` : x.mode === "existing" ? learnerName(data.byId.learner[x.id]) : `${x.first} ${x.last}`.trim());
  const lineLabel = (l) => {
    const c = data.byId.course[l.courseId];
    const k = data.byId.cohort[l.cohortId];
    return { title: c?.title || "Choose a course", when: isOnline(c) ? methodName("self-paced") : k ? `${shortDay(k.first)}${k.last !== k.first ? ` to ${shortDay(k.last)}` : ""}` : "", plan: l.plan ? pw.tiers.find((t) => t.key === l.plan)?.label : "" };
  };

  const summary = (
    <aside className="rt-acc__card rt-pws-ord__summary" aria-labelledby="rt-pws-ord-sum-h">
      <h2 className="rt-acc__h2" id="rt-pws-ord-sum-h">Order summary</h2>
      <ul className="rt-adm-list">
        {lines.map((l) => {
          const x = lineLabel(l);
          return (
            <li key={l.key}>
              <div><span className="rt-adm-strong">{x.title}</span><small>{[x.when, x.plan, `${l.people.length} × ${formatPrice(Number(l.price) || 0)}`].filter(Boolean).join(" · ")}</small></div>
              <span className="rt-pws-money__num">{formatPrice(payment === "free" ? 0 : (Number(l.price) || 0) * l.people.length)}</span>
            </li>
          );
        })}
      </ul>
      <dl className="rt-pws-ord__totals">
        <div><dt>Places</dt><dd>{places}</dd></div>
        <div><dt>Subtotal</dt><dd className="rt-pws-money__num">{formatPrice(subtotal)}</dd></div>
        {payment === "free" && <div><dt>Booked for free</dt><dd className="rt-pws-money__num">−{formatPrice(subtotal)}</dd></div>}
        <div><dt>Transaction fee ({["card", "link"].includes(payment) ? pw.fee.card : 0}%)</dt><dd className="rt-pws-money__num">{formatPrice(fee)}</dd></div>
        <div><dt>Platform fee</dt><dd className="rt-pws-money__num">{formatPrice(0)}</dd></div>
        <div className="-total"><dt>Total (GBP)</dt><dd className="rt-pws-money__num">{formatPrice(total)}</dd></div>
      </dl>
      <p className="rt-acc__note">Prices include VAT where you charge it. The transaction fee comes out of your earning; the customer pays the total.</p>
    </aside>
  );

  if (step === "review") {
    return (
      <div className="rt-pws-ord__layout">
        <div className="rt-acc__stack">
          <section className="rt-acc__card" aria-labelledby="rt-pws-ord-r1">
            <div className="rt-acc__cardhead rt-pws-ord__rhead"><h2 className="rt-acc__h2" id="rt-pws-ord-r1">Customer</h2><button type="button" className="rt-pws-ord__change" onClick={() => change("rt-pws-ord-s1")}>Change<span className="rt-sr"> the customer</span></button></div>
            <dl className="rt-adm-dl">
              <div><dt>Name</dt><dd>{customerName(cust)}{cust.company && `, ${cust.company}`}</dd></div>
              <div><dt>Contact</dt><dd>{cust.email}<br />{cust.phone}</dd></div>
              <div><dt>Address</dt><dd>{[cust.address, cust.city, cust.postcode.toUpperCase()].filter(Boolean).join(", ")}</dd></div>
            </dl>
          </section>
          <section className="rt-acc__card" aria-labelledby="rt-pws-ord-r2">
            <div className="rt-acc__cardhead rt-pws-ord__rhead"><h2 className="rt-acc__h2" id="rt-pws-ord-r2">Courses and learners</h2><button type="button" className="rt-pws-ord__change" onClick={() => change("rt-pws-ord-s2")}>Change<span className="rt-sr"> the courses and learners</span></button></div>
            {lines.map((l) => {
              const x = lineLabel(l);
              return (
                <div key={l.key} className="rt-adm-line">
                  <div className="rt-adm-line__top">
                    <div><strong>{x.title}</strong><small>{[x.when, x.plan].filter(Boolean).join(" · ")}</small></div>
                    <div className="rt-adm-line__price"><strong>{formatPrice((Number(l.price) || 0) * l.people.length)}</strong><small>{l.people.length} × {formatPrice(Number(l.price) || 0)}</small></div>
                  </div>
                  <ul className="rt-pws-ord__people">{l.people.map((p) => <li key={p.key}>{personLabel(p)}</li>)}</ul>
                </div>
              );
            })}
          </section>
          <section className="rt-acc__card" aria-labelledby="rt-pws-ord-r3">
            <div className="rt-acc__cardhead rt-pws-ord__rhead"><h2 className="rt-acc__h2" id="rt-pws-ord-r3">Payment</h2><button type="button" className="rt-pws-ord__change" onClick={() => change("rt-pws-ord-s3")}>Change<span className="rt-sr"> the payment</span></button></div>
            <dl className="rt-adm-dl">
              <div><dt>How</dt><dd>{pw.payments[payment].label}<small className="rt-pws-ord__dd-note">{pw.payments[payment].hint}</small></dd></div>
              <div><dt>Emails</dt><dd>{[receipt && "Receipt to the customer", joining && "Joining instructions to each learner"].filter(Boolean).join(". ") || "None"}</dd></div>
            </dl>
          </section>
          <div className="rt-pws-ord__actions">
            <button type="button" className="button -md -purple-1 text-white" onClick={place} disabled={busy} aria-busy={busy || undefined}>{busy ? "Placing order…" : payment === "link" ? "Place order and send link" : "Place order"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setStep("edit")} disabled={busy}>Back to edit</button>
          </div>
        </div>
        {summary}
      </div>
    );
  }

  const custMatches = matchPeople(known, custFind, customerName);
  const err = (id) => errors[id];

  return (
    <form className="rt-pws-ord__layout" onSubmit={review} noValidate ref={formRef}>
      <div className="rt-acc__stack">
        {/* 1. customer */}
        <section className="rt-acc__card" id="rt-pws-ord-s1" aria-labelledby="rt-pws-ord-h1">
          <h2 className="rt-acc__h2 rt-pws-ord__step" id="rt-pws-ord-h1"><span aria-hidden="true">1</span>Customer</h2>
          <p className="rt-acc__note">The person or company paying. They get the receipt.</p>
          {custMode === "find" ? (
            <div className="rt-pws-ord__find">
              <Field id="c-find" label="Find a customer" hint="Type at least 2 letters of their name or email." type="search" value={custFind} onChange={(e) => setCustFind(e.target.value)} error={err("c-find")} autoComplete="off" />
              {custFind.trim().length >= 2 && (
                <div aria-live="polite">
                  {custMatches.length ? (
                    <ul className="rt-pws-ord__matches">
                      {custMatches.map((p) => (
                        <li key={p.email}>
                          <button type="button" onClick={() => { setCust({ ...emptyCustomer, ...p }); setCustMode("details"); setErrors({}); }}>
                            <strong>{customerName(p)}</strong><span>{p.email}{p.company && ` · ${p.company}`}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="rt-acc__note">No customer matches. Add them as a new customer.</p>}
                </div>
              )}
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setCust({ ...emptyCustomer, email: EMAIL.test(custFind.trim()) ? custFind.trim() : "" }); setCustMode("details"); setErrors({}); }}>New customer</button>
            </div>
          ) : (
            <>
              <div className="rt-pws-ord__grid">
                {CUSTOMER_FIELDS.map((f) => (
                  <Field key={f.key} id={`c-${f.key}`} label={f.label} hint={f.hint} type={f.type || "text"} autoComplete={f.auto} value={cust[f.key]} onChange={(e) => setCust((c) => ({ ...c, [f.key]: e.target.value }))} error={err(`c-${f.key}`)} wide={f.wide} />
                ))}
              </div>
              <button type="button" className="rt-pws-ord__change rt-adm-mt" onClick={() => { setCustMode("find"); setCust(emptyCustomer); }}>Change customer</button>
            </>
          )}
        </section>

        {/* 2. courses and learners */}
        <section className="rt-acc__card" id="rt-pws-ord-s2" aria-labelledby="rt-pws-ord-h2">
          <h2 className="rt-acc__h2 rt-pws-ord__step" id="rt-pws-ord-h2"><span aria-hidden="true">2</span>Courses and learners</h2>
          <p className="rt-acc__note">Add each course with the people going on it. A company can book several people at once.</p>
          {!courses.length && <p className="rt-adm-item__block">You have no live courses yet. A course can be booked once our team has approved it.</p>}
          <ol className="rt-pws-ord__lines">
            {lines.map((l, i) => {
              const p = `l${i}`;
              const c = data.byId.course[l.courseId];
              const pack = packFor(c);
              const ks = c ? cohortsFor(c.id) : [];
              const max = maxFor(l);
              const fmt = c ? pw.formats.find((f) => f.key === c.format) : null;
              return (
                <li key={l.key} className="rt-pws-ord__line">
                  <div className="rt-pws-ord__linehead">
                    <h3 className="rt-adm-h3">Course {i + 1}</h3>
                    <div className="rt-adm-cellrow">
                      <button type="button" className="rt-pws-ord__change" onClick={() => copyLine(l)}>Copy this course</button>
                      {lines.length > 1 && <button type="button" className="rt-pws-ord__change rt-adm-danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Remove<span className="rt-sr"> course {i + 1}</span></button>}
                    </div>
                  </div>
                  <div className="rt-pws-ord__grid">
                    <Select id={`${p}-course`} label="Course" error={err(`${p}-course`)} value={l.courseId} onChange={(value) => setLine(l.key, { courseId: value, cohortId: "", plan: "", priceTouched: false })} hint={fmt ? methodName(fmt.key) : undefined} placeholder="Choose a course" options={courses.map((x) => ({ value: x.id, label: x.title }))} />
                    {c && !isOnline(c) && (
                      <Select id={`${p}-cohort`} label="Dates" error={err(`${p}-cohort`)} value={l.cohortId} onChange={(value) => setLine(l.key, { cohortId: value })} placeholder={ks.length ? "Choose the dates" : "No dates with places left"} options={ks.map((k) => ({ value: k.id, label: `${shortDay(k.first)}${k.last !== k.first ? ` to ${shortDay(k.last)}` : ""} · ${k.venue ? k.venue.city : "Online"} · ${k.left} left` }))} />
                    )}
                    {pack && (
                      <Select id={`${p}-plan`} label="Plan" error={err(`${p}-plan`)} value={l.plan} onChange={(value) => setLine(l.key, { plan: value })} placeholder="Choose a plan" options={pw.tiers.map((t) => ({ value: t.key, label: `${t.label}: ${formatPrice(pack.tiers[t.key].price)}` }))} />
                    )}
                    {c && payment !== "free" && (
                      <Field id={`${p}-price`} label="Price per place (£)" hint={l.priceTouched ? `List price ${formatPrice(Number(listPrice(l)) || 0)}.` : "Filled in from the course. Change it for a discount."} type="number" inputMode="decimal" min="0" step="0.01" autoComplete="off" value={l.price} onChange={(e) => setLine(l.key, { price: e.target.value, priceTouched: true })} error={err(`${p}-price`)} />
                    )}
                  </div>

                  <fieldset className="rt-pws-ord__learners" aria-describedby={err(`${p}-people`) ? `${p}-people-e` : undefined}>
                    <legend className="rt-adm-h3">Learners</legend>
                    {err(`${p}-people`) && <p className="rt-q__err" id={`${p}-people-e`}><span className="rt-sr">Error: </span>{err(`${p}-people`)}</p>}
                    <ol className="rt-pws-ord__plist">
                      {l.people.map((x, j) => {
                        const q = `${p}-p${j}`;
                        const found = x.mode === "existing" && x.id ? data.byId.learner[x.id] : null;
                        const lm = x.mode === "existing" && !x.id ? matchPeople(data.learners, x.find, learnerName) : [];
                        return (
                          <li key={x.key} className="rt-pws-ord__person">
                            <div className="rt-pws-ord__personhead">
                              <span className="rt-adm-strong">Learner {j + 1}</span>
                              {l.people.length > 1 && <button type="button" className="rt-pws-ord__change rt-adm-danger" onClick={() => removePerson(l.key, x.key)}>Remove<span className="rt-sr"> learner {j + 1}</span></button>}
                            </div>
                            {j === 0 && (
                              <label className="rt-fp__opt rt-pws-ord__same">
                                <input type="checkbox" className="rt-fp__check" checked={x.mode === "same"} onChange={(e) => setPerson(l.key, x.key, { mode: e.target.checked ? "same" : "new" })} />
                                <span>Same as the customer</span>
                              </label>
                            )}
                            {x.mode === "same" && err(`${q}-same`) && <p className="rt-q__err"><span className="rt-sr">Error: </span>{err(`${q}-same`)}</p>}
                            {x.mode !== "same" && (
                              <>
                                <div className="rt-adm-seg rt-pws-ord__seg" role="group" aria-label={`Learner ${j + 1}`}>
                                  <button type="button" className={x.mode === "existing" ? "is-on" : ""} aria-pressed={x.mode === "existing"} onClick={() => setPerson(l.key, x.key, { mode: "existing" })}>Booked with you before</button>
                                  <button type="button" className={x.mode === "new" ? "is-on" : ""} aria-pressed={x.mode === "new"} onClick={() => setPerson(l.key, x.key, { mode: "new", id: "" })}>New learner</button>
                                </div>
                                {x.mode === "existing" && (found ? (
                                  <p className="rt-pws-ord__picked"><span><strong>{learnerName(found)}</strong> {found.email}</span><button type="button" className="rt-pws-ord__change" onClick={() => setPerson(l.key, x.key, { id: "", find: "" })}>Change<span className="rt-sr"> learner {j + 1}</span></button></p>
                                ) : (
                                  <>
                                    <Field id={`${q}-find`} label="Find the learner" hint="Type at least 2 letters of their name or email." type="search" autoComplete="off" value={x.find} onChange={(e) => setPerson(l.key, x.key, { find: e.target.value })} error={err(`${q}-find`)} />
                                    {x.find.trim().length >= 2 && (
                                      <div aria-live="polite">
                                        {lm.length ? (
                                          <ul className="rt-pws-ord__matches">
                                            {lm.map((m) => <li key={m.id}><button type="button" onClick={() => setPerson(l.key, x.key, { id: m.id })}><strong>{learnerName(m)}</strong><span>{m.email}{m.company && ` · ${m.company}`}</span></button></li>)}
                                          </ul>
                                        ) : <p className="rt-acc__note">No learner matches. Add them as a new learner.</p>}
                                      </div>
                                    )}
                                  </>
                                ))}
                                {x.mode === "new" && (
                                  <div className="rt-pws-ord__grid">
                                    <Field id={`${q}-first`} label="First name" autoComplete="off" value={x.first} onChange={(e) => setPerson(l.key, x.key, { first: e.target.value })} error={err(`${q}-first`)} />
                                    <Field id={`${q}-last`} label="Last name" autoComplete="off" value={x.last} onChange={(e) => setPerson(l.key, x.key, { last: e.target.value })} error={err(`${q}-last`)} />
                                    <Field id={`${q}-email`} label="Email" type="email" autoComplete="off" value={x.email} onChange={(e) => setPerson(l.key, x.key, { email: e.target.value })} error={err(`${q}-email`)} />
                                    <Field id={`${q}-phone`} label="Phone (optional)" type="tel" autoComplete="off" value={x.phone} onChange={(e) => setPerson(l.key, x.key, { phone: e.target.value })} error={err(`${q}-phone`)} />
                                  </div>
                                )}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                    <div className="rt-adm-cellrow">
                      <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => addPerson(l.key)} disabled={l.people.length >= max}>Add a learner</button>
                      {c && <span className="rt-adm-muted">{isOnline(c) ? "Each learner gets their own access." : l.cohortId ? `${max} ${max === 1 ? "place" : "places"} left on these dates.` : "Choose the dates to see the places left."}</span>}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setLines((ls) => [...ls, newLine()])}>Add another course</button>
        </section>

        {/* 3. payment */}
        <section className="rt-acc__card" id="rt-pws-ord-s3" aria-labelledby="rt-pws-ord-h3">
          <h2 className="rt-acc__h2 rt-pws-ord__step" id="rt-pws-ord-h3"><span aria-hidden="true">3</span>Payment</h2>
          <Choice name="rt-pws-ord-pay" legend="How is this order paid?" value={payment} onChange={setPayment} options={Object.entries(pw.payments).map(([value, x]) => ({ value, label: x.label }))} />
          <p className="rt-acc__note rt-pws-ord__payhint">{pw.payments[payment].hint}</p>
          {payment === "card" && <p className="rt-adm-item__reason"><i className="icon-check text-12" aria-hidden="true"></i> Card details are taken by our payment partner's secure form after you place the order. They are never typed or stored here.</p>}
          <div className="rt-adm-checks rt-adm-mt">
            <Toggle id="rt-pws-ord-receipt" checked={receipt} onChange={setReceipt} label="Email a receipt to the customer" />
            <Toggle id="rt-pws-ord-joining" checked={joining} onChange={setJoining} label="Email joining instructions to each learner" hint="With the dates, venue or joining link, and what to bring." />
          </div>
        </section>

      </div>
      {summary}
      {/* after the summary, so on a narrow screen the person sees the total before reviewing; beside it on a wide one */}
      <div className="rt-pws-ord__actions">
        <button type="submit" className="button -md -purple-1 text-white">Review order</button>
      </div>
    </form>
  );
}
