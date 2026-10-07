import React from "react";

// The four trust points shown on the live Hurak course page (site-wide facts, not course data).
// Icons are PNG files in /public/assets/icons/trust (decorative: alt=""); they keep their own colours.
const ITEMS = [
  { icon: "no-booking-fee", title: "No booking fee", text: "We provide our services without any additional charges." },
  { icon: "approved-providers", title: "Approved providers only", text: "All courses on our platform undergo thorough manual screening to ensure the utmost quality." },
  { icon: "buying-for-team", title: "Buying for your team?", text: "Purchase courses for your team, family or colleagues. Add a course, and provide student details at checkout." },
  { icon: "pay-by-invoice", title: "Pay by invoice", text: "Choose \"Business Customer\" at checkout for access to this payment method." },
];

export default function TrustBoxes() {
  return (
    <section className="rt-cd__sec rt-cd__trust" aria-label="Why book with us">
      <ul>
        {ITEMS.map((i) => (
          <li key={i.title}>
            <img className="rt-cd__ticon" src={`/assets/icons/trust/${i.icon}.png`} alt="" width={44} height={44} aria-hidden="true" />
            <h3>{i.title}</h3>
            <p>{i.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
