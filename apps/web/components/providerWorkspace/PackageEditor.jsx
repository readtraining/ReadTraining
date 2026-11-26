"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sheet, { DISCARD_MESSAGE } from "@/components/testPrep/runner/Sheet";
import { PackageCards } from "@/components/courseDetail/PackageChooser";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { Toggle } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { Field, aria, isMoney } from "./settingsForm";

// A price plan: the plan's own name (only the provider sees it), 2, 3 or 4 packages (Basic, Plus, Pro, Elite to start with), each
// with its name, price per delegate, an optional "Save £" amount (shown as a was-price), a tagline, "Most popular" (one package
// at most) and "Courses included": the provider's own other courses sold in that package, ticked (up to 3; a package such as
// "CCTV + First Aid" includes their first aid course); and the plan's features: one list for the whole plan, each feature Included
// (a tick), Not included (crossed out) or Hidden (not shown) on each package, with an optional description, and an included one with an optional value for that package ("2" exam
// attempts, "12 months" of access: the brief's "value of each row"). A plan saved before
// may include first aid on its own (`firstAid`): it shows in the list, ticked, to keep or untick. Edit shows the form, Learner
// preview the course page's own package cards. Saving (API provider.plans.save) changes what learners see at once: the dates and
// courses on the plan take its cheapest package as their price. `plan`: the plan to edit, or none for a new one. Without the right
// to change prices (ReadTraining staff) only the features, taglines and "Most popular" change: the rest shows as it is.
//
// The plan is stored as before (each package with its own features, included or not): opening it puts the packages' features
// side by side by name (a package without one has it Hidden), and saving writes each package's list back in the table's order,
// leaving out the ones Hidden on it. So a name is used once in a plan.

const NAMES = ["Basic", "Plus", "Pro", "Elite"];
const MAX_FEATURES = 12; // the API's limit for one package
// a feature on a package: each state's mark (`icon`) and colour (`tone`)
const STATES = [
  { value: "in", label: "Included", help: "Shown with a tick", icon: "icon-check", tone: "in" },
  { value: "out", label: "Not included", help: "Shown crossed out", icon: "icon-close", tone: "out" },
  { value: "none", label: "Hidden", help: "Not shown on this package", tone: "none" },
];
const MAX_COURSES = 3; // the API's limit of other courses in one package
const pounds = (pence) => (pence == null || pence === 0 ? "" : (pence / 100).toFixed(2).replace(/\.00$/, ""));
const pence = (v) => Math.round(Number(String(v).trim()) * 100);
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
let rowKey = 0;
const nextKey = () => `f${(rowKey += 1)}`;
const blankTier = (i) => ({ name: NAMES[i], price: "", save: "", tagline: "", popular: false, firstAid: false, courses: [] });
const toDraft = (plan) => {
  if (!plan) return { name: "", tiers: [0, 1, 2].map(blankTier), rows: [] };
  const tiers = plan.tiers;
  // one row per feature name, in the order the packages list them (the first package's first)
  const rows = [];
  tiers.forEach((t, i) =>
    (t.features ?? []).forEach((f) => {
      let row = rows.find((r) => same(r.title, f.title));
      if (!row) rows.push((row = { key: nextKey(), title: f.title, description: "", states: tiers.map(() => "none"), values: tiers.map(() => "") }));
      row.states[i] = f.included ? "in" : "out";
      row.values[i] = f.value ?? "";
      if (!row.description && f.description) row.description = f.description;
    }),
  );
  return { name: plan.name ?? "", tiers: tiers.map((t) => ({ name: t.name, price: pounds(t.pricePence), save: pounds(t.savePence), tagline: t.tagline ?? "", popular: Boolean(t.popular), firstAid: Boolean(t.firstAid), courses: t.courses ?? [] })), rows };
};
// each package's features, in the table's order, without the ones Hidden on it
const featuresOf = (rows, i) =>
  rows.filter((r) => r.states[i] !== "none").map((r) => ({ title: r.title.trim(), description: r.description.trim() || null, included: r.states[i] === "in", value: (r.states[i] === "in" && r.values[i].trim()) || null }));
// the packages as the API takes them
const toInput = (d) =>
  d.tiers.map((t, i) => ({
    name: t.name.trim(),
    pricePence: pence(t.price),
    savePence: t.save.trim() ? pence(t.save) : null,
    tagline: t.tagline.trim() || null,
    popular: t.popular,
    firstAid: t.firstAid,
    courses: t.courses,
    features: featuresOf(d.rows, i),
  }));
// the packages as the course page's cards take them (the learner preview); `titles`: the provider's course names, by id
const toCards = (d, titles = new Map()) =>
  d.tiers.map((t, i) => {
    const price = isMoney(t.price) ? Number(t.price) : 0;
    const save = isMoney(t.save) ? Number(t.save) : 0;
    const includes = t.courses.map((id) => ({ id, name: titles.get(id) || "A course", course: null, firstAid: false, dated: true }));
    return { key: `p${i}`, name: t.name.trim() || `Package ${i + 1}`, price, wasPrice: save > 0 ? price + save : null, tagline: t.tagline.trim(), popular: t.popular, firstAid: t.firstAid, includes, features: featuresOf(d.rows.filter((r) => r.title.trim()), i) };
  });

// "Courses included" in one package: the provider's own courses chosen from a dropdown ("Add a course"), each shown as a tag with
// its ✕ (up to 3). A plan saved before with first aid on its own shows it as a tag too, to keep or remove. A course that isn't live
// says so (learners see only live ones linked).
function CoursesIncluded({ id, value, courses, loading, firstAid, onChange, onFirstAid, disabled = false }) {
  const full = value.length >= MAX_COURSES;
  const title = (cid) => courses.find((c) => c.id === cid)?.title || "A course you no longer have";
  const left = courses.filter((c) => !value.includes(c.id));
  return (
    <div className="rt-field rt-pws-pkg__courses">
      <label htmlFor={id}>Courses included</label>
      {(value.length > 0 || firstAid) && (
        <ul className="rt-pws-course-tags rt-pws-pkg__ctags">
          {firstAid && (
            <li><span>Emergency First Aid at Work</span>{!disabled && <button type="button" onClick={() => onFirstAid(false)} aria-label="Remove Emergency First Aid at Work"><i className="icon-close text-10" aria-hidden="true"></i></button>}</li>
          )}
          {value.map((cid) => (
            <li key={cid}><span>{title(cid)}</span>{!disabled && <button type="button" onClick={() => onChange(value.filter((x) => x !== cid))} aria-label={`Remove ${title(cid)}`}><i className="icon-close text-10" aria-hidden="true"></i></button>}</li>
          ))}
        </ul>
      )}
      {disabled ? (
        !value.length && !firstAid && <p className="rt-field__hint">None</p>
      ) : full ? (
        <p className="rt-field__hint">That's the most a package can include ({MAX_COURSES}). Remove one to add another.</p>
      ) : !loading && !left.length ? (
        <p className="rt-field__hint">{courses.length ? "All your courses are included." : "Your courses show here once you have added them."}</p>
      ) : (
        <FieldSelect id={id} label="Courses included" value="" compact disabled={loading} placeholder={loading ? "Loading your courses…" : "Add a course"}
          options={left.map((c) => ({ value: String(c.id), label: `${c.title}${c.status && c.status !== "live" ? " (not live)" : ""}` }))}
          onChange={(v) => v && onChange([...value, Number(v)])} />
      )}
    </div>
  );
}

// One package's choice for one feature: a button showing it (its mark, its word, a chevron) that opens a menu of the three. The
// menu opens in a layer of its own above the pop-up, so the table's sideways scroll never cuts it off; arrow keys move in it,
// Enter picks, Esc and Tab close it and put focus back on the button.
const Mark = ({ s, className = "" }) => (
  <span className={`rt-pws-pkg__stmark -${s.tone}${className}`} aria-hidden="true">{s.icon ? <i className={s.icon}></i> : s.text || null}</span>
);
function StatePicker({ value, onChange, label, states = STATES }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(null);
  const btn = useRef(null);
  const menu = useRef(null);
  const current = states.find((x) => x.value === value) || states[0];
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };
  // under the button, centred on it, kept on screen (above it when there is no room below)
  useLayoutEffect(() => {
    if (!open || !btn.current || !menu.current) return;
    const b = btn.current.getBoundingClientRect();
    const w = menu.current.offsetWidth;
    const h = menu.current.offsetHeight;
    const left = Math.min(Math.max(8, b.left + b.width / 2 - w / 2), window.innerWidth - w - 8);
    const top = b.bottom + 6 + h > window.innerHeight - 8 ? Math.max(8, b.top - 6 - h) : b.bottom + 6;
    setAt({ left, top });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
    const items = () => [...(menu.current?.querySelectorAll('[role="menuitemradio"]') ?? [])];
    // ahead of the pop-up's own keys (its Esc would close the whole pop-up), so they act on the menu only
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      const list = items();
      const i = list.indexOf(document.activeElement);
      const go = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
      if (go === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      list[(go + list.length) % list.length]?.focus();
    };
    const out = (e) => !menu.current?.contains(e.target) && !btn.current?.contains(e.target) && close(false);
    // scrolling the pop-up or the table moves the button away from its menu: the menu closes
    const moved = (e) => !menu.current?.contains(e.target) && close(false);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", out);
    window.addEventListener("scroll", moved, true);
    window.addEventListener("resize", moved);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", out);
      window.removeEventListener("scroll", moved, true);
      window.removeEventListener("resize", moved);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- close only uses refs
  return (
    <>
      <button type="button" ref={btn} className={`rt-pws-pkg__st -${current.tone}`} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: ${current.label}`} onClick={() => (open ? close() : (setAt(null), setOpen(true)))}>
        <Mark s={current} />
        {current.label}
        <i className="icon-chevron-down rt-pws-pkg__stcaret" aria-hidden="true"></i>
      </button>
      {open && createPortal(
        <ul ref={menu} role="menu" aria-label={label} className="rt-rowmenu__list rt-pws-pkg__stmenu" style={at ? { left: at.left, top: at.top } : { visibility: "hidden" }}>
          {states.map((s) => (
            <li key={s.value} role="none">
              <button type="button" role="menuitemradio" aria-checked={s.value === value} tabIndex={-1} onClick={() => { onChange(s.value); close(); }}>
                <Mark s={s} />
                <span><b>{s.label}</b><small>{s.help}</small></span>
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}

export default function PackageEditor({ open, onClose, plan = null, onSaved }) {
  const { organisationId, can } = useProviderAccess();
  const fixed = !can("provider.pricing.edit");
  // the provider's courses, for each package's "Courses included"
  const courseList = api.provider.courses.list.useQuery({ organisationId }, { enabled: open && Boolean(organisationId) });
  const courses = (courseList.data ?? []).map((c) => ({ id: c.id, title: c.title, status: c.status }));
  const titles = new Map(courses.map((c) => [c.id, c.title]));
  const utils = api.useUtils();
  const save = api.provider.plans.save.useMutation();
  const [draft, setDraft] = useState(() => toDraft(null));
  const [start, setStart] = useState("");
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [view, setView] = useState("edit");
  // the add row: the new feature's name and its state on each package (Included to start with, kept from one add to the next)
  const [newName, setNewName] = useState("");
  const [newStates, setNewStates] = useState(["in", "in", "in"]);
  const [newError, setNewError] = useState("");
  // features whose description box was opened with "+ Add description" (one with words always shows it)
  const [described, setDescribed] = useState(() => new Set());
  const formRef = useRef(null);
  const newRef = useRef(null);

  // a fresh copy each time the dialog opens
  useEffect(() => {
    if (!open) return;
    const d = toDraft(plan);
    setDraft(d);
    setStart(JSON.stringify(d));
    setErrors({});
    setGeneral("");
    setView("edit");
    setNewName("");
    setNewStates(d.tiers.map(() => "in"));
    setNewError("");
    setDescribed(new Set());
  }, [open, plan?.id, plan?.version]); // eslint-disable-line react-hooks/exhaustive-deps -- read the plan once per opening
  const dirty = open && JSON.stringify(draft) !== start;
  useUnsavedChanges(dirty);

  // a field's message goes once the field is changed (the next send checks everything again)
  const clear = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  const setTier = (i, patch) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const setRow = (key, patch) => setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
  const setValue = (key, i, value) => setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, values: r.values.map((v, j) => (j === i ? value : v)) } : r)) }));
  const setState = (key, i, value) => {
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, states: r.states.map((s, j) => (j === i ? value : s)) } : r)) }));
    clear(`f-${key}`);
  };
  const removeRow = (r, k) => {
    setDraft((d) => ({ ...d, rows: d.rows.filter((x) => x.key !== r.key) }));
    clear(`f-${r.key}`);
    // focus stays in the table: the next feature's name, or the add box when it was the last
    requestAnimationFrame(() => (document.getElementById(`rt-plan-f-${draft.rows[k + 1]?.key}`) || document.getElementById(`rt-plan-f-${draft.rows[k - 1]?.key}`) || newRef.current)?.focus());
  };
  const addDescription = (key) => {
    setDescribed((s) => new Set(s).add(key));
    requestAnimationFrame(() => document.getElementById(`rt-plan-f-${key}-d`)?.focus());
  };
  const addRow = () => {
    const title = newName.trim();
    if (!title) return newRef.current?.focus();
    if (draft.rows.some((r) => same(r.title, title))) return setNewError(`There is already a feature called “${title}”.`);
    setDraft((d) => ({ ...d, rows: [...d.rows, { key: nextKey(), title, description: "", states: [...newStates], values: newStates.map(() => "") }] }));
    setNewName("");
    setNewError("");
    newRef.current?.focus();
  };
  // more or fewer packages: a new package has every feature Hidden (the add row's state for it: Included); a removed package's
  // states and messages go with it
  const setCount = (n) => {
    setDraft((d) => ({
      ...d,
      tiers: n <= d.tiers.length ? d.tiers.slice(0, n) : [...d.tiers, ...Array.from({ length: n - d.tiers.length }, (_, k) => blankTier(d.tiers.length + k))],
      rows: d.rows.map((r) => ({ ...r, states: Array.from({ length: n }, (_, j) => r.states[j] ?? "none"), values: Array.from({ length: n }, (_, j) => r.values[j] ?? "") })),
    }));
    setNewStates((s) => Array.from({ length: n }, (_, j) => s[j] ?? "in"));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => Number(key.match(/^t(\d+)-/)?.[1] ?? -1) < n)));
  };
  // one "Most popular" at most: turning it on for one package turns it off for the others
  const setPopular = (i, on) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t, j) => ({ ...t, popular: j === i ? on : on ? false : t.popular })) }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!draft.name.trim()) errs.name = "Name the plan, like “SIA door supervisor packages”.";
    const names = draft.tiers.map((t) => t.name.trim().toLowerCase());
    draft.tiers.forEach((t, i) => {
      if (!t.name.trim()) errs[`t${i}-name`] = "Name the package, like Basic.";
      else if (names.indexOf(names[i]) !== i) errs[`t${i}-name`] = "Give every package a different name.";
      if (!isMoney(t.price)) errs[`t${i}-price`] = "Enter a price, like 249 or 249.99.";
      else if (Number(t.price) < 1) errs[`t${i}-price`] = "Enter a price of at least £1.";
      else if (Number(t.price) > 100000) errs[`t${i}-price`] = "Enter a price of £100,000 or less.";
      if (t.save.trim() && !isMoney(t.save)) errs[`t${i}-save`] = "Enter a saving, like 30, or leave it empty.";
      else if (t.save.trim() && isMoney(t.price) && Number(t.save) > Number(t.price)) errs[`t${i}-save`] = "A package can’t save more than its own price.";
    });
    draft.rows.forEach((r, k) => {
      if (!r.title.trim()) errs[`f-${r.key}`] = "Write the feature, or remove it.";
      else if (draft.rows.findIndex((x) => same(x.title, r.title)) !== k) errs[`f-${r.key}`] = "Another feature has this name. Give each its own.";
      else if (r.states.every((s) => s === "none")) errs[`f-${r.key}`] = "Show it on at least one package, or remove it.";
    });

    setErrors(errs);
    setGeneral("");
    if (Object.keys(errs).length) {
      setView("edit");
      return requestAnimationFrame(() => focusFirstError(formRef.current));
    }
    save.mutate(
      { organisationId, ...(plan ? { planId: plan.id, seen: plan.version } : {}), name: draft.name.trim(), tiers: toInput(draft) },
      {
        onSuccess: (r) => {
          setStart(JSON.stringify(draft));
          utils.provider.plans.list.invalidate();
          onSaved?.(r);
          onClose();
        },
        onError: (er) => {
          // changed somewhere else: the list loads the latest, so opening the plan again edits that
          if (er?.data?.code === "CONFLICT") utils.provider.plans.list.invalidate();
          const { general: g, fields } = errorsFrom(er);
          setGeneral(g || Object.values(fields)[0] || "We couldn’t save the plan. Please try again.");
          requestAnimationFrame(() => formRef.current?.querySelector(".rt-acc__notice")?.focus());
        },
      },
    );
  };

  // what uses the plan, in words: "the upcoming date", "the 3 upcoming dates and the self-paced course"
  const n = (k, one, many) => (k ? (k === 1 ? `the ${one}` : `the ${k} ${many}`) : "");
  const used = plan ? [n(plan.used.dates, "upcoming date", "upcoming dates"), n(plan.used.courses, "self-paced course", "self-paced courses")].filter(Boolean).join(" and ") : "";
  const usedMany = plan ? plan.used.dates + plan.used.courses > 1 : false;
  const tierName = (t, i) => t.name.trim() || `Package ${i + 1}`;
  const viewSwitch = (
    <div className="rt-pws-pkg__countrow rt-pws-pkg__view" role="group" aria-label="Show">
      {[["edit", "Edit"], ["preview", "Learner preview"]].map(([k, label]) => (
        <button key={k} type="button" className={`rt-tr__filter${view === k ? " is-on" : ""}`} aria-pressed={view === k} onClick={() => setView(k)}>{label}</button>
      ))}
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title={plan ? "Edit price plan" : "Create price plan"} closeLabel="Close" className="rt-pws-pkg__sheet" unsaved={dirty} busy={save.isPending} aside={viewSwitch}>
      <form className="rt-q__form rt-pws-pkg" onSubmit={submit} noValidate ref={formRef}>
        {general && <p className="rt-acc__notice -warn" tabIndex={-1} role="alert">{general}</p>}
        {view === "preview" ? (
          <div className="rt-pws-pkg__preview">
            <p className="rt-acc__note">The packages as learners see them on the course page.</p>
            <PackageCards list={toCards(draft, titles)} />
            <p className="rt-pk__note">Prices are per delegate and include VAT.</p>
          </div>
        ) : (
          <>
            <p className="rt-acc__note">
              {plan
                ? `Changes show to learners as soon as you save.${used ? ` ${used.charAt(0).toUpperCase()}${used.slice(1)} on this plan ${usedMany ? "take" : "takes"} its cheapest package as ${usedMany ? "their" : "its"} price.` : ""}`
                : "Learners see the packages as soon as you put the plan on a date or a self-paced course. Its cheapest package is the price they show."}
            </p>

            <div className="rt-pws-pkg__top">
              <Field id="rt-plan-name" label="Plan name" required error={errors.name} hint="Only your team sees this name. Learners see the package names.">
                <input {...aria("rt-plan-name", errors.name, true)} type="text" maxLength={60} autoComplete="off" placeholder="For example: SIA door supervisor packages" value={draft.name} onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); clear("name"); }} disabled={fixed} />
              </Field>
              <fieldset className="rt-field rt-pws-pkg__count">
                <legend>Number of packages</legend>
                <div className="rt-pws-pkg__countrow" role="group">
                  {[2, 3, 4].map((k) => (
                    <button key={k} type="button" className={`rt-tr__filter${draft.tiers.length === k ? " is-on" : ""}`} aria-pressed={draft.tiers.length === k} onClick={() => setCount(k)} disabled={fixed}>{k}</button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className={`rt-pws-pkg__tiers -n${draft.tiers.length}`}>
              {draft.tiers.map((t, i) => {
                const saving = isMoney(t.price) && isMoney(t.save) ? Number(t.save) : 0;
                return (
                  <section key={i} className={`rt-pws-pkg__tier${t.popular ? " -popular" : ""}`} aria-labelledby={`rt-plan-t${i}-h`}>
                    <div className="rt-pws-pkg__tierhead">
                      <h3 className="rt-pws-pkg__h3" id={`rt-plan-t${i}-h`}>{tierName(t, i)}</h3>
                      {t.popular && <span className="rt-pws-pkg__badge">Most popular</span>}
                    </div>
                    <Field id={`rt-plan-t${i}-name`} label="Package name" required error={errors[`t${i}-name`]}>
                      <input {...aria(`rt-plan-t${i}-name`, errors[`t${i}-name`])} type="text" maxLength={50} autoComplete="off" value={t.name} onChange={(e) => { setTier(i, { name: e.target.value }); clear(`t${i}-name`); }} disabled={fixed} />
                    </Field>
                    <div className="rt-pws-pkg__money">
                      <Field id={`rt-plan-t${i}-price`} label="Price (£)" required error={errors[`t${i}-price`]}>
                        <input {...aria(`rt-plan-t${i}-price`, errors[`t${i}-price`])} type="text" inputMode="decimal" autoComplete="off" value={t.price} onChange={(e) => { setTier(i, { price: e.target.value.replace(/£|,/g, "") }); clear(`t${i}-price`); }} disabled={fixed} />
                      </Field>
                      <Field id={`rt-plan-t${i}-save`} label="Save (£)" error={errors[`t${i}-save`]}>
                        <input {...aria(`rt-plan-t${i}-save`, errors[`t${i}-save`])} type="text" inputMode="decimal" autoComplete="off" value={t.save} onChange={(e) => { setTier(i, { save: e.target.value }); clear(`t${i}-save`); }} disabled={fixed} />
                      </Field>
                    </div>
                    <p className="rt-pws-pkg__save" aria-live="polite">{isMoney(t.price) ? `${formatPrice(Number(t.price))} per delegate` : "Per delegate"}, including VAT{saving > 0 ? ` · was ${formatPrice(Number(t.price) + saving)}` : ""}</p>
                    <Field id={`rt-plan-t${i}-tag`} label="Tagline">
                      <input id={`rt-plan-t${i}-tag`} type="text" maxLength={80} autoComplete="off" placeholder="For example: Pass first time" value={t.tagline} onChange={(e) => setTier(i, { tagline: e.target.value })} />
                    </Field>
                    <Toggle id={`rt-plan-t${i}-pop`} checked={t.popular} onChange={(on) => setPopular(i, on)} label="Mark as Most popular" />
                    <CoursesIncluded id={`rt-plan-t${i}-inc`} value={t.courses} courses={courses} loading={courseList.isLoading} firstAid={t.firstAid} disabled={fixed}
                      onChange={(list) => setTier(i, { courses: list })} onFirstAid={(on) => setTier(i, { firstAid: on })} />
                  </section>
                );
              })}
            </div>

            <section className="rt-pws-pkg__fsec" aria-labelledby="rt-plan-fh">
              <div>
                <h3 className="rt-pws-pkg__h3" id="rt-plan-fh">Features</h3>
                <p className="rt-acc__note">Choose how each feature appears on each package. An included one can show a value, like 2 or 12 months.</p>
              </div>
              <div className="rt-pws-pkg__fscroll">
                <table className={`rt-pws-pkg__ftable -n${draft.tiers.length}`}>
                  <thead>
                    <tr>
                      <th scope="col">Feature</th>
                      {draft.tiers.map((t, i) => <th key={i} scope="col">{tierName(t, i)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.rows.map((r, k) => {
                      const id = `rt-plan-f-${r.key}`;
                      const err = errors[`f-${r.key}`];
                      const named = r.title.trim() || `Feature ${k + 1}`;
                      const showDesc = Boolean(r.description) || described.has(r.key);
                      return (
                        <tr key={r.key}>
                          <td className="rt-pws-pkg__fcell">
                            {err && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{err}</p>}
                            <div className="rt-pws-pkg__fline">
                              <label htmlFor={id} className="rt-sr">Feature {k + 1}</label>
                              <input id={id} className="rt-pws-pkg__fname" type="text" maxLength={80} autoComplete="off" value={r.title} onChange={(e) => { setRow(r.key, { title: e.target.value }); clear(`f-${r.key}`); }} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} />
                              <button type="button" className="rt-pws-pkg__fdel" onClick={() => removeRow(r, k)} aria-label={`Remove ${named}`}><i className="icon-close" aria-hidden="true"></i></button>
                            </div>
                            {showDesc ? (
                              <>
                                <label htmlFor={`${id}-d`} className="rt-sr">Description of {named} (optional)</label>
                                <input id={`${id}-d`} className="rt-pws-pkg__fdesc" type="text" maxLength={200} autoComplete="off" placeholder="Short description (optional)" value={r.description} onChange={(e) => setRow(r.key, { description: e.target.value })} />
                              </>
                            ) : (
                              <button type="button" className="rt-pws-pkg__fadd" onClick={() => addDescription(r.key)}>+ Add description<span className="rt-sr"> to {named}</span></button>
                            )}
                          </td>
                          {draft.tiers.map((t, i) => (
                            <td key={i} className="rt-pws-pkg__scell">
                              <StatePicker value={r.states[i]} onChange={(v) => setState(r.key, i, v)} label={`${named} in ${tierName(t, i)}`} />
                              {r.states[i] === "in" && (
                                <input className="rt-pws-pkg__fval" type="text" maxLength={30} autoComplete="off" placeholder="Value (optional)" aria-label={`Value of ${named} in ${tierName(t, i)} (optional)`} value={r.values[i]} onChange={(e) => setValue(r.key, i, e.target.value)} />
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="rt-pws-pkg__fcell">
                        {newError && <p className="rt-q__err" id="rt-plan-new-e"><span className="rt-sr">Error: </span>{newError}</p>}
                        {draft.rows.length < MAX_FEATURES ? (
                          <div className="rt-pws-pkg__fnew">
                            <label htmlFor="rt-plan-new" className="rt-sr">New feature</label>
                            <input id="rt-plan-new" ref={newRef} type="text" maxLength={80} autoComplete="off" placeholder="New feature, e.g. Free resit" value={newName}
                              onChange={(e) => { setNewName(e.target.value); setNewError(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                              aria-invalid={newError ? true : undefined} aria-describedby={newError ? "rt-plan-new-e" : undefined} />
                            <button type="button" className="button -md -purple-1 text-white" onClick={addRow}><span aria-hidden="true">+</span> Add<span className="rt-sr"> feature</span></button>
                          </div>
                        ) : (
                          <p className="rt-acc__note">A plan has up to {MAX_FEATURES} features. Remove one to add another.</p>
                        )}
                      </td>
                      {draft.tiers.map((t, i) => (
                        <td key={i} className="rt-pws-pkg__scell">
                          {draft.rows.length < MAX_FEATURES && <StatePicker value={newStates[i] ?? "in"} onChange={(v) => setNewStates((s) => s.map((x, j) => (j === i ? v : x)))} label={`New feature in ${tierName(t, i)}`} />}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        )}

        <div className="rt-pws-set__actions">
          <button type="submit" className="button -md -purple-1 text-white" disabled={save.isPending} aria-busy={save.isPending || undefined}>{save.isPending ? "Saving…" : plan ? "Save plan" : "Create plan"}</button>
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => (!dirty || window.confirm(DISCARD_MESSAGE)) && onClose()} disabled={save.isPending}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
