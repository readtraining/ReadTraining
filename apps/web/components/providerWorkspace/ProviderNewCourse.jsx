"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { createCourse } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { CardChoice, Choice } from "./providerParts";
import { categoryOptions, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { ErrorState } from "@/components/states/States";

// A new course in Hurak's five steps: 1 working title, 2 category, sub-category and topic, 3 compliance or not (a compliance course
// can also go on the shared landing page), 4 performance model, 5 Skill Saver. Previous / Continue, Exit back to the courses;
// Submit creates a draft and opens the course editor on its landing page.
const STEPS = 5;
const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];

export default function ProviderNewCourse() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ title: "", category: "", subcategory: "", topic: "", type: "", sharedLanding: "", model: "", skillSaver: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const subs = subcategoryOptions(f.category);
  const topics = topicOptions(f.category, f.subcategory);

  const check = () => {
    const e = {};
    if (step === 1 && !f.title.trim()) e.title = "Enter a working title. You can change it later.";
    if (step === 2) {
      if (!f.category) e.category = "Choose a category.";
      if (!f.subcategory) e.subcategory = "Choose a sub-category.";
    }
    if (step === 3) {
      if (!f.type) e.type = "Choose whether the course is compliance.";
      else if (f.type === "compliance" && !f.sharedLanding) e.sharedLanding = "Choose Yes or No.";
    }
    if (step === 4 && !f.model) e.model = "Choose a performance model.";
    if (step === 5 && !f.skillSaver) e.skillSaver = "Choose Yes or No.";
    return e;
  };
  const next = (ev) => {
    ev.preventDefault();
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(ref.current);
    if (step < STEPS) {
      setStep(step + 1);
      requestAnimationFrame(() => ref.current?.querySelector("h2")?.focus());
      return;
    }
    setBusy(true);
    const id = createCourse({
      title: f.title.trim(), category: f.category, subcategory: f.subcategory, topic: f.topic, type: f.type,
      sharedLanding: f.type === "compliance" && f.sharedLanding === "yes", model: f.model, skillSaver: f.skillSaver === "yes",
    });
    router.push(`/provider/courses/${id}`);
  };
  const back = () => {
    setErrors({});
    setStep(step - 1);
    requestAnimationFrame(() => ref.current?.querySelector("h2")?.focus());
  };
  const Err = ({ k }) => (errors[k] ? <p className="rt-q__err" id={`rt-pws-nc-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p> : null);

  // the categories come from the catalogue list; without it a course can't be filed, so say so instead of empty lists
  if (!categoryOptions().length) return <ErrorState title="We couldn't load the course categories." text="Check your connection, then try again." onRetry={() => router.refresh()} />;

  return (
    <form className="rt-acc__card rt-pws-wiz" onSubmit={next} noValidate ref={ref}>
      <div className="rt-pws-wiz__top">
        <p className="rt-pws-wiz__step">Step {step} of {STEPS}</p>
        <Link href="/provider/courses" className="rt-cd__link">Exit</Link>
      </div>
      <div className="rt-pws-wiz__bar" aria-hidden="true"><span style={{ "--rt-wiz": `${(step / STEPS) * 100}%` }}></span></div>

      {step === 1 && (
        <>
          <h2 className="rt-acc__h2" tabIndex={-1}>How about a working title?</h2>
          <div className="rt-field">
            <label htmlFor="rt-pws-nc-title">Working title</label>
            <p className="rt-field__hint" id="rt-pws-nc-title-h">It&apos;s ok if you can&apos;t think of a good title now. You can change it later.</p>
            <Err k="title" />
            <input id="rt-pws-nc-title" value={f.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="For example: Emergency First Aid at Work" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={`rt-pws-nc-title-h${errors.title ? " rt-pws-nc-title-e" : ""}`} />
            <span className="rt-field__hint rt-pws-course-count">{f.title.length} of 60</span>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="rt-acc__h2" tabIndex={-1}>What category best fits the knowledge you&apos;ll share?</h2>
          <p className="rt-acc__note">If you&apos;re not sure, you can change it later.</p>
          <div className="rt-pws-wiz__fields">
            <div className="rt-field">
              <label htmlFor="rt-pws-nc-category">Category</label>
              <Err k="category" />
              <FieldSelect id="rt-pws-nc-category" label="Category" placeholder="Choose a category" value={f.category} onChange={(v) => set({ category: v, subcategory: "", topic: "" })} options={categoryOptions()} invalid={Boolean(errors.category)} describedBy={errors.category ? "rt-pws-nc-category-e" : undefined} />
            </div>
            <div className="rt-field">
              <label htmlFor="rt-pws-nc-subcategory">Sub-category</label>
              <Err k="subcategory" />
              <FieldSelect id="rt-pws-nc-subcategory" label="Sub-category" placeholder={f.category ? "Choose a sub-category" : "Choose a category first"} value={f.subcategory} onChange={(v) => set({ subcategory: v, topic: "" })} options={subs} disabled={!f.category} invalid={Boolean(errors.subcategory)} describedBy={errors.subcategory ? "rt-pws-nc-subcategory-e" : undefined} />
            </div>
            <div className="rt-field">
              <label htmlFor="rt-pws-nc-topic">Topic (optional)</label>
              <FieldSelect id="rt-pws-nc-topic" label="Topic" placeholder={topics.length ? "Choose a topic" : "No topics for this sub-category"} value={f.topic} onChange={(v) => set({ topic: v })} options={topics} disabled={!topics.length} />
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="rt-acc__h2" tabIndex={-1}>What type of course is it?</h2>
          <CardChoice name="rt-pws-nc-type" legend="Course type" hideLegend value={f.type} onChange={(v) => set({ type: v, sharedLanding: v === "compliance" ? f.sharedLanding : "" })} error={errors.type}
            options={Object.entries(pw.courseTypes).map(([value, t]) => ({ value, label: t.label, text: t.text }))} />
          {f.type === "compliance" && (
            <Choice name="rt-pws-nc-shared" legend="Advertise it on our shared course landing page?" hint="A page on ReadTraining that lists every provider running this course, so learners can compare dates and prices." value={f.sharedLanding} onChange={(v) => set({ sharedLanding: v })} error={errors.sharedLanding} options={YES_NO} />
          )}
        </>
      )}

      {step === 4 && (
        <>
          <h2 className="rt-acc__h2" tabIndex={-1}>Choose a performance model</h2>
          <CardChoice name="rt-pws-nc-model" legend="Performance model" hideLegend value={f.model} onChange={(v) => set({ model: v })} error={errors.model}
            options={Object.entries(pw.models).map(([value, m]) => ({ value, label: `${m.short}: ${m.label.toLowerCase()}`, text: m.text, points: m.points }))} />
        </>
      )}

      {step === 5 && (
        <>
          <h2 className="rt-acc__h2" tabIndex={-1}>Skill Saver loyalty programme</h2>
          <p className="rt-acc__note">Learners on Skill Saver get money off their next course. Courses in the programme show the Skill Saver badge. <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link></p>
          <Choice name="rt-pws-nc-saver" legend="Include this course in Skill Saver?" value={f.skillSaver} onChange={(v) => set({ skillSaver: v })} error={errors.skillSaver} options={YES_NO} />
        </>
      )}

      <div className="rt-pws-wiz__foot">
        {step > 1 ? <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={back}>Previous</button> : <span />}
        <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{step < STEPS ? "Continue" : busy ? "Creating…" : "Submit"}</button>
      </div>
    </form>
  );
}
