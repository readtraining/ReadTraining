import React from "react";
import { TEAM } from "@/lib/teamTraining";

// The four trust points (site-wide facts, not course data), as home's benefit cards (.rt-benefit-card) with icon-font glyphs.
const ITEMS = [
  { icon: "icon-save-money", title: "No booking fee", text: "We provide our services without any additional charges." },
  { icon: "icon-badge", title: "Approved providers only", text: "All courses on our platform undergo thorough manual screening to ensure the utmost quality." },
  { icon: "icon-friend", title: TEAM.trust.title, text: TEAM.trust.text },
  { icon: "icon-document", title: "Pay by invoice", text: "Choose \"Business Customer\" at checkout for access to this payment method." },
];

export default function TrustBoxes() {
  return (
    <section className="rt-cd__sec" aria-label="Why book with us">
      <ul className="rt-benefit-grid rt-cd__benefits">
        {ITEMS.map((i) => (
          <li key={i.title} className="rt-benefit-card">
            <span className="rt-benefit__icon" aria-hidden="true"><i className={`${i.icon} text-16`}></i></span>
            <div className="rt-benefit__title mt-15">{i.title}</div>
            <div className="rt-benefit__text">{i.text}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
