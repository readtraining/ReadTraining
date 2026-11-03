"use client";

import React, { useEffect, useState } from "react";
import { account } from "@/data/account";
import { cardExpired, getCards, removeCard, setDefaultCard } from "@/lib/account";
import { EmptyState } from "@/components/states/States";

const copy = account.payments;

// Payment methods (the client's "Payment methods"): the saved cards (brand, last 4 digits, expiry, the default one), with Make
// default and Remove. A card is never typed in here: it is saved in the payment provider's secure form when online payment opens
// (Milestone 4), and the provider keeps it; we keep only its brand, last 4 digits and expiry. Until then the cards are the demo's.
export default function AccountPayments() {
  const [cards, setCards] = useState(null);
  const [announce, setAnnounce] = useState("");
  useEffect(() => setCards(getCards()), []);
  if (!cards) return null;

  const reload = (msg) => {
    setCards(getCards());
    setAnnounce(msg);
  };

  return (
    <div className="rt-acc__stack">
      {announce && <p className="rt-acc__banner -done" role="status">{announce}</p>}
      <section className="rt-acc__card" aria-labelledby="rt-pm-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-pm-h">Saved cards</h2>
        </div>
        <p className="rt-acc__note">{copy.soon}</p>
        {cards.length ? (
          <ul className="rt-acc__cards">
            {cards.map((c) => {
              const expired = cardExpired(c.exp);
              return (
                <li key={c.id} className={c.default ? "is-default" : undefined}>
                  <span className="rt-acc__cardmark" aria-hidden="true">{{ Visa: "VISA", Mastercard: "MC", "American Express": "AMEX" }[c.brand] || "CARD"}</span>
                  <div className="rt-acc__cardinfo">
                    <b>{c.brand} ending {c.last4}</b>
                    <span>{(expired ? copy.expired : copy.expires).replace("{date}", c.exp)} · {c.name}</span>
                  </div>
                  <div className="rt-acc__cardactions">
                    {c.default ? <span className="rt-pill rt-acc__status -confirmed">{copy.default}</span> : <button type="button" className="fb-textlink rt-biz__linkbtn" onClick={() => { setDefaultCard(c.id); reload(`${c.brand} ending ${c.last4} is now your default card.`); }}>{copy.makeDefault}<span className="rt-sr"> {c.brand} ending {c.last4}</span></button>}
                    <button type="button" className="rt-biz__remove" onClick={() => { removeCard(c.id); reload(copy.removed.replace("{last4}", c.last4)); }}>{copy.remove}<span className="rt-sr"> {c.brand} ending {c.last4}</span></button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState inCard title={copy.none.text} />
        )}
      </section>
    </div>
  );
}
