"use client";

import React from "react";
import Link from "next/link";
import { QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatPrice, savePercent } from "@/lib/courses";

const CardCheck = () => (
  <svg className="rt-cd__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" />
  </svg>
);

const BULLETS = {
  classroom: ["Focused study away from the workplace.", "Face-to-face support with experienced tutors.", "Interact with fellow professionals."],
  online: ["Learn from home or at work.", "Live sessions with an experienced tutor.", "Join from any device."],
  inhouse: [
    "Book more, pay less: bulk discounts available.",
    "Choose from our centres or train on-site.",
    "Train your team together on a date that suits you.",
    "Customisable course content tailored to your workplace.",
    "Expert-led, hands-on training delivered at your location.",
  ],
};

// Learning options: one card per way to learn this course (only the ones it offers) plus team training.
// "See dates" switches the booking state to that option and scrolls to the study options.
export default function LearningOptions() {
  const { course, modes, setMode } = useBooking();

  const fromFor = (mode) => {
    const list = course.sessions.filter((s) => s.mode === mode);
    return list.reduce((best, s) => (s.price < best.price ? s : best), list[0]);
  };
  const seeDates = (mode) => {
    setMode(mode);
    requestAnimationFrame(() => document.getElementById("dates")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const cards = modes.filter((m) => m !== "inhouse").map((m) => ({
    key: m,
    title: m === "classroom" ? "Classroom" : course.methods.includes("live-online") ? "Live online" : "Online self-paced",
    best: fromFor(m),
  }));
  const team = modes.includes("inhouse");
  const count = cards.length + (team ? 1 : 0);

  return (
    <section className="rt-cd__sec" id="learning-options" aria-labelledby="rt-cd-lo-h">
      <h2 id="rt-cd-lo-h">Learning options</h2>
      <div className="rt-cd__lo" style={{ "--lo-cols": Math.min(count, 3) }}>
        {cards.map((c) => {
          const pct = savePercent(c.best.price, c.best.wasPrice);
          return (
            <article key={c.key} className={`rt-cd__lo-card${course.popularMode === c.key ? " is-popular" : ""}`}>
              {course.popularMode === c.key && <span className="rt-cd__lo-tag">Most popular</span>}
              <h3>{c.title}</h3>
              <ul>
                {BULLETS[c.key].map((b) => <li key={b}><CardCheck /> {b}</li>)}
              </ul>
              <div className="rt-cd__lo-foot">
                <p className="rt-cd__lo-price">From <strong>{formatPrice(c.best.price)}</strong> <span>All inc</span></p>
                {c.best.wasPrice > c.best.price && (
                  <p className="rt-cd__lo-was"><s><span className="rt-cd__sr">was </span>{formatPrice(c.best.wasPrice)}</s> {pct}% off</p>
                )}
                <button type="button" className="rt-cd__ghost" onClick={() => seeDates(c.key)}>See dates</button>
              </div>
            </article>
          );
        })}
        {team && (
          <article className="rt-cd__lo-card">
            <h3>Team training solutions</h3>
            <ul>
              {BULLETS.inhouse.map((b) => <li key={b}><CardCheck /> {b}</li>)}
            </ul>
            <div className="rt-cd__lo-foot">
              <p className="rt-cd__lo-quote">Contact us for a quote</p>
              <Link href={QUOTE_HREF} className="rt-cd__ghost">Enquire now</Link>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
