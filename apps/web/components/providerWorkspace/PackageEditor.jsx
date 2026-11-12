"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { Toggle } from "./providerParts";
import { Field, aria, isMoney } from "./settingsForm";

// A price plan, as Hurak's "Create New Plan": the plan's own name (only the provider sees it), 2, 3 or 4 packages (Basic, Plus,
// Pro, Elite to start with), and for each package its name, price per delegate, an optional "Save £" amount (shown as a was-price),
// a tagline, "Most popular" (one package at most) and its features, each included (✓) or not (✗) with an optional description.
// Saving (API provider.plans.save) changes what learners see at once: the dates and courses on the plan take its cheapest package
// as their price. `plan`: the plan to edit, or none for a new one.

const NAMES = ["Basic", "Plus", "Pro", "Elite"];
const MAX_FEATURES = 12;
const pounds = (pence) => (pence == null || pence === 0 ? "" : (pence / 100).toFixed(2).replace(/\.00$/, ""));
const pence = (v) => Math.round(Number(String(v).trim()) * 100);
const blankFeature = () => ({ title: "", description: "", included: true });
const blankTier = (i) => ({ name: NAMES[i], price: "", save: "", tagline: "", popular: false, features: [] });
const toDraft = (plan) => {
  const tiers = plan ? plan.tiers : null;
  return {
    name: plan?.name ?? "",
    tiers: tiers
      ? tiers.map((t) => ({ name: t.name, price: pounds(t.pricePence), save: pounds(t.savePence), tagline: t.tagline ?? "", popular: Boolean(t.popular), features: (t.features ?? []).map((f) => ({ title: f.title, description: f.description ?? "", included: f.included })) }))
      : [0, 1, 2].map(blankTier),
  };
};
// the packages as the API takes them
const toInput = (d) =>
  d.tiers.map((t) => ({
    name: t.name.trim(),
    pricePence: pence(t.price),
    savePence: t.save.trim() ? pence(t.save) : null,
    tagline: t.tagline.trim() || null,
    popular: t.popular,
    features: t.features.map((f) => ({ title: f.title.trim(), description: f.description.trim() || null, included: f.included })),
  }));

export default function PackageEditor({ open, onClose, plan = null, onSaved }) {
  const { organisationId } = useProviderAccess();
  const utils = api.useUtils();
  const save = api.provider.plans.save.useMutation();
  const [draft, setDraft] = useState(() => toDraft(null));
  const [start, setStart] = useState("");
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const formRef = useRef(null);

  // a fresh copy each time the dialog opens
  useEffect(() => {
    if (!open) return;
    const d = toDraft(plan);
    setDraft(d);
    setStart(JSON.stringify(d));
    setErrors({});
    setGeneral("");
  }, [open, plan?.id, plan?.version]); // eslint-disable-line react-hooks/exhaustive-deps -- read the plan once per opening
  const dirty = open && JSON.stringify(draft) !== start;
  useUnsavedChanges(dirty);

  // a field's message goes once the field is changed (the next send checks everything again)
  const clear = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  const setTier = (i, patch) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const setFeature = (i, k, patch) => setTier(i, { features: draft.tiers[i].features.map((f, j) => (j === k ? { ...f, ...patch } : f)) });
  const moveFeature = (i, k, by) => {
    const list = [...draft.tiers[i].features];
    const [x] = list.splice(k, 1);
    list.splice(k + by, 0, x);
    setTier(i, { features: list });
  };
  const setCount = (n) => setDraft((d) => ({ ...d, tiers: n <= d.tiers.length ? d.tiers.slice(0, n) : [...d.tiers, ...Array.from({ length: n - d.tiers.length }, (_, k) => blankTier(d.tiers.length + k))] }));
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
      if (t.save.trim() && !isMoney(t.save)) errs[`t${i}-save`] = "Enter a saving, like 30, or leave it empty.";
      t.features.forEach((f, k) => {
        if (!f.title.trim()) errs[`t${i}-f${k}`] = "Write the feature, or remove it.";
      });
    });
    setErrors(errs);
    setGeneral("");
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
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
  return (
    <Sheet open={open} onClose={onClose} title={plan ? "Edit price plan" : "Create price plan"} closeLabel="Close" className="rt-pws-pkg__sheet">
      <form className="rt-q__form rt-pws-pkg" onSubmit={submit} noValidate ref={formRef}>
        {general && <p className="rt-acc__notice -warn" tabIndex={-1} role="alert">{general}</p>}
        <p className="rt-acc__note">
          {plan
            ? `Changes show to learners as soon as you save.${used ? ` ${used.charAt(0).toUpperCase()}${used.slice(1)} on this plan ${usedMany ? "take" : "takes"} its cheapest package as ${usedMany ? "their" : "its"} price.` : ""}`
            : "Learners see the packages as soon as you put the plan on a date or a self-paced course. Its cheapest package is the price they show."}
        </p>

        <div className="rt-pws-pkg__top">
          <Field id="rt-plan-name" label="Plan name" error={errors.name} hint="Only your team sees this name. Learners see the package names.">
            <input {...aria("rt-plan-name", errors.name, true)} type="text" maxLength={60} autoComplete="off" placeholder="For example: SIA door supervisor packages" value={draft.name} onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); clear("name"); }} />
          </Field>
          <fieldset className="rt-field rt-pws-pkg__count">
            <legend>Number of packages</legend>
            <div className="rt-pws-pkg__countrow" role="group">
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" className={`rt-tr__filter${draft.tiers.length === n ? " is-on" : ""}`} aria-pressed={draft.tiers.length === n} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className={`rt-pws-pkg__tiers -n${draft.tiers.length}`}>
          {draft.tiers.map((t, i) => {
            const save = isMoney(t.price) && isMoney(t.save) ? Number(t.save) : 0;
            return (
              <section key={i} className={`rt-pws-pkg__tier${t.popular ? " -popular" : ""}`} aria-labelledby={`rt-plan-t${i}-h`}>
                <div className="rt-pws-pkg__tierhead">
                  <h3 className="rt-pws-pkg__h3" id={`rt-plan-t${i}-h`}>{t.name.trim() || `Package ${i + 1}`}</h3>
                  {t.popular && <span className="rt-pws-pkg__badge">Most popular</span>}
                </div>
                <Field id={`rt-plan-t${i}-name`} label="Package name" error={errors[`t${i}-name`]}>
                  <input {...aria(`rt-plan-t${i}-name`, errors[`t${i}-name`])} type="text" maxLength={30} autoComplete="off" value={t.name} onChange={(e) => { setTier(i, { name: e.target.value }); clear(`t${i}-name`); }} />
                </Field>
                <div className="rt-pws-pkg__money">
                  <Field id={`rt-plan-t${i}-price`} label="Price (£)" error={errors[`t${i}-price`]}>
                    <input {...aria(`rt-plan-t${i}-price`, errors[`t${i}-price`])} type="text" inputMode="decimal" autoComplete="off" value={t.price} onChange={(e) => { setTier(i, { price: e.target.value }); clear(`t${i}-price`); }} />
                  </Field>
                  <Field id={`rt-plan-t${i}-save`} label="Save (£)" error={errors[`t${i}-save`]}>
                    <input {...aria(`rt-plan-t${i}-save`, errors[`t${i}-save`])} type="text" inputMode="decimal" autoComplete="off" placeholder="Optional" value={t.save} onChange={(e) => { setTier(i, { save: e.target.value }); clear(`t${i}-save`); }} />
                  </Field>
                </div>
                <p className="rt-pws-pkg__save" aria-live="polite">Per delegate, all inclusive{save > 0 ? ` · was ${formatPrice(Number(t.price) + save)}, you save ${formatPrice(save)}` : ""}</p>
                <Field id={`rt-plan-t${i}-tag`} label="Tagline (optional)">
                  <input id={`rt-plan-t${i}-tag`} type="text" maxLength={80} autoComplete="off" placeholder="For example: Everything you need to pass" value={t.tagline} onChange={(e) => setTier(i, { tagline: e.target.value })} />
                </Field>
                <Toggle id={`rt-plan-t${i}-pop`} checked={t.popular} onChange={(on) => setPopular(i, on)} label="Mark as Most popular" />

                <fieldset className="rt-pws-pkg__itemset">
                  <legend>Features</legend>
                  {t.features.length > 0 && (
                    <ol className="rt-pws-pkg__itemrows">
                      {t.features.map((f, k) => {
                        const err = errors[`t${i}-f${k}`];
                        const id = `rt-plan-t${i}-f${k}`;
                        return (
                          <li key={k} className={`rt-pws-pkg__feature${f.included ? " -yes" : " -no"}`}>
                            <div className="rt-field">
                              <label htmlFor={id}>Feature {k + 1}</label>
                              {err && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{err}</p>}
                              <input id={id} type="text" maxLength={80} autoComplete="off" placeholder="For example: Free date changes" value={f.title} onChange={(e) => { setFeature(i, k, { title: e.target.value }); clear(`t${i}-f${k}`); }} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} />
                            </div>
                            <div className="rt-field">
                              <label htmlFor={`${id}-d`}>Description (optional)</label>
                              <input id={`${id}-d`} type="text" maxLength={200} autoComplete="off" value={f.description} onChange={(e) => setFeature(i, k, { description: e.target.value })} />
                            </div>
                            <div className="rt-pws-pkg__featurebar">
                              <div className="rt-pws-pkg__state" role="group" aria-label={`Feature ${k + 1}: included or not`}>
                                <button type="button" className={f.included ? "is-on -yes" : ""} aria-pressed={f.included} onClick={() => setFeature(i, k, { included: true })}><i className="icon-check text-10" aria-hidden="true"></i>Included</button>
                                <button type="button" className={!f.included ? "is-on -no" : ""} aria-pressed={!f.included} onClick={() => setFeature(i, k, { included: false })}><i className="icon-close text-10" aria-hidden="true"></i>Not included</button>
                              </div>
                              <span className="rt-pws-pkg__perkbtns">
                                <button type="button" className="rt-pws-pkg__move" onClick={() => moveFeature(i, k, -1)} disabled={k === 0} aria-label={`Move feature ${k + 1} up`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                                <button type="button" className="rt-pws-pkg__move" onClick={() => moveFeature(i, k, 1)} disabled={k === t.features.length - 1} aria-label={`Move feature ${k + 1} down`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                                <button type="button" className="rt-pws-set__textbtn" onClick={() => { setTier(i, { features: t.features.filter((_, j) => j !== k) }); setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => !key.startsWith(`t${i}-f`)))); }}>Remove<span className="rt-sr"> feature {k + 1}</span></button>
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {t.features.length < MAX_FEATURES && (
                    <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setTier(i, { features: [...t.features, blankFeature()] })}>Add feature<span className="rt-sr"> to {t.name || `package ${i + 1}`}</span></button>
                  )}
                </fieldset>
              </section>
            );
          })}
        </div>

        <div className="rt-pws-set__actions">
          <button type="submit" className="button -md -purple-1 text-white" disabled={save.isPending} aria-busy={save.isPending || undefined}>{save.isPending ? "Saving…" : plan ? "Save plan" : "Create plan"}</button>
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
