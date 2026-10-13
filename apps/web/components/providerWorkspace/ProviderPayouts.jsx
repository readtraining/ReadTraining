"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { customerName, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { Empty, Loading, Pill, Stats, getQuery, setQuery, shortDay } from "./providerParts";
import { RangeControl, inRange, rangeBounds } from "./moneyParts";

// What we have paid into the provider's bank account and what is on its way: four numbers, the payout account (or a prompt to add
// one), and the payouts with a date range. Opening a payout lists the orders in it with what each earned.
const PAYOUT_TONE = { paid: "ok", transit: "info" };
const SUFFIX = ["th", "st", "nd", "rd"];
const ordinal = (n) => `${n}${SUFFIX[((n % 100) - 20) % 10] || SUFFIX[n % 100] || SUFFIX[0]}`;

export default function ProviderPayouts() {
  const data = useProvider();
  const [range, setRange] = useState({ range: "all", from: "", to: "" });
  const [openId, setOpenId] = useState(null);
  useEffect(() => {
    setRange({ range: getQuery("range") || "all", from: getQuery("from") || "", to: getQuery("to") || "" });
  }, []);
  if (!data) return <Loading rows={2} stats />;

  const year = new Date().getUTCFullYear();
  const paid = data.payouts.filter((p) => p.status === "paid");
  const transit = data.payouts.filter((p) => p.status === "transit");
  const inAny = new Set(data.payouts.flatMap((p) => p.orders));
  const waiting = data.orders.filter((o) => o.money.net && !inAny.has(o.ref)).reduce((t, o) => t + o.money.net, 0);
  const next = transit.map((p) => p.date).sort()[0];
  const stats = [
    { icon: "icon-save-money", value: formatPrice(paid.filter((p) => p.date.startsWith(String(year))).reduce((t, p) => t + p.amount, 0)), label: `Paid out in ${year}` },
    { icon: "icon-wall-clock", value: formatPrice(transit.reduce((t, p) => t + p.amount, 0)), label: "On its way" },
    { icon: "icon-calendar", value: next ? shortDay(next) : "None due", label: "Next payout" },
    { icon: "icon-basket", value: formatPrice(waiting), label: "Earned, not yet in a payout" },
  ];
  const bounds = rangeBounds(range.range, range.from, range.to);
  const list = data.payouts.filter((p) => inRange(Date.parse(`${p.date}T12:00:00Z`), bounds));
  const acct = data.org.payout;
  const setRangeQ = (r) => {
    setRange(r);
    setQuery("range", r.range === "all" ? "" : r.range);
    setQuery("from", r.range === "custom" ? r.from : "");
    setQuery("to", r.range === "custom" ? r.to : "");
  };

  return (
    <div className="rt-acc__stack">
      <Stats items={stats} label="Payouts" />

      {acct.connected ? (
        <section className="rt-acc__card rt-pws-money__acct" aria-labelledby="rt-pws-po-acct">
          <div>
            <h2 className="rt-acc__h2" id="rt-pws-po-acct">Payout account</h2>
            <p className="rt-acc__note">{acct.holder} · sort code {acct.sort} · account ending {acct.last4}</p>
          </div>
          <Link href="/provider/settings?tab=payouts" className="button -sm -outline-purple-1 text-purple-1">Change</Link>
        </section>
      ) : (
        <section className="rt-acc__card rt-pws-money__alert rt-pws-money__acct" aria-labelledby="rt-pws-po-acct">
          <div>
            <h2 className="rt-acc__h2" id="rt-pws-po-acct">Add your bank details to get paid</h2>
            <p className="rt-acc__note">Your earnings are kept safe until you do. We pay into a UK business bank account.</p>
          </div>
          <Link href="/provider/settings?tab=payouts" className="button -sm -purple-1 text-white">Add bank details</Link>
        </section>
      )}

      <p className="rt-acc__note rt-adm-help"><i className="icon-calendar text-12" aria-hidden="true"></i> We pay on the {ordinal(pw.fee.payoutDay)} of each month for courses that took place the month before. On-demand courses are paid the month after they are bought.</p>

      <div className="rt-adm-toolbar">
        <RangeControl id="rt-pws-po-range" {...range} value={range.range} onChange={setRangeQ} />
      </div>

      {!data.payouts.length ? (
        <Empty title="No payouts yet" text="Your first payout appears here once a course you have sold has taken place." />
      ) : list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-money__payouts">
            <thead>
              <tr><th scope="col">Payout</th><th scope="col">Date</th><th scope="col">Orders</th><th scope="col" className="rt-pws-money__right">Amount</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const isOpen = openId === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr>
                      <td data-label="Payout">
                        <button type="button" className="rt-pws-money__toggle" aria-expanded={isOpen} aria-controls={`rt-pws-po-${p.id}`} onClick={() => setOpenId(isOpen ? null : p.id)} disabled={!p.orders.length}>
                          <i className={`icon-chevron-${isOpen ? "up" : "down"} text-11`} aria-hidden="true"></i>{p.id}<span className="rt-sr"> orders</span>
                        </button>
                      </td>
                      <td data-label="Date">{shortDay(p.date)}</td>
                      <td data-label="Orders">{p.orders.length}</td>
                      <td data-label="Amount" className="rt-pws-money__num rt-pws-money__right">{formatPrice(p.amount)}</td>
                      <td data-label="Status"><Pill tone={PAYOUT_TONE[p.status]}>{pw.payoutStatuses[p.status]}</Pill></td>
                    </tr>
                    {isOpen && (
                      <tr className="rt-pws-money__detail" id={`rt-pws-po-${p.id}`}>
                        <td colSpan={5}>
                          <ul className="rt-adm-list">
                            {p.orders.map((ref) => {
                              const o = data.orders.find((x) => x.ref === ref);
                              return (
                                <li key={ref}>
                                  <div><Link href={`/provider/orders/${ref}`} className="rt-adm-strong">{ref}</Link><small>{customerName(o.customer)} · {data.byId.course[o.lines[0].courseId]?.title}</small></div>
                                  <span className="rt-pws-money__num">{formatPrice(o.money.net)}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No payouts in these dates.</p>
      )}
    </div>
  );
}
