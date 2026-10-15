"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { savePackage, useProvider } from "@/lib/providerWorkspace";
import { Field, aria, isMoney } from "./settingsForm";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

// A price package: one name and three options (Saver, Flexi, Premium) that learners choose between on the course page and in the
// basket. Each option has a price, an optional saving ("You save £x") and perks: a heading with lines that are included (✓) or
// not included (✗), or another of the provider's courses that is or isn't part of it. "Features for every option" are perks
// shown on all three. Adding or changing a perk opens a panel inside the same dialog (no second dialog), then returns to the
// package. Used by the Pricing plans page and the course editor's Course pricing section.

const TIERS = pw.tiers;
const INCLUDED = new Set(["included", "course"]);
const COURSE_TYPES = new Set(["course", "noCourse"]);
const MAX_PERKS = 6;
const clone = (x) => JSON.parse(JSON.stringify(x));
const blankTier = () => ({ price: "", discount: "", perks: [] });
const blankItem = () => ({ type: "included", courseId: "", text: "" });

function toDraft(p) {
  if (!p) return { name: "", features: [], tiers: Object.fromEntries(TIERS.map((t) => [t.key, blankTier()])) };
  return {
    id: p.id,
    name: p.name,
    features: clone(p.features || []),
    tiers: Object.fromEntries(TIERS.map((t) => {
      const x = p.tiers?.[t.key] || {};
      return [t.key, { price: x.price ? String(x.price) : "", discount: x.discount ? String(x.discount) : "", perks: clone(x.perks || []) }];
    })),
  };
}

// one perk as the learner will see it
function PerkView({ perk, courses, onEdit, onRemove, onMove, first, last }) {
  return (
    <li className="rt-pws-pkg__perk">
      <div className="rt-pws-pkg__perkhead">
        <b>{perk.heading}</b>
        <span className="rt-pws-pkg__perkbtns">
          <button type="button" className="rt-pws-pkg__move" onClick={() => onMove(-1)} disabled={first} aria-label={`Move ${perk.heading} up`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
          <button type="button" className="rt-pws-pkg__move" onClick={() => onMove(1)} disabled={last} aria-label={`Move ${perk.heading} down`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
          <button type="button" className="rt-pws-set__textbtn" onClick={onEdit}>Edit<span className="rt-sr"> {perk.heading}</span></button>
          <button type="button" className="rt-pws-set__textbtn" onClick={onRemove}>Remove<span className="rt-sr"> {perk.heading}</span></button>
        </span>
      </div>
      {perk.description && <p className="rt-pws-pkg__perkdesc">{perk.description}</p>}
      <ul className="rt-pws-pkg__items">
        {perk.items.map((it, i) => {
          const yes = INCLUDED.has(it.type);
          const label = COURSE_TYPES.has(it.type) ? courses[it.courseId]?.title || it.text : it.text;
          return (
            <li key={i} className={yes ? "-yes" : "-no"}>
              <i className={`${yes ? "icon-check" : "icon-close"} text-12`} aria-hidden="true"></i>
              <span><span className="rt-sr">{yes ? "Included: " : "Not included: "}</span>{label}</span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default function PackageEditor({ open, onClose, packageId, onSaved }) {
  const data = useProvider();
  const [draft, setDraft] = useState(() => toDraft(null));
  const [errors, setErrors] = useState({});
  const [perk, setPerk] = useState(null); // { scope: "features" | tier key, index: number | null, draft, errors }
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const perkRef = useRef(null);
  const returnTo = useRef(null);

  // a fresh copy each time the dialog opens
  useEffect(() => {
    if (!open || !data) return;
    setDraft(toDraft(packageId ? data.byId.pack[packageId] : null));
    setErrors({});
    setPerk(null);
    setBusy(false);
  }, [open, packageId]); // eslint-disable-line react-hooks/exhaustive-deps -- read the package once per opening

  // after the perk panel closes, focus goes back to the button that opened it
  useEffect(() => {
    if (perk || !returnTo.current) return;
    const id = returnTo.current;
    returnTo.current = null;
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }, [perk]);

  const courses = data?.byId.course || {};
  const courseList = data ? data.courses.filter((c) => c.title) : [];
  const setTier = (key, patch) => setDraft((d) => ({ ...d, tiers: { ...d.tiers, [key]: { ...d.tiers[key], ...patch } } }));
  const perksOf = (scope) => (scope === "features" ? draft.features : draft.tiers[scope].perks);
  const setPerks = (scope, perks) => (scope === "features" ? setDraft((d) => ({ ...d, features: perks })) : setTier(scope, { perks }));
  // Hurak's perk reordering: move a perk up or down within its list
  const movePerk = (scope, i, by) => {
    const list = [...perksOf(scope)];
    const [x] = list.splice(i, 1);
    list.splice(i + by, 0, x);
    setPerks(scope, list);
  };
  const scopeLabel = (scope) => (scope === "features" ? "every option" : TIERS.find((t) => t.key === scope).label);

  const openPerk = (scope, index, openerId) => {
    returnTo.current = openerId;
    const src = index === null ? { heading: "", description: "", items: [blankItem()] } : clone(perksOf(scope)[index]);
    setPerk({ scope, index, draft: { ...src, items: src.items.map((it) => ({ ...blankItem(), ...it })) }, errors: {} });
    requestAnimationFrame(() => perkRef.current?.querySelector("input, select, textarea")?.focus());
  };
  const editPerkDraft = (patch) => setPerk((p) => ({ ...p, draft: { ...p.draft, ...patch } }));
  const editItem = (i, patch) => editPerkDraft({ items: perk.draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  const savePerk = (e) => {
    e.preventDefault();
    const p = perk.draft;
    const errs = {};
    if (!p.heading.trim()) errs.heading = "Enter a heading for the perk, like “Date changes”.";
    p.items.forEach((it, i) => {
      if (COURSE_TYPES.has(it.type) && !it.courseId) errs[`item-${i}`] = "Choose the course.";
      else if (!COURSE_TYPES.has(it.type) && !it.text.trim()) errs[`item-${i}`] = "Enter what is or isn't included.";
    });
    if (Object.keys(errs).length) {
      setPerk((x) => ({ ...x, errors: errs }));
      return focusFirstError(perkRef.current);
    }
    const clean = {
      heading: p.heading.trim(),
      description: p.description.trim(),
      items: p.items.map((it) => (COURSE_TYPES.has(it.type) ? { type: it.type, courseId: it.courseId, text: courses[it.courseId]?.title || "" } : { type: it.type, text: it.text.trim() })),
    };
    const list = [...perksOf(perk.scope)];
    if (perk.index === null) list.push(clean);
    else list[perk.index] = clean;
    setPerks(perk.scope, list);
    setPerk(null);
  };

  const save = (e) => {
    e.preventDefault();
    const errs = {};
    if (!draft.name.trim()) errs.name = "Enter a name for the package, like “First aid bundles”.";
    TIERS.forEach((t) => {
      const x = draft.tiers[t.key];
      if (!isMoney(x.price)) errs[`${t.key}-price`] = "Enter a price in pounds, like 235 or 235.50.";
      if (x.discount !== "" && !isMoney(x.discount, { zero: true })) errs[`${t.key}-discount`] = "Enter the saving in pounds, like 15, or leave it empty.";
      else if (x.discount !== "" && isMoney(x.price) && Number(x.discount) >= Number(x.price)) errs[`${t.key}-discount`] = "The saving must be less than the price.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    setBusy(true);
    const id = savePackage({
      ...(draft.id ? { id: draft.id } : {}),
      name: draft.name.trim(),
      features: draft.features,
      tiers: Object.fromEntries(TIERS.map((t) => {
        const x = draft.tiers[t.key];
        return [t.key, { price: Number(x.price), discount: x.discount === "" ? 0 : Number(x.discount), perks: x.perks }];
      })),
    });
    onSaved?.(id);
    onClose();
  };

  const title = perk ? `${perk.index === null ? "Add" : "Edit"} ${perk.scope === "features" ? "feature" : "perk"}` : packageId ? "Edit package" : "Create package";

  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel="Close" className="rt-pws-pkg__sheet">
      {perk ? (
        <form className="rt-q__form rt-pws-pkg__perkform" onSubmit={savePerk} noValidate ref={perkRef}>
          <button type="button" className="rt-pws-set__textbtn rt-pws-pkg__back" onClick={() => setPerk(null)}>
            <i className="icon-arrow-left text-12" aria-hidden="true"></i>Back to the package
          </button>
          <p className="rt-acc__note">Shown on {scopeLabel(perk.scope)}{perk.scope === "features" ? "" : " only"}. Learners see each line with a tick or a cross.</p>
          <Field id="rt-pkg-heading" label="Heading" error={perk.errors.heading}>
            <input {...aria("rt-pkg-heading", perk.errors.heading)} type="text" maxLength={60} autoComplete="off" value={perk.draft.heading} onChange={(e) => editPerkDraft({ heading: e.target.value })} />
          </Field>
          <Field id="rt-pkg-desc" label="Short description (optional)">
            <input id="rt-pkg-desc" type="text" maxLength={140} autoComplete="off" value={perk.draft.description} onChange={(e) => editPerkDraft({ description: e.target.value })} />
          </Field>
          <fieldset className="rt-pws-pkg__itemset">
            <legend>What is in this perk?</legend>
            <ol className="rt-pws-pkg__itemrows">
              {perk.draft.items.map((it, i) => {
                const err = perk.errors[`item-${i}`];
                const isCourse = COURSE_TYPES.has(it.type);
                return (
                  <li key={i} className="rt-pws-pkg__itemrow">
                    {err && <p className="rt-q__err" id={`rt-pkg-item-${i}-e`}><span className="rt-sr">Error: </span>{err}</p>}
                    <div className="rt-pws-pkg__itemfields">
                      <div className="rt-field">
                        <label htmlFor={`rt-pkg-type-${i}`}>Line {i + 1}</label>
                        <FieldSelect id={`rt-pkg-type-${i}`} label={`Line ${i + 1}`} value={it.type} onChange={(value) => editItem(i, { type: value })} options={Object.entries(pw.perkTypes).map(([k, v]) => ({ value: k, label: v }))} />
                      </div>
                      {isCourse ? (
                        <div className="rt-field">
                          <label htmlFor={`rt-pkg-val-${i}`}>Course</label>
                          <FieldSelect id={`rt-pkg-val-${i}`} label="Course" placeholder="Choose a course" value={it.courseId} onChange={(value) => editItem(i, { courseId: value })} options={courseList.map((c) => ({ value: c.id, label: c.title }))} invalid={Boolean(err)} describedBy={err ? `rt-pkg-item-${i}-e` : undefined} />
                        </div>
                      ) : (
                        <div className="rt-field">
                          <label htmlFor={`rt-pkg-val-${i}`}>Detail</label>
                          <input id={`rt-pkg-val-${i}`} type="text" maxLength={90} autoComplete="off" placeholder="For example: One free date change" value={it.text} onChange={(e) => editItem(i, { text: e.target.value })} aria-invalid={err ? true : undefined} aria-describedby={err ? `rt-pkg-item-${i}-e` : undefined} />
                        </div>
                      )}
                      {perk.draft.items.length > 1 && (
                        <button type="button" className="rt-pws-set__textbtn rt-pws-pkg__itemdel" onClick={() => editPerkDraft({ items: perk.draft.items.filter((_, j) => j !== i) })}>Remove<span className="rt-sr"> line {i + 1}</span></button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {perk.draft.items.length < 8 && (
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => editPerkDraft({ items: [...perk.draft.items, blankItem()] })}>Add another line</button>
            )}
          </fieldset>
          <div className="rt-pws-set__actions">
            <button type="submit" className="button -md -purple-1 text-white">{perk.index === null ? "Add" : "Save"} {perk.scope === "features" ? "feature" : "perk"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setPerk(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <form className="rt-q__form rt-pws-pkg" onSubmit={save} noValidate ref={formRef}>
          <Field id="rt-pkg-name" label="Package name" error={errors.name} hint="Only you see the name. Learners see the three options.">
            <input {...aria("rt-pkg-name", errors.name, true)} type="text" maxLength={60} autoComplete="off" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>

          <section className="rt-pws-pkg__block" aria-labelledby="rt-pkg-feat-h">
            <h3 className="rt-pws-pkg__h3" id="rt-pkg-feat-h">Features for every option</h3>
            <p className="rt-acc__note">Shown on Saver, Flexi and Premium, like the certificate or the course book.</p>
            {draft.features.length > 0 && (
              <ul className="rt-pws-pkg__perks">
                {draft.features.map((p, i) => <PerkView key={i} perk={p} courses={courses} onEdit={() => openPerk("features", i, "rt-pkg-add-features")} onRemove={() => setPerks("features", draft.features.filter((_, j) => j !== i))} onMove={(by) => movePerk("features", i, by)} first={i === 0} last={i === draft.features.length - 1} />)}
              </ul>
            )}
            {draft.features.length < MAX_PERKS && <button type="button" id="rt-pkg-add-features" className="button -sm -outline-purple-1 text-purple-1" onClick={() => openPerk("features", null, "rt-pkg-add-features")}>Add feature</button>}
          </section>

          <div className="rt-pws-pkg__tiers">
            {TIERS.map((t) => {
              const x = draft.tiers[t.key];
              const saving = isMoney(x.discount, { zero: true }) ? Number(x.discount) : 0;
              const pe = errors[`${t.key}-price`];
              const de = errors[`${t.key}-discount`];
              return (
                <section key={t.key} className={`rt-pws-pkg__tier${t.badge ? " -popular" : ""}`} aria-labelledby={`rt-pkg-${t.key}-h`}>
                  <div className="rt-pws-pkg__tierhead">
                    <h3 className="rt-pws-pkg__h3" id={`rt-pkg-${t.key}-h`}>{t.label}</h3>
                    {t.badge && <span className="rt-pws-pkg__badge">{t.badge}</span>}
                  </div>
                  <div className="rt-pws-pkg__money">
                    <Field id={`rt-pkg-${t.key}-price`} label="Price (£)" error={pe}>
                      <input {...aria(`rt-pkg-${t.key}-price`, pe)} type="text" inputMode="decimal" autoComplete="off" value={x.price} onChange={(e) => setTier(t.key, { price: e.target.value })} />
                    </Field>
                    <Field id={`rt-pkg-${t.key}-disc`} label="Saving (£)" error={de}>
                      <input {...aria(`rt-pkg-${t.key}-disc`, de)} type="text" inputMode="decimal" autoComplete="off" placeholder="Optional" value={x.discount} onChange={(e) => setTier(t.key, { discount: e.target.value })} />
                    </Field>
                  </div>
                  <p className="rt-pws-pkg__save" aria-live="polite"><span className="rt-pws-pkg__incl">All inclusive</span>{saving > 0 ? ` · You save ${formatPrice(saving)}` : ""}</p>
                  {x.perks.length > 0 && (
                    <ul className="rt-pws-pkg__perks">
                      {x.perks.map((p, i) => <PerkView key={i} perk={p} courses={courses} onEdit={() => openPerk(t.key, i, `rt-pkg-add-${t.key}`)} onRemove={() => setTier(t.key, { perks: x.perks.filter((_, j) => j !== i) })} onMove={(by) => movePerk(t.key, i, by)} first={i === 0} last={i === x.perks.length - 1} />)}
                    </ul>
                  )}
                  {x.perks.length < MAX_PERKS && <button type="button" id={`rt-pkg-add-${t.key}`} className="button -sm -outline-purple-1 text-purple-1" onClick={() => openPerk(t.key, null, `rt-pkg-add-${t.key}`)}>Add perk<span className="rt-sr"> to {t.label}</span></button>}
                </section>
              );
            })}
          </div>

          <div className="rt-pws-set__actions">
            <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : "Save package"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
