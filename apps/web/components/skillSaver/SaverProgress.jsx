"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Eyebrow, Ticks } from "@/components/marketing/parts";
import SaverStatus from "./SaverStatus";
import { useAuthUser } from "@/lib/auth/authClient";
import { skillSaverStatus } from "@/lib/skillSaver";
import { completedCourseDates } from "@/lib/useSkillSaver";

// "Your level" on the learner Skill Saver page: the rules beside the learner's own level. Signed in, the level is worked out
// from the courses they completed (lib/account.js getLearning, demo bookings until bookings come from the database); signed
// out, a prompt to log in or create an account. `initialPerson` is who the server saw, so the right state shows at once; the
// live session takes over if it changes (logging out in another tab). Completed courses are read in the browser after load.
export default function SaverProgress({ progress: p, initialPerson }) {
  const live = useAuthUser();
  const person = live === undefined ? initialPerson : live;
  const [dates, setDates] = useState(null);
  useEffect(() => {
    setDates(completedCourseDates());
  }, []);
  const status = person && dates ? skillSaverStatus(dates, true) : null;

  return (
    <section id="rt-sv-progress" className="fb-section -white" aria-labelledby="rt-sv-progress-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{p.eyebrow}</Eyebrow>
            <h2 className="fb-title" id="rt-sv-progress-h">{p.title}</h2>
            <p className="fb-lede">{p.text}</p>
            <Ticks items={p.rules} />
          </div>

          <div aria-live="polite">
            {person && !status && (
              <ProductFrame title={p.frame} className="rt-sv__status">
                <p className="rt-sv__checking" aria-busy="true">Checking your level…</p>
              </ProductFrame>
            )}
            {person === null && (
              <ProductFrame title={p.frame} className="rt-sv__status">
                <div className="rt-sv__out">
                  <span className="rt-sv__outIcon" aria-hidden="true"><i className="icon-person-2 text-20"></i></span>
                  <h3 className="rt-sv__outTitle">{p.signedOut.title}</h3>
                  <p className="rt-sv__outText">{p.signedOut.text}</p>
                  <div className="rt-sv__actions">
                    <Link href={p.signedOut.login.href} className="button -md -purple-1 text-white">{p.signedOut.login.label}</Link>
                    <Link href={p.signedOut.signUp.href} className="button -md -outline-purple-1 text-purple-1">{p.signedOut.signUp.label}</Link>
                  </div>
                </div>
              </ProductFrame>
            )}
            {person && status && (
              <SaverStatus title={p.frame} greeting={person.firstName ? `Hi ${person.firstName}, here's your level` : "Here's your level"} status={status}>
                <div className="rt-sv__actions">
                  <Link href={p.find.href} className="button -md -purple-1 text-white">{p.find.label}</Link>
                  <Link href={p.learning.href} className="button -md -outline-purple-1 text-purple-1">{p.learning.label}</Link>
                </div>
              </SaverStatus>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
