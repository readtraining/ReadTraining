"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { CourseEndpoints, useCourseEndpoints, useEndpoints } from "@/lib/courseEditorApi";
import { getSupabase } from "@/lib/supabase/client";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { CourseGear, SeoPanel, SharedGear } from "./CourseSettings";
import { CohortForm } from "./ProviderCohorts";
import { COURSE_TONE, CardChoice, Loading, Pill, formatWhen, getQuery, setQuery } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { categoryName, categoryOptions, levelOptions, methodName, subcategoryName, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";

// The course editor's sections, in Hurak's order, each ticked in the "Publish your course" list when it is complete. FAQs and SEO
// are optional: they never stop a course being sent for approval.
const SECTIONS = [
  { key: "landing", label: "Course landing page" },
  { key: "info", label: "Course information" },
  { key: "syllabus", label: "Syllabus and exam" },
  { key: "faqs", label: "FAQs", optional: true },
  { key: "pricing", label: "Course pricing" },
  { key: "mode", label: "Mode of study" },
  { key: "seo", label: "SEO settings", optional: true },
];
// a shared course page (written by ReadTraining's team) has no price, dates or way of teaching of its own: its providers' courses do
const SHARED_SECTIONS = ["landing", "info", "syllabus", "faqs", "seo"];
const FORM_SECTIONS = ["landing", "info", "syllabus", "faqs", "pricing", "mode"];
const LIMITS = { title: 80, summary: 300, feature: 70, outcome: 160 };
const MAX_IMAGE = 2 * 1024 * 1024; // the course-media bucket's limit
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_RE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\/\S+$/;
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const STATUS_NOTES = {
  draft: "This course is a draft. Only your team can see it.",
  pending: "We're checking this course. You can still make changes.",
  changes: "Our team has asked for changes. Make them, then send the course for approval again.",
  live: "This course is live. Changes to its wording are checked by our team before learners see them; prices, dates and settings change straight away.",
  paused: "This course is paused, so it doesn't show on ReadTraining. Put it back live from the course settings (the gear).",
};
const SHARED_NOTES = {
  draft: "This shared course page is a draft: nobody outside the team can see it, and providers can't list their courses on it yet. Publish it when it is complete.",
  live: "This shared course page is live. Changes you save show on it straight away. Providers can list their courses on it.",
  paused: "This shared course page is off the site. Providers' courses on it don't show until it is published again.",
};
// fields only the page's wording (the "page" roles: course editor, marketing) may change; the rest need full course editing
const PAGE_FIELDS = ["title", "summary", "description", "audience", "entryRequirements", "outcomes", "features", "videoUrl"];
const PRICE_FIELDS = ["price", "skillSaver"];

// The draft the editor works on: the saved course, with any change still waiting for approval on top (so the provider keeps
// editing their latest version).
const draftOf = (c) => {
  const p = c.pendingChanges?.content || {};
  const pick = (k) => (p[k] !== undefined ? p[k] : c[k]);
  return {
    model: c.model, method: c.method || "classroom", skillSaver: c.skillSaver, price: c.pricePence == null ? "" : (c.pricePence / 100).toFixed(2).replace(/\.00$/, ""),
    title: pick("title") || "", summary: pick("summary") || "", description: pick("description") || "", audience: pick("audience") || "", entryRequirements: pick("entryRequirements") || "",
    outcomes: pick("outcomes") || [], features: pick("features") || [], category: pick("category") || "", subcategory: pick("subcategory") || "", topic: pick("topic") || "", level: pick("level") || "",
    videoUrl: pick("videoUrl") || "",
    units: (pick("units") || []).map((u) => ({ title: u.title, body: u.body || "" })),
    exams: (pick("exams") || []).map((e) => ({ unit: e.unit, passMark: e.passMark || "", duration: e.duration || "" })),
    faqs: (pick("faqs") || []).map((f) => ({ question: f.question, answer: f.answer })),
  };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// whether each section is complete, from the draft (and the saved images and dates)
function sectionOk(d, course, key) {
  if (key === "landing") return Boolean(d.title.trim() && d.summary.trim() && d.description.trim() && d.category && d.subcategory && d.level && course.images.length);
  if (key === "info") return d.outcomes.length >= 4;
  if (key === "syllabus") return d.units.length > 0;
  if (key === "faqs") return d.faqs.length > 0;
  if (key === "pricing") return d.method !== "self-paced" || d.price !== "";
  if (key === "mode") return Boolean(d.method);
  return Boolean(course.seoTitle && course.seoDescription);
}

// What changed in the draft, as the API takes it. The catalogue place goes as one (category, sub-category and topic together).
function changes(draft, base, access) {
  const out = {};
  const keys = Object.keys(draft).filter((k) => !same(draft[k], base[k]));
  for (const k of keys) {
    if (!access.full && !PAGE_FIELDS.includes(k)) continue;
    if (!access.pricing && PRICE_FIELDS.includes(k)) continue;
    if (k === "price") out.pricePence = draft.price === "" ? null : Math.round(Number(draft.price) * 100);
    else if (["category", "subcategory", "topic"].includes(k)) Object.assign(out, { category: draft.category, subcategory: draft.subcategory, topic: draft.topic || null });
    else out[k] = draft[k];
  }
  return out;
}

// One course, as Hurak's editor: the "Publish your course" list on the left (one item per section, ticked when complete, kept in
// ?tab=), the section on the right. The sections' fields are one draft saved with "Save"; images and SEO save themselves. The
// header shows the status and performance model, with Preview and the gear (course settings). "Send for approval" sends a draft
// once nothing required is missing. Leaving with unsaved changes asks first. Course data comes from the API.
// scope "admin": the same editor for a shared course page in the admin (lib/courseEditorApi.js): no pricing or mode of study,
// changes go live on Save, and the page is published from here instead of sent for approval.
export default function ProviderCourseEditor({ courseId, scope = "provider" }) {
  const id = /^\d+$/.test(String(courseId)) ? Number(courseId) : 0;
  const ep = useCourseEndpoints(scope, id);
  const query = ep.query;
  const course = query.data;
  const [tab, setTab] = useState("landing");
  const [draft, setDraft] = useState(null);
  const [base, setBase] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [said, setSaid] = useState("");
  const [gear, setGear] = useState(false);
  const [preview, setPreview] = useState(false);
  const formRef = useRef(null);
  const navRef = useRef(null);
  const loadedFor = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  const saved = useCallback((message) => setToast({ message }), []);
  const access = ep.access;
  const sections = ep.admin ? SECTIONS.filter((x) => SHARED_SECTIONS.includes(x.key)) : SECTIONS;
  const back = ep.admin ? { label: "Back to the catalogue", href: "/admin/catalogue" } : { label: "Back to courses", href: "/provider/courses" };

  useEffect(() => {
    const t = getQuery("tab");
    if (sections.some((x) => x.key === t)) setTab(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- read the address once

  useEffect(() => {
    if (course && loadedFor.current !== course.id) {
      loadedFor.current = course.id;
      const d = draftOf(course);
      setDraft(d);
      setBase(d);
    }
  }, [course]);

  const dirty = Boolean(draft && base && !same(draft, base));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!id || query.error?.data?.code === "NOT_FOUND" || (ep.admin && course && course.kind !== "shared")) return <EmptyState title="This course was not found" text={ep.admin ? "It may have been deleted. Only shared course pages are edited here." : "It may have been deleted, or it belongs to another provider."} action={back} />;
  if (query.isError) return <ErrorState title="We couldn't load this course." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!course || !draft) return <Loading rows={3} />;

  const canSubmit = access.full && (ep.admin ? course.status !== "live" : course.status === "draft" || course.status === "changes");
  const isLive = course.status === "live" || course.status === "paused";
  const ticks = sections.map((x) => ({ ...x, ok: sectionOk(draft, course, x.key) }));
  const refresh = ep.refresh;

  // checks what the API would refuse, so the provider is shown the field, then saves what changed
  const save = async () => {
    const e = {};
    if (!draft.title.trim() || draft.title.trim().length < 3) e.title = "Enter a title of at least 3 characters.";
    if (draft.price !== "" && !PRICE_RE.test(draft.price)) e.price = "Enter the price in pounds, like 95 or 95.50.";
    if (draft.videoUrl.trim() && !VIDEO_RE.test(draft.videoUrl.trim())) e.videoUrl = "Use a YouTube or Vimeo link, starting https://";
    setErrors(e);
    if (Object.keys(e).length) {
      const where = e.price ? "pricing" : "landing";
      if (tab !== where) changeTab(where);
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return false;
    }
    const clean = { ...draft, title: draft.title.trim(), summary: draft.summary.trim(), videoUrl: draft.videoUrl.trim() };
    const patch = changes(clean, base, access);
    if (!Object.keys(patch).length) {
      setDraft(clean);
      setBase(clean);
      return true;
    }
    try {
      const r = await ep.update(patch);
      setDraft(clean);
      setBase(clean);
      refresh();
      const message = r.pendingChange ? "Saved. Your changes go live once our team has checked them." : ep.admin && course.status === "live" ? "Saved. The page shows the changes now." : "Course saved.";
      setSaid(message);
      setToast({ message });
      return true;
    } catch (error) {
      const { fields, general } = errorsFrom(error);
      setErrors({ ...fields, form: general });
      if (fields.price || fields.pricePence) changeTab("pricing");
      setSaid(general || Object.values(fields)[0] || "");
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return false;
    }
  };
  // send for approval (a provider's course) or publish (a shared page), saving first if needed
  const submit = async () => {
    if (dirty && !(await save())) return;
    try {
      if (ep.admin) await ep.setStatus("live");
      else await ep.submit();
      refresh();
      setToast({ message: ep.admin ? "Published. The page is live and providers can list their courses on it." : "Sent for approval. We'll email you within 2 working days." });
    } catch (error) {
      setSaid(errorsFrom(error).general);
      navRef.current?.focus();
    }
  };
  const withdraw = async () => {
    await ep.discard();
    const d = draftOf(await ep.fetch());
    setDraft(d);
    setBase(d);
    refresh();
    setToast({ message: "Your changes were withdrawn. The live version stays as it is." });
  };
  function changeTab(t) {
    setTab(t);
    setErrors({});
    setQuery("tab", t === "landing" ? "" : t);
  }
  const lastSaved = course.updatedAt ? formatWhen(new Date(course.updatedAt).getTime()) : "";
  const busy = ep.updating || ep.submitting;
  const sectionProps = { course, draft, setDraft, errors, access };

  return (
    <CourseEndpoints.Provider value={ep}>
    <div className="rt-acc__stack">
      <p className="rt-sr" aria-live="polite">{said}</p>
      <section className="rt-acc__card rt-adm-hero" aria-label="Course">
        <div className="rt-pws-course-herotext">
          <div className="rt-adm-item__top">
            <Pill tone={COURSE_TONE[course.status]}>{pw.courseStatuses[course.status]}</Pill>
            <span className="rt-adm-item__when">{ep.admin ? "Shared course page" : `Performance model: ${pw.models[course.model]?.label}`}{lastSaved ? ` · Last saved ${lastSaved}` : ""}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{course.title}</h2>
          <p className="rt-acc__note">{(ep.admin ? SHARED_NOTES : STATUS_NOTES)[course.status]}</p>
          {course.status === "changes" && course.statusNote && <p className="rt-adm-item__block"><b>What to change:</b> {course.statusNote}</p>}
          {course.parent && <p className="rt-acc__note">Listed on the shared course page <b>{course.parent.title}</b>.</p>}
          {!ep.admin && course.lastChange?.status === "rejected" && course.lastChange.note && !course.pendingChanges && <p className="rt-adm-item__block"><b>Your last change was not approved:</b> {course.lastChange.note}</p>}
          {!ep.admin && course.status === "paused" && course.statusNote && <p className="rt-adm-item__block"><b>Paused by our team:</b> {course.statusNote} Contact us to put it back live.</p>}
        </div>
        <div className="rt-adm-hero__actions">
          {FORM_SECTIONS.includes(tab) && dirty && <span className="rt-pws-course-unsaved"><i className="icon-edit text-12" aria-hidden="true"></i>Unsaved changes</span>}
          {FORM_SECTIONS.includes(tab) && access.page && <button type="button" className="button -sm -purple-1 text-white" onClick={save} disabled={busy} aria-busy={ep.updating || undefined}>{ep.updating ? "Saving…" : "Save"}</button>}
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setPreview(true)}>Preview</button>
          <button type="button" className="rt-pws-ce__gear" onClick={() => setGear(true)} aria-label="Course settings"><i className="icon-setting text-16" aria-hidden="true"></i></button>
        </div>
      </section>

      {course.pendingChanges && (
        <section className="rt-acc__card rt-pws-ce__pending" aria-label="Changes waiting for approval">
          <p className="rt-acc__note"><b>Your changes are waiting for approval.</b> Learners see the live version until our team has checked them (saved {formatWhen(new Date(course.pendingChanges.since).getTime())}). You can keep editing: new changes join the same request.</p>
          {access.page && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={withdraw} disabled={ep.discarding}>Withdraw changes</button>}
        </section>
      )}
      {!access.page && <p className="rt-adm-item__block">{ep.admin ? "You can see this page but not change it: that needs the catalogue switch." : "Your role can see this course but not change it."}</p>}
      {!ep.admin && access.page && !access.full && <p className="rt-adm-item__block">Your role can change the page wording and search settings. Ask an owner or admin to change the rest.</p>}

      <div className="rt-pws-ce">
        <nav className="rt-acc__card rt-pws-ce__nav" aria-labelledby="rt-pws-ce-nav-h" tabIndex={-1} ref={navRef}>
          <h2 className="rt-adm-h3" id="rt-pws-ce-nav-h">{ep.admin ? "Publish the page" : "Publish your course"}</h2>
          <ol className="rt-pws-ce__steps">
            {ticks.map((x) => (
              <li key={x.key}>
                <button type="button" className={`rt-pws-ce__step${tab === x.key ? " is-on" : ""}`} onClick={() => changeTab(x.key)} aria-current={tab === x.key ? "step" : undefined}>
                  <span className={`rt-pws-course-tick${x.ok ? " is-ok" : ""}`} aria-hidden="true">{x.ok ? <i className="icon-check text-10"></i> : null}</span>
                  {x.label}{x.optional && <small className="rt-pws-ce__opt"> (optional)</small>}<span className="rt-sr">{x.ok ? ": complete" : ": not complete"}</span>
                </button>
              </li>
            ))}
          </ol>
          {canSubmit ? (
            <>
              <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={submit} disabled={busy} aria-busy={ep.submitting || undefined}>{ep.admin ? (ep.submitting ? "Publishing…" : "Publish") : ep.submitting ? "Sending…" : "Send for approval"}</button>
              {course.missing.length > 0 && <p className="rt-acc__note rt-pws-ce__need">Still needed: {course.missing.join("; ")}.</p>}
            </>
          ) : <p className="rt-pws-ce__status"><Pill tone={COURSE_TONE[course.status]}>{pw.courseStatuses[course.status]}</Pill></p>}
        </nav>

        <div className="rt-pws-ce__main" ref={formRef}>
          {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
          {tab === "landing" && <LandingSection {...sectionProps} shared={ep.admin} onSaved={saved} />}
          {tab === "info" && <InfoSection {...sectionProps} />}
          {tab === "syllabus" && <SyllabusSection {...sectionProps} />}
          {tab === "faqs" && <FaqSection {...sectionProps} />}
          {!ep.admin && tab === "pricing" && <PricingSection {...sectionProps} />}
          {!ep.admin && tab === "mode" && <ModeSection {...sectionProps} isLive={isLive} onSaved={saved} />}
          {tab === "seo" && (
            <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-seo-h">
              <h2 className="rt-acc__h2" id="rt-pws-ce-seo-h">SEO settings</h2>
              <p className="rt-acc__note">How the course page shows in Google and other search results. Saved on its own, straight away.</p>
              <SeoPanel course={course} onSaved={saved} />
            </section>
          )}
        </div>
      </div>

      {ep.admin ? <SharedGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} /> : <CourseGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} />}
      <PreviewSheet open={preview} onClose={() => setPreview(false)} course={course} draft={draft} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
    </CourseEndpoints.Provider>
  );
}

// ---- Preview ---------------------------------------------------------------------------------------------------------------

// The course page as learners will see the top of it, from the unsaved draft.
function PreviewSheet({ open, onClose, course, draft }) {
  const cover = course.images[0];
  const cost = draft.method === "self-paced" && PRICE_RE.test(draft.price) ? formatPrice(Number(draft.price)) : "";
  return (
    <Sheet open={open} onClose={onClose} title="Preview" closeLabel="Close">
      <article className="rt-pws-ce__preview">
        {cover ? <img src={cover.url} alt={cover.alt || ""} /> : <EmptyState inCard title="No course image yet." />}
        <p className="rt-pws-ce__pcat">{[categoryName(draft.category), subcategoryName(draft.category, draft.subcategory)].filter(Boolean).join(" › ")}</p>
        <h3>{draft.title || "Untitled course"}</h3>
        {draft.summary && <p>{draft.summary}</p>}
        {cost && <p className="rt-adm-price">{cost}</p>}
        {draft.features.length > 0 && <ul className="rt-pws-course-tags">{draft.features.map((f) => <li key={f}><span>{f}</span></li>)}</ul>}
        {draft.outcomes.length > 0 && (
          <>
            <h4>What you&apos;ll learn</h4>
            <ul className="rt-pws-ce__learn">{draft.outcomes.map((o) => <li key={o}><i className="icon-check text-10" aria-hidden="true"></i>{o}</li>)}</ul>
          </>
        )}
        {draft.description && <><h4>Course details</h4><p className="rt-pws-ce__details">{draft.description}</p></>}
        {draft.audience && <><h4>Who it&apos;s for</h4><p className="rt-pws-ce__details">{draft.audience}</p></>}
        {draft.entryRequirements && <><h4>Entry requirements</h4><p className="rt-pws-ce__details">{draft.entryRequirements}</p></>}
      </article>
    </Sheet>
  );
}

// ---- shared parts ----------------------------------------------------------------------------------------------------------

function Counter({ value, max }) {
  return <span className="rt-field__hint rt-pws-course-count">{value.length} of {max}</span>;
}
const FieldErr = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);
const useSet = (setDraft) => (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

// A list of short lines added one at a time (features, learning outcomes), with Enter or the Add button; outcomes can be reordered.
function LineList({ id, label, hint, items, onChange, max, placeholder, ordered = false, commas = false, disabled }) {
  const [value, setValue] = useState("");
  const add = (text = value) => {
    const parts = (commas ? text.split(",") : [text]).map((x) => x.trim().slice(0, max)).filter(Boolean);
    if (parts.length) onChange([...items, ...parts.filter((p) => !items.includes(p))]);
    setValue("");
  };
  const move = (i, by) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
  };
  return (
    <div className="rt-field">
      <label htmlFor={id}>{label}</label>
      <span className="rt-field__hint" id={`${id}-h`}>{hint}</span>
      {!disabled && (
        <div className="rt-pws-course-addrow">
          <input id={id} value={value} maxLength={max} onChange={(e) => (commas && e.target.value.includes(",") ? add(e.target.value) : setValue(e.target.value))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} aria-describedby={`${id}-h`} autoComplete="off" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => add()}>Add</button>
        </div>
      )}
      {items.length > 0 && (ordered ? (
        <ol className="rt-pws-course-list">
          {items.map((o, i) => (
            <li key={o}>
              <span className="rt-pws-course-list__text">{o}</span>
              {!disabled && (
                <span className="rt-pws-course-list__tools">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move up: ${o}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move down: ${o}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                  <button type="button" onClick={() => onChange(items.filter((x) => x !== o))} aria-label={`Remove: ${o}`}><i className="icon-bin text-12" aria-hidden="true"></i></button>
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="rt-pws-course-tags">
          {items.map((f) => (
            <li key={f}><span>{f}</span>{!disabled && <button type="button" onClick={() => onChange(items.filter((x) => x !== f))} aria-label={`Remove ${f}`}><i className="icon-close text-10" aria-hidden="true"></i></button>}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}

// ---- Course landing page ---------------------------------------------------------------------------------------------------

function LandingSection({ course, draft, setDraft, errors, access, shared = false, onSaved }) {
  const set = useSet(setDraft);
  const subs = subcategoryOptions(draft.category);
  const topics = topicOptions(draft.category, draft.subcategory);
  const full = !access.full;
  const page = !access.page;

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-basics-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-basics-h">Course landing page</h2>
        {!shared && <CardChoice name="rt-pws-ce-model" legend="Performance model" value={draft.model} onChange={(v) => !full && set("model")(v)}
          options={Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label, text: m.text, disabled: full && value !== draft.model }))} />}
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-title">Course title</label>
          <FieldErr id="rt-pws-ce-title" text={errors.title} />
          <input id="rt-pws-ce-title" value={draft.title} maxLength={LIMITS.title} onChange={(e) => set("title")(e.target.value)} disabled={page} placeholder="For example: Emergency First Aid at Work" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? "rt-pws-ce-title-e" : undefined} />
          <Counter value={draft.title} max={LIMITS.title} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-sub">Short description</label>
          <span className="rt-field__hint" id="rt-pws-ce-sub-h">One or two sentences under the title: who it is for and what they get.</span>
          <FieldErr id="rt-pws-ce-sub" text={errors.summary} />
          <textarea id="rt-pws-ce-sub" rows={2} value={draft.summary} maxLength={LIMITS.summary} onChange={(e) => set("summary")(e.target.value)} disabled={page} aria-describedby="rt-pws-ce-sub-h" autoComplete="off" />
          <Counter value={draft.summary} max={LIMITS.summary} />
        </div>
        <div className="rt-pws-course-grid3">
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-level">Course level</label>
            <FieldErr id="rt-pws-ce-level" text={errors.level} />
            <FieldSelect id="rt-pws-ce-level" label="Course level" placeholder="Choose a level" value={draft.level} onChange={set("level")} options={levelOptions()} disabled={full} invalid={Boolean(errors.level)} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-cat">Course category</label>
            <FieldErr id="rt-pws-ce-cat" text={errors.category} />
            <FieldSelect id="rt-pws-ce-cat" label="Course category" placeholder="Choose a category" value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v, subcategory: "", topic: "" }))} options={categoryOptions()} disabled={full} invalid={Boolean(errors.category)} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-subcat">Course sub-category</label>
            <FieldErr id="rt-pws-ce-subcat" text={errors.subcategory} />
            <FieldSelect id="rt-pws-ce-subcat" label="Course sub-category" placeholder={draft.category ? "Choose a sub-category" : "Choose a category first"} value={draft.subcategory} onChange={(v) => setDraft((d) => ({ ...d, subcategory: v, topic: "" }))} options={subs} disabled={full || !draft.category} invalid={Boolean(errors.subcategory)} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-topic">Course topic (optional)</label>
            <FieldSelect id="rt-pws-ce-topic" label="Course topic" placeholder={topics.length ? "Choose a topic" : "No topics for this sub-category"} value={draft.topic} onChange={set("topic")} options={topics} disabled={full || !topics.length} />
          </div>
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-details">Course description</label>
          <span className="rt-field__hint" id="rt-pws-ce-details-h">What the course covers, how it is taught and assessed. Leave a blank line between paragraphs.</span>
          <textarea id="rt-pws-ce-details" rows={8} maxLength={10000} value={draft.description} onChange={(e) => set("description")(e.target.value)} disabled={page} aria-describedby="rt-pws-ce-details-h" autoComplete="off" />
        </div>
      </section>

      <ImagesCard course={course} disabled={page} onSaved={onSaved} />

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-video-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-video-h">Overview video (optional)</h2>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-video">Video link</label>
          <span className="rt-field__hint" id="rt-pws-ce-video-h2">A YouTube or Vimeo link. Copy it from the video&apos;s Share button.</span>
          <FieldErr id="rt-pws-ce-video" text={errors.videoUrl} />
          <input id="rt-pws-ce-video" type="url" inputMode="url" value={draft.videoUrl} onChange={(e) => set("videoUrl")(e.target.value)} disabled={page} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={errors.videoUrl ? true : undefined} aria-describedby={`rt-pws-ce-video-h2${errors.videoUrl ? " rt-pws-ce-video-e" : ""}`} autoComplete="url" />
        </div>
      </section>
    </form>
  );
}

// The course's images: uploaded straight away (not part of the draft), shown in order; the first is the cover in search results.
function ImagesCard({ course, disabled, onSaved }) {
  const ep = useEndpoints();
  const [list, setList] = useState(course.images);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  useEffect(() => setList(course.images), [course.images]);
  const changed = !same(list.map((i) => [i.id, i.alt]), course.images.map((i) => [i.id, i.alt]));
  const refresh = ep.refresh;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError("Choose a JPG, PNG, WebP or GIF picture.");
    if (file.size > MAX_IMAGE) return setError("Choose a picture under 2MB.");
    if (course.images.length >= 10) return setError("A course can have up to 10 images. Remove one first.");
    setError("");
    setBusy(true);
    try {
      const { path, token } = await ep.uploadUrl(file.type);
      const { error: upError } = await getSupabase().storage.from("course-media").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upError) throw new Error("The picture didn't upload. Please try again.");
      await ep.addImage(path);
      refresh();
      onSaved("Image added");
    } catch (err) {
      setError(err?.data ? errorsFrom(err).general : err.message || "The picture didn't upload. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const saveList = async (next, message) => {
    setError("");
    setBusy(true);
    try {
      await ep.setImages(next.map((i) => ({ id: i.id, alt: i.alt || "" })));
      refresh();
      onSaved(message);
    } catch (err) {
      setError(errorsFrom(err).general);
      setList(course.images);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-media-h" aria-busy={busy || undefined}>
      <h2 className="rt-acc__h2" id="rt-pws-ce-media-h">Course images</h2>
      <p className="rt-acc__note">They show at the top of the course page; the first image is the cover in search results. Images are saved as soon as you add or change them.</p>
      {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      {!disabled && (
        <div className="rt-pws-course-mediabar">
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} className="rt-sr" id="rt-pws-ce-file" onChange={onFile} tabIndex={-1} aria-hidden="true" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Upload course image"}</button>
          <span className="rt-field__hint">500 × 300 pixels or larger. JPG, PNG, WebP or GIF, up to 2MB. No text on the image.</span>
        </div>
      )}
      {list.length ? (
        <>
          <ul className="rt-pws-course-media">
            {list.map((m, i) => (
              <li key={m.id} className="rt-pws-course-mediaitem">
                <img src={m.url} alt="" />
                <div className="rt-pws-course-mediabody">
                  {i === 0 ? <Pill tone="info">Cover</Pill> : !disabled && <button type="button" className="fb-textlink rt-pws-course-linkbtn" disabled={busy} onClick={() => saveList([m, ...list.filter((x) => x.id !== m.id)], "Cover image changed")}>Make cover</button>}
                  <div className="rt-field">
                    <label htmlFor={`rt-pws-ce-alt-${i}`}>ALT text</label>
                    <input id={`rt-pws-ce-alt-${i}`} value={m.alt || ""} maxLength={140} disabled={disabled} onChange={(e) => setList(list.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} placeholder="For example: learners practising CPR on a manikin" autoComplete="off" />
                  </div>
                  {!disabled && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" disabled={busy} onClick={() => saveList(list.filter((x) => x.id !== m.id), "Image removed")}>Remove<span className="rt-sr"> image {i + 1}</span></button>}
                </div>
              </li>
            ))}
          </ul>
          {changed && !disabled && <div><button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => saveList(list, "ALT text saved")}>Save ALT text</button></div>}
        </>
      ) : <EmptyState inCard title="No images yet. Upload one: a course needs an image before it can be sent for approval." />}
    </section>
  );
}

// ---- Course information ----------------------------------------------------------------------------------------------------

function InfoSection({ draft, setDraft, access }) {
  const set = useSet(setDraft);
  const page = !access.page;
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-learn-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-learn-h">Course information</h2>
        <p className="rt-acc__note">These show on the public course page and help it perform in search.</p>
        <LineList id="rt-pws-ce-feature" label="Course features" hint={'Short facts shown as tags, like "1 day" or "Certificate valid 3 years". Press Enter or type a comma to add.'} items={draft.features} onChange={set("features")} max={LIMITS.feature} commas disabled={page} />
        <LineList id="rt-pws-ce-obj" label="What will learners learn?" hint={`Add at least 4, each starting with a verb. Press Enter to add. ${draft.outcomes.length} added${draft.outcomes.length < 4 ? `, ${4 - draft.outcomes.length} more to reach 4` : ""}.`} items={draft.outcomes} onChange={set("outcomes")} max={LIMITS.outcome} placeholder="For example: Give CPR to an adult" ordered disabled={page} />
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-aud">Who is it for? (optional)</label>
          <span className="rt-field__hint" id="rt-pws-ce-aud-h">The people and jobs the course suits.</span>
          <textarea id="rt-pws-ce-aud" rows={3} maxLength={2000} value={draft.audience} onChange={(e) => set("audience")(e.target.value)} disabled={page} aria-describedby="rt-pws-ce-aud-h" autoComplete="off" />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-req">Entry requirements (optional)</label>
          <span className="rt-field__hint" id="rt-pws-ce-req-h">What learners need before they book, like an age, ID or an earlier qualification. Leave it empty if there are none.</span>
          <textarea id="rt-pws-ce-req" rows={3} maxLength={2000} value={draft.entryRequirements} onChange={(e) => set("entryRequirements")(e.target.value)} disabled={page} aria-describedby="rt-pws-ce-req-h" autoComplete="off" />
        </div>
      </section>
    </form>
  );
}

// ---- Syllabus and exam -----------------------------------------------------------------------------------------------------

function SyllabusSection({ draft, setDraft, access }) {
  const set = useSet(setDraft);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  const locked = !access.full;
  const move = (i, by) => {
    const next = [...draft.units];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    set("units")(next);
  };
  const setExam = (i, patch) => set("exams")(draft.exams.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-units-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-units-h">Syllabus</h2>
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setEditing(null); setSheet(true); }}>Add unit</button>}
        </div>
        <p className="rt-acc__note">The course&apos;s units, in order. Learners open each one on the course page to see what it covers.</p>
        {draft.units.length ? (
          <ol className="rt-adm-list">
            {draft.units.map((u, i) => (
              <li key={`${u.title}-${i}`}>
                <div><b>{i + 1}. {u.title}</b>{u.body && <small className="rt-pws-ce__unitbody">{u.body}</small>}</div>
                {!locked && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move up: ${u.title}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => move(i, 1)} disabled={i === draft.units.length - 1} aria-label={`Move down: ${u.title}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => { setEditing(i); setSheet(true); }}>Edit<span className="rt-sr"> {u.title}</span></button>
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("units")(draft.units.filter((_, j) => j !== i))}>Remove<span className="rt-sr"> {u.title}</span></button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : <EmptyState inCard title="No units yet. Add at least one: a course needs its syllabus before it can be sent for approval." />}
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-exam-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-exam-h">Exam and assessment (optional)</h2>
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => set("exams")([...draft.exams, { unit: "", passMark: "", duration: "" }])} disabled={draft.exams.length >= 20}>Add row</button>}
        </div>
        <p className="rt-acc__note">If the course ends with an exam, one row per paper or practical: what it covers, the pass mark and how long it takes. Leave it empty if there is no exam.</p>
        {draft.exams.length ? (
          <ol className="rt-pws-ce__exams">
            {draft.exams.map((e, i) => (
              <li key={i} className="rt-pws-ce__exam">
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-u${i}`}>Exam or unit</label>
                  <input id={`rt-pws-ce-ex-u${i}`} value={e.unit} maxLength={120} onChange={(ev) => setExam(i, { unit: ev.target.value })} disabled={locked} placeholder="For example: Multiple choice paper" autoComplete="off" />
                </div>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-p${i}`}>Pass mark</label>
                  <input id={`rt-pws-ce-ex-p${i}`} value={e.passMark} maxLength={40} onChange={(ev) => setExam(i, { passMark: ev.target.value })} disabled={locked} placeholder="For example: 70%" autoComplete="off" />
                </div>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-d${i}`}>Duration</label>
                  <input id={`rt-pws-ce-ex-d${i}`} value={e.duration} maxLength={40} onChange={(ev) => setExam(i, { duration: ev.target.value })} disabled={locked} placeholder="For example: 45 minutes" autoComplete="off" />
                </div>
                {!locked && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("exams")(draft.exams.filter((_, j) => j !== i))}>Remove<span className="rt-sr"> exam row {i + 1}</span></button>}
              </li>
            ))}
          </ol>
        ) : <EmptyState inCard title="No exam on this course." />}
      </section>

      <UnitSheet open={sheet} onClose={() => setSheet(false)} unit={editing === null ? null : draft.units[editing]} onSave={(rows) => {
        if (editing === null) set("units")([...draft.units, ...rows].slice(0, 40));
        else set("units")(draft.units.map((u, i) => (i === editing ? rows[0] : u)));
        setSheet(false);
      }} />
    </form>
  );
}

// Add one or more units (a title and what it covers), or edit one.
function UnitSheet({ open, onClose, unit, onSave }) {
  const [rows, setRows] = useState([{ title: "", body: "" }]);
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setRows([unit ? { ...unit } : { title: "", body: "" }]);
      setErrors({});
    }
  }, [open, unit]);
  const change = (i, key, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    rows.forEach((r, i) => {
      if (!r.title.trim()) err[`t${i}`] = "Enter the unit title.";
    });
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    onSave(rows.map((r) => ({ title: r.title.trim(), body: r.body.trim() })));
  };
  return (
    <Sheet open={open} onClose={onClose} title={unit ? "Edit unit" : "Add units"} closeLabel="Close">
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <p className="rt-acc__note">A title for each unit, and what it covers: one topic per line.</p>
        {rows.map((r, i) => (
          <fieldset key={i} className="rt-pws-course-repeat">
            <legend>Unit {i + 1}</legend>
            <div className="rt-field">
              <label htmlFor={`rt-pws-cu-t${i}`}>Unit title</label>
              {errors[`t${i}`] && <p className="rt-q__err" id={`rt-pws-cu-t${i}-e`}><span className="rt-sr">Error: </span>{errors[`t${i}`]}</p>}
              <input id={`rt-pws-cu-t${i}`} value={r.title} maxLength={120} onChange={(e) => change(i, "title", e.target.value)} placeholder="For example: Life-saving skills" aria-invalid={errors[`t${i}`] ? true : undefined} aria-describedby={errors[`t${i}`] ? `rt-pws-cu-t${i}-e` : undefined} autoComplete="off" />
            </div>
            <div className="rt-field">
              <label htmlFor={`rt-pws-cu-b${i}`}>What it covers (optional)</label>
              <textarea id={`rt-pws-cu-b${i}`} rows={4} value={r.body} maxLength={2000} onChange={(e) => change(i, "body", e.target.value)} autoComplete="off" />
            </div>
            {rows.length > 1 && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove unit {i + 1}</button>}
          </fieldset>
        ))}
        {!unit && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setRows((x) => [...x, { title: "", body: "" }])}>Add another</button>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{unit ? "Save unit" : "Add to course"}</button>
      </form>
    </Sheet>
  );
}

// ---- FAQs ------------------------------------------------------------------------------------------------------------------

// The course's own questions and answers, written for this course only (the brief: never one block copied across courses).
function FaqSection({ draft, setDraft, access }) {
  const set = useSet(setDraft);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = a new one, a number = that FAQ
  const locked = !access.full;
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-faqs-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-faqs-h">FAQs</h2>
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(null)} disabled={draft.faqs.length >= 30}>Add FAQ</button>}
        </div>
        <p className="rt-acc__note">Questions learners ask about this course, with your answers. They show on the course page.</p>
        {draft.faqs.length ? (
          <ul className="rt-adm-list">
            {draft.faqs.map((f, i) => (
              <li key={`${f.question}-${i}`}>
                <div><b>{f.question}</b><small>{f.answer}</small></div>
                {!locked && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => setEditing(i)}>Edit<span className="rt-sr"> {f.question}</span></button>
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("faqs")(draft.faqs.filter((_, j) => j !== i))}>Remove<span className="rt-sr"> {f.question}</span></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <EmptyState inCard title="No FAQs on this course yet." />}
      </section>
      <FaqSheet open={editing !== undefined} onClose={() => setEditing(undefined)} faq={typeof editing === "number" ? draft.faqs[editing] : null} onSave={(f) => {
        set("faqs")(typeof editing === "number" ? draft.faqs.map((x, i) => (i === editing ? f : x)) : [...draft.faqs, f]);
        setEditing(undefined);
      }} />
    </form>
  );
}

function FaqSheet({ open, onClose, faq, onSave }) {
  const [f, setF] = useState({ question: "", answer: "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setF(faq ? { ...faq } : { question: "", answer: "" });
      setErrors({});
    }
  }, [open, faq]);
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!f.question.trim()) err.q = "Enter the question.";
    if (!f.answer.trim()) err.a = "Enter the answer.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    onSave({ question: f.question.trim(), answer: f.answer.trim() });
  };
  return (
    <Sheet open={open} onClose={onClose} title={faq ? "Edit FAQ" : "Add FAQ"} closeLabel="Close">
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <div className="rt-field">
          <label htmlFor="rt-pws-cf-q">Question</label>
          {errors.q && <p className="rt-q__err" id="rt-pws-cf-q-e"><span className="rt-sr">Error: </span>{errors.q}</p>}
          <input id="rt-pws-cf-q" value={f.question} maxLength={160} onChange={(e) => setF({ ...f, question: e.target.value })} aria-invalid={errors.q ? true : undefined} aria-describedby={errors.q ? "rt-pws-cf-q-e" : undefined} autoComplete="off" />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-cf-a">Answer</label>
          {errors.a && <p className="rt-q__err" id="rt-pws-cf-a-e"><span className="rt-sr">Error: </span>{errors.a}</p>}
          <textarea id="rt-pws-cf-a" rows={5} value={f.answer} maxLength={1200} onChange={(e) => setF({ ...f, answer: e.target.value })} aria-invalid={errors.a ? true : undefined} aria-describedby={errors.a ? "rt-pws-cf-a-e" : undefined} autoComplete="off" />
        </div>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{faq ? "Save FAQ" : "Add to course"}</button>
      </form>
    </Sheet>
  );
}

// ---- Course pricing --------------------------------------------------------------------------------------------------------

// Skill Saver, and the price: a self-paced course has one price; classroom and live online courses are priced on each date.
// Prices include VAT and change straight away, even on a live course.
function PricingSection({ draft, setDraft, errors, access, course }) {
  const set = useSet(setDraft);
  const locked = !access.pricing;
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-price-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-price-h">Course pricing</h2>
        <div className="rt-pws-ce__loyalty">
          <label className="rt-fp__opt">
            <input type="checkbox" className="rt-fp__check" checked={draft.skillSaver} disabled={locked} onChange={(e) => set("skillSaver")(e.target.checked)} />
            <span>Include this course in the Skill Saver loyalty programme</span>
          </label>
          <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link>
        </div>
        {draft.method === "self-paced" ? (
          <div className="rt-field rt-pws-course-price">
            <label htmlFor="rt-pws-ce-pricein">Price per learner, including VAT</label>
            <FieldErr id="rt-pws-ce-pricein" text={errors.price || errors.pricePence} />
            <div className="rt-pws-course-money">
              <span aria-hidden="true">£</span>
              <input id="rt-pws-ce-pricein" type="text" inputMode="decimal" value={draft.price} disabled={locked} onChange={(e) => set("price")(e.target.value.trim())} aria-invalid={errors.price ? true : undefined} aria-describedby={errors.price ? "rt-pws-ce-pricein-e" : undefined} autoComplete="off" />
            </div>
          </div>
        ) : (
          <p className="rt-acc__note">Each date has its own price, set when you add the date: you can charge more for a Saturday or a busy month. {course.upcomingCohorts ? `This course has ${course.upcomingCohorts} upcoming ${course.upcomingCohorts === 1 ? "date" : "dates"}.` : "This course has no dates yet."} <Link href={`/provider/cohorts?course=${course.id}`} className="rt-cd__link">See its dates</Link></p>
        )}
      </section>
    </form>
  );
}

// ---- Mode of study ---------------------------------------------------------------------------------------------------------

function ModeSection({ course, draft, setDraft, access, onSaved }) {
  const set = useSet(setDraft);
  const [adding, setAdding] = useState(false);
  const utils = api.useUtils();
  const { organisationId, can } = useProviderAccess();
  const locked = !access.full || course.cohortCount > 0;
  const dated = course.method === "classroom" || course.method === "live-online";

  return (
    <div className="rt-acc__stack">
      <form className="rt-acc__card rt-pws-course-form" noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="rt-pws-ce-mode-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-mode-h">Mode of study</h2>
        {course.cohortCount > 0 && <p className="rt-adm-item__block">This course has dates, so how it is taught can&apos;t change. Remove its dates first, or create a new course for another mode of study.</p>}
        <CardChoice name="rt-pws-ce-format" legend="How is the course taught?" value={draft.method} onChange={(v) => !locked && set("method")(v)}
          options={pw.formats.map((f) => ({ value: f.key, label: methodName(f.key), text: f.text, disabled: locked && f.key !== draft.method }))} />
        {draft.method !== course.method && <p className="rt-acc__note">Save to change how the course is taught.</p>}
      </form>

      {dated && draft.method === course.method && (
        <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-dates-h">
          <div className="rt-acc__cardhead rt-pws-course-cardhead">
            <h2 className="rt-acc__h2" id="rt-pws-ce-dates-h">Dates</h2>
            {can("provider.cohorts.edit") && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setAdding(true)}>Add dates</button>}
          </div>
          <p className="rt-acc__note">{course.upcomingCohorts ? `${course.upcomingCohorts} upcoming ${course.upcomingCohorts === 1 ? "date" : "dates"}.` : "No upcoming dates yet."} Each date has its own {course.method === "classroom" ? "venue, " : "joining link, "}places and price. Learners can book once the course is live.</p>
          <Link href={`/provider/cohorts?course=${course.id}`} className="rt-cd__link">Manage this course&apos;s dates</Link>
        </section>
      )}
      {draft.method === "self-paced" && draft.method === course.method && (
        <section className="rt-acc__card rt-pws-course-form" aria-label="Self-paced">
          <p className="rt-acc__note">Self-paced courses have no dates: learners start when they book. The course shows on ReadTraining with its price; lessons and online booking for self-paced courses come in a later update.</p>
        </section>
      )}

      <CohortForm open={adding} onClose={() => setAdding(false)} suggestCourseId={course.id} onSaved={() => {
        setAdding(false);
        utils.provider.courses.get.invalidate({ organisationId, courseId: course.id });
        onSaved("Dates added");
      }} />
    </div>
  );
}
