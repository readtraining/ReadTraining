"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContextElement } from "@/context/Context";
import { basket as basketCopy } from "@/data/basket";
import { checkout as copy } from "@/data/checkout";
import { basketIssues, basketTotals, isSelected, lineKey, lineParts, modeLabel, promoFor } from "@/lib/basket";
import { getWallet, saveBooking, spendWallet } from "@/lib/account";
import { ORDER_KEY, PAY_FAILED_KEY, placeOrder, validCardNumber, validExpiry, validPostcode } from "@/lib/checkout";
import { formatDateRange, formatPrice } from "@/lib/format";
import BasketSteps from "@/components/basket/BasketSteps";
import CheckoutSummary, { CheckoutMiniSummary } from "./CheckoutSummary";
import { focusFirstError } from "@/lib/focusFirstError";

const FORM_ID = "rt-ck-form";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY = { type: "individual", firstName: "", lastName: "", email: "", phone: "", company: "", po: "", line1: "", line2: "", city: "", postcode: "", method: "card", cardNumber: "", expiry: "", cvc: "", cardName: "" };
const NO_DELEGATE = { firstName: "", lastName: "", email: "", me: false };
const digits = (v) => v.replace(/\D/g, "");
const when = (item) => (item.mode === "ondemand" ? item.time : formatDateRange(item.date, item.endDate));
const where = (item) => (item.venue ? `${item.venue}, ${item.city}` : modeLabel(item.mode));

function validate(v, delegateList, delegates) {
  const e = {};
  if (!v.firstName.trim()) e.firstName = "Enter your first name.";
  if (!v.lastName.trim()) e.lastName = "Enter your last name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
  if (digits(v.phone).length < 10) e.phone = "Enter a phone number, like 07700 900 982.";
  if (v.type === "business" && !v.company.trim()) e.company = "Enter your company name.";
  if (!v.line1.trim()) e.line1 = "Enter the first line of your address.";
  if (!v.city.trim()) e.city = "Enter your town or city.";
  if (!v.postcode.trim()) e.postcode = "Enter your postcode.";
  else if (!validPostcode(v.postcode)) e.postcode = "Enter a real postcode, like SW1A 1AA.";
  delegateList.forEach(({ key, n, title }) => {
    const d = delegates[key] || NO_DELEGATE;
    if (d.me) return;
    const who = `delegate ${n} on ${title}`;
    if (!d.firstName.trim()) e[`d-${key}-firstName`] = `Enter the first name of ${who}.`;
    if (!d.lastName.trim()) e[`d-${key}-lastName`] = `Enter the last name of ${who}.`;
    if (!d.email.trim()) e[`d-${key}-email`] = `Enter the email address of ${who}.`;
    else if (!EMAIL_RE.test(d.email.trim())) e[`d-${key}-email`] = `Enter the email address of ${who} in the correct format.`;
  });
  if (v.method === "card") {
    if (!digits(v.cardNumber)) e.cardNumber = "Enter your card number.";
    else if (!validCardNumber(digits(v.cardNumber))) e.cardNumber = "Enter a valid card number.";
    if (!v.expiry.trim()) e.expiry = "Enter the card's expiry date.";
    else if (!validExpiry(v.expiry)) e.expiry = "Enter an expiry date in the future, like 08 / 28.";
    if (!/^\d{3,4}$/.test(v.cvc)) e.cvc = "Enter the 3 or 4 digit security code.";
    if (!v.cardName.trim()) e.cardName = "Enter the name on the card.";
  }
  return e;
}

// The checkout: the booking steps (Pay securely is the current one), then the form in cards (your details, billing address, who is
// attending, payment) beside the order summary. Only the courses ticked in the basket are booked; arriving with nothing ready to pay
// for sends people back to the basket. The GOV.UK form patterns, as the contact form: labels above the fields, "(optional)",
// checked on submit, a message under each field (the first field with one gets the focus) and
// "Error: " in the page title. Paid through lib/checkout.js (simulated); a declined card keeps everything entered. On success the
// order is kept for the confirmation page, the booked courses leave the basket and the confirmation opens.
export default function CheckoutPage() {
  const router = useRouter();
  const { cartCourses, setCartCourses } = useContextElement();
  const [ready, setReady] = useState(false);
  const [promo, setPromo] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [delegates, setDelegates] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | paying | declined | failed | done
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const formRef = useRef(null);
  const payErrorRef = useRef(null);
  const baseTitle = useRef("");

  useEffect(() => {
    try {
      setPromo(promoFor(window.sessionStorage.getItem("rt-promo")));
    } catch {}
    setWalletBalance(getWallet().balance);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^Error: /, "");
    document.title = Object.keys(errors).length ? `Error: ${baseTitle.current}` : baseTitle.current;
  }, [errors]);

  const lines = useMemo(() => cartCourses.filter(isSelected), [cartCourses]);
  const totals = basketTotals(lines, promo);
  // wallet credit (the account's Wallet), if ticked: it pays for all or part of the order; the rest is paid by card or Klarna
  const walletUse = useWallet ? Math.min(walletBalance, totals.total) : 0;
  const payable = Math.round((totals.total - walletUse) * 100) / 100;
  const method = payable === 0 ? "wallet" : values.method;
  const unfinished = basketIssues(lines).length > 0;
  // one entry per place: { key, n, title, first } (first = the first delegate on that course, who can be "me")
  const delegateList = useMemo(() => lines.flatMap((item) => Array.from({ length: Math.max(1, Number(item.quantity) || 1) }, (_, i) => ({ key: `${lineKey(item)}:${i}`, n: i + 1, title: item.title, first: i === 0 }))), [lines]);

  const set = (k, format) => (e) => {
    const value = format ? format(e.target.value) : e.target.value;
    setValues((v) => ({ ...v, [k]: value }));
  };
  const setDelegate = (key, patch) => setDelegates((all) => ({ ...all, [key]: { ...NO_DELEGATE, ...all[key], ...patch } }));
  const cardFormat = (v) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
  const expiryFormat = (v) => {
    const d = digits(v).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "paying") return;
    const found = validate({ ...values, method }, delegateList, delegates);
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus("idle");
      focusFirstError(formRef.current);
      return;
    }
    setStatus("paying");
    const booker = `${values.firstName.trim()} ${values.lastName.trim()}`;
    // who attends each course, by name ("This delegate is me" = the booker)
    const namesFor = (item) => delegateList.filter((d) => d.key.startsWith(`${lineKey(item)}:`)).map((d) => {
      const x = delegates[d.key] || NO_DELEGATE;
      return x.me ? booker : `${x.firstName.trim()} ${x.lastName.trim()}`;
    });
    try {
      const { reference } = await placeOrder({ ...values, payment: { method, cardNumber: digits(values.cardNumber), wallet: walletUse }, lines, delegates });
      const walletUsed = spendWallet(walletUse, reference);
      const order = {
        paid: true,
        at: Date.now(),
        reference,
        email: values.email.trim(),
        company: values.type === "business" ? values.company.trim() : "",
        method,
        walletUsed,
        total: totals.total,
        lines: lines.map((item) => ({
          title: item.title,
          when: when(item),
          where: where(item),
          provider: item.provider,
          total: basketTotals([item]).subtotal,
          delegates: namesFor(item),
        })),
      };
      // the booking, for the customer account (My bookings)
      saveBooking({
        reference,
        bookedAt: new Date().toISOString().slice(0, 10),
        method,
        walletUsed,
        status: "confirmed",
        total: totals.total,
        company: order.company,
        lines: lines.map((item) => {
          const { unit, total, quantity } = lineParts(item);
          return { courseId: item.id, title: item.title, slug: item.slug, imageSrc: item.imageSrc, mode: item.mode, date: item.date, endDate: item.endDate, time: item.time, venue: item.venue, city: item.city, postcode: item.postcode, provider: item.provider, quantity, unit, total, delegates: namesFor(item) };
        }),
      });
      try {
        window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
        window.sessionStorage.removeItem(PAY_FAILED_KEY);
        window.sessionStorage.removeItem("rt-promo");
      } catch {}
      setStatus("done");
      setCartCourses((list) => list.filter((i) => !isSelected(i))); // what was not ticked stays in the basket
      router.push("/checkout/confirmation");
    } catch (err) {
      try {
        window.sessionStorage.setItem(PAY_FAILED_KEY, JSON.stringify({ reason: err?.code || "failed", at: Date.now() }));
      } catch {}
      setStatus(err?.code === "card_declined" ? "declined" : "failed");
      requestAnimationFrame(() => payErrorRef.current?.focus());
    }
  };

  const field = (name, label, props = {}, hint) => {
    const id = `ck-${name}`;
    const describedBy = [hint && `${id}-hint`, errors[name] && `${id}-e`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
        {errors[name] && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{errors[name]}</p>}
        <input id={id} name={name} value={values[name]} onChange={set(name, props.format)} aria-invalid={errors[name] ? true : undefined} aria-describedby={describedBy} {...props} format={undefined} />
      </div>
    );
  };
  const delegateField = (key, name, label, props = {}) => {
    const id = `ck-d-${key}-${name}`.replace(/[^\w-]/g, "-");
    const err = errors[`d-${key}-${name}`];
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {err && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{err}</p>}
        <input id={id} value={(delegates[key] || NO_DELEGATE)[name]} onChange={(e) => setDelegate(key, { [name]: e.target.value })} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} {...props} />
      </div>
    );
  };

  const head = (
    <section className="rt-bk__head">
      <div className="container">
        <div className="rt-bk__headrow">
          <h1 className="rt-bk__h1">{copy.title}</h1>
          <Link href={copy.back.href} className="fb-textlink"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{copy.back.label}</Link>
        </div>
        <BasketSteps steps={basketCopy.steps} current={2} />
      </div>
    </section>
  );

  // nothing ready to pay for (a direct visit, an empty basket, or something still to finish there)
  if (ready && status !== "done" && (lines.length === 0 || unfinished)) {
    const msg = lines.length === 0 ? copy.empty : copy.unfinished;
    return (
      <>
        {head}
        <section className="rt-bk layout-pt-md layout-pb-lg">
          <div className="container">
            <div className="rt-bk__empty">
              <span className="rt-bk__emptyicon" aria-hidden="true"><i className="icon-basket text-24"></i></span>
              <h2>{msg.title}</h2>
              <p>{msg.text}</p>
              <Link href={msg.cta.href} className="button -md -purple-1 text-white">{msg.cta.label}</Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {head}
      <section className="rt-bk layout-pt-md layout-pb-lg" aria-label="Checkout">
        <div className="container">
          {ready && (
            <div className="rt-bk__layout">
              <form id={FORM_ID} className="rt-ck__form" onSubmit={onSubmit} noValidate ref={formRef}>
                <CheckoutMiniSummary lines={lines} totals={totals} />

                <section className="rt-ck__card" aria-labelledby="rt-ck-details-h">
                  <h2 className="rt-ck__h2" id="rt-ck-details-h"><span className="rt-ck__num" aria-hidden="true">1</span>{copy.details.title}</h2>
                  <fieldset className="rt-ck__fs">
                    <legend className="rt-sr">Who is paying</legend>
                    <div className="rt-bk__opts rt-ck__types">
                      {copy.details.types.map((t) => (
                        <label key={t.value} className={`rt-bk__opt${values.type === t.value ? " is-on" : ""}`}>
                          <input type="radio" name="type" value={t.value} checked={values.type === t.value} onChange={set("type")} />
                          <span><b>{t.label}</b><small>{t.note}</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="rt-ck__fields">
                    <div className="rt-contact__pair">
                      {field("firstName", "First name", { type: "text", autoComplete: "given-name" })}
                      {field("lastName", "Last name", { type: "text", autoComplete: "family-name" })}
                    </div>
                    <div className="rt-contact__pair">
                      {field("email", "Email address", { type: "email", autoComplete: "email", inputMode: "email", spellCheck: false }, "We send your confirmation here.")}
                      {field("phone", "Phone number", { type: "tel", autoComplete: "tel" }, "In case we need to reach you about the course.")}
                    </div>
                    {values.type === "business" && (
                      <div className="rt-contact__pair">
                        {field("company", "Company name", { type: "text", autoComplete: "organization" })}
                        {field("po", "Purchase order number (optional)", { type: "text", autoComplete: "off" })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rt-ck__card" aria-labelledby="rt-ck-address-h">
                  <h2 className="rt-ck__h2" id="rt-ck-address-h"><span className="rt-ck__num" aria-hidden="true">2</span>{copy.address.title}</h2>
                  <div className="rt-ck__fields">
                    {field("line1", "Address line 1", { type: "text", autoComplete: "address-line1" })}
                    {field("line2", "Address line 2 (optional)", { type: "text", autoComplete: "address-line2" })}
                    <div className="rt-contact__pair">
                      {field("city", "Town or city", { type: "text", autoComplete: "address-level2" })}
                      {field("postcode", "Postcode", { type: "text", autoComplete: "postal-code", autoCapitalize: "characters", spellCheck: false, className: "rt-ck__short" })}
                    </div>
                    <p className="rt-ck__country">Country: <strong>{copy.address.country}</strong></p>
                  </div>
                </section>

                <section className="rt-ck__card" aria-labelledby="rt-ck-del-h">
                  <h2 className="rt-ck__h2" id="rt-ck-del-h"><span className="rt-ck__num" aria-hidden="true">3</span>{copy.delegates.title}</h2>
                  <p className="rt-ck__lead">{copy.delegates.text}</p>
                  {lines.map((item) => (
                    <div key={lineKey(item)} className="rt-ck__course">
                      <h3 className="rt-ck__h3">{item.title}</h3>
                      <p className="rt-ck__meta">{when(item)} · {where(item)}</p>
                      {delegateList.filter((d) => d.key.startsWith(`${lineKey(item)}:`)).map((d) => {
                        const x = delegates[d.key] || NO_DELEGATE;
                        const meId = `ck-me-${d.key}`.replace(/[^\w-]/g, "-");
                        return (
                          <fieldset key={d.key} className="rt-ck__delegate">
                            <legend>Delegate {d.n}</legend>
                            {d.first && (
                              <label className="rt-bk__check rt-ck__me" htmlFor={meId}>
                                <input id={meId} type="checkbox" checked={x.me} onChange={(e) => setDelegate(d.key, { me: e.target.checked })} />
                                <span>{copy.delegates.me}</span>
                              </label>
                            )}
                            {x.me ? (
                              <p className="rt-ck__meis">{[`${values.firstName} ${values.lastName}`.trim(), values.email.trim()].filter(Boolean).join(", ") || "Your details above"}</p>
                            ) : (
                              <div className="rt-ck__fields">
                                <div className="rt-contact__pair">
                                  {delegateField(d.key, "firstName", "First name", { type: "text", autoComplete: "off" })}
                                  {delegateField(d.key, "lastName", "Last name", { type: "text", autoComplete: "off" })}
                                </div>
                                {delegateField(d.key, "email", "Email address", { type: "email", inputMode: "email", spellCheck: false, autoComplete: "off" })}
                              </div>
                            )}
                          </fieldset>
                        );
                      })}
                    </div>
                  ))}
                </section>

                <section className="rt-ck__card" aria-labelledby="rt-ck-pay-h">
                  <h2 className="rt-ck__h2" id="rt-ck-pay-h"><span className="rt-ck__num" aria-hidden="true">4</span>{copy.payment.title}</h2>
                  {(status === "declined" || status === "failed") && (
                    <div className="rt-ck__payerr" role="alert" tabIndex={-1} ref={payErrorRef}>
                      <h3>{status === "declined" ? "Payment declined" : "Payment not taken"}</h3>
                      <p>{status === "declined" ? copy.payment.declined : copy.payment.failed}</p>
                    </div>
                  )}
                  {walletBalance > 0 && (
                    <div className="rt-ck__wallet">
                      <label className="rt-bk__check" htmlFor="rt-ck-wallet">
                        <input id="rt-ck-wallet" type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
                        <span>{copy.payment.wallet.replace("{amount}", formatPrice(walletBalance))}</span>
                      </label>
                      {useWallet && <p className="rt-acc__note" role="status">{payable === 0 ? copy.payment.walletAll : copy.payment.walletPart.replace("{used}", formatPrice(walletUse)).replace("{rest}", formatPrice(payable))}</p>}
                    </div>
                  )}
                  {payable > 0 && (
                  <fieldset className="rt-ck__fs">
                    <legend className="rt-sr">How you want to pay</legend>
                    <div className="rt-bk__opts">
                      {copy.payment.methods.map((m) => (
                        <label key={m.value} className={`rt-bk__opt${values.method === m.value ? " is-on" : ""}`}>
                          <input type="radio" name="method" value={m.value} checked={values.method === m.value} onChange={set("method")} />
                          <span><b>{m.label}</b><small>{m.note}</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  )}
                  {method === "card" && (
                    <div className="rt-ck__fields rt-ck__cardfields">
                      {field("cardNumber", "Card number", { type: "text", inputMode: "numeric", autoComplete: "cc-number", spellCheck: false, format: cardFormat })}
                      <div className="rt-contact__pair">
                        {field("expiry", "Expiry date", { type: "text", inputMode: "numeric", autoComplete: "cc-exp", placeholder: "MM / YY", format: expiryFormat }, "As shown on the card, like 08 / 28.")}
                        {field("cvc", "Security code", { type: "text", inputMode: "numeric", autoComplete: "cc-csc", format: (v) => digits(v).slice(0, 4) }, "3 digits on the back, 4 on the front for Amex.")}
                      </div>
                      {field("cardName", "Name on card", { type: "text", autoComplete: "cc-name" })}
                    </div>
                  )}
                  <p className="rt-ck__terms">
                    {copy.terms.text} <Link href={copy.terms.links[0].href}>{copy.terms.links[0].label}</Link>, our <Link href={copy.terms.links[1].href}>{copy.terms.links[1].label}</Link> {copy.terms.provider}
                  </p>
                  <button type="submit" className="button -md -purple-1 text-white rt-ck__paybtn" disabled={status === "paying" || status === "done"} aria-busy={status === "paying"}>
                    {status === "paying" || status === "done" ? copy.paying : payable === 0 ? copy.complete : `${copy.pay} ${formatPrice(payable)}`}
                  </button>
                </section>
              </form>
              <CheckoutSummary lines={lines} totals={totals} promo={promo} walletUse={walletUse} payable={payable} formId={FORM_ID} paying={status === "paying" || status === "done"} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
