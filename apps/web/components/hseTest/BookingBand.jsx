import React from "react";
import { Eyebrow, IconCheck } from "@/components/marketing/parts";
import { BookTestButton } from "./TestBooking";
import { HSE_PRICE, hseTest } from "@/data/hseTest";
import { formatPrice } from "@/lib/format";

// "Book with us": the dark band (as the licence pages' "we apply for you" band): what we do on the left, the price panel with what
// it includes and the booking button on the right. `centre` preselects a centre in the booking form (a centre's page).
export default function BookingBand({ centre }) {
  const b = hseTest.booking;
  return (
    <section className="fb-section -dark" id="book" aria-labelledby="rt-ht-book-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow dark>{b.eyebrow}</Eyebrow>
            <h2 className="fb-title -onDark" id="rt-ht-book-h">{b.title}</h2>
            <p className="fb-lede -onDark">{b.text}</p>
          </div>
          <div className="fb-credit rt-lic__panel">
            <div className="fb-credit__head">
              <div><span className="fb-credit__label">{b.priceLabel}</span><b>{b.priceNote}</b></div>
              <strong className="rt-lic__price">{formatPrice(HSE_PRICE)}</strong>
            </div>
            <ul className="rt-lic__panelticks">
              {b.includes.map((x) => <li key={x}><span className="fb-ticks__icon"><IconCheck /></span>{x}</li>)}
            </ul>
            <BookTestButton centre={centre} className="button -md -purple-1 text-white rt-btn-block">{b.cta}</BookTestButton>
            <p className="fb-credit__note">{b.selfNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
