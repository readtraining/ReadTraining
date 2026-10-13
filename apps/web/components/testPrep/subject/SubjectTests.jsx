import React from "react";
import Link from "next/link";
import { testPrepPage } from "@/data/testPrep";
import { formatDuration } from "@/lib/testPrep";
import { TESTS_ID } from "./scrollToTests";
import SubjectTestStatus from "./SubjectTestStatus";

// "<Subject> Mock Exams" as a study plan (the syllabus list used by learning platforms): a summary line, then one panel per
// unit with a numbered row per test. Tests named "<unit> (Test 3)" or "<unit> Mock Test 3" are grouped under "<unit>" and shown
// as "Test 3"; tests without a number (e.g. one per machine) form one list and keep their full names. Unit headers show only
// when there are two or more units (otherwise the section heading already names it). Each row is one link to the test page:
// number tile, name, facts (questions, time, pass mark), the reader's progress on this device, and home's round row arrow.
const TEST_N = /\s*(?:\(Test\s+(\d+)\)|(?:Mock\s+)?Test\s+(\d+))\s*$/i;
const pad = (n) => String(n).padStart(2, "0");

function groupTests(tests) {
  const groups = [];
  tests.forEach((x) => {
    const m = x.title.match(TEST_N);
    const num = m ? Number(m[1] || m[2]) : null;
    const unit = m ? x.title.replace(TEST_N, "").trim() : null; // null = a test without a number
    const row = { ...x, num, label: num ? `Test ${num}` : x.title };
    const last = groups[groups.length - 1];
    if (last && last.unit === unit) last.rows.push(row);
    else groups.push({ unit, rows: [row] });
  });
  // the tile shows the test's own number, or its place in the list when it has none
  groups.forEach((g) => g.rows.forEach((r, i) => { r.n = r.num || i + 1; }));
  return groups;
}

// A long list (5+ units, or 25+ tests across 2+ units) opens with jump links to each unit's panel, so nothing has to be
// hidden behind a dropdown: every test stays on the page and a reader can still go straight to their unit.
export const JUMP_MIN_UNITS = 5;
export const JUMP_MIN_TESTS = 25;
// "Unit 2 Principles of working..." -> "Unit 2"; a unit without a number keeps its name (the link truncates it)
const shortUnit = (name) => (name.match(/^unit\s*\d+/i) || [name])[0].replace(/^unit/i, "Unit");
const unitId = (i) => `unit-${i + 1}`;

// One test: no summary line ("1 free mock test" adds nothing), and a heading that only repeats the page title becomes
// "Your mock test", so the name is not shown again and again.
const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export default function SubjectTests({ heading, pageTitle, subject, tests }) {
  const t = testPrepPage.subject;
  const groups = groupTests(tests);
  const single = tests.length === 1;
  const title = single && norm(heading) === norm(pageTitle) ? t.singleHeading : heading;
  const marks = [...new Set(tests.map((x) => x.passMark).filter(Boolean))];
  const summary = [`${tests.length} ${t.free.toLowerCase()} mock ${tests.length === 1 ? "test" : "tests"}`, marks.length === 1 ? `Pass mark ${marks[0]}%` : null].filter(Boolean);
  const units = groups.filter((g) => g.unit).length;
  const showHeads = units > 1;
  const showJump = units > 1 && (units >= JUMP_MIN_UNITS || tests.length >= JUMP_MIN_TESTS);
  return (
    <section className="rt-tps__tests" aria-labelledby={TESTS_ID}>
      <h2 className="rt-tps__h2" id={TESTS_ID} tabIndex={-1}>{title}</h2>
      {!single && <p className="rt-tps__summary">{summary.join(" · ")}</p>}
      {showJump && (
        <nav className="rt-tps__units" aria-label="Jump to a unit">
          <ul>
            {groups.map((g, i) => g.unit && (
              <li key={g.rows[0].slug}>
                <a href={`#${unitId(i)}`} title={g.unit}>
                  <span className="rt-tps__units-name">{shortUnit(g.unit)}</span>
                  <span className="rt-sr">, </span>
                  <span className="rt-tps__units-count">{g.rows.length} {g.rows.length === 1 ? "test" : "tests"}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="rt-tps__groups">
        {groups.map((g, i) => (
          <div key={g.rows[0].slug} className="rt-tps__group" id={showJump && g.unit ? unitId(i) : undefined}>
            {showHeads && g.unit && (
              <div className="rt-tps__group-head">
                <h3 className="rt-tps__group-title">{g.unit}</h3>
                <span className="rt-tps__group-count">{g.rows.length} {g.rows.length === 1 ? "test" : "tests"}</span>
              </div>
            )}
            <ol className="rt-tps__rows">
              {g.rows.map((x) => {
                const facts = [x.questions ? `${x.questions} questions` : null, formatDuration(x.minutes) || null, x.passMark ? `Pass mark ${x.passMark}%` : null].filter(Boolean);
                return (
                  <li key={x.slug}>
                    <Link href={x.href} className="rt-tps__row">
                      <span className="rt-tps__num" aria-hidden="true">{pad(x.n)}</span>
                      <span className="rt-tps__row-text">
                        {g.unit && <span className="rt-sr">{g.unit}, </span>}
                        <span className="rt-tps__row-title">{x.label}</span>
                        {facts.length > 0 && (
                          <span className="rt-tps__row-meta">
                            {/* hidden commas, so a screen reader hears "Test 1, 72 questions, 1 hour 50 minutes, Pass mark 70%" */}
                            {facts.map((f) => <span key={f}><span className="rt-sr">, </span>{f}</span>)}
                          </span>
                        )}
                      </span>
                      <SubjectTestStatus subject={subject} test={x.slug} />
                      <span className="rt-tps__row-go" aria-hidden="true"><i className="icon-arrow-right"></i></span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
