"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { testPrepPage } from "@/data/testPrep";
import { markTest } from "@/app/mock-exams-test/actions";
import { fill, readFinished, settleProgress } from "./attemptStore";
import { useHeaderOffset } from "@/components/testPrep/subject/useHeaderOffset";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

// "12 min 5 s"
const formatTaken = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} min${s ? ` ${s} s` : ""}` : `${s} s`;
};

// The score ring: the share of correct answers, in the pass or fail colour, with a marker where the pass mark sits on the ring,
// so the gap to a pass (or the margin above it) can be seen at a glance.
function ScoreRing({ correct, total, passed, passMark }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const angle = ((passMark || 0) / 100) * 2 * Math.PI; // the svg is turned -90deg, so 0 is the top of the ring
  return (
    <div className={`rt-tr__ring ${passed ? "-pass" : "-fail"}`} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle className="rt-tr__ring-track" cx="60" cy="60" r={r} />
        <circle className="rt-tr__ring-bar" cx="60" cy="60" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - correct / total)} />
        {passMark ? <circle className="rt-tr__ring-mark" cx={60 + r * Math.cos(angle)} cy={60 + r * Math.sin(angle)} r="6" /> : null}
      </svg>
      <span className="rt-tr__ring-text">
        <strong>{`${correct}/${total}`}</strong>
        <span>{`${Math.round((correct / total) * 100)}%`}</span>
      </span>
    </div>
  );
}

// The result of the last finished attempt on this device: marked on the server (markTest), with the score, pass or fail
// against the pass mark, what to do next, and a review of every answer.
export default function ResultView({ subject, test, links }) {
  const r = testPrepPage.result;
  const [state, setState] = useState({ status: "loading" });
  const [filter, setFilter] = useState("all");
  const headRef = useRef(null);
  const reviewRef = useRef(null);
  useHeaderOffset();

  // A filter change brings the list back into view when the reader has scrolled down into it (the filters stay pinned).
  const pickFilter = (k) => {
    setFilter(k);
    requestAnimationFrame(() => {
      const el = reviewRef.current;
      if (!el) return;
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const top = el.getBoundingClientRect().top + window.scrollY - offset - 16;
      if (window.scrollY > top + 1) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      }
    });
  };

  useEffect(() => {
    const done = readFinished(subject.slug, test.slug);
    if (!done) {
      setState({ status: "empty" });
      return;
    }
    settleProgress(subject.slug, test.slug, done); // the result has opened: the finished attempt's progress entry can go
    let live = true;
    markTest(subject.slug, test.slug, done.answers)
      .then((res) => live && setState(res ? { status: "ready", res, done } : { status: "empty" }))
      .catch(() => live && setState({ status: "error" }));
    return () => {
      live = false;
    };
  }, [subject.slug, test.slug]);

  useEffect(() => {
    if (state.status === "ready") headRef.current?.focus({ preventScroll: true });
  }, [state.status]);

  const groups = useMemo(() => {
    if (state.status !== "ready") return null;
    const flags = state.done.flags || [];
    const rows = state.res.review.map((x, i) => ({ ...x, n: i + 1, flagged: flags.includes(x.id) }));
    return {
      all: rows,
      incorrect: rows.filter((x) => x.status === "incorrect"),
      unanswered: rows.filter((x) => x.status === "unanswered"),
      flagged: rows.filter((x) => x.flagged),
    };
  }, [state]);

  if (state.status !== "ready") {
    const empty = state.status === "empty";
    return (
      <div className="rt-tq__intro" role={state.status === "loading" ? "status" : undefined}>
        {state.status === "loading" && <p className="rt-tq__intro-text">{r.loading}</p>}
        {state.status !== "loading" && (
          <>
            <span className="rt-benefit__icon" aria-hidden="true"><i className="icon-document text-16"></i></span>
            {empty && <h2 className="rt-tps__h2">{r.emptyTitle}</h2>}
            <p className="rt-tq__intro-text">{empty ? r.emptyText : r.errorText}</p>
            <div className="rt-tq__actions">
              <Link href={links.test} className="button -md -purple-1 text-white">{r.emptyLabel}</Link>
            </div>
          </>
        )}
      </div>
    );
  }

  const { res, done } = state;
  const list = groups[filter];
  return (
    <>
      <section className="rt-tr__summary" aria-labelledby="rt-tr-title">
        <div className="rt-tr__top">
          <div className="rt-tr__ringwrap">
            <ScoreRing correct={res.correct} total={res.total} passed={res.passed} passMark={res.passMark} />
            {res.passMark ? <p className="rt-tr__ring-cap"><span className="rt-tr__ring-key" aria-hidden="true"></span>{fill(r.passMarkKey, res)}</p> : null}
          </div>
          <div className="rt-tr__body">
            <span className="rt-pill -accent">{r.eyebrow}</span>
            <h2 className={`rt-tps__h2 rt-tr__title ${res.passed ? "-pass" : "-fail"}`} id="rt-tr-title" tabIndex={-1} ref={headRef}>{res.passed ? r.passTitle : r.failTitle}</h2>
            <p className="rt-tr__text">{fill(r.scoreText, res)}</p>
            {done.reason === "time" && <p className="rt-tr__note">{r.timeUpNote}</p>}
            {/* the same colours as the review's status badges below: correct green, incorrect red, not answered grey */}
            <dl className="rt-tr__stats">
              <div className="-correct"><dt>{r.stats.correct}</dt><dd>{res.correct}</dd></div>
              <div className="-incorrect"><dt>{r.stats.incorrect}</dt><dd>{res.incorrect}</dd></div>
              <div className="-unanswered"><dt>{r.stats.unanswered}</dt><dd>{res.unanswered}</dd></div>
              <div className="-time"><dt>{r.stats.time}</dt><dd>{formatTaken(done.seconds || 0)}</dd></div>
            </dl>
            <div className="rt-tq__actions">
              <Link href={links.test} className="button -md -purple-1 text-white">{r.retakeLabel}</Link>
              {links.next && (
                <Link href={links.next} className="button -md -outline-purple-1 text-purple-1">
                  {r.nextLabel}<span className="rt-cd__sr">{`: ${links.nextTitle}`}</span>
                </Link>
              )}
              <Link href={links.subject} className="button -md -outline-purple-1 text-purple-1">{r.backLabel}</Link>
            </div>
          </div>
        </div>
        <div className="rt-tr__book">
          <div>
            <h3 className="rt-tr__book-title">{r.bookTitle}</h3>
            <p className="rt-tr__book-text">{r.bookText}</p>
          </div>
          <Link href={links.book} className="button -md -outline-purple-1 text-purple-1">{r.bookLabel}</Link>
        </div>
      </section>

      <section className="rt-tr__review" aria-labelledby="rt-tr-review" ref={reviewRef}>
        <h2 className="rt-tps__h2" id="rt-tr-review">{r.reviewTitle}</h2>
        <div className="rt-tr__filters" role="group" aria-label={r.reviewTitle}>
          {Object.keys(r.filters).map((k) => (
            <button key={k} type="button" className={`rt-tr__filter${filter === k ? " is-on" : ""}`} aria-pressed={filter === k} onClick={() => pickFilter(k)}>
              {r.filters[k]}<span className="rt-tr__filter-n">{groups[k].length}</span>
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="rt-tr__none">{r.noneInFilter}</p>
        ) : (
          <ol className="rt-tr__list">
            {list.map((x) => (
              <li key={x.id} className="rt-tr__item">
                <div className="rt-tr__item-head">
                  <span className="rt-tr__item-n">{`Question ${x.n}`}</span>
                  <span className={`rt-tr__status -${x.status}`}>{r.status[x.status]}</span>
                  {x.flagged && <span className="rt-tr__flag"><i className="icon-flag" aria-hidden="true"></i>{r.filters.flagged}</span>}
                </div>
                <h3 className="rt-tr__q">{x.q}</h3>
                <ul className="rt-tr__opts">
                  {x.options.map((o, i) => {
                    const right = i === x.answer;
                    const wrong = i === x.given && !right;
                    return (
                      <li key={i} className={`rt-tr__opt${right ? " is-correct" : ""}${wrong ? " is-wrong" : ""}`}>
                        <span className="rt-tq__letter" aria-hidden="true">{LETTERS[i]}</span>
                        <span className="rt-tr__opt-text">{o}</span>
                        {(right || wrong || i === x.given) && (
                          <span className="rt-tr__tag">
                            <i className={right ? "icon-check" : "icon-close"} aria-hidden="true"></i>
                            {[i === x.given && r.yourAnswer, right && r.correctAnswer].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
