"use client";

import React from "react";
import Link from "next/link";
import { quoteHref, useBooking } from "./BookingProvider";
import { TEAM } from "@/lib/teamTraining";
import { formatPrice, formatWeekdayDate } from "@/lib/format";
import DatesDialog from "./DatesDialog";
import { Check, Icon } from "./Icon";
import { modeLabel } from "@/lib/courseModes";
import { EmptyState } from "@/components/states/States";


// Existing descriptions per option. An option with no description (Self-paced) simply shows none.
const BULLETS = {
  classroom: ["Focused study away from the workplace.", "Face-to-face support with experienced tutors.", "Interact with fellow professionals."],
  online: ["Learn from home or at work.", "Live sessions with an experienced tutor.", "Join from any device."],
  ondemand: ["Start anytime at your own pace."],
  inhouse: TEAM.bullets,
};

// One summary row for the selected dated option (nothing is chosen for the learner): how many dates at how many venues, the
// next one and the lowest price. "See dates" opens the pop-up (DatesDialog) where the venue and date are chosen.
function DatesSummary({ rows, mode }) {
  const { openDates, summaryFor } = useBooking();
  const sum = summaryFor(mode);
  if (!sum) return null;
  const classroom = mode === "classroom";
  return (
    <div className="rt-ds">
      <Icon name="calendar" className="rt-ds__icon" />
      <div className="rt-ds__text" aria-live="polite">
        <strong>{sum.count} {sum.count === 1 ? "date" : "dates"}{classroom ? ` at ${sum.venues} ${sum.venues === 1 ? "venue" : "venues"}` : ", live online"}</strong>
        <span>Next course: {formatWeekdayDate(sum.next.date)} · {sum.from ? "from " : ""}{formatPrice(sum.price)}</span>
      </div>
      <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={openDates} aria-haspopup="dialog">See dates ({rows.length})</button>
    </div>
  );
}

// Learning options: the one place where the choice is made. Every option (Classroom, Live online, Self-paced, team training) is
// the same card; the grid picks one row, 2 x 2 or a single column from the number of options and the room available. The dates for the selected option follow,
// then the staff training and exam prep boxes. Choosing never moves the page.
export default function LearningSection() {
  const { course, modes, mode, setMode, isInHouse } = useBooking();

  const fromFor = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  const rows = course.sessions.filter((s) => s.mode === mode);
  const noDates = course.sessions.length === 0;
  // "Most popular" means something only between study methods (classroom, live online, self-paced), not against team training
  const compare = modes.filter((m) => m !== "inhouse").length > 1;

  if (!modes.length) {
    return (
      <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
        <h2 id="rt-cd-lo-h">Learning options</h2>
        <EmptyState inCard title="New dates coming soon." text="No dates are open for booking yet. Save the course to come back to it." action={{ label: "Ask about this course", href: "/contact-us" }} />
      </section>
    );
  }

  return (
    <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
      <h2 id="rt-cd-lo-h">Learning options</h2>
      {noDates && <p className="rt-cd__lead">No public dates are open yet. Your team can still train together: ask for a quote below.</p>}

      <fieldset className="rt-lc__fs">
        <legend className="rt-cd__sr">How do you want to learn?</legend>
        <div className={`rt-lc -n${modes.length}`} role="radiogroup" aria-label="How do you want to learn?">
          {modes.map((m) => {
            const on = mode === m;
            const list = BULLETS[m] || [];
            return (
              // The whole card selects the option; the radio inside is what keyboards and screen readers use (named by the card title).
              <div key={m} className={`rt-lc__card${on ? " is-selected" : ""}`} onClick={() => setMode(m)}>
                <input type="radio" name="rt-lo-mode" value={m} checked={on} onChange={() => setMode(m)} aria-labelledby={`rt-lc-${m}`} />
                {/* Every card has the same four parts (badge, title, points, price), some of them empty, so the
                    parts line up across a row of cards (CSS subgrid). */}
                <span className="rt-lc__top">{compare && course.popularMode === m && <span className="rt-pill -accent">Most popular</span>}</span>
                <h3 className="rt-lc__name" id={`rt-lc-${m}`}>{m === "inhouse" ? TEAM.cardTitle : modeLabel(m)}</h3>
                <ul className="rt-lc__list">{list.map((b) => <li key={b}><Check /> <span>{b}</span></li>)}</ul>
                <span className="rt-lc__price">
                  {m === "inhouse" ? <span className="rt-lc__quote">{TEAM.quoteText}</span> : <><span>From</span> <strong>{formatPrice(fromFor(m))}</strong></>}
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* self-paced has nothing more to show here (no dates, no further points), so the part and its heading are left out */}
      {mode !== "ondemand" && (
      <div className="rt-lo__dates">
        <div className="rt-lo__dates-head">
          <h3 className="rt-lo__h">{isInHouse ? "Team training at your workplace" : "Upcoming dates"}</h3>
        </div>

        {isInHouse ? (
          <div className="rt-lo__inhouse">
            <p className="rt-cd__lead">{TEAM.line}</p>
            <div className="rt-lc__cta">
              <Link href={quoteHref(course)} className="button -md -outline-purple-1 text-purple-1">{TEAM.cta}</Link>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState inCard title="No dates in this location yet." text="Try another location." />
        ) : (
          <DatesSummary rows={rows} mode={mode} />
        )}
        <DatesDialog />
      </div>
      )}

    </section>
  );
}
