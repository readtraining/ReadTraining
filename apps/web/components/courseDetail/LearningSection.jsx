"use client";

import React from "react";
import Link from "next/link";
import { quoteHref, useBooking } from "./BookingProvider";
import { TEAM } from "@/lib/teamTraining";
import { formatDateRange, formatPrice } from "@/lib/format";
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

// One summary row for the selected dated option. "See dates" opens the pop-up (DatesDialog) where the date is chosen.
function DatesSummary({ rows, mode }) {
  const { session, openDates } = useBooking();
  const chosen = rows.find((r) => r.id === session.id);
  const classroom = mode === "classroom";
  const venues = new Set(rows.map((r) => `${r.address}|${r.postcode}`)).size;
  const from = Math.min(...rows.map((r) => r.price));
  return (
    <div className="rt-ds">
      <Icon name="calendar" className="rt-ds__icon" />
      <div className="rt-ds__text" aria-live="polite">
        {chosen ? (
          <>
            <strong>{formatDateRange(chosen.date, chosen.endDate)}</strong>
            <span>{classroom ? `${chosen.address}, ${chosen.postcode}, provided by ${chosen.provider}` : `${chosen.time}, provided by ${chosen.provider}`}</span>
          </>
        ) : (
          <strong>{classroom ? `${rows.length} dates in ${venues} venues, from ${formatPrice(from)}` : `${rows.length} dates, from ${formatPrice(from)}`}</strong>
        )}
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

  return (
    <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
      <h2 id="rt-cd-lo-h">Learning options</h2>

      <fieldset className="rt-lc__fs">
        <legend className="rt-cd__sr">How do you want to learn?</legend>
        <div className={`rt-lc -n${modes.length}`} role="radiogroup" aria-label="How do you want to learn?">
          {modes.map((m) => {
            const on = mode === m;
            const list = BULLETS[m] || [];
            const more = list.length - 2;
            return (
              // The whole card selects the option; the radio inside is what keyboards and screen readers use (named by the card title).
              <div key={m} className={`rt-lc__card${on ? " is-selected" : ""}`} onClick={() => setMode(m)}>
                <input type="radio" name="rt-lo-mode" value={m} checked={on} onChange={() => setMode(m)} aria-labelledby={`rt-lc-${m}`} />
                {/* Every card has the same five parts (badge, title, points, "+ more", price), some of them empty, so the
                    parts line up across a row of cards (CSS subgrid). */}
                <span className="rt-lc__top">{course.popularMode === m && <span className="rt-pill -accent">Most popular</span>}</span>
                <h3 className="rt-lc__name" id={`rt-lc-${m}`}>{m === "inhouse" ? TEAM.cardTitle : modeLabel(m)}</h3>
                <ul className="rt-lc__list">{list.slice(0, 2).map((b) => <li key={b}><Check /> <span>{b}</span></li>)}</ul>
                <span className="rt-lc__more">{more > 0 && `+ ${more} more`}</span>
                <span className="rt-lc__price">
                  {m === "inhouse" ? <span className="rt-lc__quote">{TEAM.quoteText}</span> : <><span>From</span> <strong>{formatPrice(fromFor(m))}</strong></>}
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="rt-lo__dates">
        <div className="rt-lo__dates-head">
          <h3 className="rt-lo__h">Study options for the {course.title}</h3>
        </div>

        {/* The selected option's full list of points shows here as soon as its card is chosen. */}
        {!isInHouse && BULLETS[mode]?.length > 2 && (
          <ul className="rt-lc__full">
            {BULLETS[mode].map((b) => <li key={b}><Check /> <span>{b}</span></li>)}
          </ul>
        )}

        {isInHouse ? (
          <div className="rt-lo__inhouse">
            <ul className="rt-lc__full rt-lc__full--cols">
              {BULLETS.inhouse.map((b) => <li key={b}><Check /> <span>{b}</span></li>)}
            </ul>
            <div className="rt-lc__cta">
              <Link href={quoteHref(course)} className="button -md -outline-purple-1 text-purple-1">{TEAM.cta}</Link>
            </div>
          </div>
        ) : mode === "ondemand" ? null : rows.length === 0 ? (
          <EmptyState inCard title="No dates in this location yet." text="Try another location." />
        ) : (
          <>
            <DatesSummary rows={rows} mode={mode} />
          </>
        )}
        <DatesDialog />
      </div>

      <div className="rt-lo__xtra">
        <div className="rt-cd__staff">
          <strong>{TEAM.staff.title}</strong>
          <p>{TEAM.staff.text}</p>
          <Link href={quoteHref(course)} className="rt-cd__link">{TEAM.staff.link}</Link>
        </div>

      </div>
    </section>
  );
}
