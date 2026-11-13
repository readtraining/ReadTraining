"use client";

import React from "react";
import Link from "next/link";
import { quoteHref, useBooking } from "./BookingProvider";
import { TEAM } from "@/lib/teamTraining";
import { formatPrice, formatWeekdayDate } from "@/lib/format";
import DatesDialog from "./DatesDialog";
import { Check } from "./Icon";
import { modeLabel } from "@/lib/courseModes";
import { EmptyState } from "@/components/states/States";

// What each way of studying offers. Team training's points are its own (lib/teamTraining.js).
const BULLETS = {
  classroom: ["Focused study away from the workplace", "Face-to-face support with experienced tutors", "Interact with fellow professionals"],
  online: ["Learn from home or at work", "Live sessions with an experienced tutor", "Join from any device"],
  ondemand: ["Start any time, at your own pace", "Study on any device", "Pick up where you left off"],
  inhouse: TEAM.points,
};
// each way of studying's icon: a drawn line icon (stroke, currentColor)
const PATHS = {
  classroom: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  online: <><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M2 19h20" /><path d="M10.5 8.8v3.4l3-1.7z" /></>,
  ondemand: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  inhouse: <><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" /><circle cx="10" cy="7.5" r="3.5" /><path d="M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.2a3.5 3.5 0 0 1 0 6.6" /></>,
};
const ModeIcon = ({ mode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[mode] || PATHS.classroom}</svg>
);

// Learning options: one card per way of studying this course (Classroom, Live online, Self-paced, Team training), side by side
// (two across, a third one taking the full row; one under another on phones). Each card is information plus ONE action, its
// button: the card itself isn't clickable. A card: icon, name and price on one row; what it offers; then a footer saying what
// is open (the dates and venues, "start any time", or at your workplace) and its button: See dates (that method's dates,
// DatesDialog), Book now (a self-paced course, straight to its steps or the basket) or Get a team quote (the quote form with
// this course filled in). The main way of studying (the most popular, else the first with dates) is highlighted as our
// recommendation; it is still only its button that acts.
export default function LearningSection() {
  const { course, modes, book, openDatesFor, summaryFor } = useBooking();
  const noDates = course.sessions.length === 0;
  const main = modes.includes(course.popularMode) && course.popularMode !== "inhouse" ? course.popularMode : modes.find((m) => m !== "inhouse");

  if (!modes.length) {
    return (
      <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
        <h2 id="rt-cd-lo-h">Learning options</h2>
        <EmptyState inCard title="New dates coming soon." text="No dates are open for booking yet. Save the course to come back to it." action={{ label: "Ask about this course", href: "/contact-us" }} />
      </section>
    );
  }

  const card = (m) => {
    const name = m === "inhouse" ? TEAM.cardTitle : modeLabel(m);
    const sum = m === "classroom" || m === "online" ? summaryFor(m) : null;
    const selfPaced = m === "ondemand" ? course.sessions.find((s) => s.mode === "ondemand") : null;
    // the price row: the lowest price ("From" when dates or packages differ), or "Price / On request" for team training
    const price =
      m === "inhouse"
        ? { label: "Price", value: "On request" }
        : sum
          ? { label: sum.from ? "From" : "Price", value: formatPrice(sum.price) }
          : selfPaced
            ? { label: selfPaced.packages ? "From" : "Price", value: formatPrice(selfPaced.price) }
            : null;
    return (
      <li key={m} className={`rt-opt${m === main && modes.length > 1 ? " -main" : ""}`}>
        <div className="rt-opt__head">
          <span className="rt-opt__icon" aria-hidden="true"><ModeIcon mode={m} /></span>
          <h3 className="rt-opt__name">{name}</h3>
          {price && (
            <p className="rt-opt__price">
              <span>{price.label}</span>
              <strong>{price.value}</strong>
            </p>
          )}
        </div>
        <ul className="rt-opt__list">{(BULLETS[m] || []).map((b) => <li key={b}><Check /> <span>{b}</span></li>)}</ul>
        <div className="rt-opt__foot">
          {sum ? (
            <p className="rt-opt__meta">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
              <span>
                <strong>{sum.count} {sum.count === 1 ? "date" : "dates"}{m === "classroom" ? ` at ${sum.venues} ${sum.venues === 1 ? "venue" : "venues"}` : ", live online"}</strong>
                Next course {formatWeekdayDate(sum.next.date)}{m === "classroom" && sum.towns.length ? ` · ${sum.towns.slice(0, 3).join(", ")}${sum.towns.length > 3 ? ` +${sum.towns.length - 3}` : ""}` : ""}
              </span>
            </p>
          ) : m === "inhouse" ? (
            <p className="rt-opt__meta">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 21V8l8-5 8 5v13" /><path d="M9 21v-6h6v6" /></svg>
              <span><strong>{TEAM.where}</strong>{TEAM.reply}</span>
            </p>
          ) : (
            <p className="rt-opt__meta">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
              <span><strong>Start any time</strong>{selfPaced?.time || "Online, at your own pace"}</span>
            </p>
          )}
          {sum ? (
            <button type="button" className="button -md -purple-1 text-white rt-opt__btn" onClick={() => openDatesFor(m)} aria-haspopup="dialog">
              See dates<span className="rt-cd__sr"> for {name}</span>
            </button>
          ) : m === "inhouse" ? (
            <Link href={quoteHref(course)} className="button -md -outline-purple-1 text-purple-1 rt-opt__btn">{TEAM.cta}</Link>
          ) : (
            <button type="button" className="button -md -purple-1 text-white rt-opt__btn" onClick={() => selfPaced && book(selfPaced.id)}>
              Book now<span className="rt-cd__sr"> {name}</span>
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
      <h2 id="rt-cd-lo-h">Learning options</h2>
      {noDates && <p className="rt-cd__lead">No public dates are open yet. Your team can still train together: ask for a quote below.</p>}
      <ul className={`rt-opts -n${modes.length}`}>{modes.map(card)}</ul>
      <DatesDialog />
    </section>
  );
}
