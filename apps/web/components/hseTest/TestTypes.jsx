import React from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/marketing/parts";
import { hseTest } from "@/data/hseTest";
import { cardsForTest } from "@/lib/hseTest";

// "Which test do I need?": the three tests as cards, each with who it is for and the CSCS cards it leads to (from the CSCS card
// guide's data), then a link to the card guide.
export default function TestTypes() {
  const t = hseTest.types;
  return (
    <section className="fb-section -lavender" id="types" aria-labelledby="rt-ht-types-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-ht-types-h">{t.title}</h2>
          <p className="fb-lede">{t.text}</p>
        </div>
        <ul className="rt-ht__types">
          {t.items.map((x) => {
            const cards = cardsForTest(x.match);
            return (
              <li key={x.key} className="rt-ht__type">
                <h3 className="rt-ht__typeName">{x.name}</h3>
                <p className="rt-ht__typeWho">{x.who}</p>
                {cards.length > 0 && (
                  <>
                    <span className="rt-ht__typeLabel">{t.unlocks}</span>
                    <ul className="rt-ht__cards">
                      {cards.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <div className="fb-actions -center">
          <Link href={t.guide.href} className="button -md -outline-purple-1 text-purple-1">{t.guide.label}</Link>
        </div>
      </div>
    </section>
  );
}
