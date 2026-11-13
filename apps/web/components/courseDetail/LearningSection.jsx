"use client";

import React from "react";
import { useBooking } from "./BookingProvider";
import { TEAM } from "@/lib/teamTraining";
import { formatPrice } from "@/lib/format";
import DatesDialog from "./DatesDialog";
import { Check } from "./Icon";
import { modeLabel } from "@/lib/courseModes";
import { EmptyState } from "@/components/states/States";


// Existing descriptions per option. An option with no description (Self-paced) simply shows none.
const BULLETS = {
  classroom: ["Focused study away from the workplace.", "Face-to-face support with experienced tutors.", "Interact with fellow professionals."],
  online: ["Learn from home or at work.", "Live sessions with an experienced tutor.", "Join from any device."],
  ondemand: ["Start anytime at your own pace."],
  inhouse: TEAM.bullets,
};

// Learning options: the one place where the choice is made. Every option (Classroom, Live online, Self-paced, team training) is
// the same card; the grid picks one row, 2 x 2 or a single column from the number of options and the room available. Nothing
// follows the cards: the booking card beside them (and the phone's bottom bar) shows the chosen option's dates and Book now, or
// for team training its Get a team quote. Choosing never moves the page.
export default function LearningSection() {
  const { course, modes, mode, setMode } = useBooking();

  const fromFor = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
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

      <DatesDialog />
    </section>
  );
}
