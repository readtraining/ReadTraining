"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { canChangeFormat, saveCourse, saveFaq, saveVenue, submitCourse, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import CourseCurriculum from "./CourseCurriculum";
import { CourseGear, RecordsPanel, ResitPanel, SeoPanel } from "./CourseSettings";
import PackageEditor from "./PackageEditor";
import { COURSE_TONE, CardChoice, Choice, Loading, Pill, formatWhen, getQuery, setQuery } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { categoryName, categoryOptions, levelOptions, methodName, subcategoryName, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { EmptyState } from "@/components/states/States";

// Hurak's seven course sections, in its order, each ticked in the "Publish your course" list when it is complete
const SECTIONS = [
  { key: "landing", label: "Course landing page" },
  { key: "info", label: "Course information" },
  { key: "pricing", label: "Course pricing" },
  { key: "records", label: "Cohort learning records" },
  { key: "mode", label: "Mode of study" },
  { key: "seo", label: "SEO settings" },
  { key: "activities", label: "Course activities" },
];
const FORM_SECTIONS = ["landing", "info", "pricing", "mode"];
const LIMITS = { title: 80, subtitle: 300, feature: 70, objective: 160 };
const MAX_IMAGE = 2 * 1024 * 1024; // DEMO: pictures are kept in this browser until uploads go to the API
const VIDEO_RE = /^https:\/\/\S+\.\S+/;
const STATUS_NOTES = {
  draft: "This course is a draft. Only you can see it.",
  pending: "We're checking this course. You can still make changes.",
  approved: "This course is live. Changes you save are checked by our team before learners see them.",
  changes: "Our team has asked for changes. Make them, then send the course for approval again.",
};

const pickDescription = (c) => ({
  title: c.title, subtitle: c.subtitle, details: c.details, level: c.level, category: c.category, subcategory: c.subcategory, topic: c.topic,
  model: c.model, format: c.format, media: c.media, features: c.features, objectives: c.objectives, topics: c.topics, faqs: c.faqs, venues: c.venues,
});
const pickPricing = (c) => ({ type: c.pricing.type, price: c.pricing.type === "flat" ? String(c.pricing.price || "") : "", packageId: c.pricing.packageId || "", skillSaver: Boolean(c.skillSaver) });
const toPricing = (p) => (p.type === "tiered" ? { type: "tiered", packageId: p.packageId } : p.type === "free" ? { type: "free", price: 0 } : { type: "flat", price: Number(p.price) || 0 });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// whether each section is complete, from the saved course
function sectionOk(c, key) {
  if (key === "landing") return Boolean(c.title.trim() && c.subtitle.trim() && c.category && c.subcategory && c.details.trim() && c.media.some((m) => m.type === "image"));
  if (key === "info") return c.objectives.length >= 4;
  if (key === "pricing") return c.pricing.type === "free" || (c.pricing.type === "tiered" ? Boolean(c.pricing.packageId) : Number(c.pricing.price) > 0);
  if (key === "records") return !c.settings.clr.enabled || c.settings.clr.fields.length + c.settings.clr.custom.length > 0;
  if (key === "mode") return c.format !== "classroom" || c.venues.length > 0;
  if (key === "seo") return Boolean(c.settings.seo.title && c.settings.seo.description);
  return c.format !== "self-paced" || c.curriculum.some((s) => s.lessons.length);
}
const NEEDS = {
  landing: "a title, subtitle, category, sub-category, course details and a course image",
  info: "at least 4 learning objectives",
  pricing: "a price, a pricing plan, or Free",
  records: "at least one heading, or No",
  mode: "a venue for classroom courses",
  seo: "an SEO title and description",
  activities: "at least one activity for self-paced courses",
};

// One course, as Hurak's editor: the "Publish your course" list on the left (one item per section, ticked when complete, kept in
// ?tab=), the section on the right. Landing page, information, pricing and mode of study are drafts saved with "Save"; learning
// records, SEO and activities save themselves. The header shows the status and performance model, with Preview and the gear
// (course settings). "Send for approval" sends a draft once every section is ticked. Leaving with unsaved changes asks first.
export default function ProviderCourseEditor({ courseId }) {
  const data = useProvider();
  const [tab, setTab] = useState("landing");
  const [desc, setDesc] = useState(null);
  const [price, setPrice] = useState(null);
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

  useEffect(() => {
    const t = getQuery("tab");
    if (SECTIONS.some((x) => x.key === t)) setTab(t);
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
  if (!course) return <EmptyState title="This course was not found" text="It may have been deleted." action={{ label: "Back to courses", href: "/provider/courses" }} />;

  const canSubmit = course.status === "draft" || course.status === "changes";
  const ticks = SECTIONS.map((x) => ({ ...x, ok: sectionOk(course, x.key) }));
  const missing = ticks.filter((x) => !x.ok);

  const save = () => {
    const e = {};
    if (price.type === "flat" && price.price !== "" && !(Number(price.price) >= 0)) e.price = "Enter the price as a number, like 95 or 95.50.";
    if (price.type === "tiered" && !price.packageId && data.packages.some((p) => p.active)) e.package = "Choose a pricing plan, or create one.";
    setErrors(e);
    if (Object.keys(e).length) {
      if (tab !== "pricing") changeTab("pricing");
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return false;
    }
    const clean = { ...desc, title: desc.title.trim(), subtitle: desc.subtitle.trim() };
    saveCourse(course.id, { ...clean, pricing: toPricing(price), skillSaver: price.skillSaver });
    // the drafts now match what was saved, so "Unsaved changes" clears
    setDesc(clean);
    setPrice(pickPricing({ pricing: toPricing(price), skillSaver: price.skillSaver }));
    setSaid("Saved");
    setToast({ message: "Course saved." });
    return true;
  };
  const submit = () => {
    if (dirty && !save()) return;
    const after = dirty ? { ...course, ...desc, pricing: toPricing(price) } : course;
    const left = SECTIONS.filter((x) => !sectionOk(after, x.key));
    if (left.length) {
      setSaid(`Complete ${left.map((x) => x.label).join(", ")} before you send the course for approval.`);
      navRef.current?.focus();
      return;
    }
    submitCourse(course.id);
    setToast({ message: "Sent for approval. We'll email you within 2 working days." });
  };
  function changeTab(t) {
    setTab(t);
    setErrors({});
    setQuery("tab", t === "landing" ? "" : t);
  }
  const lastSaved = course.updated ? formatWhen(course.updated) : "";
  const formatLocked = !canChangeFormat(data, course.id);

  return (
    <div className="rt-acc__stack">
      <p className="rt-sr" aria-live="polite">{said}</p>
      <section className="rt-acc__card rt-adm-hero" aria-label="Course">
        <div className="rt-pws-course-herotext">
          <div className="rt-adm-item__top">
            <Pill tone={COURSE_TONE[course.status]}>{pw.courseStatuses[course.status]}</Pill>
            <span className="rt-adm-item__when">Performance model: {pw.models[course.model]?.label}{lastSaved ? ` · Last saved ${lastSaved}` : ""}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{course.title || "Untitled course"}</h2>
          <p className="rt-acc__note">{STATUS_NOTES[course.status]}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {FORM_SECTIONS.includes(tab) && dirty && <span className="rt-pws-course-unsaved"><i className="icon-edit text-12" aria-hidden="true"></i>Unsaved changes</span>}
          {FORM_SECTIONS.includes(tab) && <button type="button" className="button -sm -purple-1 text-white" onClick={save}>Save</button>}
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setPreview(true)}>Preview</button>
          <button type="button" className="rt-pws-ce__gear" onClick={() => setGear(true)} aria-label="Course settings"><i className="icon-setting text-16" aria-hidden="true"></i></button>
        </div>
      </section>

      <div className="rt-pws-ce">
        <nav className="rt-acc__card rt-pws-ce__nav" aria-labelledby="rt-pws-ce-nav-h" tabIndex={-1} ref={navRef}>
          <h2 className="rt-adm-h3" id="rt-pws-ce-nav-h">Publish your course</h2>
          <ol className="rt-pws-ce__steps">
            {ticks.map((x) => (
              <li key={x.key}>
                <button type="button" className={`rt-pws-ce__step${tab === x.key ? " is-on" : ""}`} onClick={() => changeTab(x.key)} aria-current={tab === x.key ? "step" : undefined}>
                  <span className={`rt-pws-course-tick${x.ok ? " is-ok" : ""}`} aria-hidden="true">{x.ok ? <i className="icon-check text-10"></i> : null}</span>
                  {x.label}<span className="rt-sr">{x.ok ? ": complete" : ": not complete"}</span>
                </button>
              </li>
            ))}
          </ol>
          {canSubmit ? (
            <>
              <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={submit}>Send for approval</button>
              {missing.length > 0 && <p className="rt-acc__note rt-pws-ce__need">Still needed: {missing.map((x) => NEEDS[x.key]).join("; ")}.</p>}
            </>
          ) : <p className="rt-pws-ce__status"><Pill tone={COURSE_TONE[course.status]}>{pw.courseStatuses[course.status]}</Pill></p>}
        </nav>

        <div className="rt-pws-ce__main" ref={formRef}>
          {tab === "landing" && <LandingSection data={data} desc={desc} setDesc={setDesc} />}
          {tab === "info" && <InfoSection data={data} desc={desc} setDesc={setDesc} />}
          {tab === "pricing" && <PricingTab data={data} price={price} setPrice={setPrice} errors={errors} />}
          {tab === "records" && (
            <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-rec-h">
              <h2 className="rt-acc__h2" id="rt-pws-ce-rec-h">Cohort learning records</h2>
              <p className="rt-acc__note">Store information about each student in a cohort, like their result or when their certificate was sent.</p>
              <RecordsPanel course={course} onSaved={saved} />
            </section>
          )}
          {tab === "mode" && <ModeSection course={course} data={data} desc={desc} setDesc={setDesc} locked={formatLocked} onSaved={saved} />}
          {tab === "seo" && (
            <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-seo-h">
              <h2 className="rt-acc__h2" id="rt-pws-ce-seo-h">SEO settings</h2>
              <p className="rt-acc__note">How the course page shows in Google and other search results.</p>
              <SeoPanel course={course} onSaved={saved} />
            </section>
          )}
          {tab === "activities" && <CourseCurriculum course={course} />}
        </div>
      </div>

      <CourseGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} />
      <PreviewSheet open={preview} onClose={() => setPreview(false)} data={data} desc={desc} price={price} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}

// ---- Preview ---------------------------------------------------------------------------------------------------------------

// The course page as learners will see the top of it, from the unsaved drafts.
function PreviewSheet({ open, onClose, data, desc, price }) {
  const cover = desc.media.find((m) => m.type === "image");
  const pack = price.type === "tiered" ? data.byId.pack[price.packageId] : null;
  const cost = price.type === "free" ? "Free" : pack ? `From ${formatPrice(Math.min(...pw.tiers.map((t) => pack.tiers[t.key]?.price || Infinity)))}` : Number(price.price) > 0 ? formatPrice(Number(price.price)) : "";
  return (
    <Sheet open={open} onClose={onClose} title="Preview" closeLabel="Close">
      <article className="rt-pws-ce__preview">
        {cover ? <img src={cover.src} alt={cover.alt || ""} /> : <EmptyState inCard title="No course image yet." />}
        <p className="rt-pws-ce__pcat">{[categoryName(desc.category), subcategoryName(desc.category, desc.subcategory)].filter(Boolean).join(" › ")}</p>
        <h3>{desc.title || "Untitled course"}</h3>
        {desc.subtitle && <p>{desc.subtitle}</p>}
        {cost && <p className="rt-adm-price">{cost}</p>}
        {desc.features.length > 0 && <ul className="rt-pws-course-tags">{desc.features.map((f) => <li key={f}><span>{f}</span></li>)}</ul>}
        {desc.objectives.length > 0 && (
          <>
            <h4>What you&apos;ll learn</h4>
            <ul className="rt-pws-ce__learn">{desc.objectives.map((o) => <li key={o}><i className="icon-check text-10" aria-hidden="true"></i>{o}</li>)}</ul>
          </>
        )}
        {desc.details && <><h4>Course details</h4><p className="rt-pws-ce__details">{desc.details}</p></>}
      </article>
    </Sheet>
  );
}

// ---- Course landing page ---------------------------------------------------------------------------------------------------

function Counter({ value, max }) {
  return <span className="rt-field__hint rt-pws-course-count">{value.length} of {max}</span>;
}

function LandingSection({ data, desc, setDesc }) {
  const set = (key) => (value) => setDesc((d) => ({ ...d, [key]: value }));
  const [library, setLibrary] = useState(false);
  const [mediaTab, setMediaTab] = useState("images");
  const [mediaErr, setMediaErr] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoErr, setVideoErr] = useState("");
  const fileRef = useRef(null);

  const images = desc.media.filter((m) => m.type === "image");
  const videos = desc.media.filter((m) => m.type === "video");
  const subs = subcategoryOptions(desc.category);
  const topics = topicOptions(desc.category, desc.subcategory);
  const withImage = (img) => setDesc((d) => ({ ...d, media: [...d.media.filter((m) => m.type === "image"), img, ...d.media.filter((m) => m.type === "video")] }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|gif)$/.test(file.type)) return setMediaErr("Choose a JPG, PNG or GIF picture.");
    if (file.size > MAX_IMAGE) return setMediaErr("Choose a picture under 2MB.");
    const reader = new FileReader();
    reader.onload = () => {
      setMediaErr("");
      withImage({ type: "image", src: String(reader.result), alt: "" });
    };
    reader.onerror = () => setMediaErr("That picture could not be read. Try another file.");
    reader.readAsDataURL(file);
  };
  const updateMedia = (src, patch) => set("media")(desc.media.map((m) => (m.src === src ? { ...m, ...patch } : m)));
  const removeMedia = (src) => set("media")(desc.media.filter((m) => m.src !== src));
  const makeCover = (src) => {
    const img = desc.media.find((m) => m.src === src);
    set("media")([img, ...desc.media.filter((m) => m.src !== src)]);
  };
  const addVideo = () => {
    const v = videoUrl.trim();
    if (!VIDEO_RE.test(v)) {
      setVideoErr("Enter the full video link, starting https://");
      return document.getElementById("rt-pws-ce-video")?.focus();
    }
    if (videos.some((m) => m.src === v)) {
      setVideoErr("This video is already on the course.");
      return document.getElementById("rt-pws-ce-video")?.focus();
    }
    setVideoErr("");
    setVideoUrl("");
    set("media")([...desc.media, { type: "video", src: v }]);
  };

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-basics-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-basics-h">Course landing page</h2>
        <CardChoice name="rt-pws-ce-model" legend="Performance model" value={desc.model} onChange={set("model")}
          options={Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label, text: m.text }))} />
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-title">Course title</label>
          <input id="rt-pws-ce-title" value={desc.title} maxLength={LIMITS.title} onChange={(e) => set("title")(e.target.value)} placeholder="For example: Emergency First Aid at Work" autoComplete="off" />
          <Counter value={desc.title} max={LIMITS.title} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-sub">Course subtitle</label>
          <span className="rt-field__hint" id="rt-pws-ce-sub-h">One or two sentences under the title: who it is for and what they get.</span>
          <textarea id="rt-pws-ce-sub" rows={2} value={desc.subtitle} maxLength={LIMITS.subtitle} onChange={(e) => set("subtitle")(e.target.value)} aria-describedby="rt-pws-ce-sub-h" autoComplete="off" />
          <Counter value={desc.subtitle} max={LIMITS.subtitle} />
        </div>
        <div className="rt-pws-course-grid3">
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-level">Course level</label>
            <FieldSelect id="rt-pws-ce-level" label="Course level" value={desc.level} onChange={set("level")} options={levelOptions()} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-cat">Course category</label>
            <FieldSelect id="rt-pws-ce-cat" label="Course category" placeholder="Choose a category" value={desc.category} onChange={(v) => setDesc((d) => ({ ...d, category: v, subcategory: "", topic: "" }))} options={categoryOptions()} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-subcat">Course subcategory</label>
            <FieldSelect id="rt-pws-ce-subcat" label="Course subcategory" placeholder={desc.category ? "Choose a sub-category" : "Choose a category first"} value={desc.subcategory} onChange={(v) => setDesc((d) => ({ ...d, subcategory: v, topic: "" }))} options={subs} disabled={!desc.category} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-topic">Course topic (optional)</label>
            <FieldSelect id="rt-pws-ce-topic" label="Course topic" placeholder={topics.length ? "Choose a topic" : "No topics for this sub-category"} value={desc.topic} onChange={set("topic")} options={topics} disabled={!topics.length} />
          </div>
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-details">Course details</label>
          <span className="rt-field__hint" id="rt-pws-ce-details-h">What the course covers, how it is taught and assessed, and who it suits.</span>
          <textarea id="rt-pws-ce-details" rows={8} value={desc.details} onChange={(e) => set("details")(e.target.value)} aria-describedby="rt-pws-ce-details-h" autoComplete="off" />
        </div>
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-media-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-media-h">Course media</h2>
        <p className="rt-acc__note">Add course images and videos. They show as a slideshow at the top of the course page; the first image is the cover in search results.</p>
        <div className="rt-pws-ce__mtabs" role="group" aria-label="Media type">
          {[["images", `Images (${images.length})`], ["videos", `Videos (${videos.length})`]].map(([k, l]) => (
            <button key={k} type="button" className={`rt-pws-ce__mtab${mediaTab === k ? " is-on" : ""}`} aria-pressed={mediaTab === k} onClick={() => setMediaTab(k)}>{l}</button>
          ))}
        </div>
        {mediaTab === "images" ? (
          <>
            {mediaErr && <p className="rt-q__err" id="rt-pws-ce-media-e" role="alert"><span className="rt-sr">Error: </span>{mediaErr}</p>}
            <div className="rt-pws-course-mediabar">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" className="rt-sr" id="rt-pws-ce-file" onChange={onFile} tabIndex={-1} aria-hidden="true" />
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()}>Upload course image</button>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setLibrary(true)}>Choose from your library</button>
              <span className="rt-field__hint">500 × 300 pixels or larger. JPG, PNG or GIF, up to 2MB. No text on the image.</span>
            </div>
            {images.length ? (
              <ul className="rt-pws-course-media">
                {images.map((m, i) => (
                  <li key={m.src} className="rt-pws-course-mediaitem">
                    <img src={m.src} alt="" />
                    <div className="rt-pws-course-mediabody">
                      {i === 0 ? <Pill tone="info">Cover</Pill> : <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => makeCover(m.src)}>Make cover</button>}
                      <div className="rt-field">
                        <label htmlFor={`rt-pws-ce-alt-${i}`}>ALT text</label>
                        <input id={`rt-pws-ce-alt-${i}`} value={m.alt || ""} maxLength={140} onChange={(e) => updateMedia(m.src, { alt: e.target.value })} placeholder="For example: learners practising CPR on a manikin" autoComplete="off" />
                      </div>
                      <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => removeMedia(m.src)}>Remove<span className="rt-sr"> image {i + 1}</span></button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState inCard title="No images yet. Upload one or choose from your library." />}
          </>
        ) : (
          <>
            <div className="rt-field">
              <label htmlFor="rt-pws-ce-video">Video URL</label>
              <span className="rt-field__hint" id="rt-pws-ce-video-h">A YouTube or Vimeo link. Copy it from the video&apos;s Share button.</span>
              {videoErr && <p className="rt-q__err" id="rt-pws-ce-video-e"><span className="rt-sr">Error: </span>{videoErr}</p>}
              <div className="rt-pws-course-addrow">
                <input id="rt-pws-ce-video" type="url" inputMode="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideo(); } }} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={videoErr ? true : undefined} aria-describedby={`rt-pws-ce-video-h${videoErr ? " rt-pws-ce-video-e" : ""}`} autoComplete="url" />
                <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={addVideo}>Add video</button>
              </div>
            </div>
            {videos.length ? (
              <ul className="rt-adm-list">
                {videos.map((m) => (
                  <li key={m.src}>
                    <div><b className="rt-pws-ce__url">{m.src}</b></div>
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => removeMedia(m.src)}>Remove<span className="rt-sr"> video {m.src}</span></button>
                  </li>
                ))}
              </ul>
            ) : <EmptyState inCard title="No videos yet." />}
          </>
        )}
      </section>

      <MediaLibrary open={library} onClose={() => setLibrary(false)} data={data} current={images.map((m) => m.src)} onPick={(m) => { withImage({ type: "image", src: m.src, alt: m.alt || "" }); setLibrary(false); }} />
    </form>
  );
}

// ---- Course information ----------------------------------------------------------------------------------------------------

function InfoSection({ data, desc, setDesc }) {
  const set = (key) => (value) => setDesc((d) => ({ ...d, [key]: value }));
  const [sheet, setSheet] = useState(null);
  const [feature, setFeature] = useState("");
  const [objective, setObjective] = useState("");
  const [editTopic, setEditTopic] = useState(null);

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
  const linkedFaqs = desc.faqs.map((id) => data.faqs.find((f) => f.id === id)).filter(Boolean);

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-learn-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-learn-h">Course information</h2>
        <p className="rt-acc__note">These show on the public course page and help it perform in search.</p>
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
          <label htmlFor="rt-pws-ce-obj">What will students learn?</label>
          <span className="rt-field__hint" id="rt-pws-ce-obj-h">Aim to add at least 4 learning objectives, each starting with a verb. Press Enter to add.</span>
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
          <h2 className="rt-acc__h2" id="rt-pws-ce-topics-h">What topics will be covered?</h2>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setEditTopic(null); setSheet("topic"); }}>Add topic</button>
        </div>
        <p className="rt-acc__note">A title for each topic and a short description of what it includes.</p>
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
        ) : <EmptyState inCard title="No topics yet." />}
      </section>

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-faqs-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-faqs-h">FAQs</h2>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("faqs")}>Add FAQs</button>
        </div>
        <p className="rt-acc__note">Choose from your FAQs or write a new one. Your FAQs are kept in Settings › FAQs, so you can use the same answer on every course.</p>
        {linkedFaqs.length ? (
          <ul className="rt-adm-list">
            {linkedFaqs.map((f) => (
              <li key={f.id}>
                <div><b>{f.q}</b><small>{f.a}</small></div>
                <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => set("faqs")(desc.faqs.filter((x) => x !== f.id))}>Remove<span className="rt-sr"> {f.q}</span></button>
              </li>
            ))}
          </ul>
        ) : <EmptyState inCard title="No FAQs on this course yet." />}
      </section>

      <TopicSheet open={sheet === "topic"} onClose={() => setSheet(null)} topic={editTopic === null ? null : desc.topics[editTopic]} onSave={(rows) => {
        if (editTopic === null) set("topics")([...desc.topics, ...rows]);
        else set("topics")(desc.topics.map((t, i) => (i === editTopic ? rows[0] : t)));
        setSheet(null);
      }} />
      <FaqSheet open={sheet === "faqs"} onClose={() => setSheet(null)} faqs={data.faqs} linked={desc.faqs} onSave={(ids) => { set("faqs")(ids); setSheet(null); }} />
    </form>
  );
}

// ---- Mode of study ---------------------------------------------------------------------------------------------------------

function ModeSection({ course, data, desc, setDesc, locked, onSaved }) {
  const set = (key) => (value) => setDesc((d) => ({ ...d, [key]: value }));
  const [venueSheet, setVenueSheet] = useState(false);
  const [venuePick, setVenuePick] = useState("");
  const linkedVenues = desc.venues.map((id) => data.byId.venue[id]).filter(Boolean);
  const venueOptions = data.venues.filter((v) => v.active && !desc.venues.includes(v.id));

  return (
    <div className="rt-acc__stack">
      <form className="rt-acc__card rt-pws-course-form" noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="rt-pws-ce-mode-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-mode-h">Mode of study</h2>
        {locked && <p className="rt-adm-item__block">This course has orders, so how it is delivered can&apos;t change. Create a new course for another mode of study.</p>}
        <CardChoice name="rt-pws-ce-format" legend="How is the course content delivered to students?" value={desc.format} onChange={set("format")}
          options={pw.formats.map((f) => ({ value: f.key, label: methodName(f.key), text: f.text, disabled: locked && f.key !== course.format }))} />
      </form>

      {desc.format === "classroom" && (
        <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-venues-h">
          <div className="rt-acc__cardhead rt-pws-course-cardhead">
            <h2 className="rt-acc__h2" id="rt-pws-ce-venues-h">Venues</h2>
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setVenueSheet(true)}>Add venue</button>
          </div>
          <p className="rt-acc__note">Where this course runs. Each cohort picks one of these.</p>
          {venueOptions.length > 0 && (
            <div className="rt-pws-course-addrow">
              <div className="rt-field">
                <label htmlFor="rt-pws-ce-venue" className="rt-sr">Choose a venue</label>
                <FieldSelect id="rt-pws-ce-venue" label="Choose a venue" placeholder="Choose one of your venues" value={venuePick} onChange={setVenuePick} options={venueOptions.map((v) => ({ value: v.id, label: `${v.name}, ${v.city}` }))} />
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
          ) : <EmptyState inCard title="No venues on this course yet." />}
        </section>
      )}

      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-resit-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-resit-h">Exam resit</h2>
        <p className="rt-acc__note">If the course ends with an exam, whether learners can resit it and what it costs. Saved on its own.</p>
        <ResitPanel course={course} onSaved={onSaved} />
      </section>

      <VenueSheet open={venueSheet} onClose={() => setVenueSheet(false)} onSave={(ids) => { setDesc((d) => ({ ...d, venues: [...d.venues, ...ids] })); setVenueSheet(false); }} />
    </div>
  );
}

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
      ) : <EmptyState inCard title="No other pictures yet. Pictures you upload to any course appear here." />}
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

// ---- Course pricing --------------------------------------------------------------------------------------------------------

// Hurak's pricing: the Skill Saver loyalty programme, then the structure: a flat rate, tiered (one of your pricing plans, shown as
// a table of its Saver, Flexi and Premium prices) or free. Cohorts can still set their own price.
function PricingTab({ data, price, setPrice, errors }) {
  const [editor, setEditor] = useState(false);
  const set = (patch) => setPrice((p) => ({ ...p, ...patch }));
  const active = data.packages.filter((p) => p.active || p.id === price.packageId);
  const pack = data.byId.pack[price.packageId];

  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-price-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-price-h">Course pricing</h2>
        <div className="rt-pws-ce__loyalty">
          <label className="rt-fp__opt">
            <input type="checkbox" className="rt-fp__check" checked={price.skillSaver} onChange={(e) => set({ skillSaver: e.target.checked })} />
            <span>Include this course in the Skill Saver loyalty programme</span>
          </label>
          <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link>
        </div>
        <Choice name="rt-pws-ce-ptype" legend="Choose your pricing structure" hint="Don't worry, you can change this later when creating cohorts." value={price.type} onChange={(v) => set({ type: v })} options={[{ value: "flat", label: "Flat rate" }, { value: "tiered", label: "Tiered" }, { value: "free", label: "Free" }]} />
        {price.type === "flat" && (
          <div className="rt-field rt-pws-course-price">
            <label htmlFor="rt-pws-ce-pricein">Price per learner, including VAT</label>
            {errors.price && <p className="rt-q__err" id="rt-pws-ce-pricein-e"><span className="rt-sr">Error: </span>{errors.price}</p>}
            <div className="rt-pws-course-money">
              <span aria-hidden="true">£</span>
              <input id="rt-pws-ce-pricein" type="number" inputMode="decimal" min="0" step="0.01" value={price.price} onChange={(e) => set({ price: e.target.value })} aria-invalid={errors.price ? true : undefined} aria-describedby={errors.price ? "rt-pws-ce-pricein-e" : undefined} autoComplete="off" />
            </div>
          </div>
        )}
        {price.type === "free" && <p className="rt-acc__note">Learners book this course for free. You can still charge for a cohort when you create it.</p>}
        {price.type === "tiered" && (
          <>
            <p className="rt-acc__note">With tiered pricing you can offer 3 pricing plans: Saver, Flexi and Premium, each with its own perks.</p>
            {active.length > 0 && (
              <div className="rt-field">
                <label htmlFor="rt-pws-ce-pack">Select pricing plan</label>
                {errors.package && <p className="rt-q__err" id="rt-pws-ce-pack-e"><span className="rt-sr">Error: </span>{errors.package}</p>}
                <FieldSelect id="rt-pws-ce-pack" label="Select pricing plan" placeholder="Choose a pricing plan" value={price.packageId} onChange={(value) => set({ packageId: value })} options={active.map((p) => ({ value: p.id, label: p.name || "Untitled plan" }))} invalid={Boolean(errors.package)} describedBy={errors.package ? "rt-pws-ce-pack-e" : undefined} />
              </div>
            )}
            <div className="rt-pws-course-mediabar">
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditor(true)}>Create pricing plan</button>
              <Link href="/provider/packages" className="rt-cd__link">Manage pricing plan</Link>
            </div>
            {pack && (
              <div className="rt-biz__tablecard rt-pws-ce__plans">
                <table className="rt-biz__table rt-adm-table">
                  <thead><tr><th scope="col">Plan name</th>{pw.tiers.map((t) => <th scope="col" key={t.key}>{t.label} plan</th>)}</tr></thead>
                  <tbody>
                    <tr>
                      <td data-label="Plan name" className="rt-adm-strong">{pack.name || "Untitled plan"}</td>
                      {pw.tiers.map((t) => <td key={t.key} data-label={`${t.label} plan`}>{formatPrice(pack.tiers[t.key]?.price || 0)}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <PackageEditor open={editor} onClose={() => setEditor(false)} packageId={null} onSaved={(id) => { set({ packageId: id }); setEditor(false); }} />
    </form>
  );
}
