"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEndpoints } from "@/lib/courseEditorApi";
import { errorsFrom } from "@/lib/useMe";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import TextArea from "@/components/forms/TextArea";
import { Toggle } from "./providerParts";

// The shared page editor's Course guide step: the guide's sections (API admin.courses.saveGuide; their shape and rules are
// apps/api/src/lib/courseGuide.mts, the page shows them in components/courseDetail/CourseGuide.jsx). Every section is optional:
// switched on, it shows its fields; switched off, it leaves the page. Prices are never typed: a package adds to each date's own
// price, and the costs are worked out from the live dates. Kept open (hidden) on the other steps as
// the SEO step is, so the bar's Save saves it (`saveRef`, `onState`). Built from the editor's own parts: a card per section
// (.rt-acc__card), the switches (Toggle), .rt-field fields, and the price plan editor's package cards (.rt-pws-pkg__tier) for
// each item of a list.

// A field: `text` (one line), `area` (a box: paragraphs, and "- " lines for a list), `lines` (one item per line), `money`
// (pounds), `check` (a switch), `rows` (a list of items with `fields`), `group` (fields together; `optional`: switched on and off).
const T = (key, label, max, hint) => ({ key, label, type: "text", max, hint });
const A = (key, label, max, hint) => ({ key, label, type: "area", max, hint });
const L = (key, label, hint) => ({ key, label, type: "lines", hint });
const TITLE = T("title", "Heading", 120);
const LIST_HINT = "One per line.";
const TEXT_HINT = "A blank line starts a new paragraph. Lines starting with \"- \" show as a list. [words](/course/...) or [words](https://...) makes a link.";

export const GUIDE_SECTIONS = [
  { key: "heroTitle", label: "Hero heading", hint: "The page's main heading, in place of the course name (which stays everywhere else).", field: T("heroTitle", "Heading", 120) },
  { key: "trust", label: "Trust strip", hint: "Short lines in the hero, under its buttons, shown one after another with dots between them.", field: L("trust", "Lines", "One per line, up to 6 (60 characters each).") },
  {
    key: "compare", label: "Comparison table", hint: "A table comparing options (licences, fees), after Who is this course for.",
    fields: [TITLE, A("intro", "Line under the heading", 600), L("columns", "Column headings", LIST_HINT), { key: "rows", label: "Rows", type: "rows", item: "row", fields: [T("label", "Row label", 120), L("cells", "Cells", "One per column after the first. Yes or No shows a tick or a cross.")] }, T("note", "Note under the table", 400)],
  },
  { key: "unitsIntro", label: "Syllabus intro", hint: "A line above the syllabus units.", field: A("unitsIntro", "Text", 600) },
  { key: "week", label: "Course week", hint: "What happens on each day.", fields: [TITLE, { key: "items", label: "Days", type: "rows", item: "day", fields: [T("day", "Day", 40), T("text", "What happens", 200)] }, T("note", "Note", 300)] },
  { key: "included", label: "What's included", fields: [TITLE, L("items", "Items", LIST_HINT)] },
  {
    key: "exams", label: "Exam table extras", hint: "One more column for the exam table, matched to its rows by the unit's name (Syllabus and exam). A row whose name isn't here leaves the column out.",
    fields: [A("intro", "Text above the table", 1200, TEXT_HINT), T("column", "Column heading", 30, "Questions unless you name another, such as Assessment."), { key: "units", label: "Units", type: "rows", item: "unit", fields: [T("unit", "Unit name, as in the exam table", 120), T("value", "Column value", 120, "For Questions: a number, or — for a practical assessment.")] }],
  },
  {
    key: "packages", label: "Packages", hint: "Packages learners choose when they book a date. Each one is the date's own price plus what it adds; one with no price yet shows \"Price not set yet\" and isn't offered when booking until it has one. A date on a provider's price plan keeps that plan. Team training isn't a package: it is in Learning options, priced by quote.",
    fields: [TITLE, A("intro", "Line under the heading", 600), { key: "items", label: "Packages", type: "rows", item: "package", most: 6, fields: [T("name", "Name", 60), T("text", "Best for", 200), L("points", "What's in it", LIST_HINT), { key: "add", label: "Adds to the date's price (£)", type: "money", hint: "Leave it empty while the price isn't set." }, T("badge", "Badge", 30, "For example: Most popular"), { key: "firstAid", label: "Includes Emergency First Aid at Work (the basket then doesn't ask about first aid)", type: "check" }] }, T("note", "Note", 400)],
  },
  {
    key: "business", label: "Team training", hint: "A section for employers.",
    fields: [TITLE, A("intro", "Line under the heading", 800), { key: "benefits", label: "Benefits", type: "rows", item: "benefit", fields: [T("title", "Benefit", 60), T("text", "Text", 200)] }, { key: "tiers", label: "Volume savings", type: "rows", item: "saving", fields: [T("learners", "Group size", 40), T("saving", "Saving", 40)] }, T("account", "Account line", 200), T("signIn", "Line for business account holders", 120), { key: "quote", label: "Quote", type: "group", fields: [T("title", "Heading", 60), T("text", "Line", 200), T("cta", "Button words", 40)] }],
  },
  { key: "licence", label: "Steps", hint: "Numbered steps (how to get or renew a licence), with a tip under them.", fields: [TITLE, { key: "steps", label: "Steps", type: "rows", item: "step", fields: [T("title", "Step", 80), A("text", "Text", 400)] }, A("note", "Tip under the steps", 400)] },
  {
    key: "costs", label: "Cost table", hint: "What it costs in total. The course row and the total are worked out from the live prices.",
    fields: [
      TITLE, A("intro", "Line under the heading", 400), T("courseLabel", "Course row label", 80, "Empty: the course name."),
      { key: "firstAid", label: "First aid row", type: "group", optional: true, fields: [T("label", "Label", 80), { key: "from", label: "From (£)", type: "money" }] },
      { key: "rows", label: "Other rows", type: "rows", item: "row", fields: [T("label", "Cost", 80), T("value", "Price", 60, "For example: Free")] },
      { key: "licenceFee", label: "Licence fee row", type: "group", optional: true, fields: [T("label", "Label", 80), { key: "amount", label: "Amount (£)", type: "money" }] },
      A("note", "Note under the table", 400),
    ],
  },
  { key: "careers", label: "Careers", fields: [TITLE, A("text", "Text", 800), L("areas", "Areas of work", LIST_HINT), A("roles", "Roles", 400), T("cta", "Link words", 40), T("href", "Link address", 200, "A page on this site, starting /")] },
];

// ---- the guide as the form holds it, and as it is saved ------------------------------------------------------------------------

const blank = (f) => (f.type === "lines" ? [] : f.type === "rows" ? [blankRow(f)] : f.type === "money" ? "0" : f.type === "check" ? false : f.type === "group" ? (f.optional ? undefined : blankObj(f.fields)) : "");
const blankObj = (fields) => Object.fromEntries(fields.map((f) => [f.key, blank(f)]).filter(([, v]) => v !== undefined));
const blankRow = (f) => blankObj(f.fields);
const startOf = (s) => (s.field ? "" : s.list ? [blankObj(s.list.fields)] : blankObj(s.fields));

// one value as saved: words trimmed, empty ones left out, lists without empty lines, pounds as numbers, empty rows dropped
function cleanValue(f, v) {
  if (f.type === "lines") return (v || []).map((x) => String(x).trim()).filter(Boolean);
  if (f.type === "money") return v === "" || v == null ? undefined : Number(v);
  if (f.type === "check") return Boolean(v);
  if (f.type === "rows") return (v || []).map((r) => cleanObj(f.fields, r)).filter((r) => r && Object.keys(r).length);
  if (f.type === "group") return v ? cleanObj(f.fields, v) : undefined;
  const t = String(v ?? "").trim();
  return t || undefined;
}
function cleanObj(fields, obj) {
  const out = { ...obj };
  for (const f of fields) {
    const c = cleanValue(f, obj?.[f.key]);
    if (c === undefined || (Array.isArray(c) && !c.length && f.type !== "lines")) delete out[f.key];
    else out[f.key] = c;
  }
  // a row with nothing typed in it (a switch alone isn't anything typed)
  const typed = fields.some((f) => f.type !== "check" && out[f.key] !== undefined && !(Array.isArray(out[f.key]) && !out[f.key].length));
  return typed ? out : null;
}
/** The form's guide as it is saved: switched-off sections left out; null when nothing is left. */
export function cleanGuide(g) {
  const out = {};
  for (const s of GUIDE_SECTIONS) {
    if (g[s.key] === undefined) continue;
    const v = s.field ? cleanValue(s.field, g[s.key]) : s.list ? cleanValue({ type: "rows", fields: s.list.fields }, g[s.key]) : cleanObj(s.fields, g[s.key]);
    if (v !== undefined && v !== null && !(Array.isArray(v) && !v.length)) out[s.key] = v;
  }
  return Object.keys(out).length ? out : null;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// ---- the form --------------------------------------------------------------------------------------------------------------

export function GuidePanel({ course, onSaved, onState, saveRef }) {
  const ep = useEndpoints();
  const [guide, setGuide] = useState(() => course.guide || {});
  const [saved, setSaved] = useState(() => course.guide || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errRef = useRef(null);
  const dirty = !same(cleanGuide(guide), cleanGuide(saved || {}));
  useUnsavedChanges(dirty);
  useEffect(() => { onState?.({ dirty, busy }); }, [dirty, busy]); // eslint-disable-line react-hooks/exhaustive-deps -- onState is the editor's setter
  // a newer guide (saved in another tab, or by a colleague) shows here while nothing is typed
  const savedKey = JSON.stringify(course.guide || null);
  useEffect(() => {
    if (dirty) return;
    setSaved(course.guide || null);
    setGuide(course.guide || {});
  }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the saved guide changes

  const save = () => {
    const clean = cleanGuide(guide);
    setError("");
    setBusy(true);
    return ep.saveGuide(clean)
      .then(() => { setSaved(clean); setGuide(clean || {}); ep.refresh(); onSaved("Course guide saved. The page shows it now."); return true; })
      .catch((err) => {
        if (ep.stale(err)) return false; // changed somewhere else: the editor's banner says so
        const { fields, general } = errorsFrom(err);
        setError(general || Object.values(fields)[0] || "We couldn't save the course guide. Check your connection, then try again.");
        requestAnimationFrame(() => { errRef.current?.scrollIntoView({ block: "center" }); errRef.current?.focus({ preventScroll: true }); });
        return false;
      })
      .finally(() => setBusy(false));
  };
  useEffect(() => { if (saveRef) saveRef.current = save; });
  const locked = !ep.access.page;
  const setKey = (key) => (value) => setGuide((g) => (value === undefined ? Object.fromEntries(Object.entries(g).filter(([k]) => k !== key)) : { ...g, [key]: value }));

  return (
    <div className="rt-q__form">
      {error && <p className="rt-q__err" role="alert" tabIndex={-1} ref={errRef}><span className="rt-sr">Error: </span>{error}</p>}
      {GUIDE_SECTIONS.map((s) => {
        const on = guide[s.key] !== undefined;
        const id = `rt-pws-guide-${s.key}`;
        return (
          <fieldset key={s.key} className="rt-acc__card">
            <legend className="rt-sr">{s.label}</legend>
            <Toggle id={`${id}-on`} checked={on} disabled={locked} onChange={(v) => setKey(s.key)(v ? startOf(s) : undefined)} label={s.label} hint={s.hint} />
            {on && (
              <div className="rt-q__form">
                {s.field ? (
                  <Field f={s.field} id={id} value={guide[s.key]} onChange={setKey(s.key)} locked={locked} />
                ) : s.list ? (
                  <Rows f={{ key: s.key, label: s.label, item: s.list.item, fields: s.list.fields }} id={id} value={guide[s.key]} onChange={setKey(s.key)} locked={locked} />
                ) : (
                  <Fields fields={s.fields} id={id} value={guide[s.key]} onChange={setKey(s.key)} locked={locked} />
                )}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

function Fields({ fields, id, value, onChange, locked }) {
  const obj = value || {};
  return fields.map((f) => <Field key={f.key} f={f} id={`${id}-${f.key}`} value={obj[f.key]} onChange={(v) => onChange({ ...obj, [f.key]: v })} locked={locked} />);
}

function Field({ f, id, value, onChange, locked }) {
  if (f.type === "rows") return <Rows f={f} id={id} value={value} onChange={onChange} locked={locked} />;
  if (f.type === "group") {
    const on = value !== undefined;
    return (
      <div className="rt-q__form">
        {f.optional ? <Toggle id={`${id}-on`} checked={on} disabled={locked} onChange={(v) => onChange(v ? blankObj(f.fields) : undefined)} label={f.label} /> : <p className="rt-pws-pkg__h3">{f.label}</p>}
        {on && <Fields fields={f.fields} id={id} value={value} onChange={onChange} locked={locked} />}
      </div>
    );
  }
  if (f.type === "check") return <Toggle id={id} checked={Boolean(value)} disabled={locked} onChange={onChange} label={f.label} />;
  const hint = f.hint ? <span className="rt-field__hint" id={`${id}-h`}>{f.hint}</span> : null;
  const described = f.hint ? `${id}-h` : undefined;
  if (f.type === "area" || f.type === "lines") {
    const text = f.type === "lines" ? (value || []).join("\n") : value ?? "";
    return (
      <div className="rt-field">
        <label htmlFor={id}>{f.label}</label>
        {hint}
        <TextArea id={id} rows={f.type === "lines" ? 4 : 3} maxLength={f.max} value={text} disabled={locked} aria-describedby={described}
          onChange={(e) => onChange(f.type === "lines" ? e.target.value.split("\n") : e.target.value)} />
      </div>
    );
  }
  return (
    <div className="rt-field">
      <label htmlFor={id}>{f.label}</label>
      {hint}
      <input id={id} type="text" inputMode={f.type === "money" ? "decimal" : undefined} maxLength={f.max} value={value ?? ""} disabled={locked} autoComplete="off" aria-describedby={described}
        onChange={(e) => onChange(f.type === "money" ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)} />
    </div>
  );
}

// A list of items (packages, steps, rows), each in the price plan editor's package card with up, down and remove; Add another
// under them.
function Rows({ f, id, value, onChange, locked }) {
  const rows = value || [];
  const most = f.most ?? 20;
  const move = (i, by) => {
    const next = [...rows];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
  };
  return (
    <div className="rt-q__form">
      <p className="rt-pws-pkg__h3">{f.label}</p>
      {rows.map((r, i) => (
        <div key={i} className="rt-pws-pkg__tier" role="group" aria-label={`${f.item} ${i + 1}`}>
          <div className="rt-pws-pkg__tierhead">
            <span>{f.item.charAt(0).toUpperCase() + f.item.slice(1)} {i + 1}</span>
            {!locked && (
              <span className="rt-pws-course-list__tools">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${f.item} ${i + 1} up`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${f.item} ${i + 1} down`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove ${f.item} ${i + 1}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
              </span>
            )}
          </div>
          <Fields fields={f.fields} id={`${id}-${i}`} value={r} onChange={(v) => onChange(rows.map((x, j) => (j === i ? v : x)))} locked={locked} />
        </div>
      ))}
      {!locked && rows.length < most && (
        <div><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => onChange([...rows, blankRow(f)])}>Add {rows.length ? "another" : "a"} {f.item}</button></div>
      )}
    </div>
  );
}
