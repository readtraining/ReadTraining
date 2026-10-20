"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { getBookings } from "@/lib/account";
import { formatDate, formatPrice } from "@/lib/format";
import { EmptyState } from "@/components/states/States";

const copy = account.purchases;
const TONE = { paid: "completed", refunded: "cancelled", requested: "confirmed" };

// Purchase history (the client's "Purchase history"): every order, newest first, as a table (cards on phones): the order
// reference, when it was placed, its courses, what was paid and how (card, Klarna, wallet), and its status (Paid, Cancellation
// requested, Refunded). An order opens its booking, with the receipt to print.
export default function AccountPurchases() {
  const [orders, setOrders] = useState(null);
  useEffect(() => setOrders(getBookings().sort((a, b) => (a.bookedAt < b.bookedAt ? 1 : -1))), []);
  if (!orders) return null;
  if (!orders.length) {
    return (
      <EmptyState large icon="icon-document" headingLevel={2} title={copy.empty.title} text={copy.empty.text} action={{ href: account.dashboard.next.cta.href, label: account.dashboard.next.cta.label }} />
    );
  }
  const statusOf = (o) => (o.status === "cancelled" ? "refunded" : o.cancellation ? "requested" : "paid");
  const paidWith = (o) => [o.walletUsed ? copy.paidWith.wallet : null, o.method && !(o.method === "wallet") ? copy.paidWith[o.method] : null].filter(Boolean).join(" and ");

  return (
    <div className="rt-acc__card rt-biz__tablecard">
      <table className="rt-biz__table">
        <thead><tr>{copy.columns.map((c) => <th key={c} scope="col">{c}</th>)}<th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const s = statusOf(o);
            return (
              <tr key={o.reference}>
                <td data-label={copy.columns[0]}><b>{o.reference}</b></td>
                <td data-label={copy.columns[1]}>{formatDate(o.bookedAt)}</td>
                <td data-label={copy.columns[2]}>{o.lines[0].title}{o.lines.length > 1 && <small>+ {o.lines.length - 1} more</small>}</td>
                <td data-label={copy.columns[3]}><b>{formatPrice(o.total)}</b><small>{paidWith(o)}{s === "refunded" && o.refund ? ` · ${formatPrice(o.refund)} refunded` : ""}</small></td>
                <td data-label={copy.columns[4]}><span className={`rt-pill rt-acc__status -${TONE[s]}`}>{copy.status[s]}</span></td>
                <td className="rt-biz__act"><Link href={`/account/bookings/${o.reference}`} className="fb-textlink">{copy.view}<span className="rt-sr"> order {o.reference}</span></Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
