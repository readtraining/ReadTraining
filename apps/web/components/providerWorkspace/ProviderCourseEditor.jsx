"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { saveCourse, saveFaq, saveVenue, submitCourse, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import ProviderCohorts from "./ProviderCohorts";
import CourseCurriculum from "./CourseCurriculum";
import CourseSettings from "./CourseSettings";
import PackageEditor from "./PackageEditor";
import { COURSE_TONE, Choice, Empty, Loading, Pill, Tabs, formatWhen, getQuery, setQuery } from "./providerParts";

const TABS = [
  { key: "description", label: "Description" },
  { key: "pricing", label: "Pricing" },
  { key: "cohorts", label: "Cohorts" },
  { key: "curriculum", label: "Curriculum" },
  { key: "settings", label: "Settings" },
];
const FORM_TABS = ["description", "pricing"];
const LIMITS = { title: 80, subtitle: 300, feature: 70, objective: 160 };
const MAX_IMAGE = 2 * 1024 * 1024; // DEMO: pictures are kept in this browser until uploads go to the API
const STATUS_NOTES = {
  draft: "This course is a draft. Only you can see it.",
  pending: "We're checking this course. You can still make changes.",
  approved: "This course is live. Changes you save are checked by our team before learners see them.",
  changes: "Our team has asked for changes. Make them, then send the course for review again.",
};

const pickDescription = (c) => ({
  title: c.title, subtitle: c.subtitle, details: c.details, level: c.level, category: c.category, enrolment: c.enrolment,
  media: c.media, features: c.features, objectives: c.objectives, topics: c.topics, faqs: c.faqs, venues: c.venues,
});
const pickPricing = (c) => ({ type: c.pricing.type, price: c.pricing.type === "flat" ? String(c.pricing.price || "") : "", packageId: c.pricing.packageId || "" });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// What must be in place before a course can be sent for review, worked out from the saved course.
function readiness(c) {
  const items = [
    { key: "title", label: "A course title", ok: Boolean(c.title.trim()) },
    { key: "subtitle", label: "A subtitle", ok: Boolean(c.subtitle.trim()) },
    { key: "category", label: "A category", ok: Boolean(c.category) },
    { key: "objectives", label: "At least 4 learning objectives", ok: c.objectives.length >= 4 },
    { key: "image", label: "At least one picture", ok: c.media.some((m) => m.type === "image") },
    { key: "price", label: "A price or a price package", ok: c.pricing.type === "tiered" ? Boolean(c.pricing.packageId) : Number(c.pricing.price) > 0 },
  ];
  if (c.format === "classroom") items.push({ key: "venue", label: "At least one venue", ok: c.venues.length > 0 });
  if (c.format === "on-demand") items.push({ key: "lesson", label: "At least one lesson in the curriculum", ok: c.curriculum.some((s) => s.lessons.length) });
  return items;
}

// One course, in five tabs kept in the address (?tab=): Description and Pricing are forms saved with "Save"; Cohorts, Curriculum and
// Settings save as you go. The hero shows the title, status, format and when it was last saved, with "Send for review" once the
// "Ready for review" list is complete. Leaving with unsaved changes asks first.
export default function ProviderCourseEditor({ courseId }) {
  const data = useProvider();
  const [tab, setTab] = useState("description");
  const [desc, setDesc] = useState(null);
  const [price, setPrice] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [said, setSaid] = useState("");
  const formRef = useRef(null);
  const readyRef = useRef(null);
  const loadedFor = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.some((x) => x.key === t)) setTab(t);
  }, []);

  const course = data?.byId.course[courseId];
  useEffect(() => {
    if (course && loadedFor.current !== course.id) {
      loadedFor.current = course.id;
      setDesc(pickDescription(course));
      setPrice(pickPricing(course));
    }
  }, [course]);

  const dirty = Boolean(course && desc && price && (!same(desc, pickDescription(course)) || !same(price, pickPricing(course))));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!data || (course && (!desc || !price))) return <Loading rows={3} />;
  if (!course) return <Empty title="This course was not found" text="It may have been deleted." action={{ label: "Back to courses", href: "/provider/courses" }} />;

  const format = pw.formats.find((f) => f.key === course.format) || pw.formats[0];
  const ready = readiness(course);
  const isReady = ready.every((r) => r.ok);
  const canSubmit = course.status === "draft" || course.status === "changes";

  const check = () => {
    const e = {};
    const video = desc.media.find((m) => m.type === "video");
    if (video && !/^https:\/\/\S+\.\S+/.test(video.src)) e.video = "Enter the full video link, starting https://";
    if (price.type === "flat" && price.price !== "" && !(Number(price.price) >= 0)) e.price = "Enter the price as a number, like 95 or 95.50.";
    if (price.type === "tiered" && !price.packageId && data.packages.some((p) => p.active)) e.package = "Choose a price package, or create one.";
    return e;
  };
  const save = () => {
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) {
      const errTab = e.video ? "description" : "pricing";
      if (errTab !== tab) changeTab(errTab);
      focusFirstError(formRef.current);
      return false;
    }
    const pricing = price.type === "tiered" ? { type: "tiered", packageId: price.packageId } : { type: "flat", price: Number(price.price) || 0 };
    const clean = { ...desc, title: desc.title.trim(), subtitle: desc.subtitle.trim() };
    saveCourse(course.id, { ...clean, pricing });
    // the drafts now match what was saved, so "Unsaved changes" clears
    setDesc(clean);
    setPrice(pickPricing({ pricing }));
    setSaid("Saved");
    setToast({ message: "Course saved." });
    return true;
  };
  const submit = () => {
    if (dirty && !save()) return;
    // read again after a save: the readiness of the course as it will be sent
    const next = dirty ? readiness({ ...course, ...desc, pricing: price.type === "tiered" ? { type: "tiered", packageId: price.packageId } : { type: "flat", price: Number(price.price) || 0 } }) : ready;
    if (!next.every((r) => r.ok)) {
      setSaid("Complete the missing items before you send the course for review.");
      readyRef.current?.focus();
      return;
    }
    submitCourse(course.id);
    setToast({ message: "Sent for review. We'll email you within 2 working days." });
  };
  function changeTab(t) {
    setTab(t);
    setQuery("tab", t === "description" ? "" : t);
  }
  const lastSaved = course.updated ? formatWhen(course.updated) : "";

  return (
    <div className="rt-acc__stack">
      <p className="rt-sr" aria-live="polite">{said}</p>
      <section className="rt-acc__card rt-adm-hero" aria-label="Course">
        <div className="rt-pws-course-herotext">
          <div className="rt-adm-item__top">
            <Pill tone={COURSE_TONE[course.status]}>{pw.courseStatuses[course.status]}</Pill>
            <span className="rt-adm-item__when">{format.short}{lastSaved ? ` · Last saved ${lastSaved}` : ""}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{course.title || "Untitled course"}</h2>
          <p className="rt-acc__note">{STATUS_NOTES[course.status]}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {FORM_TABS.includes(tab) && dirty && <span className="rt-pws-course-unsaved"><i className="icon-edit text-12" aria-hidden="true"></i>Unsaved changes</span>}
          {FORM_TABS.includes(tab) && <button type="button" className={`button -sm ${canSubmit ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={save}>Save</button>}
          {canSubmit && <button type="button" className="button -sm -purple-1 text-white" onClick={submit} aria-describedby="rt-pws-ce-ready-h">Send for review</button>}
        </div>
      </section>

      {canSubmit && (
        <section className="rt-acc__card rt-pws-course-ready" aria-labelledby="rt-pws-ce-ready-h" tabIndex={-1} ref={readyRef}>
          <h2 className="rt-acc__h2" id="rt-pws-ce-ready-h">{isReady ? "Ready for review" : "Before you send it for review"}</h2>
          <ul className="rt-pws-course-checks">
            {ready.map((r) => (
              <li key={r.key} className={r.ok ? "is-ok" : ""}>
                <span className="rt-pws-course-tick" aria-hidden="true">{r.ok ? <i className="icon-check text-10"></i> : null}</span>
                {r.label}<span className="rt-sr">{r.ok ? ": done" : ": still needed"}</span>
              </li>
            ))}
          </ul>
          {dirty && <p className="rt-acc__note">Save your changes to update this list.</p>}
        </section>
      )}

      <Tabs tabs={TABS} value={tab} onChange={changeTab} label="Course sections" />

      <div ref={formRef}>
        {tab === "description" && <DescriptionTab course={course} data={data} desc={desc} setDesc={setDesc} errors={errors} />}
        {tab === "pricing" && <PricingTab data={data} price={price} setPrice={setPrice} errors={errors} />}
        {tab === "cohorts" && (course.format === "on-demand" ? (
          <div className="rt-acc__card">
            <h2 className="rt-acc__h2">No dates needed</h2>
            <p className="rt-acc__note">On-demand courses have no cohorts. Learners start straight after booking and work through the curriculum at their own pace.</p>
            <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => changeTab("curriculum")}>Build the curriculum<i className="icon-arrow-right text-12" aria-hidden="true"></i></button>
          </div>
        ) : <ProviderCohorts courseId={course.id} />)}
        {tab === "curriculum" && <CourseCurriculum course={course} />}
        {tab === "settings" && <CourseSettings course={course} />}
      </div>
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}

// ---- Description ----------------------------------------------------------------------------------------------------------

function Counter({ value, max }) {
  return <span className="rt-field__hint rt-pws-course-count">{value.length} of {max}</span>;
}

function DescriptionTab({ course, data, desc, setDesc, errors }) {
  const set = (key) => (value) => setDesc((d) => ({ ...d, [key]: value }));
  const [sheet, setSheet] = useState(null);
  const [feature, setFeature] = useState("");
  const [objective, setObjective] = useState("");
  const [mediaErr, setMediaErr] = useState("");
  const [venuePick, setVenuePick] = useState("");
  const [editTopic, setEditTopic] = useState(null);
  const fileRef = useRef(null);

  const images = desc.media.filter((m) => m.type === "image");
  const video = desc.media.find((m) => m.type === "video");

  const addFeature = (value = feature) => {
    const parts = value.split(",").map((x) => x.trim().slice(0, LIMITS.feature)).filter(Boolean);
    if (parts.length) set("features")([...desc.features, ...parts.filter((p) => !desc.features.includes(p))]);
    setFeature("");
  };
  const addObjective = () => {
    const v = objective.trim();
    if (v && !desc.objectives.includes(v)) set("objectives")([...desc.objectives, v]);
    setObjective("");
  };
  const moveObjective = (i, by) => {
    const next = [...desc.objectives];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    set("objectives")(next);
  };
  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMediaErr("Choose a picture: JPG, PNG or WebP.");
    if (file.size > MAX_IMAGE) return setMediaErr("Choose a picture under 2MB.");
    const reader = new FileReader();
    reader.onload = () => {
      setMediaErr("");
      setDesc((d) => ({ ...d, media: [...d.media.filter((m) => m.type === "image"), { type: "image", src: String(reader.result), alt: "" }, ...d.media.filter((m) => m.type === "video")] }));
    };
    reader.onerror = () => setMediaErr("That picture could not be read. Try another file.");
    reader.readAsDataURL(file);
  };
  const updateMedia = (src, patch) => set("media")(desc.media.map((m) => (m.src === src ? { ...m, ...patch } : m)));
  const removeMedia = (src) => {
    const next = desc.media.filter((m) => m.src !== src);
    set("media")(next.some((m) => m.type === "image") ? next : next.filter((m) => m.type !== "video"));
  };
  const makeCover = (src) => {
    const img = desc.media.find((m) => m.src === src);
    set("media")([img, ...desc.media.filter((m) => m.src !== src)]);
  };
  const setVideo = (src) => set("media")([...desc.media.filter((m) => m.type !== "video"), ...(src ? [{ type: "video", src }] : [])]);

  const linkedFaqs = desc.faqs.map((id) => data.faqs.find((f) => f.id === id)).filter(Boolean);
  const linkedVenues = desc.venues.map((id) => data.byId.venue[id]).filter(Boolean);
  const venueOptions = data.venues.filter((v) => v.active && !desc.venues.includes(v.id));

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-basics-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-basics-h">About the course</h2>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-title">Course title</label>
          <input id="rt-pws-ce-title" value={desc.title} maxLength={LIMITS.title} onChange={(e) => set("title")(e.target.value)} placeholder="For example: Emergency First Aid at Work" autoComplete="off" />
          <Counter value={desc.title} max={LIMITS.title} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-sub">Subtitle</label>
          <span className="rt-field__hint" id="rt-pws-ce-sub-h">One or two sentences under the title: who it is for and what they get.</span>
          <textarea id="rt-pws-ce-sub" rows={2} value={desc.subtitle} maxLength={LIMITS.subtitle} onChange={(e) => set("subtitle")(e.target.value)} aria-describedby="rt-pws-ce-sub-h" autoComplete="off" />
          <Counter value={desc.subtitle} max={LIMITS.subtitle} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-details">Course details</label>
          <span className="rt-field__hint" id="rt-pws-ce-details-h">What the course covers, how it is taught and assessed, and who it suits.</span>
          <textarea id="rt-pws-ce-details" rows={7} value={desc.details} onChange={(e) => set("details")(e.target.value)} aria-describedby="rt-pws-ce-details-h" autoComplete="off" />
        </div>
        <div className="rt-pws-course-grid3">
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-level">Level</label>
            <select id="rt-pws-ce-level" value={desc.level} onChange={(e) => set("level")(e.target.value)} autoComplete="off">
              {pw.levels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-cat">Category</label>
            <select id="rt-pws-ce-cat" value={desc.category} onChange={(e) => set("category")(e.target.value)} autoComplete="off">
              <option value="">Choose a category</option>
              {pw.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <Choice name="rt-pws-ce-enrol" legend="Who can book" value={desc.enrolment} onChange={set("enrolment")} hint="Private courses don't show in search; you share the link or book learners yourself." options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]} />
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-media-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-media-h">Pictures and video</h2>
        <p className="rt-acc__note">The first picture is the course&apos;s cover in search results. Use a landscape picture, at least 1200 pixels wide.</p>
        {mediaErr && <p className="rt-q__err" id="rt-pws-ce-media-e" role="alert"><span className="rt-sr">Error: </span>{mediaErr}</p>}
        <div className="rt-pws-course-mediabar">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="rt-sr" id="rt-pws-ce-file" onChange={onFile} tabIndex={-1} aria-hidden="true" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()}>Upload a picture</button>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("library")}>Choose from your library</button>
          <span className="rt-field__hint">JPG, PNG or WebP, up to 2MB.</span>
        </div>
        {images.length ? (
          <ul className="rt-pws-course-media">
            {images.map((m, i) => (
              <li key={m.src} className="rt-pws-course-mediaitem">
                <img src={m.src} alt="" />
                <div className="rt-pws-course-mediabody">
                  {i === 0 ? <Pill tone="info">Cover</Pill> : <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => makeCover(m.src)}>Make cover</button>}
                  <div className="rt-field">
                    <label htmlFor={`rt-pws-ce-alt-${i}`}>Describe the picture</label>
                    <input id={`rt-pws-ce-alt-${i}`} value={m.alt || ""} maxLength={140} onChange={(e) => updateMedia(m.src, { alt: e.target.value })} placeholder="For example: learners practising CPR on a manikin" autoComplete="off" />
                  </div>
                  <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => removeMedia(m.src)}>Remove<span className="rt-sr"> picture {i + 1}</span></button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="rt-acc__empty">No pictures yet. Upload one or choose from your library.</p>}
        {images.length > 0 && (
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-video">Promo video link (optional)</label>
            <span className="rt-field__hint" id="rt-pws-ce-video-h">A YouTube or Vimeo link. It plays on the course page after the cover picture.</span>
            {errors.video && <p className="rt-q__err" id="rt-pws-ce-video-e"><span className="rt-sr">Error: </span>{errors.video}</p>}
            <input id="rt-pws-ce-video" type="url" inputMode="url" value={video?.src || ""} onChange={(e) => setVideo(e.target.value.trim())} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={errors.video ? true : undefined} aria-describedby={`rt-pws-ce-video-h${errors.video ? " rt-pws-ce-video-e" : ""}`} autoComplete="url" />
          </div>
        )}
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-learn-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-learn-h">What learners get</h2>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-feature">Course features</label>
          <span className="rt-field__hint" id="rt-pws-ce-feature-h">Short facts shown as tags, like &quot;1 day&quot; or &quot;Certificate valid 3 years&quot;. Press Enter or type a comma to add.</span>
          <div className="rt-pws-course-addrow">
            <input id="rt-pws-ce-feature" value={feature} maxLength={LIMITS.feature} onChange={(e) => (e.target.value.includes(",") ? addFeature(e.target.value) : setFeature(e.target.value))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} aria-describedby="rt-pws-ce-feature-h" autoComplete="off" />
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => addFeature()}>Add</button>
          </div>
          {desc.features.length > 0 && (
            <ul className="rt-pws-course-tags">
              {desc.features.map((f) => (
                <li key={f}><span>{f}</span><button type="button" onClick={() => set("features")(desc.features.filter((x) => x !== f))} aria-label={`Remove ${f}`}><i className="icon-close text-10" aria-hidden="true"></i></button></li>
              ))}
            </ul>
          )}
        </div>

        <div className="rt-field">
          <label htmlFor="rt-pws-ce-obj">What will learners be able to do after the course?</label>
          <span className="rt-field__hint" id="rt-pws-ce-obj-h">Aim for at least 4 learning objectives, each starting with a verb. Press Enter to add.</span>
          <div className="rt-pws-course-addrow">
            <input id="rt-pws-ce-obj" value={objective} maxLength={LIMITS.objective} onChange={(e) => setObjective(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addObjective(); } }} placeholder="For example: Give CPR to an adult" aria-describedby="rt-pws-ce-obj-h rt-pws-ce-obj-n" autoComplete="off" />
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={addObjective}>Add</button>
          </div>
          <span className="rt-field__hint" id="rt-pws-ce-obj-n" aria-live="polite">{desc.objectives.length} {desc.objectives.length === 1 ? "objective" : "objectives"} added{desc.objectives.length < 4 ? `, ${4 - desc.objectives.length} more to reach 4` : ""}</span>
          {desc.objectives.length > 0 && (
            <ol className="rt-pws-course-list">
              {desc.objectives.map((o, i) => (
                <li key={o}>
                  <span className="rt-pws-course-list__text">{o}</span>
                  <span className="rt-pws-course-list__tools">
                    <button type="button" onClick={() => moveObjective(i, -1)} disabled={i === 0} aria-label={`Move up: ${o}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                    <button type="button" onClick={() => moveObjective(i, 1)} disabled={i === desc.objectives.length - 1} aria-label={`Move down: ${o}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                    <button type="button" onClick={() => set("objectives")(desc.objectives.filter((x) => x !== o))} aria-label={`Remove: ${o}`}><i className="icon-bin text-12" aria-hidden="true"></i></button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-topics-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-topics-h">Topics covered</h2>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setEditTopic(null); setSheet("topic"); }}>Add topic</button>
        </div>
        <p className="rt-acc__note">A heading for each topic and a short description of what it includes.</p>
        {desc.topics.length ? (
          <ul className="rt-adm-list">
            {desc.topics.map((t, i) => (
              <li key={`${t.title}-${i}`}>
                <div><b>{t.title}</b><small>{t.text}</small></div>
                <div className="rt-adm-list__side">
                  <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => { setEditTopic(i); setSheet("topic"); }}>Edit<span className="rt-sr"> {t.title}</span></button>
                  <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("topics")(desc.topics.filter((_, j) => j !== i))}>Remove<span className="rt-sr"> {t.title}</span></button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="rt-acc__empty">No topics yet.</p>}
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-faqs-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-faqs-h">Frequently asked questions</h2>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("faqs")}>Add FAQs</button>
        </div>
        <p className="rt-acc__note">FAQs live in your library (Settings › FAQs), so you can use the same answer on every course.</p>
        {linkedFaqs.length ? (
          <ul className="rt-adm-list">
            {linkedFaqs.map((f) => (
              <li key={f.id}>
                <div><b>{f.q}</b><small>{f.a}</small></div>
                <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("faqs")(desc.faqs.filter((x) => x !== f.id))}>Remove<span className="rt-sr"> {f.q}</span></button>
              </li>
            ))}
          </ul>
        ) : <p className="rt-acc__empty">No FAQs on this course yet.</p>}
      </section>

      {course.format === "classroom" && (
        <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-venues-h">
          <div className="rt-acc__cardhead rt-pws-course-cardhead">
            <h2 className="rt-acc__h2" id="rt-pws-ce-venues-h">Venues</h2>
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("venue")}>Create a venue</button>
          </div>
          <p className="rt-acc__note">Where this course can run. Each cohort picks one of these.</p>
          {venueOptions.length > 0 && (
            <div className="rt-pws-course-addrow">
              <div className="rt-field">
                <label htmlFor="rt-pws-ce-venue" className="rt-sr">Choose a venue</label>
                <select id="rt-pws-ce-venue" value={venuePick} onChange={(e) => setVenuePick(e.target.value)} autoComplete="off">
                  <option value="">Choose a venue</option>
                  {venueOptions.map((v) => <option key={v.id} value={v.id}>{v.name}, {v.city}</option>)}
                </select>
              </div>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={!venuePick} onClick={() => { set("venues")([...desc.venues, venuePick]); setVenuePick(""); }}>Add to course</button>
            </div>
          )}
          {linkedVenues.length ? (
            <ul className="rt-adm-list">
              {linkedVenues.map((v) => (
                <li key={v.id}>
                  <div><b>{v.name}</b><small>{[v.street, v.city, v.postcode].filter(Boolean).join(", ")}{v.active ? "" : " · Archived"}</small></div>
                  <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("venues")(desc.venues.filter((x) => x !== v.id))}>Remove<span className="rt-sr"> {v.name}</span></button>
                </li>
              ))}
            </ul>
          ) : <p className="rt-acc__empty">No venues on this course yet.</p>}
        </section>
      )}

      <MediaLibrary open={sheet === "library"} onClose={() => setSheet(null)} data={data} current={images.map((m) => m.src)} onPick={(m) => { setDesc((d) => ({ ...d, media: [...d.media.filter((x) => x.type === "image"), { type: "image", src: m.src, alt: m.alt || "" }, ...d.media.filter((x) => x.type === "video")] })); setSheet(null); }} />
      <TopicSheet open={sheet === "topic"} onClose={() => setSheet(null)} topic={editTopic === null ? null : desc.topics[editTopic]} onSave={(rows) => {
        if (editTopic === null) set("topics")([...desc.topics, ...rows]);
        else set("topics")(desc.topics.map((t, i) => (i === editTopic ? rows[0] : t)));
        setSheet(null);
      }} />
      <FaqSheet open={sheet === "faqs"} onClose={() => setSheet(null)} faqs={data.faqs} linked={desc.faqs} onSave={(ids) => { set("faqs")(ids); setSheet(null); }} />
      <VenueSheet open={sheet === "venue"} onClose={() => setSheet(null)} onSave={(ids) => { setDesc((d) => ({ ...d, venues: [...d.venues, ...ids] })); setSheet(null); }} />
    </form>
  );
}

// Pictures already used on the provider's courses, to reuse on this one.
function MediaLibrary({ open, onClose, data, current, onPick }) {
  const seen = new Set(current);
  const pics = [];
  data.courses.forEach((c) => c.media.forEach((m) => {
    if (m.type === "image" && !seen.has(m.src)) {
      seen.add(m.src);
      pics.push({ ...m, from: c.title || "Untitled course" });
    }
  }));
  return (
    <Sheet open={open} onClose={onClose} title="Your media library" closeLabel="Close">
      {pics.length ? (
        <ul className="rt-pws-course-library">
          {pics.map((m) => (
            <li key={m.src}>
              <button type="button" onClick={() => onPick(m)}>
                <img src={m.src} alt="" />
                <span>Use this picture<span className="rt-sr"> from {m.from}</span></span>
                <small>From {m.from}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="rt-acc__empty">No other pictures yet. Pictures you upload to any course appear here.</p>}
    </Sheet>
  );
}

// Add one or more topics (title and description each), or edit one.
function TopicSheet({ open, onClose, topic, onSave }) {
  const [rows, setRows] = useState([{ title: "", text: "" }]);
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setRows([topic ? { ...topic } : { title: "", text: "" }]);
      setErrors({});
    }
  }, [open, topic]);
  const change = (i, key, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    rows.forEach((r, i) => {
      if (!r.title.trim()) err[`t${i}`] = "Enter the topic title.";
      if (!r.text.trim()) err[`d${i}`] = "Describe what the topic includes.";
    });
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    onSave(rows.map((r) => ({ title: r.title.trim(), text: r.text.trim() })));
  };
  return (
    <Sheet open={open} onClose={onClose} title={topic ? "Edit topic" : "Add topics"} closeLabel="Close">
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <p className="rt-acc__note">List the topics the course covers. Add a heading for each, with a short description of what it includes.</p>
        {rows.map((r, i) => (
          <fieldset key={i} className="rt-pws-course-repeat">
            <legend>Topic {i + 1}</legend>
            <div className="rt-field">
              <label htmlFor={`rt-pws-ct-t${i}`}>Topic title</label>
              {errors[`t${i}`] && <p className="rt-q__err" id={`rt-pws-ct-t${i}-e`}><span className="rt-sr">Error: </span>{errors[`t${i}`]}</p>}
              <input id={`rt-pws-ct-t${i}`} value={r.title} maxLength={80} onChange={(e) => change(i, "title", e.target.value)} placeholder="For example: Life-saving skills" aria-invalid={errors[`t${i}`] ? true : undefined} aria-describedby={errors[`t${i}`] ? `rt-pws-ct-t${i}-e` : undefined} autoComplete="off" />
            </div>
            <div className="rt-field">
              <label htmlFor={`rt-pws-ct-d${i}`}>Topic description</label>
              {errors[`d${i}`] && <p className="rt-q__err" id={`rt-pws-ct-d${i}-e`}><span className="rt-sr">Error: </span>{errors[`d${i}`]}</p>}
              <textarea id={`rt-pws-ct-d${i}`} rows={3} value={r.text} maxLength={300} onChange={(e) => change(i, "text", e.target.value)} aria-invalid={errors[`d${i}`] ? true : undefined} aria-describedby={errors[`d${i}`] ? `rt-pws-ct-d${i}-e` : undefined} autoComplete="off" />
            </div>
            {rows.length > 1 && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove topic {i + 1}</button>}
          </fieldset>
        ))}
        {!topic && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setRows((x) => [...x, { title: "", text: "" }])}>Add another</button>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{topic ? "Save topic" : "Add to course"}</button>
      </form>
    </Sheet>
  );
}

// Tick FAQs from the library, or write new ones (saved to the library and ticked).
function FaqSheet({ open, onClose, faqs, linked, onSave }) {
  const [picked, setPicked] = useState([]);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setPicked(linked);
      setRows([]);
      setErrors({});
    }
  }, [open, linked]);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const change = (i, key, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    rows.forEach((r, i) => {
      if (!r.q.trim()) err[`q${i}`] = "Enter the question.";
      if (!r.a.trim()) err[`a${i}`] = "Enter the answer.";
    });
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    const added = rows.map((r) => saveFaq({ q: r.q.trim(), a: r.a.trim() }));
    onSave([...picked, ...added]);
  };
  return (
    <Sheet open={open} onClose={onClose} title="FAQs for this course" closeLabel="Close">
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        {faqs.length > 0 && (
          <fieldset className="rt-pws-course-repeat -plain">
            <legend>From your library</legend>
            <div className="rt-adm-checks">
              {faqs.map((f) => (
                <label key={f.id} className="rt-fp__opt rt-pws-course-checkopt">
                  <input type="checkbox" className="rt-fp__check" checked={picked.includes(f.id)} onChange={() => toggle(f.id)} />
                  <span>{f.q}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {rows.map((r, i) => (
          <fieldset key={i} className="rt-pws-course-repeat">
            <legend>New FAQ {i + 1}</legend>
            <div className="rt-field">
              <label htmlFor={`rt-pws-cf-q${i}`}>Question</label>
              {errors[`q${i}`] && <p className="rt-q__err" id={`rt-pws-cf-q${i}-e`}><span className="rt-sr">Error: </span>{errors[`q${i}`]}</p>}
              <input id={`rt-pws-cf-q${i}`} value={r.q} maxLength={160} onChange={(e) => change(i, "q", e.target.value)} aria-invalid={errors[`q${i}`] ? true : undefined} aria-describedby={errors[`q${i}`] ? `rt-pws-cf-q${i}-e` : undefined} autoComplete="off" />
            </div>
            <div className="rt-field">
              <label htmlFor={`rt-pws-cf-a${i}`}>Answer</label>
              {errors[`a${i}`] && <p className="rt-q__err" id={`rt-pws-cf-a${i}-e`}><span className="rt-sr">Error: </span>{errors[`a${i}`]}</p>}
              <textarea id={`rt-pws-cf-a${i}`} rows={3} value={r.a} maxLength={1000} onChange={(e) => change(i, "a", e.target.value)} aria-invalid={errors[`a${i}`] ? true : undefined} aria-describedby={errors[`a${i}`] ? `rt-pws-cf-a${i}-e` : undefined} autoComplete="off" />
            </div>
            <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove new FAQ {i + 1}</button>
          </fieldset>
        ))}
        <p className="rt-acc__note">New FAQs are saved to your library, so you can use them on other courses too.</p>
        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setRows((x) => [...x, { q: "", a: "" }])}>Write a new FAQ</button>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Save FAQs</button>
      </form>
    </Sheet>
  );
}

// Create one or more venues (saved to the venue library) and add them to the course.
function VenueSheet({ open, onClose, onSave }) {
  const blank = { name: "", street: "", city: "", postcode: "" };
  const [rows, setRows] = useState([blank]);
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setRows([{ ...blank }]);
      setErrors({});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- blank is a constant
  const change = (i, key, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    rows.forEach((r, i) => {
      if (!r.name.trim()) err[`name${i}`] = "Enter the venue name.";
      if (!r.street.trim()) err[`street${i}`] = "Enter the street address.";
      if (!r.city.trim()) err[`city${i}`] = "Enter the town or city.";
      if (r.postcode.trim() && !/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(r.postcode.trim())) err[`postcode${i}`] = "Enter a real UK postcode, like LS1 4DL.";
    });
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    onSave(rows.map((r) => saveVenue({ name: r.name.trim(), street: r.street.trim(), city: r.city.trim(), postcode: r.postcode.trim().toUpperCase() })));
  };
  const field = (i, key, label, auto, extra = {}) => {
    const id = `rt-pws-cv-${key}${i}`;
    const err = errors[`${key}${i}`];
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {err && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{err}</p>}
        <input id={id} value={rows[i][key]} onChange={(e) => change(i, key, e.target.value)} autoComplete={auto} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} {...extra} />
      </div>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title="Create venues" closeLabel="Close">
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <p className="rt-acc__note">Venues are saved to your library (Settings › Venues) and added to this course.</p>
        {rows.map((r, i) => (
          <fieldset key={i} className="rt-pws-course-repeat">
            <legend>Venue {i + 1}</legend>
            {field(i, "name", "Venue name", "organization", { maxLength: 80, placeholder: "For example: Northfield Training Centre" })}
            {field(i, "street", "Street address", "street-address", { maxLength: 120 })}
            <div className="rt-pws-course-grid2">
              {field(i, "city", "Town or city", "address-level2", { maxLength: 60 })}
              {field(i, "postcode", "Postcode (optional)", "postal-code", { maxLength: 8 })}
            </div>
            {rows.length > 1 && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove venue {i + 1}</button>}
          </fieldset>
        ))}
        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setRows((x) => [...x, { ...blank }])}>Add another</button>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Save venues</button>
      </form>
    </Sheet>
  );
}

// ---- Pricing ---------------------------------------------------------------------------------------------------------------

function PricingTab({ data, price, setPrice, errors }) {
  const [editor, setEditor] = useState(null); // null closed, "new", or a package id
  const set = (patch) => setPrice((p) => ({ ...p, ...patch }));
  const active = data.packages.filter((p) => p.active || p.id === price.packageId);
  const pack = data.byId.pack[price.packageId];

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-price-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-price-h">How you charge</h2>
        <Choice name="rt-pws-ce-ptype" legend="Pricing" value={price.type} onChange={(v) => set({ type: v })} options={[{ value: "flat", label: "One price" }, { value: "tiered", label: "Price packages" }]} />
        {price.type === "flat" ? (
          <div className="rt-field rt-pws-course-price">
            <label htmlFor="rt-pws-ce-pricein">Price per learner, including VAT</label>
            <span className="rt-field__hint" id="rt-pws-ce-pricein-h">You can set a different price for each cohort.</span>
            {errors.price && <p className="rt-q__err" id="rt-pws-ce-pricein-e"><span className="rt-sr">Error: </span>{errors.price}</p>}
            <div className="rt-pws-course-money">
              <span aria-hidden="true">£</span>
              <input id="rt-pws-ce-pricein" type="number" inputMode="decimal" min="0" step="0.01" value={price.price} onChange={(e) => set({ price: e.target.value })} aria-invalid={errors.price ? true : undefined} aria-describedby={`rt-pws-ce-pricein-h${errors.price ? " rt-pws-ce-pricein-e" : ""}`} autoComplete="off" />
            </div>
          </div>
        ) : (
          <>
            <p className="rt-acc__note">With price packages you can offer up to 3 options: Saver, Flexi and Premium, each with its own perks.</p>
            {active.length > 0 && (
              <div className="rt-field">
                <label htmlFor="rt-pws-ce-pack">Price package</label>
                {errors.package && <p className="rt-q__err" id="rt-pws-ce-pack-e"><span className="rt-sr">Error: </span>{errors.package}</p>}
                <select id="rt-pws-ce-pack" value={price.packageId} onChange={(e) => set({ packageId: e.target.value })} aria-invalid={errors.package ? true : undefined} aria-describedby={errors.package ? "rt-pws-ce-pack-e" : undefined} autoComplete="off">
                  <option value="">Choose a package</option>
                  {active.map((p) => <option key={p.id} value={p.id}>{p.name || "Unnamed package"}</option>)}
                </select>
              </div>
            )}
            <div className="rt-pws-course-mediabar">
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditor("new")}>Create a package</button>
              {pack && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditor(pack.id)}>Edit package</button>}
            </div>
          </>
        )}
      </section>

      {price.type === "tiered" && pack && (
        <section aria-labelledby="rt-pws-ce-tiers-h">
          <h2 className="rt-acc__h2 rt-pws-course-tiersh" id="rt-pws-ce-tiers-h">{pack.name || "Unnamed package"}</h2>
          <ul className="rt-pws-course-tiers">
            {pw.tiers.map((t) => {
              const tier = pack.tiers[t.key] || { price: 0, discount: 0, perks: [] };
              const perks = [...(pack.features || []), ...tier.perks];
              return (
                <li key={t.key} className={`rt-acc__card rt-pws-course-tier${t.badge ? " -featured" : ""}`}>
                  <div className="rt-pws-course-tier__top">
                    <h3>{t.label}</h3>
                    {t.badge && <Pill tone="info">{t.badge}</Pill>}
                  </div>
                  <p className="rt-adm-price">{formatPrice(tier.price)}</p>
                  {tier.discount > 0 && <p className="rt-pws-course-save">You save {formatPrice(tier.discount)}</p>}
                  {perks.map((pk, i) => (
                    <div key={`${pk.heading}-${i}`} className="rt-pws-course-perk">
                      <b>{pk.heading}</b>
                      <ul>
                        {pk.items.map((it, j) => {
                          const yes = it.type === "included" || it.type === "course";
                          return (
                            <li key={j} className={yes ? "" : "-no"}>
                              <i className={`${yes ? "icon-check" : "icon-close"} text-10`} aria-hidden="true"></i>
                              <span className="rt-sr">{yes ? "Included: " : "Not included: "}</span>{it.text}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <PackageEditor open={Boolean(editor)} onClose={() => setEditor(null)} packageId={editor === "new" ? null : editor} onSaved={(id) => { set({ packageId: id }); setEditor(null); }} />
    </form>
  );
}
