"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet, { DISCARD_MESSAGE } from "@/components/testPrep/runner/Sheet";
import { errorsFrom } from "@/lib/useMe";
import { api } from "@/lib/trpc/react";
import { contentDefaults } from "@/data/home";
import { formatPrice } from "@/lib/format";
import { focusFirstError } from "@/lib/focusFirstError";
import TextArea from "@/components/forms/TextArea";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { Confirm, Counter, Field, aria } from "./settingsForm";
import { Toggle } from "./providerParts";
import LineList from "./LineList";

// A shared page's optional sections (its Course guide: API admin.courses.saveGuide; their shape and rules are
// apps/api/src/lib/courseGuide.mts, the page shows them in components/courseDetail/CourseGuide.jsx). Each one sits in the editor
// step for its part of the page (`step`): the top of the page on Course landing page, the comparison, course week and what's
// included on Course information, and a step of their own, Licence, costs and careers (team training, the licence steps, the cost
// table and careers). A shared page lists every provider's dates, so none of them is a price, a package or a bundle: those are
// each provider's own (its dates and price plans). In a step a section
// is one compact card (GuideExtras): its name with its switch and what it holds. Add and Edit open
// it in a pop-up made for what it is: a table for the comparison, the course week and the costs, titled groups for the licence
// steps, and the course editor's lists for items. The pop-up's Save saves the section at once (no approval, logged), and Remove asks first, then saves.
// Prices are never typed: the cost table's course and first aid rows come from live prices, and the licence fee and the team
// training words are the site's own (Site content), picked or switched on here.

// The sections, in the page's order. `step`: the editor step that holds it; `anchor`: its
// heading on the page, for "View on page" ("" the top); `toggle`: nothing to fill in, only added or not (the words are the site's);
// `wide`: its pop-up is the wide one (a table or cards side by side).
export const GUIDE_SECTIONS = [
  { key: "heroTitle", step: "landing", label: "Main heading", anchor: "" },
  { key: "trust", step: "landing", label: "Trust strip", anchor: "" },
  { key: "compare", step: "info", label: "Comparison table", anchor: "rt-cg-compare-h", wide: true },
  { key: "week", step: "info", label: "Course week", anchor: "rt-cg-week-h", wide: true },
  { key: "included", step: "info", label: "What's included", anchor: "rt-cg-incl-h" },
  { key: "business", step: "after", label: "Team training", anchor: "business", toggle: true, edit: "/admin/content?tab=teamTraining" },
  { key: "licence", step: "after", label: "Licence steps", anchor: "licence" },
  { key: "costs", step: "after", label: "Cost table", anchor: "costs", wide: true },
  { key: "careers", step: "after", label: "Careers", anchor: "rt-cg-career-h" },
];

export const stepOfSection = (key) => GUIDE_SECTIONS.find((s) => s.key === key)?.step || null;
/** The sections a saved guide has, in the page's order (`step`: only that step's). */
export const addedSections = (guide, step) => GUIDE_SECTIONS.filter((s) => (!step || s.step === step) && guide?.[s.key] !== undefined);

// ---- each section as its pop-up holds it, and as it is saved ---------------------------------------------------------------

const text = (v) => String(v ?? "").trim();
const lines = (a) => (a || []).map(text).filter(Boolean);
const opt = (v) => text(v) || undefined;

// A blank section, and a saved one, as its pop-up's draft (lists never missing)
function draftOf(key, v) {
  switch (key) {
    case "heroTitle": return v || "";
    case "trust": return v || [];
    case "compare": {
      const columns = v?.columns?.length ? [...v.columns] : ["", "", ""];
      return { title: v?.title || "", intro: v?.intro || "", note: v?.note || "", columns, rows: (v?.rows?.length ? v.rows : [{ label: "", cells: [] }]).map((r) => ({ label: r.label, cells: columns.slice(1).map((_, i) => r.cells?.[i] ?? "") })) };
    }
    case "week": return { title: v?.title || "", note: v?.note || "", items: v?.items?.length ? v.items.map((x) => ({ ...x })) : [{ day: "", text: "" }] };
    case "included": return { title: v?.title || "What's included", items: v?.items || [] };
    case "licence": return { title: v?.title || "", note: v?.note || "", steps: v?.steps?.length ? v.steps.map((x) => ({ ...x })) : [{ title: "", text: "" }] };
    case "costs": return {
      title: v?.title || "What does it cost in total?", intro: v?.intro || "", note: v?.note || "", courseLabel: v?.courseLabel || "",
      firstAid: v?.firstAid ? { label: v.firstAid.label } : null,
      rows: (v?.rows || []).map((r) => ({ ...r })),
      licenceFee: v?.licenceFee ? { label: v.licenceFee.label || "", fee: v.licenceFee.fee || "" } : null,
    };
    case "careers": return { title: v?.title || "", text: v?.text || "", areas: v?.areas || [], roles: v?.roles || "", cta: v?.cta || "", href: v?.href || "" };
    default: return v;
  }
}

// The draft as it is saved (words trimmed, empty ones left out)
function cleanOf(key, d) {
  switch (key) {
    case "heroTitle": return text(d);
    case "trust": return lines(d);
    case "compare": return { title: text(d.title), intro: opt(d.intro), note: opt(d.note), columns: d.columns.map(text), rows: d.rows.map((r) => ({ label: text(r.label), cells: r.cells.map(text) })) };
    case "week": return { title: text(d.title), note: opt(d.note), items: d.items.map((x) => ({ day: text(x.day), text: text(x.text) })) };
    case "included": return { title: text(d.title), items: lines(d.items) };
    case "licence": return { title: text(d.title), note: opt(d.note), steps: d.steps.map((x) => ({ title: text(x.title), text: text(x.text) })) };
    case "costs": return {
      title: text(d.title), intro: opt(d.intro), note: opt(d.note), courseLabel: opt(d.courseLabel),
      ...(d.firstAid ? { firstAid: { label: text(d.firstAid.label) } } : {}),
      rows: d.rows.map((r) => ({ label: text(r.label), value: text(r.value) })),
      ...(d.licenceFee ? { licenceFee: { label: text(d.licenceFee.label), fee: d.licenceFee.fee } } : {}),
    };
    case "careers": return { title: text(d.title), text: text(d.text), areas: lines(d.areas), roles: opt(d.roles), cta: opt(d.cta), href: opt(d.href) };
    default: return d;
  }
}

// What the draft still needs before it can be saved, as { field id: message } (the API checks the same: lib/courseGuide.mts)
function problemsOf(key, d) {
  const e = {};
  const need = (id, v, what) => { if (!text(v)) e[id] = `Enter ${what}.`; };
  if (key === "heroTitle") need("g-hero", d, "the heading");
  if (key === "trust" && !lines(d).length) e["g-trust"] = "Add at least one line.";
  if (["compare", "week", "included", "licence", "costs", "careers"].includes(key)) need("g-title", d.title, "the heading");
  if (key === "compare") {
    d.columns.forEach((c, i) => need(`g-col${i}`, c, "the column heading"));
    d.rows.forEach((r, i) => { need(`g-row${i}`, r.label, "the row label"); r.cells.forEach((c, j) => need(`g-cell${i}-${j}`, c, "Yes, No or a few words")); });
  }
  if (key === "week") d.items.forEach((x, i) => { need(`g-day${i}`, x.day, "the day"); need(`g-what${i}`, x.text, "what happens"); });
  if (key === "included" && !lines(d.items).length) e["g-items"] = "Add at least one item.";
  if (key === "licence") d.steps.forEach((x, i) => { need(`g-step${i}`, x.title, "the step"); need(`g-steptext${i}`, x.text, "what happens in this step"); });
  if (key === "costs") {
    if (d.firstAid) need("g-fa-label", d.firstAid.label, "the row's name");
    d.rows.forEach((r, i) => { need(`g-crow${i}`, r.label, "what the cost is"); need(`g-cval${i}`, r.value, "the price, or words like Free"); });
    if (d.licenceFee) { need("g-lf-label", d.licenceFee.label, "the row's name"); if (!d.licenceFee.fee) e["g-lf-fee"] = "Choose the licence fee."; }
  }
  if (key === "careers") need("g-text", d.text, "the text");
  return e;
}

// what an added section holds, in a few words (shown on its card)
const n = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
function summaryOf(s, v, fees) {
  if (s.toggle) return "";
  if (s.key === "heroTitle") return v;
  if (s.key === "trust") return (v || []).join(" · ");
  if (s.key === "compare") return [v.title, n(v.rows?.length || 0, "row"), n(v.columns?.length || 0, "column")].join(" · ");
  if (s.key === "week") return [v.title, n(v.items?.length || 0, "day")].join(" · ");
  if (s.key === "included") return [v.title, n(v.items?.length || 0, "item")].join(" · ");
  if (s.key === "costs") {
    const fee = v.licenceFee && fees.find((f) => f.key === v.licenceFee.fee);
    return [v.title, v.firstAid && "first aid row", fee && `${fee.name} ${formatPrice(fee.amount)}`, v.rows?.length && n(v.rows.length, "other row")].filter(Boolean).join(" · ");
  }
  if (s.key === "licence") return [v.title, n(v.steps?.length || 0, "step")].join(" · ");
  if (s.key === "careers") return [v.title, n(v.areas?.length || 0, "area of work", "areas of work")].join(" · ");
  return "";
}

// ---- the saved guide, held by the editor -------------------------------------------------------------------------------------

/**
 * The shared page's guide for the editor's steps. `ep`: the editor's endpoints (lib/courseEditorApi.js). `saveSection(key,
 * value, message)` saves the guide with that section (undefined takes it off) and resolves to "" or what went wrong ("stale":
 * changed somewhere else, which the editor's banner says); `reset(course)` starts again from a course loaded again ("Load the
 * latest version"). Each section is saved from its own pop-up, so nothing here is ever unsaved (`dirty` is always false).
 */
export function useGuideForm({ ep, course, onSaved }) {
  const [saved, setSaved] = useState(() => course?.guide || null);
  const [busy, setBusy] = useState(false);
  const savedKey = JSON.stringify(course?.guide || null);
  useEffect(() => { setSaved(course?.guide || null); }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the saved guide changes
  const saveSection = async (key, value, message) => {
    const next = { ...(saved || {}) };
    if (value === undefined) delete next[key];
    else next[key] = value;
    const ordered = Object.fromEntries(GUIDE_SECTIONS.filter((s) => next[s.key] !== undefined).map((s) => [s.key, next[s.key]]));
    const clean = Object.keys(ordered).length ? ordered : null;
    setBusy(true);
    try {
      await ep.saveGuide(clean);
      setSaved(clean);
      ep.refresh();
      onSaved?.(message);
      return "";
    } catch (err) {
      if (ep.stale(err)) return "stale";
      const { fields, general } = errorsFrom(err);
      return Object.values(fields)[0] || general || "We couldn't save it. Check your connection, then try again.";
    } finally {
      setBusy(false);
    }
  };
  return { saved, busy, saveSection, dirty: false, reset: (fresh) => setSaved(fresh?.guide || null), locked: !ep.access.page };
}

// ---- the sections of one step --------------------------------------------------------------------------------------------

/**
 * One step's optional sections, each a compact card. `own`: the step is only these (Licence, costs and careers): its
 * card has the step's heading; otherwise they are a card of their own under the step's fields. `onView(anchor)`: the Preview at
 * that section. `pageTitle`: the page's name (the cost table's course row says it when it has no label of its own).
 */
export function GuideExtras({ form, step, own, onView, pageTitle }) {
  const list = GUIDE_SECTIONS.filter((s) => s.step === step);
  if (!list.length) return null;
  const hid = own ? `rt-pws-ce-${step}-h` : `rt-pws-ce-${step}-x`;
  return (
    <section className="rt-acc__card rt-pws-course-form" aria-labelledby={hid}>
      <h2 className="rt-acc__h2" id={hid}>{own ? own.title : "Optional sections"}</h2>
      {own?.note && <p className="rt-acc__note">{own.note}</p>}
      <ul className="rt-pws-extras">
        {list.map((s) => <ExtraCard key={s.key} s={s} form={form} onView={onView} pageTitle={pageTitle} />)}
      </ul>
    </section>
  );
}

function ExtraCard({ s, form, onView, pageTitle }) {
  const fees = useLicenceFees();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const value = form.saved?.[s.key];
  const on = value !== undefined;
  const id = `rt-pws-guide-${s.key}`;
  const save = async (v, message) => {
    setError("");
    const problem = await form.saveSection(s.key, v, message);
    if (problem && problem !== "stale") setError(problem);
    return problem;
  };
  const add = () => (s.toggle ? save(true, `${s.label} added. The page shows it now.`) : setEditing(true));
  const remove = async () => {
    const problem = await save(undefined, `${s.label} removed from the page.`);
    if (!problem || problem === "stale") setRemoving(false);
  };
  return (
    <li id={id} className={`rt-pws-extra${on ? " is-on" : ""}`}>
      <div className="rt-pws-extra__head">
        <Toggle id={`${id}-on`} checked={on} disabled={form.locked || form.busy} onChange={(v) => (v ? add() : setRemoving(true))} label={s.label} />
        {on && !form.locked && (
          <div className="rt-pws-extra__actions">
            {!s.toggle && <button type="button" className="rt-pws-ce__iconbtn" onClick={() => setEditing(true)} aria-haspopup="dialog" aria-label={`Edit: ${s.label}`} title="Edit"><i className="icon-edit text-14" aria-hidden="true"></i></button>}
            <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => setRemoving(true)} aria-haspopup="dialog" aria-label={`Remove: ${s.label}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
          </div>
        )}
      </div>
      {on && (
        <div className="rt-pws-extra__body">
          {summaryOf(s, value, fees) && <p className="rt-pws-extra__sum">{summaryOf(s, value, fees)}</p>}
          <p className="rt-pws-extra__links">
            {s.toggle && <Link href={s.edit} className="fb-textlink">Edit the words</Link>}
            {onView && <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => onView(s.anchor)}>View on page<span className="rt-sr">: {s.label} (opens in a new tab)</span></button>}
          </p>
        </div>
      )}
      {error && !editing && !removing && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      {!s.toggle && <SectionSheet s={s} open={editing} value={value} fees={fees} pageTitle={pageTitle} onClose={() => setEditing(false)} onSave={(v) => save(v, `${s.label} saved. The page shows it now.`)} />}
      <Confirm danger open={removing} onClose={() => { setRemoving(false); setError(""); }} busy={form.busy} error={removing ? error : ""}
        title={`Remove ${s.label.toLowerCase()}?`} text="It comes off the page straight away." confirmLabel="Remove" onConfirm={remove} />
    </li>
  );
}

// The site's licence fees (Site content › Licence fees), as saved, else the built-in list
function useLicenceFees() {
  const site = api.content.site.useQuery(undefined, { staleTime: 60_000 });
  return site.data?.licenceFees?.items || contentDefaults.licenceFees.items;
}

// ---- one section's pop-up ------------------------------------------------------------------------------------------------

function SectionSheet({ s, open, value, fees, pageTitle, onClose, onSave }) {
  const [draft, setDraft] = useState(() => draftOf(s.key, value));
  const [start, setStart] = useState(draft);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const d = draftOf(s.key, value);
    setDraft(d);
    setStart(d);
    setErrors({});
    setGeneral("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- a fresh draft each time it opens
  const dirty = JSON.stringify(draft) !== JSON.stringify(start);
  const submit = async (e) => {
    e.preventDefault();
    const found = problemsOf(s.key, draft);
    setErrors(found);
    setGeneral("");
    if (Object.keys(found).length) return requestAnimationFrame(() => focusFirstError(formRef.current));
    setSaving(true);
    const problem = await onSave(cleanOf(s.key, draft));
    setSaving(false);
    if (!problem || problem === "stale") return onClose();
    setGeneral(problem);
  };
  const set = (patch) => setDraft((d) => (typeof patch === "function" ? patch(d) : { ...d, ...patch }));
  const clear = (id) => setErrors((x) => (x[id] ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== id)) : x));
  const props = { d: draft, set, errors, clear, fees, pageTitle };
  return (
    <Sheet open={open} onClose={onClose} title={value === undefined ? `Add ${s.label.toLowerCase()}` : s.label} closeLabel="Close" className={s.wide ? "rt-pws-pkg__sheet" : ""} unsaved={dirty} busy={saving}>
      <form className="rt-q__form rt-pws-gx" onSubmit={submit} noValidate ref={formRef}>
        {general && <p className="rt-acc__notice -warn" role="alert">{general}</p>}
        {s.key === "heroTitle" && <HeroEditor {...props} />}
        {s.key === "trust" && <TrustEditor {...props} />}
        {s.key === "compare" && <CompareEditor {...props} />}
        {s.key === "week" && <WeekEditor {...props} />}
        {s.key === "included" && <IncludedEditor {...props} />}
        {s.key === "licence" && <StepsEditor {...props} />}
        {s.key === "costs" && <CostsEditor {...props} />}
        {s.key === "careers" && <CareersEditor {...props} />}
        <div className="rt-pws-set__actions">
          <button type="submit" className="button -md -purple-1 text-white" disabled={saving} aria-busy={saving || undefined}>{saving ? "Saving…" : value === undefined ? "Add to the page" : "Save"}</button>
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => (!dirty || window.confirm(DISCARD_MESSAGE)) && onClose()} disabled={saving}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

// ---- the editors ------------------------------------------------------------------------------------------------------------

// a text field with its label, hint, error and (a box with `max`) a count
function Text({ id, label, value, onChange, errors, clear, max, hint, required, area, rows = 3, placeholder }) {
  const err = errors?.[id];
  return (
    <Field id={id} label={label} hint={hint} error={err} required={required} count={max && area ? <Counter value={value || ""} max={max} /> : null}>
      {area
        ? <TextArea {...aria(id, err, hint)} rows={rows} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => { onChange(e.target.value); clear?.(id); }} />
        : <input {...aria(id, err, hint)} type="text" maxLength={max} autoComplete="off" value={value} placeholder={placeholder} onChange={(e) => { onChange(e.target.value); clear?.(id); }} />}
    </Field>
  );
}

// the up, down and remove buttons of a row in a table or list
function RowTools({ i, count, name, onMove, onRemove, min = 1 }) {
  return (
    <span className="rt-pws-gx__tools">
      {onMove && <button type="button" className="rt-pws-ce__iconbtn" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label={`Move up: ${name}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>}
      {onMove && <button type="button" className="rt-pws-ce__iconbtn" onClick={() => onMove(i, 1)} disabled={i === count - 1} aria-label={`Move down: ${name}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>}
      <Bin onClick={() => onRemove(i)} disabled={count <= min} name={name} />
    </span>
  );
}
const Bin = ({ onClick, name, disabled }) => (
  <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={onClick} disabled={disabled} aria-label={`Remove ${name}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
);
const moved = (list, i, by) => {
  const next = [...list];
  const [x] = next.splice(i, 1);
  next.splice(i + by, 0, x);
  return next;
};
// a text box inside a table cell, with its error above it
function CellInput({ id, label, value, onChange, errors, clear, max, placeholder, strong }) {
  const err = errors?.[id];
  return (
    <>
      {err && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{err}</p>}
      <label htmlFor={id} className="rt-sr">{label}</label>
      <input id={id} className={`rt-pws-gx__input${strong ? " -strong" : ""}`} type="text" maxLength={max} autoComplete="off" value={value} placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); clear?.(id); }} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} />
    </>
  );
}
const AddRow = ({ onClick, children, disabled }) => (
  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={onClick} disabled={disabled}>{children}</button>
);

function HeroEditor({ d, set, errors, clear }) {
  return <Text id="g-hero" label="Heading" required max={120} value={d} onChange={(v) => set(() => v)} errors={errors} clear={clear} />;
}

function TrustEditor({ d, set, errors }) {
  return <LineList id="g-trust" label="Lines" hint="Press Enter to add. Up to 6." items={d} onChange={(v) => set(() => v)} max={60} most={6}  ordered error={errors["g-trust"]} />;
}

function IncludedEditor({ d, set, errors, clear }) {
  return (
    <>
      <Text id="g-title" label="Heading" required max={120} value={d.title} onChange={(v) => set({ title: v })} errors={errors} clear={clear} />
      <LineList id="g-items" label="Items" hint="Press Enter to add. Up to 15." items={d.items} onChange={(v) => set({ items: v })} max={160} most={15}  ordered error={errors["g-items"]} />
    </>
  );
}

// a table to fill in: the first column the rows' labels, then up to 4 more; each cell Yes, No or a few words
function CompareEditor({ d, set, errors, clear }) {
  const cols = d.columns.length;
  const setCol = (i, v) => set({ columns: d.columns.map((c, j) => (j === i ? v : c)) });
  const setRow = (i, patch) => set({ rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addCol = () => set({ columns: [...d.columns, ""], rows: d.rows.map((r) => ({ ...r, cells: [...r.cells, ""] })) });
  const removeCol = (i) => set({ columns: d.columns.filter((_, j) => j !== i), rows: d.rows.map((r) => ({ ...r, cells: r.cells.filter((_, j) => j !== i - 1) })) });
  return (
    <>
      <Text id="g-title" label="Heading" required max={120} value={d.title} onChange={(v) => set({ title: v })} errors={errors} clear={clear} />
      <Text id="g-intro" label="Introduction" area rows={2} max={600} value={d.intro} onChange={(v) => set({ intro: v })} errors={errors} clear={clear} />
      <div className="rt-pws-pkg__fsec">
        <p className="rt-pws-gx__label">The table</p>
        <div className="rt-pws-pkg__fscroll">
          <table className="rt-pws-pkg__ftable rt-pws-gx__table">
            <thead>
              <tr>
                {d.columns.map((c, i) => (
                  <th key={i} scope="col">
                    <span className="rt-pws-gx__headcell">
                      <CellInput id={`g-col${i}`} label={i === 0 ? "Heading over the row labels" : `Column ${i} heading`} value={c} onChange={(v) => setCol(i, v)} errors={errors} clear={clear} max={60} placeholder={i === 0 ? "You can work in" : `Option ${i}`} strong />
                      {i > 0 && cols > 2 && <Bin onClick={() => removeCol(i)} name={`column ${c || i}`} />}
                    </span>
                  </th>
                ))}
                <th scope="col" className="rt-pws-gx__toolcol"><span className="rt-sr">Row tools</span></th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i}>
                  <td><CellInput id={`g-row${i}`} label={`Row ${i + 1} label`} value={r.label} onChange={(v) => setRow(i, { label: v })} errors={errors} clear={clear} max={120}  strong /></td>
                  {r.cells.map((c, j) => (
                    <td key={j}><CellInput id={`g-cell${i}-${j}`} label={`${r.label || `Row ${i + 1}`}: ${d.columns[j + 1] || `column ${j + 1}`}`} value={c} onChange={(v) => setRow(i, { cells: r.cells.map((x, k) => (k === j ? v : x)) })} errors={errors} clear={clear} max={80} placeholder="Yes, No or words" /></td>
                  ))}
                  <td className="rt-pws-gx__toolcol"><RowTools i={i} count={d.rows.length} name={r.label || `row ${i + 1}`} onMove={(k, by) => set({ rows: moved(d.rows, k, by) })} onRemove={(k) => set({ rows: d.rows.filter((_, j) => j !== k) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rt-pws-gx__adds">
          <AddRow onClick={() => set({ rows: [...d.rows, { label: "", cells: d.columns.slice(1).map(() => "") }] })} disabled={d.rows.length >= 20}>Add a row</AddRow>
          <AddRow onClick={addCol} disabled={cols >= 5}>Add a column</AddRow>
        </div>
      </div>
      <Text id="g-note" label="Note" area rows={2} max={400} value={d.note} onChange={(v) => set({ note: v })} errors={errors} clear={clear} />
    </>
  );
}

// the days, a row each: the day and what happens
function WeekEditor({ d, set, errors, clear }) {
  const setItem = (i, patch) => set({ items: d.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <>
      <Text id="g-title" label="Heading" required max={120} value={d.title} onChange={(v) => set({ title: v })} errors={errors} clear={clear} />
      <div className="rt-pws-pkg__fsec">
        <p className="rt-pws-gx__label">The days</p>
        <div className="rt-pws-pkg__fscroll">
          <table className="rt-pws-pkg__ftable rt-pws-gx__table">
            <thead><tr><th scope="col" className="rt-pws-gx__daycol">Day</th><th scope="col">What happens</th><th scope="col" className="rt-pws-gx__toolcol"><span className="rt-sr">Row tools</span></th></tr></thead>
            <tbody>
              {d.items.map((x, i) => (
                <tr key={i}>
                  <td><CellInput id={`g-day${i}`} label={`Day ${i + 1}`} value={x.day} onChange={(v) => setItem(i, { day: v })} errors={errors} clear={clear} max={40} placeholder={i === 0 ? "Days 1 and 2" : ""} strong /></td>
                  <td><CellInput id={`g-what${i}`} label={`What happens on ${x.day || `day ${i + 1}`}`} value={x.text} onChange={(v) => setItem(i, { text: v })} errors={errors} clear={clear} max={200} /></td>
                  <td className="rt-pws-gx__toolcol"><RowTools i={i} count={d.items.length} name={x.day || `day ${i + 1}`} onMove={(k, by) => set({ items: moved(d.items, k, by) })} onRemove={(k) => set({ items: d.items.filter((_, j) => j !== k) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rt-pws-gx__adds"><AddRow onClick={() => set({ items: [...d.items, { day: "", text: "" }] })} disabled={d.items.length >= 10}>Add a day</AddRow></div>
      </div>
      <Text id="g-note" label="Note" area rows={2} max={300} value={d.note} onChange={(v) => set({ note: v })} errors={errors} clear={clear} />
    </>
  );
}

// numbered steps, each a title and a few lines
function StepsEditor({ d, set, errors, clear }) {
  const setStep = (i, patch) => set({ steps: d.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <>
      <Text id="g-title" label="Heading" required max={120} value={d.title} onChange={(v) => set({ title: v })} errors={errors} clear={clear} />
      {d.steps.map((x, i) => (
        <fieldset key={i} className="rt-pws-course-repeat">
          <legend>Step {i + 1}</legend>
          <div className="rt-pws-gx__repeathead"><RowTools i={i} count={d.steps.length} name={x.title || `step ${i + 1}`} onMove={(k, by) => set({ steps: moved(d.steps, k, by) })} onRemove={(k) => set({ steps: d.steps.filter((_, j) => j !== k) })} /></div>
          <Text id={`g-step${i}`} label="Title" required max={80} value={x.title} onChange={(v) => setStep(i, { title: v })} errors={errors} clear={clear} />
          <Text id={`g-steptext${i}`} label="What happens" required area rows={2} max={400} value={x.text} onChange={(v) => setStep(i, { text: v })} errors={errors} clear={clear} />
        </fieldset>
      ))}
      <div className="rt-pws-gx__adds"><AddRow onClick={() => set({ steps: [...d.steps, { title: "", text: "" }] })} disabled={d.steps.length >= 10}>Add a step</AddRow></div>
      <Text id="g-note" label="Tip" area rows={2} max={400} value={d.note} onChange={(v) => set({ note: v })} errors={errors} clear={clear} />
    </>
  );
}

// the cost table as learners see it: the course row and the total from the live prices, the rows typed here between them
function CostsEditor({ d, set, errors, clear, fees, pageTitle }) {
  const setRow = (i, patch) => set({ rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const remove = (onClick, what) => <Bin onClick={onClick} name={`the ${what} row`} />;
  return (
    <>
      <Text id="g-title" label="Heading" required max={120} value={d.title} onChange={(v) => set({ title: v })} errors={errors} clear={clear} />
      <Text id="g-intro" label="Introduction" area rows={2} max={400} value={d.intro} onChange={(v) => set({ intro: v })} errors={errors} clear={clear} />
      <div className="rt-pws-pkg__fsec">
        <p className="rt-pws-gx__label">The table</p>
        <div className="rt-pws-pkg__fscroll">
          <table className="rt-pws-pkg__ftable rt-pws-gx__table">
            <thead><tr><th scope="col">Cost</th><th scope="col" className="rt-pws-gx__pricecol">Price</th><th scope="col" className="rt-pws-gx__toolcol"><span className="rt-sr">Remove</span></th></tr></thead>
            <tbody>
              <tr>
                <td><CellInput id="g-course" label="Course row" value={d.courseLabel} onChange={(v) => set({ courseLabel: v })} errors={errors} clear={clear} max={80} placeholder={`${pageTitle || "The"} course`} strong /></td>
                <td><span className="rt-pws-gx__live">Live price</span></td>
                <td className="rt-pws-gx__toolcol"></td>
              </tr>
              {d.firstAid && (
                <tr>
                  <td><CellInput id="g-fa-label" label="First aid row" value={d.firstAid.label} onChange={(v) => set({ firstAid: { ...d.firstAid, label: v } })} errors={errors} clear={clear} max={80} strong /></td>
                  <td><span className="rt-pws-gx__live">Live price</span></td>
                  <td className="rt-pws-gx__toolcol">{remove(() => set({ firstAid: null }), "first aid")}</td>
                </tr>
              )}
              {d.rows.map((r, i) => (
                <tr key={i}>
                  <td><CellInput id={`g-crow${i}`} label={`Cost ${i + 1}`} value={r.label} onChange={(v) => setRow(i, { label: v })} errors={errors} clear={clear} max={80}  strong /></td>
                  <td><CellInput id={`g-cval${i}`} label={`Price of ${r.label || `cost ${i + 1}`}`} value={r.value} onChange={(v) => setRow(i, { value: v })} errors={errors} clear={clear} max={60} placeholder="Free" /></td>
                  <td className="rt-pws-gx__toolcol">{remove(() => set({ rows: d.rows.filter((_, j) => j !== i) }), r.label || `cost ${i + 1}`)}</td>
                </tr>
              ))}
              {d.licenceFee && (
                <tr>
                  <td><CellInput id="g-lf-label" label="Licence fee row" value={d.licenceFee.label} onChange={(v) => set({ licenceFee: { ...d.licenceFee, label: v } })} errors={errors} clear={clear} max={80} placeholder="SIA licence fee (paid to the SIA)" strong /></td>
                  <td>
                    {errors["g-lf-fee"] && <p className="rt-q__err" id="g-lf-fee-e"><span className="rt-sr">Error: </span>{errors["g-lf-fee"]}</p>}
                    <FieldSelect id="g-lf-fee" label="Licence fee" placeholder="Choose a fee" value={d.licenceFee.fee} compact invalid={Boolean(errors["g-lf-fee"])} describedBy={errors["g-lf-fee"] ? "g-lf-fee-e" : undefined}
                      onChange={(v) => { set({ licenceFee: { ...d.licenceFee, fee: v } }); clear("g-lf-fee"); }} options={fees.map((x) => ({ value: x.key, label: `${x.name}: ${formatPrice(x.amount)}` }))} />
                  </td>
                  <td className="rt-pws-gx__toolcol">{remove(() => set({ licenceFee: null }), "licence fee")}</td>
                </tr>
              )}
              <tr className="rt-pws-gx__total">
                <td>Typical total</td>
                <td><span className="rt-pws-gx__live">Worked out</span></td>
                <td className="rt-pws-gx__toolcol"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rt-pws-gx__adds">
          <AddRow onClick={() => set({ rows: [...d.rows, { label: "", value: "" }] })} disabled={d.rows.length >= 6}>Add a cost</AddRow>
          {!d.firstAid && <AddRow onClick={() => set({ firstAid: { label: "Emergency First Aid at Work (if needed)" } })}>Add a first aid row</AddRow>}
          {!d.licenceFee && <AddRow onClick={() => set({ licenceFee: { label: "", fee: fees[0]?.key || "" } })}>Add a licence fee row</AddRow>}
        </div>
      </div>
      <Text id="g-note" label="Note" area rows={2} max={400} value={d.note} onChange={(v) => set({ note: v })} errors={errors} clear={clear} />
    </>
  );
}

function CareersEditor({ d, set, errors, clear }) {
  return (
    <>
      <Text id="g-title" label="Heading" required max={120} value={d.title} onChange={(v) => set({ title: v })} errors={errors} clear={clear} />
      <Text id="g-text" label="Text" required area rows={3} max={800} value={d.text} onChange={(v) => set({ text: v })} errors={errors} clear={clear} />
      <LineList id="g-areas" label="Areas of work" hint="Press Enter to add. Up to 12." items={d.areas} onChange={(v) => set({ areas: v })} max={120} most={12} />
      <Text id="g-roles" label="Roles" area rows={2} max={400} value={d.roles} onChange={(v) => set({ roles: v })} errors={errors} clear={clear} />
      <div className="rt-pws-gx__pair">
        <Text id="g-cta" label="Link words" max={40} value={d.cta} onChange={(v) => set({ cta: v })} errors={errors} clear={clear} />
        <Text id="g-href" label="Link address" max={200} value={d.href} onChange={(v) => set({ href: v })} errors={errors} clear={clear} placeholder="/security-jobs" />
      </div>
    </>
  );
}
