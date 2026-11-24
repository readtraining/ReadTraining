import React from "react";

// Why book with Read Training: the same heading and points on every course page (site-wide facts, not course data: the client's
// points, worded for every subject), as home's benefit cards (.rt-benefit-card) with icon-font glyphs.
const ITEMS = [
  { icon: "icon-global-search", title: "Compare in one place", text: "Prices, venues and dates from multiple approved providers, side by side." },
  { icon: "icon-badge", title: "Approved providers only", text: "Every provider and course is checked by our team before it is listed." },
  { icon: "icon-coupon", title: "Clear pricing", text: "See what's included (exams, resits, materials) before you book." },
  { icon: "icon-calendar", title: "Flexible dates", text: "Weekday and weekend courses across the UK." },
  { icon: "icon-save-money", title: "No booking fee", text: "We provide our services without any additional charges." },
  { icon: "icon-message", title: "Support", text: "Our team can help you choose the right course or bundle for your goals." },
];

export default function TrustBoxes() {
  return (
    <section className="rt-cd__sec" id="why-book" aria-labelledby="rt-cd-why-h">
      <h2 id="rt-cd-why-h">Why book with Read Training?</h2>
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
