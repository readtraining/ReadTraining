"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { getWallet } from "@/lib/account";
import { formatDate, formatPrice } from "@/lib/format";

const copy = account.wallet;

// Wallet (the client's "User wallet"): the credit balance, how to spend it (the checkout's "Use my wallet balance"), every
// transaction with the running balance (refunds to the wallet, goodwill or gift credit, money spent on orders) and how wallet
// credit works. Simulated until accounts exist.
export default function AccountWallet() {
  const [wallet, setWallet] = useState(null);
  useEffect(() => setWallet(getWallet()), []);
  if (!wallet) return null;

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-acc__wallet" aria-labelledby="rt-wl-h">
        <div>
          <h2 className="rt-acc__eyebrow" id="rt-wl-h">{copy.balance}</h2>
          <p className="rt-acc__walletamt">{formatPrice(wallet.balance)}</p>
          <p className="rt-acc__note">{copy.use}</p>
        </div>
        <Link href={account.dashboard.next.cta.href} className="button -md -purple-1 text-white">{account.dashboard.next.cta.label}</Link>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-wl-tx-h">
        <h2 className="rt-acc__h2" id="rt-wl-tx-h">{copy.history}</h2>
        {wallet.transactions.length ? (
          <table className="rt-biz__table">
            <thead><tr>{copy.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {wallet.transactions.map((t) => (
                <tr key={t.id}>
                  <td data-label={copy.columns[0]}>{formatDate(t.date)}</td>
                  <td data-label={copy.columns[1]}>{t.label}</td>
                  <td data-label={copy.columns[2]}><b className={t.amount > 0 ? "rt-acc__credit" : undefined}>{t.amount > 0 ? "+" : "−"}{formatPrice(Math.abs(t.amount))}</b></td>
                  <td data-label={copy.columns[3]}>{formatPrice(t.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rt-acc__empty">{copy.none}</p>
        )}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-wl-how-h">
        <h2 className="rt-acc__h2" id="rt-wl-how-h">{copy.how.title}</h2>
        <ul className="rt-bk__trust rt-acc__howlist">
          {copy.how.items.map((t) => <li key={t}><span className="fb-ticks__icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}
