"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { testPrepPage } from "@/data/testPrep";
import { Check, Icon } from "@/components/courseDetail/Icon";
import { useHeaderOffset } from "../subject/useHeaderOffset";
import Sheet from "./Sheet";
import SubjectFacts from "../subject/SubjectFacts";
import { clearProgress, fill, formatClock, formatSpoken, isSettled, readFinished, readProgress, saveFinished, saveProgress } from "./attemptStore";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const FIVE = 5 * 60 * 1000;
const ONE = 60 * 1000;

// The question number grid: in the panel beside the question (desktop) and in the "Questions" sheet (phones). Longer tests are
// split into blocks of 10, each with its range and how many are answered; the block holding the current question is open and
// the others fold to that one line (a reader can open or fold any of them), so even a 72-question test stays short.
const BLOCK = 10;

function Navigator({ questions, answers, flags, current, onGo, onFinish }) {
  const t = testPrepPage.runner;
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const blocks = [];
  for (let i = 0; i < questions.length; i += BLOCK) blocks.push(i);
  const currentBlock = Math.floor(current / BLOCK);
  const [opened, setOpened] = useState([]); // blocks the reader opened besides the current one
  const [closedBlock, setClosedBlock] = useState(-1); // the current block, if the reader folded it (opens again on a move)
  const split = questions.length > BLOCK;

  const nums = (from) => (
    <ol className="rt-tq__nums">
      {questions.slice(from, from + BLOCK).map((q, k) => {
        const i = from + k;
        const isAnswered = answers[q.id] !== undefined;
        const isFlagged = flags.includes(q.id);
        const cls = ["rt-tq__num", i === current && "is-current", isAnswered && "is-answered", isFlagged && "is-flagged"].filter(Boolean).join(" ");
        const label = [`Question ${i + 1}`, isAnswered ? t.legend.answered : t.legend.open, isFlagged && t.legend.flagged].filter(Boolean).join(", ").toLowerCase();
        return (
          <li key={q.id}>
            <button type="button" className={cls} aria-label={label.charAt(0).toUpperCase() + label.slice(1)} aria-current={i === current ? "step" : undefined} onClick={() => onGo(i)}>
              {i + 1}
              {isFlagged && <i className="icon-flag rt-tq__num-flag" aria-hidden="true"></i>}
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <p className="rt-tq__nav-sum">{fill(t.navSummary, { answered, total: questions.length })}</p>
      {split ? (
        <div className="rt-tq__blocks">
          {blocks.map((from, bi) => {
            const slice = questions.slice(from, from + BLOCK);
            const done = slice.filter((q) => answers[q.id] !== undefined).length;
            const open = bi === currentBlock ? closedBlock !== bi : opened.includes(bi);
            const id = `rt-tq-block-${bi}`;
            return (
              <div key={from} className={`rt-tq__block${open ? " is-open" : ""}${bi === currentBlock ? " is-current" : ""}`}>
                <button type="button" className="rt-tq__block-head" aria-expanded={open} aria-controls={id} onClick={() => (bi === currentBlock ? setClosedBlock(open ? bi : -1) : setOpened((o) => (o.includes(bi) ? o.filter((x) => x !== bi) : [...o, bi])))}>
                  <span className="rt-tq__block-range">{`${from + 1}–${from + slice.length}`}</span>
                  <span className="rt-tq__block-bar" aria-hidden="true"><span style={{ width: `${(done / slice.length) * 100}%` }}></span></span>
                  <span className="rt-tq__block-count">{`${done}/${slice.length}`}</span>
                  <i className="icon-chevron-down" aria-hidden="true"></i>
                </button>
                <div id={id} hidden={!open}>{nums(from)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        nums(0)
      )}
      <ul className="rt-tq__legend" aria-hidden="true">
        <li><span className="rt-tq__swatch is-current"></span>{t.legend.current}</li>
        <li><span className="rt-tq__swatch is-answered"></span>{t.legend.answered}</li>
        <li><span className="rt-tq__swatch is-flagged"><i className="icon-flag"></i></span>{t.legend.flagged}</li>
        <li><span className="rt-tq__swatch"></span>{t.legend.open}</li>
      </ul>
      <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-btn-block rt-tq__nav-finish" onClick={onFinish}>{t.finishLabel}</button>
    </>
  );
}

// One mock test: the "before you start" card, then the questions with a timer, flags and the question grid. Progress is
// saved on this device; finishing (or the timer running out) stores the answers and opens the result page, which marks them
// on the server. The paper comes without answers.
export default function TestRunner({ subject, test, keyFacts = [], questions, links }) {
  const t = testPrepPage.runner;
  const router = useRouter();
  const total = questions.length;
  const timed = Boolean(test.minutes);
  const [phase, setPhase] = useState("intro"); // intro | running | finishing
  // While the test runs, <body> gets "rt-tq-running": the sections under the test, the help section and the footer are hidden
  // (the site menu stays), so the screen holds the question, the timer and the grid. They come back on the intro and result.
  useEffect(() => {
    document.body.classList.toggle("rt-tq-running", phase === "running");
    return () => document.body.classList.remove("rt-tq-running");
  }, [phase]);
  const [saved, setSaved] = useState(null);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState([]);
  const [current, setCurrent] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const qRef = useRef(null);
  const cardRef = useRef(null);
  const focusQuestion = useRef(false);
  const navBtnRef = useRef(null);
  const warned = useRef({ five: false, one: false });
  const live = useRef({});
  live.current = { answers, flags, startedAt, deadline };

  useHeaderOffset();

  const finish = useCallback(
    (reason, from) => {
      const s = from || live.current;
      const end = s.deadline ? Math.min(Date.now(), s.deadline) : Date.now();
      saveFinished(subject.slug, test.slug, { answers: s.answers, flags: s.flags, seconds: Math.max(0, Math.round((end - s.startedAt) / 1000)), reason, at: Date.now(), startedAt: s.startedAt });
      // the progress entry stays until the result page opens (settleProgress), so a lost redirect is retried on the next load
      saveProgress(subject.slug, test.slug, { answers: s.answers, flags: s.flags, current: 0, startedAt: s.startedAt, deadline: s.deadline || 0 });
      setFinishOpen(false);
      setNavOpen(false);
      setPhase("finishing");
      router.push(links.result);
    },
    [subject.slug, test.slug, links.result, router],
  );

  // a test left in progress: offer to resume it, or mark it straight away if its time has run out; one already finished whose
  // result page never opened (the redirect was lost) goes straight there
  useEffect(() => {
    const p = readProgress(subject.slug, test.slug);
    if (!p || typeof p.answers !== "object" || !p.startedAt) return;
    if (isSettled(p, readFinished(subject.slug, test.slug))) {
      setPhase("finishing");
      router.replace(links.result);
    } else if (p.deadline && p.deadline <= Date.now()) finish("time", p);
    else setSaved(p);
  }, [subject.slug, test.slug, finish, router, links.result]);

  const begin = (from) => {
    const start = Date.now();
    const s = from || { answers: {}, flags: [], current: 0, startedAt: start, deadline: timed ? start + test.minutes * 60 * 1000 : 0 };
    setAnswers(s.answers);
    setFlags(s.flags || []);
    setCurrent(Math.min(Math.max(0, s.current || 0), total - 1));
    setStartedAt(s.startedAt);
    setDeadline(s.deadline || 0);
    setNow(start);
    warned.current = { five: Boolean(s.deadline) && s.deadline - start <= FIVE, one: Boolean(s.deadline) && s.deadline - start <= ONE };
    // resuming with 5 minutes or less left: the warnings already passed are not given, so say how long is left instead, once
    // the test (and its live region) is on screen
    const left = s.deadline ? s.deadline - start : 0;
    if (from && left > 0 && left <= FIVE) setTimeout(() => setAnnounce(fill(t.warnLeft, { time: formatSpoken(left) })), 500);
    focusQuestion.current = true;
    setSaved(null);
    setPhase("running");
  };
  const restart = () => {
    clearProgress(subject.slug, test.slug);
    begin(null);
  };

  // keep progress on this device
  useEffect(() => {
    if (phase === "running") saveProgress(subject.slug, test.slug, { answers, flags, current, startedAt, deadline });
  }, [phase, answers, flags, current, startedAt, deadline, subject.slug, test.slug]);

  // the clock
  useEffect(() => {
    if (phase !== "running" || !deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase, deadline]);
  const remaining = deadline ? deadline - (now || Date.now()) : null;
  useEffect(() => {
    if (phase !== "running" || remaining === null) return;
    if (remaining <= 0) finish("time");
    else if (remaining <= ONE && !warned.current.one) {
      warned.current = { five: true, one: true };
      setAnnounce(t.warnOne);
    } else if (remaining <= FIVE && !warned.current.five) {
      warned.current.five = true;
      setAnnounce(t.warnFive);
    }
  }, [phase, remaining, finish, t.warnOne, t.warnFive]);

  // ask before the tab is closed or reloaded mid-test (progress is saved either way)
  useEffect(() => {
    if (phase !== "running") return;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase]);

  const go = useCallback(
    (i) => {
      if (i < 0 || i >= total) return;
      focusQuestion.current = true;
      setCurrent(i);
    },
    [total],
  );

  // after moving to a question, put focus on it and bring it into view if it is off screen
  useEffect(() => {
    if (phase !== "running" || !focusQuestion.current) return;
    focusQuestion.current = false;
    qRef.current?.focus({ preventScroll: true });
    const card = cardRef.current;
    if (!card) return;
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
    const top = card.getBoundingClientRect().top;
    if (top < offset + 72 || top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: window.scrollY + top - offset - 88, behavior: reduce ? "auto" : "smooth" });
    }
  }, [phase, current]);

  const q = questions[current];
  const pick = useCallback((qid, i) => setAnswers((a) => ({ ...a, [qid]: i })), []);
  const toggleFlag = useCallback((qid) => setFlags((f) => (f.includes(qid) ? f.filter((x) => x !== qid) : [...f, qid])), []);

  // keyboard: 1 to 4 or A to D answers, arrows move (outside the answer radios, which use arrows themselves), F flags
  useEffect(() => {
    if (phase !== "running" || finishOpen || navOpen) return;
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const el = e.target;
      const isRadio = el.tagName === "INPUT" && el.type === "radio";
      if ((el.tagName === "INPUT" && !isRadio) || el.tagName === "TEXTAREA" || el.isContentEditable) return;
      const k = e.key.toLowerCase();
      const n = /^[1-9]$/.test(k) ? Number(k) - 1 : /^[a-e]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
      if (n >= 0 && n < q.options.length) {
        e.preventDefault();
        pick(q.id, n);
      } else if (k === "f") {
        e.preventDefault();
        toggleFlag(q.id);
      } else if (!isRadio && e.key === "ArrowRight") {
        e.preventDefault();
        go(current + 1);
      } else if (!isRadio && e.key === "ArrowLeft") {
        e.preventDefault();
        go(current - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, finishOpen, navOpen, q, current, go, pick, toggleFlag]);

  const answeredCount = useMemo(() => questions.filter((x) => answers[x.id] !== undefined).length, [questions, answers]);
  const unanswered = useMemo(() => questions.map((x, i) => ({ id: x.id, i })).filter((x) => answers[x.id] === undefined), [questions, answers]);
  const flagged = useMemo(() => questions.map((x, i) => ({ id: x.id, i })).filter((x) => flags.includes(x.id)), [questions, flags]);

  if (phase === "finishing") {
    return (
      <div className="rt-tq__intro" role="status">
        <p className="rt-tq__intro-text">{testPrepPage.result.loading}</p>
      </div>
    );
  }

  if (phase !== "running") {
    const savedAnswered = saved ? Object.keys(saved.answers).length : 0;
    // "Before you start": the paper's key facts (the subject page's strip), the rules as a checklist, and the start panel
    // (Start test, or Resume / Start again with what was saved).
    return (
      <div className="rt-tq__start">
        <SubjectFacts facts={keyFacts} />
        <section className="rt-tq__brief" aria-labelledby="rt-tq-brief-h">
          <div className="rt-tq__brief-text">
            <h2 className="rt-tps__h2" id="rt-tq-brief-h">{t.introTitle}</h2>
            <ul className="rt-tq__checks">
              {t.rules.map((r) => <li key={r}><Check />{r}</li>)}
            </ul>
          </div>
          <div className="rt-tq__brief-go">
            {saved ? (
              <>
                <p className="rt-tq__resume" role="status">
                  {fill(t.resumeNote, { answered: savedAnswered, total, time: saved.deadline ? formatSpoken(saved.deadline - Date.now()) : "no limit" })}
                </p>
                <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => begin(saved)}>{t.resumeLabel}</button>
                <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-btn-block" onClick={restart}>{t.restartLabel}</button>
              </>
            ) : (
              <>
                <p className="rt-tq__brief-ready">{t.readyText}</p>
                <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => begin(null)}>{t.startLabel}</button>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  const sel = answers[q.id];
  const isFlagged = flags.includes(q.id);
  const warn = remaining !== null && remaining <= ONE ? " is-danger" : remaining !== null && remaining <= FIVE ? " is-warn" : "";
  const openFinish = () => {
    setNavOpen(false);
    setFinishOpen(true);
  };
  const jump = (i) => {
    setFinishOpen(false);
    setNavOpen(false);
    go(i);
  };

  return (
    <div className="rt-tq__grid">
      <div className="rt-tq__main">
        <div className="rt-tq__bar">
          <div className="rt-tq__progress">
            <span className="rt-tq__count">{fill(t.progress, { n: current + 1, total })}</span>
            <span className="rt-tq__track" aria-hidden="true"><span style={{ width: `${(answeredCount / total) * 100}%` }}></span></span>
          </div>
          {remaining !== null && (
            <div className={`rt-tq__timer${warn}`} role="timer" aria-label={`${t.timeLeft}: ${formatSpoken(remaining)}`}>
              <i className="icon-wall-clock" aria-hidden="true"></i>
              <span aria-hidden="true">{formatClock(remaining)}</span>
            </div>
          )}
          <button ref={navBtnRef} type="button" className="button -sm -outline-purple-1 text-purple-1 rt-tq__navbtn" aria-haspopup="dialog" onClick={() => setNavOpen(true)}>
            <i className="icon-list" aria-hidden="true"></i><span className="rt-tq__navbtn-label">{t.navOpenLabel}</span>
          </button>
        </div>

        <section className="rt-tq__card" ref={cardRef} aria-labelledby="rt-tq-q">
          <div className="rt-tq__card-head">
            <span className="rt-pill -accent">{`${current + 1} / ${total}`}</span>
            <button type="button" className={`button -sm rt-tq__flag ${isFlagged ? "-purple-1 text-white" : "-outline-purple-1 text-purple-1"}`} aria-pressed={isFlagged} onClick={() => toggleFlag(q.id)}>
              <i className="icon-flag" aria-hidden="true"></i>{isFlagged ? t.flaggedLabel : t.flagLabel}
            </button>
          </div>
          <fieldset className="rt-tq__fs">
            <legend className="rt-tq__legend-q">
              <h2 className="rt-tq__q" id="rt-tq-q" tabIndex={-1} ref={qRef}>{q.q}</h2>
            </legend>
            <div className="rt-tq__opts">
              {q.options.map((o, i) => (
                <label key={i} className={`rt-tq__opt${sel === i ? " is-selected" : ""}`}>
                  <input type="radio" name={`rt-tq-${q.id}`} value={i} checked={sel === i} onChange={() => pick(q.id, i)} />
                  <span className="rt-tq__letter" aria-hidden="true">{LETTERS[i]}</span>
                  <span className="rt-tq__text">{o}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="rt-tq__foot">
            <button type="button" className="button -md -outline-purple-1 text-purple-1" disabled={current === 0} onClick={() => go(current - 1)}>
              <i className="icon-chevron-left" aria-hidden="true"></i>{t.prevLabel}
            </button>
            {current < total - 1 ? (
              <button type="button" className="button -md -purple-1 text-white" onClick={() => go(current + 1)}>
                {t.nextLabel}<i className="icon-chevron-right" aria-hidden="true"></i>
              </button>
            ) : (
              <button type="button" className="button -md -purple-1 text-white" aria-haspopup="dialog" onClick={openFinish}>{t.finishLabel}</button>
            )}
          </div>
        </section>
        <p className="rt-tq__keys">{t.keysHint}</p>
      </div>

      <aside className="rt-tq__aside" aria-labelledby="rt-tq-nav-title">
        <div className="rt-tq__nav">
          <h2 className="rt-tq__nav-title" id="rt-tq-nav-title">{t.navTitle}</h2>
          <Navigator questions={questions} answers={answers} flags={flags} current={current} onGo={go} onFinish={openFinish} />
        </div>
      </aside>

      <Sheet open={navOpen} onClose={() => setNavOpen(false)} title={t.navTitle} closeLabel={t.closeLabel} className="rt-tq-sheet--nav">
        <Navigator questions={questions} answers={answers} flags={flags} current={current} onGo={jump} onFinish={openFinish} />
      </Sheet>

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title={t.finishTitle} closeLabel={t.closeLabel} fallbackFocus={navBtnRef}>
        <p className="rt-tq__dlg-text">{unanswered.length ? fill(t.finishSome, { answered: answeredCount, total }) : t.finishAllDone}</p>
        {[[t.finishUnanswered, unanswered], [t.finishFlagged, flagged]].map(([label, list]) =>
          list.length ? (
            <div className="rt-tq__dlg-group" key={label}>
              <h3 className="rt-tq__dlg-h">{`${label} (${list.length})`}</h3>
              <ul className="rt-tq__nums -compact">
                {list.map((x) => (
                  <li key={x.id}><button type="button" className="rt-tq__num" aria-label={`Go to question ${x.i + 1}`} onClick={() => jump(x.i)}>{x.i + 1}</button></li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
        <div className="rt-tq__dlg-actions">
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setFinishOpen(false)}>{t.keepGoingLabel}</button>
          <button type="button" className="button -md -purple-1 text-white" onClick={() => finish("finished")}>{t.confirmLabel}</button>
        </div>
      </Sheet>

      <p className="rt-cd__sr" aria-live="assertive">{announce}</p>
    </div>
  );
}
