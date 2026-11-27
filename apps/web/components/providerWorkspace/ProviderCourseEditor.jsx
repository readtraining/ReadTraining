"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Confirm, Req } from "./settingsForm";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { CourseEndpoints, isStale, useCourseEndpoints, useEndpoints } from "@/lib/courseEditorApi";
import { useWorkspaceLinks } from "@/lib/workspaceContext";
import { useFromLink } from "@/lib/backLink";
import { leaveWithoutAsking, useUnsavedChanges } from "@/lib/unsavedChanges";
import { acceptFor, prepareImage, shortHintFor, whenLoaded } from "@/lib/images";
import { getSupabase } from "@/lib/supabase/client";
import { errorsFrom, errorText } from "@/lib/useMe";
import { videoEmbed } from "@/lib/catalogueData";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { CourseGear, SeoPanel, SharedGear } from "./CourseSettings";
import { GUIDE_SECTIONS, GuideExtras, addedSections, useGuideForm } from "./CourseGuideEditor";
import LineList from "./LineList";
import { CohortForm, todayIso } from "./ProviderCohorts";
import { COURSE_TONE, CardChoice, Choice, KeepWidth, Loading, Pill, WayCards, getQuery, setQuery, shortDay } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { categoryOptions, levelOptions, methodName, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { LEARNING_OPTIONS, isClosedWay, isDatedMethod, waysLabel, waysOf } from "@/lib/courseModes";
import { EmptyState, ErrorState } from "@/components/states/States";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import TextArea from "@/components/forms/TextArea";

// The course editor's sections, in the order a provider fills them in, each ticked in the side list when it is complete. Learning
// options come before the price, as the price step depends on them: the self-paced option has one price, a course on dates is
// priced on each date, so its step holds its dates. FAQs and SEO are optional: they never stop a course being sent for approval.
// A course being built ends on Review: every step at a glance, and the one main button (Send for approval, or Publish).
const SECTIONS = [
  { key: "landing", label: "Course landing page" },
  { key: "info", label: "Course information" },
  { key: "syllabus", label: "Syllabus and exam" },
  // a shared page's optional sections that have no other step (ReadTraining's own pages only; the rest are in the landing page
  // and information steps): CourseGuideEditor.jsx
  { key: "after", label: "Licence, costs and careers", optional: true, extras: true },
  { key: "faqs", label: "FAQs", optional: true },
  { key: "mode", label: "Learning options" },
  { key: "pricing", label: "Price" },
  { key: "seo", label: "SEO settings", optional: true },
  // a shared page's providers' courses, to look at: their learning options, dates and prices (ReadTraining's own pages only)
  { key: "providers", label: "Providers' dates and prices", optional: true },
  { key: "review", label: "Review", final: true },
];
// the step that holds only a shared page's optional sections: its heading
const EXTRA_STEPS = { after: { title: "Licence, costs and careers" } };
// the price step's name: the self-paced option has one price, and a course on dates is priced on each date
const pricingLabel = (methods) => {
  const own = methods.includes("self-paced");
  const dated = methods.some(isDatedMethod);
  return own && dated ? "Prices and dates" : own ? "Price" : "Dates and prices";
};
// a shared course page (written by ReadTraining's team) has no price, dates or way of teaching of its own: its providers' courses do
const SHARED_SECTIONS = ["landing", "info", "syllabus", "after", "faqs", "seo", "providers", "review"];
const FORM_SECTIONS = ["landing", "info", "syllabus", "faqs", "mode", "pricing"];
// the shortest short description and description a course can be sent with (the API's MIN_TEXT, provider/courses.mts): a draft saves
// with less, but the step isn't complete until they are this long
const MIN = { summary: 50, description: 200 };
const longEnough = (text, key) => text.trim().length >= MIN[key];
const LIMITS = { title: 60, summary: 300, feature: 70, outcome: 160 }; // a title saved longer before the 60 limit stays until changed (the API's refuseLongTitle)
// how many of each list a course can have (the API's limits, provider/courses.mts `content`)
const MOST = { features: 12, outcomes: 20, units: 40, exams: 20, faqs: 30 };
const MAX_PRICE = 100000; // pounds (the API's pricePence limit)
// The section that shows each field's error, by the API's names (a list's rows come under the list's name) and the editor's own
// (passMark0, examUnit0: one exam row's fields). Saving with errors goes to the first section that has one.
const SECTION_OF = {
  model: "mode", title: "landing", summary: "landing", description: "landing", category: "landing", subcategory: "landing", topic: "landing", level: "landing", compliance: "landing", videoUrl: "landing",
  features: "info", outcomes: "info", audience: "info", entryRequirements: "info",
  images: "landing", syllabusIntro: "syllabus", units: "syllabus", examsIntro: "syllabus", exams: "syllabus", faqs: "faqs", price: "pricing", planId: "pricing", skillSaver: "pricing", method: "mode", methods: "mode",
  dates: "pricing",
};
const sectionOf = (key) => SECTION_OF[key] || (/^(passMark|examUnit|examDuration|examAssessment)\d+$/.test(key) ? "syllabus" : null);
// course pictures follow the rule every picture upload does (lib/images.js): JPG, PNG, WebP or GIF up to 15 MB, big ones made
// smaller for you (a GIF is kept as it is, so it must be under 2 MB), at least 500 × 300 (the API checks the stored file too:
// MIN_COURSE_IMAGE in apps/api/src/lib/media.mts)
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
// "28 Oct 2026, 14:05": with the year, as a course or a waiting change can sit for months
const SAVED_AT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
// A pass mark, as the API checks it (apps/api/src/modules/provider/courses.mts passMarkProblem): a percentage up to 100%, a score
// that isn't more than its total ("26 out of 40", "26/40", "26 of 40 marks", decimals too), or words ("Pass or fail"; a bare "of"
// is a score only at the end, so "Level 3 of 2 sections" is words). Returns what is wrong, or "". Keep the two the same.
const NUM = String.raw`(\d+(?:\.\d+)?)`;
const SCORE = new RegExp(String.raw`${NUM}\s*(?:out of|/)\s*${NUM}`);
const SCORE_OF = new RegExp(String.raw`${NUM}\s+of\s+${NUM}(?:\s*(?:marks?|points?|questions?|answers?))?\s*\.?$`);
export function passMarkProblem(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return "";
  if (/^[\d.]*\s*%$/.test(t) && !/\d/.test(t)) return "Enter the percentage needed to pass.";
  if (/^[\d.]*\s*out of\s*[\d.]*$/.test(t) && !/^\d+(?:\.\d+)?\s*out of\s*\d+(?:\.\d+)?$/.test(t)) return "Enter the score needed and the total, like 26 out of 40.";
  const pct = t.match(/(\d+(?:\.\d+)?)\s*(?:%|per\s*cent\b)/);
  if (pct && Number(pct[1]) > 100) return "A percentage pass mark can't be over 100%.";
  const score = t.match(SCORE) || t.match(SCORE_OF);
  if (score && (Number(score[2]) === 0 || Number(score[1]) > Number(score[2]))) return "The pass mark can't be more than the total, like 26 out of 40.";
  return "";
}
// A pass mark is one of three kinds, chosen, never typed as words: a percentage ("70%"), a score ("26 out of 40") or "Pass or fail".
// It is saved as that text (passMarkProblem above and the API check it), and the kind is read from the text alone ("%" alone is a
// percentage not filled in yet, "out of" alone a score), so it always belongs to its own row. One saved before as other words shows
// what it says until a kind is chosen, and stays as it was until then.
const PASS_KINDS = [{ value: "percent", label: "Percentage" }, { value: "score", label: "Score" }, { value: "passfail", label: "Pass or fail" }];
const PASS_OR_FAIL = "Pass or fail";
const passKindOf = (v) => {
  const t = (v || "").trim();
  if (/^\d*(?:\.\d*)?\s*%$/.test(t)) return "percent";
  if (/^\S*\s*out of\s*\S*$/i.test(t)) return "score";
  if (t.toLowerCase() === PASS_OR_FAIL.toLowerCase()) return "passfail";
  return "";
};
// what can be typed in a pass mark's number box: digits and one decimal point
const digits = (v) => {
  const d = v.replace(/[^\d.]/g, "");
  const dot = d.indexOf(".");
  return (dot < 0 ? d : d.slice(0, dot + 1) + d.slice(dot + 1).replace(/\./g, "")).slice(0, 6);
};
const NUMBER = /^\d+(?:\.\d+)?$/;
// a pass mark chosen but not filled in: what to say, and which box to put the cursor in
function passMarkGap(v) {
  const t = (v || "").trim();
  const kind = passKindOf(t);
  if (kind === "percent" && !NUMBER.test(t.replace(/\s*%$/, ""))) return "Enter the percentage needed to pass.";
  if (kind === "score") {
    const [got = "", total = ""] = t.split(/\s*out of\s*/i);
    if (!NUMBER.test(got) || !NUMBER.test(total)) return "Enter the score needed and the total, like 26 out of 40.";
  }
  return "";
}
function PassMarkField({ id, value, onChange, disabled, error }) {
  const t = (value || "").trim();
  const kind = passKindOf(t);
  const pct = kind === "percent" ? t.replace(/\s*%$/, "") : "";
  const [got = "", total = ""] = kind === "score" ? t.split(/\s*out of\s*/i) : [];
  const choose = (k) => onChange(k === "passfail" ? PASS_OR_FAIL : k === "score" ? " out of " : "%");
  const err = error ? `${id}-e` : undefined;
  // the error takes the cursor to the box still to fill (the kind when none is chosen)
  const focusId = kind === "percent" ? `${id}-pct` : kind === "score" ? (NUMBER.test(got) ? `${id}-total` : `${id}-got`) : id;
  return (
    <div className="rt-field rt-pws-ce__exam-wide" role="group" aria-labelledby={`${id}-l`}>
      <label htmlFor={id} id={`${id}-l`}>Pass mark<Req /></label>
      {t && !kind && <span className="rt-field__hint" id={`${id}-old`}>Saved as “{t}”. Choose how it is marked to replace it.</span>}
      {error && <p className="rt-q__err" id={err} data-focus-id={focusId}><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-pws-ce__pm">
        <FieldSelect id={id} label="How it is marked" placeholder="Choose how it is marked" value={kind} onChange={choose} options={PASS_KINDS} disabled={disabled} invalid={Boolean(error) && !kind} describedBy={[t && !kind && `${id}-old`, err].filter(Boolean).join(" ") || undefined} />
        {kind === "percent" && (
          <span className="rt-pws-ce__pmunit">
            <input id={`${id}-pct`} type="text" inputMode="decimal" value={pct} onChange={(ev) => onChange(`${digits(ev.target.value)}%`)} disabled={disabled} aria-label="Pass mark percentage" aria-invalid={error ? true : undefined} aria-describedby={err} autoComplete="off" />
            <span aria-hidden="true">%</span>
          </span>
        )}
        {kind === "score" && (
          <span className="rt-pws-ce__pmscore">
            <input id={`${id}-got`} type="text" inputMode="decimal" value={got} onChange={(ev) => onChange(`${digits(ev.target.value)} out of ${total}`)} disabled={disabled} aria-label="Score needed to pass" aria-invalid={error ? true : undefined} aria-describedby={err} autoComplete="off" />
            <span>out of</span>
            <input id={`${id}-total`} type="text" inputMode="decimal" value={total} onChange={(ev) => onChange(`${got} out of ${digits(ev.target.value)}`)} disabled={disabled} aria-label="Total marks" aria-invalid={error ? true : undefined} aria-describedby={err} autoComplete="off" />
          </span>
        )}
      </div>
    </div>
  );
}
const STATUS_NOTES = {
  draft: "Your course is a draft. Only your team can see it.",
  changes: "Our team has asked for changes. Make them, then send your course for review again.",
  live: "Your course is live. Wording changes are reviewed first; pictures, prices, dates and settings update straight away.",
  paused: "Your course is paused, so it isn't shown on ReadTraining. Put it back live from Course settings.",
};
const SHARED_NOTES = {
  draft: "This shared course page is a draft: nobody outside the team can see it, and providers can't list their courses on it yet. Publish it when it is complete.",
  live: "This shared course page is live. Changes you save show on it straight away. Providers can list their courses on it.",
  paused: "This shared course page is off the site. Providers' courses on it don't show until it is published again.",
};
// fields only the page's wording (the "page" roles: course editor, marketing) may change; the rest need full course editing
const NO_DATES_NOTE = "This course has no upcoming dates, so learners won't see a date until you add one.";
const PAGE_FIELDS = ["title", "summary", "description", "audience", "entryRequirements", "outcomes", "features", "videoUrl"];
const PRICE_FIELDS = ["price", "planId", "skillSaver"];

// The draft the editor works on: the saved course, with any change still waiting for approval on top (so the provider keeps
// editing their latest version).
const draftOf = (c) => {
  const p = c.pendingChanges?.content || {};
  const pick = (k) => (p[k] !== undefined ? p[k] : c[k]);
  return {
    // the learning options in their usual order; a course with none yet opens on classroom
    model: c.model, method: c.method || "classroom", methods: c.methods?.length ? LEARNING_OPTIONS.filter((m) => c.methods.includes(m)) : [c.method || "classroom"], skillSaver: c.skillSaver, planId: c.planId || "", price: c.pricePence == null || c.planId ? "" : (c.pricePence / 100).toFixed(2).replace(/\.00$/, ""),
    title: pick("title") || "", summary: pick("summary") || "", description: pick("description") || "", audience: pick("audience") || "", entryRequirements: pick("entryRequirements") || "",
    outcomes: pick("outcomes") || [], features: pick("features") || [], category: pick("category") || "", subcategory: pick("subcategory") || "", topic: pick("topic") || "", level: pick("level") || "",
    videoUrl: pick("videoUrl") || "",
    compliance: pick("compliance") ?? null, // true, false, or null (not answered yet)
    syllabusIntro: pick("syllabusIntro") || "", examsIntro: pick("examsIntro") || "",
    units: (pick("units") || []).map((u) => ({ title: u.title, body: u.body || "" })),
    exams: (pick("exams") || []).map((e) => ({ unit: e.unit, passMark: e.passMark || "", duration: e.duration || "", assessment: e.assessment || "" })),
    faqs: (pick("faqs") || []).map((f) => ({ question: f.question, answer: f.answer })),
  };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// the course's learning options retired in Catalogue settings that are still on sale (one not taking bookings holds nothing back:
// lib/retired.mts in the API)
const retiredOnSale = (course) => (course.retiredMethods || []).filter((m) => !isClosedWay(course, m));

// The draft's ways taught on dates (taking bookings) with no date learners can book: the API's datesMissing for the saved ones,
// and any switched on but not saved yet (it can't have a date). Sending for approval needs a date on each.
const datesNeeded = (d, course) =>
  d.methods.filter((m) => isDatedMethod(m) && !(course.closedMethods || []).includes(m) && ((course.datesMissing || []).includes(m) || !waysOf(course).includes(m)));

// what Prices & dates says while a way taught on dates has no date learners can book (Continue stops there, as Send would)
const datesGap = (lacking) => `Create a ${lacking.map(methodName).join(" and a ")} cohort: the course needs a date learners can book${lacking.length > 1 ? " for each" : ""}.`;

// whether each section is complete, from the draft (and the saved images and dates). The API counts a draft's required steps
// left by the same rules for the Dashboard's to-do list (provider/courses.mts stepsLeft): keep the two the same.
function sectionOk(d, course, key) {
  if (key === "landing") return Boolean(d.title.trim() && longEnough(d.summary, "summary") && longEnough(d.description, "description") && d.category && d.subcategory && d.level && d.compliance !== null && course.images.length);
  if (key === "info") return d.outcomes.length >= 4;
  if (key === "syllabus") return d.units.length > 0;
  if (key === "faqs") return d.faqs.length > 0;
  // priced: the self-paced option has its own price; dates are priced each, so each way taught on dates needs a date learners can book
  if (key === "pricing") return (!d.methods.includes("self-paced") || d.price !== "" || Boolean(d.planId)) && !datesNeeded(d, course).length;
  if (key === "mode") return d.methods.includes(d.method);
  if (key === "after") return addedSections(course.guide, key).length > 0;
  if (key === "providers") return (course.children || []).some((x) => x.status === "live");
  return Boolean(course.seoTitle && course.seoDescription);
}

// What is still needed before the course can be sent for approval (or a shared page published): the same rules the API checks
// (provider/courses.mts `missing`), worked out from the draft so typing an item ticks it off at once. Each item names the
// section that holds it, so the list can take the provider straight there.
function stillNeeded(d, course) {
  const out = [];
  const add = (section, text) => out.push({ section, text });
  if (!longEnough(d.summary, "summary")) add("landing", `a short description of at least ${MIN.summary} characters`);
  if (!longEnough(d.description, "description")) add("landing", `a description of at least ${MIN.description} characters`);
  if (!d.category || !d.subcategory) add("landing", "a category and sub-category");
  if (!d.level) add("landing", "a level");
  if (d.compliance === null) add("landing", "whether it is a compliance course");
  if (!course.images.length) add("landing", "at least one image");
  if (d.outcomes.length < 4) add("info", `at least 4 things learners will learn (${d.outcomes.length} so far)`);
  if (!d.units.length) add("syllabus", "at least one syllabus unit");
  if (course.kind === "provider" && !d.methods.includes(d.method)) add("mode", "a learning option");
  if (course.kind === "provider" && d.methods.includes("self-paced") && d.price === "" && !d.planId) add("pricing", "a price or a price plan for the self-paced option");
  if (course.kind === "provider") for (const m of datesNeeded(d, course)) add("pricing", `a ${methodName(m)} date learners can book`);
  // filed under something no longer offered (retired in Catalogue settings since it was chosen): the API refuses to send it
  for (const entry of course.retired || []) {
    const [, name, word] = entry.match(/^(.*) \(([^)]+)\)$/) || [];
    const key = RETIRED_KEY[word];
    if (key && d[key] === (course[key] || "")) add("landing", `another ${word}: ${name} is no longer offered`);
  }
  for (const m of retiredOnSale(course)) if (d.methods.includes(m)) add("mode", `${methodName(m)} turned off, as it is no longer offered`);
  return out;
}
// What the step `key` still needs before Continue moves on, as { field: message } (the same rules as stillNeeded and the API's
// `missing`; optional fields never stop it). Save still saves a half-finished step, and the side list still opens any step.
function stepGaps(d, course, key) {
  const e = {};
  if (key === "landing") {
    if (!d.summary.trim()) e.summary = "Enter a short description.";
    else if (!longEnough(d.summary, "summary")) e.summary = `Write at least ${MIN.summary} characters (${d.summary.trim().length} so far).`;
    if (!d.level) e.level = "Choose a level.";
    if (!d.category) e.category = "Choose a category.";
    if (!d.subcategory) e.subcategory = "Choose a sub-category.";
    if (d.compliance === null) e.compliance = pw.compliance.error;
    if (!d.description.trim()) e.description = "Enter the course description.";
    else if (!longEnough(d.description, "description")) e.description = `Write at least ${MIN.description} characters (${d.description.trim().length} so far).`;
    if (!course.images.length) e.images = "Upload at least one image.";
  }
  if (key === "info" && d.outcomes.length < 4) e.outcomes = `Add at least 4 things learners will learn (${d.outcomes.length} so far).`;
  if (key === "syllabus" && !d.units.length) e.units = "Add at least one unit.";
  // an exam row (optional) needs all three parts: the course page shows it as a line of a table
  if (key === "syllabus") d.exams.forEach((x, i) => {
    if (!x.unit.trim()) e[`examUnit${i}`] = "Name this exam or unit, or remove the row.";
    if (!x.passMark.trim()) e[`passMark${i}`] = "Choose how the exam is marked, and its pass mark.";
    else if (passMarkGap(x.passMark)) e[`passMark${i}`] = passMarkGap(x.passMark);
    if (!x.duration.trim()) e[`examDuration${i}`] = "Enter how long it takes, like 45 minutes.";
  });
  if (key === "mode" && course.kind === "provider" && !d.methods.includes(d.method)) e.method = "Choose the primary learning option.";
  if (key === "pricing" && course.kind === "provider" && d.methods.includes("self-paced") && d.price === "" && !d.planId) {
    e.price = "Enter the self-paced price per learner, or choose a price plan.";
    e.planId = "Choose a price plan, or choose Flat and enter a price.";
  }
  // each way taught on dates needs a date learners can book before it can be sent, so Continue doesn't move past it
  if (key === "pricing" && course.kind === "provider" && datesNeeded(d, course).length) e.dates = datesGap(datesNeeded(d, course));
  return e;
}
// the draft's field for each kind of catalogue entry the API names as retired ("Name (sub-category)": provider/courses.mts retired)
// (a retired learning option comes in `retiredMethods`: it is turned off in Learning options, not chosen again)
const RETIRED_KEY = { category: "category", "sub-category": "subcategory", topic: "topic", level: "level" };

// What changed in the draft, as the API takes it. The catalogue place goes as one (category, sub-category and topic together); a
// provider sends only the category and sub-category (the topic is our team's choice at approval: `access.topic` is ReadTraining's
// own, a shared page or staff editing).
function changes(draft, base, access) {
  const out = {};
  const keys = Object.keys(draft).filter((k) => !same(draft[k], base[k]));
  for (const k of keys) {
    if (!access.full && !PAGE_FIELDS.includes(k)) continue;
    if (!access.pricing && PRICE_FIELDS.includes(k)) continue;
    if (k === "planId") {
      out.planId = draft.planId || null;
      // back to Flat: the price is the field's (empty: none), not the plan's cheapest package the course held
      if (!draft.planId) out.pricePence = draft.price === "" ? null : Math.round(Number(draft.price) * 100);
    }
    else if (k === "price") {
      if (!draft.planId) out.pricePence = draft.price === "" ? null : Math.round(Number(draft.price) * 100);
    }
    else if (k === "topic" && !access.topic) continue;
    else if (["category", "subcategory", "topic"].includes(k)) Object.assign(out, { category: draft.category, subcategory: draft.subcategory, ...(access.topic ? { topic: draft.topic || null } : {}) });
    // the learning options and the primary one go together (the primary is always one of them)
    else if (k === "method" || k === "methods") Object.assign(out, { method: draft.method, methods: draft.methods });
    else out[k] = draft[k];
  }
  return out;
}

// Whether the course as loaded (`fresh`) already holds every change in `patch` (as the API took them; the API trims words).
const tidy = (v) => (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.map(tidy) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tidy(x)])) : v);
function alreadySaved(patch, fresh, access) {
  const saved = changes(draftOf(fresh), {}, access);
  return Object.keys(patch).every((k) => same(tidy(patch[k]), tidy(saved[k])));
}

// One course in the editor: the "Publish your course" list on the left (one item per section, ticked when complete, kept in
// ?tab=), the section on the right. The sections' fields are one draft saved with "Save"; images and SEO save themselves. The
// header shows the status and performance model, with Preview and the gear (course settings). The bar under the form saves and
// moves on; on the last step its "Send for approval" sends a draft, then goes back to the course list. Once every required step is
// complete, "Send for approval" also shows in the steps list on every other step, so a fix on an earlier step can be sent from
// there. Leaving with unsaved changes asks first. Course data comes from the API.
// scope "admin": the same editor for a shared course page in the admin (lib/courseEditorApi.js): no pricing or learning options,
// changes go live on Save, and the page is published from here instead of sent for approval.
// The page title (ProviderShell's h1): the course's name once it has loaded.
export function CourseTitle({ courseId, scope = "provider", fallback }) {
  const id = /^\d+$/.test(String(courseId)) ? Number(courseId) : 0;
  return useCourseEndpoints(scope, id).query.data?.title || fallback;
}

export default function ProviderCourseEditor({ courseId, scope = "provider" }) {
  const links = useWorkspaceLinks();
  const id = /^\d+$/.test(String(courseId)) ? Number(courseId) : 0;
  const ep = useCourseEndpoints(scope, id);
  const query = ep.query;
  const course = query.data;
  const router = useRouter();
  const [tab, setTab] = useState("landing");
  const [draft, setDraft] = useState(null);
  const [base, setBase] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [said, setSaid] = useState("");
  const [showNeed, setShowNeed] = useState(false); // "Almost ready to send" is open: Send for approval was pressed with something missing
  const [submitError, setSubmitError] = useState("");
  const [sendAt, setSendAt] = useState("bar"); // which Send for approval was pressed (the steps list's or the bar's), for its message
  // sent (or published) just now: the button gives way at once, without waiting for the course to load again
  const [sent, setSent] = useState(false);
  // a save was refused because the course changed somewhere else since this draft was loaded
  const [stale, setStale] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false); // "Withdraw your changes?" is open
  const [reloading, setReloading] = useState(false);
  const needRef = useRef(null);
  const staleRef = useRef(null);
  // any part of the editor (images, send, withdraw) refused because the course changed elsewhere shows the banner too
  ep.onStale(() => {
    setStale(true);
    requestAnimationFrame(() => staleRef.current?.focus());
  });
  const [gear, setGear] = useState(false);
  const [seo, setSeo] = useState({ dirty: false, busy: false }); // the SEO step's own form, saved from the bar
  const seoSave = useRef(null); // saves the SEO form (Save and Send for approval save it with the rest)
  const [pressed, setPressed] = useState("");
  // a picture uploading (or a picture change saving) on Course landing page: the editor waits for it, so nobody moves on before
  // it is in, and an upload that fails says so on the step they are on
  const [imagesBusy, setImagesBusy] = useState(false);
  // the step on screen now, for a Save and continue that finishes after the provider has gone to another step themselves
  const tabNow = useRef("");
  // "Load the latest version": the SEO step starts again from the course as it is now (it reads the course only when it opens)
  const [latest, setLatest] = useState({ n: 0, course: null }); // the bar's button that is working ("save", "continue", "send"): only it says so
  const [preview, setPreview] = useState(false);
  const formRef = useRef(null);
  const navRef = useRef(null);
  const loadedFor = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  // what a change did: announced to screen readers, and shown as a toast unless its result is already on screen (`shown`)
  const saved = useCallback((message, { shown = false } = {}) => { if (!shown) setToast({ message }); setSaid(message); }, []);
  // a shared page's optional sections (its Course guide): each saved from its own pop-up, in the step for its part of the page
  const guide = useGuideForm({ ep, course, onSaved: saved });
  // in the admin, the editor's pop-ups take the provider workspace's form look (as StaffEdit's do)
  useEffect(() => {
    if (!ep.admin) return undefined;
    document.body.classList.add("rt-pws-open");
    return () => document.body.classList.remove("rt-pws-open");
  }, [ep.admin]);
  const access = ep.access;
  // a provider our team hasn't approved yet can open its courses but not change them (the shared permission table)
  const { status: providerStatus, can: providerCan } = useProviderAccess();
  const notApproved = !ep.admin && (providerStatus === "pending" || providerStatus === "changes_requested");
  // a page still being written has no provider courses yet (they go only on live pages), so its providers' tab comes once published
  // a course being built (a draft, or one our team sent back) by someone who sends it ends on Review
  const reviewing = Boolean(course) && (course.status === "draft" || course.status === "changes") && access.full && !ep.staff;
  const sections = (ep.admin ? SECTIONS.filter((x) => SHARED_SECTIONS.includes(x.key) && (x.key !== "providers" || course?.status !== "draft")) : SECTIONS.filter((x) => !x.extras && x.key !== "providers"))
    .filter((x) => x.key !== "review" || reviewing);
  const back = ep.admin ? { label: "Back to the catalogue", href: "/admin/catalogue" } : { label: "Back to courses", href: links.courses(course?.id) };

  useEffect(() => {
    const t = getQuery("tab");
    if (sections.some((x) => x.key === t)) setTab(t);
    // from the Courses list's "Upload course image": to the images, with their upload button focused (once the course has loaded)
    if (getQuery("focus") === "images") {
      setTab(sections[0].key);
      setQuery("focus", "");
      let tries = 0;
      const find = () => {
        const h = document.getElementById("rt-pws-ce-media-h");
        if (h) {
          h.scrollIntoView({ block: "center" });
          h.closest("section")?.querySelector(".rt-pws-course-mediabar button")?.focus({ preventScroll: true });
        } else if (tries++ < 40) setTimeout(find, 150);
      };
      find();
    }
    // just made by the new course steps, or copied by the Courses list's Duplicate course: say so (once; the address loses ?created
    // or ?copied so a reload doesn't say it again)
    const made = ["created", "copied"].find((k) => getQuery(k));
    if (made) {
      const message = made === "copied"
        ? "This is a copy, saved as a draft without its dates. Change what's different, then send it for approval."
        : "Draft created. Fill in each section, then send it for approval.";
      if (made === "copied") setToast({ message });
      setSaid(message);
      setQuery(made, "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- read the address once

  // the course as loaded again has its new status: show that
  useEffect(() => {
    setSent(false);
  }, [course?.status]);

  const dirty = Boolean(draft && base && !same(draft, base));
  // the course as loaded: the first time, or a newer version (another tab or a colleague) while nothing is unsaved here, fills
  // the draft; with unsaved edits they are kept, and their save is refused as out of date (the banner offers the latest). The
  // editor's own changes keep the version they returned (lib/courseEditorApi.js), so loading again after them changes nothing.
  useEffect(() => {
    if (!course) return;
    const fresh = loadedFor.current !== course.id;
    if (!fresh && (course.version === ep.seen() || dirty || seo.dirty)) return;
    loadedFor.current = course.id;
    const d = draftOf(course);
    setDraft(d);
    setBase(d);
    ep.setVersion(course.version);
  }, [course]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the course loads again; ep keeps its version in a ref
  // leaving with unsaved changes (a link, Back, closing the tab) asks first (lib/unsavedChanges.js)
  useUnsavedChanges(dirty);
  // the fields Continue said were missing: each message goes as soon as that field is filled in (a picture uploaded)
  const gapRef = useRef([]);
  useEffect(() => {
    if (!draft || !course || !gapRef.current.length) return;
    const still = stepGaps(draft, course, tab);
    const fixed = gapRef.current.filter((k) => !still[k]);
    if (!fixed.length) return;
    gapRef.current = gapRef.current.filter((k) => still[k]);
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !fixed.includes(k))));
  }, [draft, course]); // eslint-disable-line react-hooks/exhaustive-deps -- tab: a change of step clears the errors itself
  // a field's message from Save goes as soon as that field is changed (the next Save checks it again): an exam row's with its
  // rows, and the self-paced price's with its plan (one shows at a time, Flat or Tiered)
  const lastDraft = useRef(null);
  useEffect(() => {
    const before = lastDraft.current;
    lastDraft.current = draft;
    if (!before || !draft) return;
    const changed = Object.keys(draft).filter((k) => !same(draft[k], before[k]));
    if (!changed.length) return;
    const goes = (k) => changed.includes(k)
      || (changed.includes("exams") && /^(examUnit|passMark|examDuration|examAssessment)\d+$/.test(k))
      || ((changed.includes("price") || changed.includes("planId")) && (k === "price" || k === "planId"));
    // nothing to take away: no state change at all, or every keystroke would cost a second render, and fast typing chains those
    // into React's nested-update limit, which drops the letter being typed
    if (!Object.keys(errors).some(goes)) return;
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !goes(k))));
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps -- errors: read as they are when the draft changes

  if (!id || query.error?.data?.code === "NOT_FOUND" || (ep.admin && course && course.kind !== "shared")) return <EmptyState title="This course was not found" text={ep.admin ? "It may have been deleted. Only shared course pages are edited here." : "It may have been deleted, or it belongs to another provider."} action={back} />;
  if (query.error?.data?.code === "FORBIDDEN") return <EmptyState title="You can't open this course" text="Your role doesn't include courses. Ask an owner or admin if you need it." action={back} />;
  if (query.isError) return <ErrorState title="We couldn't load this course." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!course || !draft) return <Loading detail />;

  const status = sent ? "live" : course.status; // a shared page just published (a provider goes back to the course list)
  // sending for approval stays the provider's (ReadTraining staff working here see the status instead)
  const canSubmit = access.full && !ep.staff && (ep.admin ? status !== "live" : status === "draft" || status === "changes");
  const isLive = course.status === "live" || course.status === "paused";
  // the catalogue places it is filed under that are retired (a retired learning option has its own notice)
  const retiredPlaces = (course.retired || []).filter((e) => !e.endsWith("(learning option)"));
  // a course taught on dates can go live without one, but learners then have no date to book
  const noDates = course.kind === "provider" && waysOf(course, { open: true }).some(isDatedMethod) && !course.bookableCohorts;
  const ticks = sections.map((x) => ({ ...x, label: x.key === "pricing" ? pricingLabel(base.methods) : x.key === "review" ? (ep.admin ? "Review and publish" : "Review and send") : x.label, ok: x.key === "review" ? !stillNeeded(base, course).length : sectionOk(base, course, x.key) }));
  const steps = ticks.filter((x) => !x.optional && !x.final);
  // a step's status under its name, from what is saved: Complete (the learning options name themselves, the primary first, and the
  // performance model, which a new course starts as Bookings: "Classroom · Live online · Bookings"), "3 to add", No dates yet,
  // Optional
  const stepStatus = (x) => {
    if (x.key === "mode" && x.ok) return `${waysLabel({ ...base, closedMethods: course.closedMethods })} · ${pw.models[base.model]?.label || ""}`;
    if (x.key === "providers") return providersStatus(course.children || []);
    if (x.extras) return x.ok ? `${addedSections(course.guide, x.key).length} added` : "Optional";
    if (x.key === "review") return ready ? (ep.admin ? "Ready to publish" : "Ready to send") : `${needed.length} to add`;
    if (x.ok) return "Complete";
    if (x.optional) return "Optional";
    const n = x.key === "info" ? Math.max(0, 4 - base.outcomes.length) : Object.keys(stepGaps(base, course, x.key)).length;
    if (n) return `${n} to add`;
    // the dates still to add: none yet at all, or one way taught on dates still without one
    return x.key === "pricing" ? (course.bookableCohorts ? "Dates to add" : "No dates yet") : "";
  };
  const done = steps.filter((x) => x.ok).length;
  // the section before and after this one, for the bar under the form (Back, Save and continue)
  const at = sections.findIndex((x) => x.key === tab);
  const prev = ticks[at - 1];
  const next = ticks[at + 1];
  const needed = stillNeeded(draft, course);
  const ready = !needed.length;
  // a course being built (a draft, or one our team sent back) is a guided path: Back, Save, Continue, and Send for approval on
  // the last step. One already sent (in review, live, paused) is edited section by section from the list, with one Save.
  const building = course.status === "draft" || course.status === "changes";
  // every step but the last moves on with Continue; the last step's main button is Send for approval (Publish, for a shared page)
  const send = canSubmit && (building ? !next : true);
  // and once every required step is complete, from the steps list on the other steps too (never when something is missing: the
  // list already marks what is left, and the last step's button lists it)
  const sendFromList = canSubmit && building && Boolean(next) && ready;
  const errorAt = sendAt === "list" && sendFromList ? "list" : "bar";
  const unsaved = dirty || seo.dirty;
  const saving = ep.updating || seo.busy || guide.busy;
  const refresh = ep.refresh;

  // shows a save's errors: each in its section, the editor going to the first section that has one (staying on this one if it
  // has one too); one with no place of its own goes above the form
  const showErrors = (e, general = "") => {
    const stray = Object.keys(e).filter((k) => !sectionOf(k));
    const form = general || stray.map((k) => e[k])[0] || "";
    const hit = FORM_SECTIONS.filter((s) => Object.keys(e).some((k) => sectionOf(k) === s));
    const where = hit.includes(tab) ? tab : hit[0];
    if (where && where !== tab) changeTab(where);
    setErrors({ ...e, form });
    setSaid(form || Object.values(e)[0] || "");
    // a field's error: that field; one for the whole form (no field of its own): the message itself, brought into view
    const fieldErrors = Object.keys(e).some((k) => sectionOf(k));
    requestAnimationFrame(() => {
      if (fieldErrors) return focusFirstError(formRef.current);
      const msg = document.getElementById("rt-pws-ce-formerr");
      msg?.scrollIntoView({ block: "center" });
      msg?.focus({ preventScroll: true });
    });
  };
  // checks what the API would refuse, so the provider is shown the field, then saves what changed
  const save = async () => {
    const e = {};
    if (!draft.title.trim() || draft.title.trim().length < 3) e.title = "Enter a title of at least 3 characters.";
    else if (draft.title.trim().length > LIMITS.title && draft.title.trim() !== course.title) e.title = `Enter a title of ${LIMITS.title} characters or fewer.`;
    if (draft.price !== "" && !PRICE_RE.test(draft.price)) e.price = "Enter the price in pounds, like 95 or 95.50.";
    else if (draft.price !== "" && Number(draft.price) > MAX_PRICE) e.price = "Enter a price of £100,000 or less.";
    else if (draft.price !== "" && Number(draft.price) < 1) e.price = "Enter a price of at least £1.";
    // a live course offering self-paced shows its price (the API refuses it without one)
    else if (isLive && draft.methods.includes("self-paced") && draft.price === "" && !draft.planId) {
      e.price = "Enter the self-paced price: a live course offering self-paced needs one.";
      e.planId = "Choose a price plan: a live course offering self-paced needs a price.";
    }
    // a self-paced price that is saved isn't taken away by choosing Tiered without a plan, or by emptying the field
    else if (draft.methods.includes("self-paced") && base.methods.includes("self-paced") && draft.price === "" && !draft.planId && (base.price !== "" || base.planId)) {
      e.price = "Enter the self-paced price per learner, or choose a price plan.";
      e.planId = "Choose a price plan, or choose Flat and enter a price.";
    }
    // the same rule as the course page's player and the API (videoEmbed): one YouTube or Vimeo video that can actually play
    if (draft.videoUrl.trim() && !videoEmbed(draft.videoUrl.trim())) e.videoUrl = "Use a link to one YouTube or Vimeo video, starting https://.";
    draft.exams.forEach((x, i) => {
      if (!x.unit.trim()) e[`examUnit${i}`] = "Name this exam or unit, or remove the row.";
      const problem = x.passMark.trim() ? passMarkGap(x.passMark) || passMarkProblem(x.passMark) : "Choose how the exam is marked, and its pass mark.";
      if (problem) e[`passMark${i}`] = problem;
      if (!x.duration.trim()) e[`examDuration${i}`] = "Enter how long it takes, like 45 minutes.";
    });
    if (Object.keys(e).length) {
      showErrors(e);
      return false;
    }
    setErrors({});
    const clean = { ...draft, title: draft.title.trim(), summary: draft.summary.trim(), videoUrl: draft.videoUrl.trim() };
    const patch = changes(clean, base, access);
    if (!Object.keys(patch).length) {
      setDraft(clean);
      setBase(clean);
      return true;
    }
    try {
      const r = await ep.update(patch);
      // anything typed while it was saving stays (and stays unsaved); otherwise the draft takes the tidied values
      setDraft((current) => (current === draft ? clean : current));
      setBase(clean);
      refresh();
      const message = ep.staff ? (course.status === "live" ? "Saved. Learners see the change now, and the provider will be told." : "Saved. The provider will be told.") : r.pendingChange ? "Saved. Your changes go live once our team has checked them." : ep.admin && course.status === "live" ? "Saved. The page shows the changes now." : "Course saved.";
      setSaid(message);
      setToast({ message });
      return true;
    } catch (error) {
      if (isStale(error)) {
        // Refused as changed since this draft was loaded. If the course already holds exactly this change, it was this save
        // after all (sent, then the answer lost when the connection dropped, then sent again): nothing to warn about, so the
        // editor quietly takes the saved course.
        const fresh = await ep.fetch().catch(() => null);
        if (fresh && alreadySaved(patch, fresh, access)) {
          const d = draftOf(fresh);
          setDraft((current) => (current === draft ? d : current));
          setBase(d);
          ep.setVersion(fresh.version);
          refresh();
          setSaid("Course saved.");
          setToast({ message: "Course saved." });
          return true;
        }
        // changed in another tab or by someone else: nothing was saved; say so where it can't be missed, with a way to catch up
        setStale(true);
        setSaid(error.message);
        requestAnimationFrame(() => staleRef.current?.focus());
        return false;
      }
      const { fields, general } = errorsFrom(error);
      // the API's price is in pence; the editor's field is the price
      const { pricePence, ...rest } = fields;
      showErrors(pricePence ? { ...rest, price: pricePence } : rest, general);
      return false;
    }
  };
  // the bar's Save: the course's fields and the SEO step's (its own form, kept while another section is open), each only when changed
  const saveAll = async () => {
    if (dirty && !(await save())) return false;
    if (seo.dirty && !(await seoSave.current?.())) {
      if (tab !== "seo") changeTab("seo"); // its error shows on its own step
      return false;
    }
    return true;
  };
  // send for approval (a provider's course) or publish (a shared page), saving first if needed. Nothing is sent while something
  // required is missing (or the provider isn't approved yet): the box under the button says what to do, and gets the focus.
  const submit = async () => {
    setSubmitError("");
    if (needed.length) return setShowNeed(true);
    if (!(await saveAll())) return;
    try {
      if (ep.admin) await ep.setStatus("live");
      else await ep.submit();
      refresh();
      // a provider's course: back to the course list, which says it was sent
      if (!ep.admin) return leaveWithoutAsking(() => router.push("/provider/courses?sent=1"));
      setSent(true);
      const message = "Published. The page is live and providers can list their courses on it.";
      setSaid(message);
      setToast({ message });
    } catch (error) {
      // already sent (from another tab, or before this page caught up): nothing went wrong, so the same as sending
      if (!ep.admin && error?.data?.code === "CONFLICT" && /already waiting/i.test(error.message)) {
        refresh();
        return leaveWithoutAsking(() => router.push("/provider/courses?sent=1"));
      }
      if (ep.stale(error)) return;
      const message = errorText(error);
      setSubmitError(message);
      setSaid(message);
      requestAnimationFrame(() => needRef.current?.focus());
    }
  };
  const withdraw = async () => {
    setWithdrawing(false);
    try {
      await ep.discard();
      const fresh = await ep.fetch();
      const d = draftOf(fresh);
      setDraft(d);
      setBase(d);
      ep.setVersion(fresh.version);
      refresh();
      const message = "Your changes were withdrawn. The live version stays as it is.";
      setSaid(message);
      setToast({ message });
    } catch (error) {
      if (ep.stale(error)) return;
      const message = errorText(error);
      setSaid(message);
      setToast({ message, error: true });
    }
  };
  // Preview: the real course page for this course (/provider/courses/<id>/preview, or the shared page's under /admin), in a new tab.
  // It shows what is saved, so with unsaved changes it asks first. The tab is opened at the click (a tab opened after the save
  // finishes would be blocked as a pop-up) and pointed at the preview once the save is done.
  // `at`: a section's heading on the page (a shared page's optional section's "View on page"), opened at it
  const previewHref = ep.admin ? `/admin/catalogue/${course.id}/preview` : links.preview(course.id);
  const openPreview = (at = "") => {
    const href = at ? `${previewHref}#${at}` : previewHref;
    if (dirty) return setPreview(href);
    window.open(href, "_blank");
  };
  const saveAndPreview = async () => {
    const href = typeof preview === "string" ? preview : previewHref;
    const tab = window.open("", "_blank");
    const ok = await saveAll();
    setPreview(false);
    if (ok && tab) tab.location.href = href;
    else if (ok) window.open(href, "_blank");
    else tab?.close();
  };
  // load the course as it is now, in place of this draft (the person has copied what they wanted to keep)
  const loadLatest = async () => {
    setReloading(true);
    try {
      const fresh = await ep.fetch();
      const d = draftOf(fresh);
      setDraft(d);
      setBase(d);
      setErrors({});
      ep.setVersion(fresh.version);
      setStale(false);
      setLatest((x) => ({ n: x.n + 1, course: fresh }));
      guide.reset(fresh);
      refresh();
      setToast({ message: "Loaded the latest version. Make your change again, then save." });
      setSaid("Loaded the latest version. Make your change again, then save.");
    } catch {
      setToast({ message: "We couldn't load it. Check your connection, then try again.", error: true });
      setSaid("We couldn't load it. Check your connection, then try again.");
    } finally {
      setReloading(false);
    }
  };
  function changeTab(t, { scroll = false } = {}) {
    setTab(t);
    tabNow.current = t;
    // the bar under the form is shared by every step: a save still running shows on the new step as its buttons greyed out,
    // not as "Saving…" on a button that wasn't pressed there
    setPressed("");
    setErrors({});
    setQuery("tab", t === "landing" ? "" : t);
    if (!scroll) return;
    // the new section from its top, its heading focused (so a screen reader says where they are)
    requestAnimationFrame(() => {
      const box = formRef.current?.closest(".rt-pws-ce");
      if (box) window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
      const h = formRef.current?.querySelector("h2");
      if (h) {
        h.setAttribute("tabindex", "-1");
        h.focus({ preventScroll: true });
      }
    });
  }
  const goTo = async (x, { check = false } = {}) => {
    tabNow.current = tab;
    if (FORM_SECTIONS.includes(tab) && dirty && access.page && !(await save())) return;
    // the SEO step is its own form: "Save and continue" (and Previous) save it too
    if (tab === "seo" && seo.dirty && !(await seoSave.current?.())) return;
    // they went to another step while it saved: they stay there
    if (tabNow.current !== tab) return;
    const all = check && access.page ? stepGaps(draft, course, tab) : {};
    const mayFix = (k) => k === "dates" ? providerCan("provider.cohorts.edit") : access.full ? (k !== "price" && k !== "planId") || access.pricing : PAGE_FIELDS.includes(k) || k === "images";
    const gaps = Object.fromEntries(Object.entries(all).filter(([k]) => mayFix(k)));
    gapRef.current = Object.keys(gaps);
    if (gapRef.current.length) return showErrors(gaps);
    changeTab(x.key, { scroll: true });
  };
  // Learning options' "Stop new bookings" and "Take bookings again": saved at once (not with the draft). Stopping the primary makes
  // the API choose the next one taking bookings: the draft and what it is compared with take that primary, so nothing shows as
  // unsaved and the next save doesn't send the old one back. Returns "" when done, or what went wrong (shown in "Stop new bookings
  // for …?"): `{ message, retry }`, retry when the request didn't get an answer (try again), not when it was refused (the course
  // loads again, so the card shows where it stands).
  const setOptionOpen = async (method, open) => {
    try {
      const r = await ep.setOptionOpen(method, open);
      const follow = (d) => (d && d.method === method && r.method !== method ? { ...d, method: r.method } : d);
      setDraft(follow);
      setBase(follow);
      ep.patch({ method: r.method, closedMethods: r.closedMethods }); // the new state shows straight away
      refresh();
      const lo = pw.learningOptions.bookings;
      setSaid((open ? lo.reopened : lo.stopped)(methodName(method)));
      return "";
    } catch (error) {
      if (ep.stale(error)) return "";
      const message = errorText(error);
      setSaid(message);
      if (open) setToast({ message, error: true });
      if (error?.data) refresh();
      return { message, retry: !error?.data };
    }
  };
  const busy = ep.updating || ep.submitting;
  // a send the server refused: said under the Send for approval that was pressed
  const needError = <p className="rt-q__err rt-pws-ce__need" id="rt-pws-ce-need" tabIndex={-1} ref={needRef} role="alert"><span className="rt-sr">Error: </span>{submitError}</p>;
  const sectionProps = { course, draft, setDraft, errors, access };

  return (
    <CourseEndpoints.Provider value={ep}>
    <div className="rt-acc__stack rt-pws-cepage">
      <p className="rt-sr" aria-live="polite">{said}</p>
      <section className="rt-pws-ce__head" aria-label="Course">
        <div className="rt-pws-ce__headtext">
          <p className="rt-pws-ce__meta">
            <span title={status === "draft" ? (ep.admin ? SHARED_NOTES : STATUS_NOTES).draft : undefined}><Pill tone={COURSE_TONE[status]}>{pw.courseStatuses[status]}</Pill>{status === "draft" && <span className="rt-sr">: {(ep.admin ? SHARED_NOTES : STATUS_NOTES).draft}</span>}</span>
            <span>{ep.admin ? "Shared course page" : `${waysLabel(course)} · ${pw.models[course.model]?.label}`}</span>
          </p>
          {ep.admin && <h2 className="rt-acc__h2 rt-adm-hero__name">{course.title}</h2>}
          {/* the provider's own notes about where their course stands; ReadTraining staff editing it from the admin pages see the
              status pill only (they know what saving does, and these speak to the provider) */}
          {!ep.staff && <>
            {/* a course our team paused has its own note below (their reason, Contact us), never "put it back live yourself" */}
            {status !== "draft" && status !== "pending" && !(!ep.admin && (status === "paused" || status === "changes") && course.statusNote) && <p className="rt-acc__note">{(ep.admin ? SHARED_NOTES : STATUS_NOTES)[status]}</p>}
            {status === "changes" && course.statusNote && <p className="rt-acc__notice -warn"><b>What to change:</b> {course.statusNote}</p>}
            {course.parent && <p className="rt-acc__note">Listed on the shared course page <b>{course.parent.title}</b>.</p>}
            {!ep.admin && course.lastChange?.status === "rejected" && course.lastChange.note && !course.pendingChanges && <p className="rt-acc__notice -warn"><b>Your last change was not approved:</b> {course.lastChange.note}</p>}
            {!ep.admin && course.status === "paused" && course.statusNote && <p className="rt-acc__notice -warn"><b>Paused by our team:</b> {course.statusNote} Contact us to put it back live.</p>}
          </>}
          {isLive && retiredPlaces.length > 0 && <p className="rt-acc__notice -warn"><b>No longer offered on ReadTraining:</b> {retiredPlaces.join(", ")}. {ep.admin ? "Choose another and save." : "Choose another and save: once our team has approved the change, the course can be live again."}</p>}
          {isLive && retiredOnSale(course).length > 0 && <p className="rt-acc__notice -warn"><b>No longer offered on ReadTraining:</b> {retiredOnSale(course).map(methodName).join(", ")}. Turn {retiredOnSale(course).length === 1 ? "it" : "them"} off in Learning options and save.</p>}
          {!ep.admin && !ep.staff && isLive && noDates && <p className="rt-acc__note">{NO_DATES_NOTE}</p>}
        </div>
        <div className="rt-pws-ce__headactions">
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => openPreview()}>Preview<span className="rt-sr"> (opens in a new tab)</span></button>
          <button type="button" className="rt-pws-ce__gear" onClick={() => setGear(true)} aria-label="Course settings"><i className="icon-setting text-16" aria-hidden="true"></i></button>
        </div>
      </section>

      {stale && (
        <div className="rt-pws-ce__stale" role="alert" tabIndex={-1} ref={staleRef}>
          <div>
            <b>A newer version of this course was saved</b>
            <p>Someone else, or you in another tab, saved it after you opened it. Your changes here were not saved, so nothing was overwritten. Copy anything you want to keep, then load the newer version.</p>
          </div>
          <button type="button" className="button -sm -outline-dark-1 text-dark-1" onClick={loadLatest} disabled={reloading} aria-busy={reloading || undefined}>{reloading ? "Loading…" : "Load newer version"}</button>
        </div>
      )}
      {course.pendingChanges && (
        <section className="rt-acc__card rt-pws-ce__pending" aria-label="Changes waiting for approval">
          {ep.staff ? <p className="rt-acc__note"><b>The provider has changes waiting for approval.</b> Approve or turn them down in Admin › Approvals before you change this course.</p> : <p className="rt-acc__note"><b>Your changes are waiting for approval.</b> Learners see the live version until our team has checked them (saved {SAVED_AT.format(new Date(course.pendingChanges.since))}). You can keep editing: new changes join the same request.</p>}
          {access.page && !ep.staff && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setWithdrawing(true)} aria-haspopup="dialog" disabled={ep.discarding}>{ep.discarding ? "Withdrawing…" : "Withdraw changes"}</button>}
        </section>
      )}
      {!ep.admin && notApproved && <p className="rt-acc__notice">{pw.notApproved.text}</p>}

      <div className="rt-pws-ce">
        <nav className="rt-acc__card rt-pws-ce__nav rt-pill-scroll" aria-labelledby="rt-pws-ce-nav-h" tabIndex={-1} ref={navRef}>
          <h2 className="rt-adm-h3" id="rt-pws-ce-nav-h">{isLive ? (ep.admin ? "Page sections" : "Course sections") : ep.admin ? "Publish the page" : "Publish your course"}</h2>
          <div className="rt-pws-ce__progress">
            <p>{done === steps.length ? "Every required step is complete" : `${done} of ${steps.length} required steps complete`}</p>
            <div className="rt-pws-wiz__bar" aria-hidden="true"><span style={{ "--rt-wiz": `${(done / steps.length) * 100}%` }}></span></div>
          </div>
          {sendFromList && <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={async () => { setSendAt("list"); setPressed("send"); await submit(); setPressed(""); }} disabled={busy || saving || imagesBusy} aria-describedby={submitError && errorAt === "list" ? "rt-pws-ce-need" : undefined} aria-busy={(pressed === "send" && (busy || saving)) || undefined}><KeepWidth label={ep.admin ? "Publish" : "Send for approval"} busy={pressed === "send" && (busy || saving)} working={ep.admin ? "Publishing…" : "Sending…"} /></button>}
          {submitError && errorAt === "list" && needError}
          <ol className="rt-pws-ce__steps">
            {ticks.map((x) => (
              <li key={x.key}>
                <button type="button" className={`rt-pws-ce__step${tab === x.key ? " is-on" : ""}`} onClick={() => changeTab(x.key)} disabled={imagesBusy && tab !== x.key} aria-current={tab === x.key ? "step" : undefined}>
                  <span className={`rt-pws-course-tick${x.ok ? " is-ok" : ""}`} aria-hidden="true">{x.ok ? <i className="icon-check text-10"></i> : null}</span>
                  <span className="rt-pws-ce__steptext"><span>{x.label}</span><small className={`rt-pws-ce__stepstatus${!x.ok && !x.optional ? " -todo" : ""}`}><span className="rt-sr">: </span>{stepStatus(x)}</small></span>
                </button>
              </li>
            ))}
          </ol>
          <FilterScrollPill scrollRef={navRef} />
        </nav>

        <div className="rt-pws-ce__main" ref={formRef}>
          {errors.form && <p className="rt-q__err" id="rt-pws-ce-formerr" tabIndex={-1} role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
          {tab === "landing" && <LandingSection {...sectionProps} shared={ep.admin} onSaved={saved} onImagesBusy={setImagesBusy} />}
          {tab === "info" && <InfoSection {...sectionProps} />}
          {tab === "syllabus" && <SyllabusSection {...sectionProps} />}
          {/* a shared page's optional sections: under the landing page's and information's own fields, or the whole step */}
          {ep.admin && ["landing", "info", "after"].includes(tab) && <GuideExtras form={guide} step={tab} own={EXTRA_STEPS[tab]} onView={openPreview} pageTitle={course.title} />}
          {tab === "review" && <ReviewSection ticks={ticks.filter((x) => !x.final)} stepStatus={stepStatus} needed={needed} admin={ep.admin} guide={guide.saved} onChange={(key) => changeTab(key, { scroll: true })} />}
          {tab === "faqs" && <FaqSection {...sectionProps} />}
          {!ep.admin && tab === "mode" && <ModeSection {...sectionProps} onBookings={setOptionOpen} bookingsBusy={ep.settingOption} />}
          {!ep.admin && tab === "pricing" && <PricingSection {...sectionProps} onSaved={saved} saving={saving} />}
          {ep.admin && tab === "providers" && <ProvidersSection course={course} />}
          {/* kept open (hidden) on the other sections, so SEO words typed there aren't lost and the bar's Save saves them */}
          <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-seo-h" hidden={tab !== "seo"}>
            <h2 className="rt-acc__h2" id="rt-pws-ce-seo-h">SEO settings</h2>
            <p className="rt-acc__note">How the course page shows in Google and other search results.</p>
            <SeoPanel key={latest.n} course={latest.course || course} onSaved={saved} formId="rt-pws-ce-seo-form" onState={setSeo} saveRef={seoSave} />
          </section>
          {/* the bar: Previous on the left; Save, and Continue ("Save and continue" while something is unsaved) on the right. Each
              button keeps the width of its own label while it says "Saving…". Nothing to do there (a role that can only look, on a
              course past its building steps): no bar. */}
          {((building && (prev || next)) || access.page || send) && (
            <div className="rt-acc__card rt-pws-ce__bar">
              {building && prev ? <button type="button" className="button -md -outline-dark-1 text-dark-1 rt-pws-ce__back" onClick={() => goTo(prev)} disabled={busy || saving || imagesBusy}><i className="icon-arrow-left text-12" aria-hidden="true"></i><span className="rt-pws-ce__backname">Previous</span><span className="rt-sr">: {prev.label}</span></button> : <span></span>}
              <div className="rt-pws-ce__baractions">
                {access.page && <button type="button" className={`button -md ${(building && next) || send ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={async () => { setPressed("save"); await saveAll(); setPressed(""); }} disabled={busy || saving || imagesBusy || !unsaved} aria-busy={(pressed === "save" && saving) || undefined}><KeepWidth label="Save" busy={pressed === "save" && saving} working="Saving…" /></button>}
                {building && next && <button type="button" className="button -md -purple-1 text-white" onClick={async () => { setPressed("continue"); await goTo(next, { check: true }); setPressed(""); }} disabled={busy || saving || imagesBusy} aria-busy={(pressed === "continue" && saving) || undefined}><KeepWidth label={access.page && unsaved ? "Save and continue" : "Continue"} busy={pressed === "continue" && saving} working="Saving…" /><span className="rt-sr">: {next.label}</span></button>}
                {send && <button type="button" className={`button -md ${ready ? "-purple-1 text-white" : "-outline-purple-1 text-purple-1"}`} onClick={async () => { setSendAt("bar"); setPressed("send"); await submit(); setPressed(""); }} disabled={busy || saving || imagesBusy} aria-haspopup={ready ? undefined : "dialog"} aria-describedby={submitError && errorAt === "bar" ? "rt-pws-ce-need" : undefined} aria-busy={(pressed === "send" && (busy || saving)) || undefined}><KeepWidth label={ep.admin ? "Publish" : "Send for approval"} busy={pressed === "send" && (busy || saving)} working={ep.admin ? "Publishing…" : "Sending…"} /></button>}
              </div>
            </div>
          )}
          {submitError && errorAt === "bar" && needError}
        </div>
      </div>

      {ep.admin ? <SharedGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} /> : <CourseGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} onStale={() => { setGear(false); setStale(true); requestAnimationFrame(() => staleRef.current?.focus()); }} />}
      <Confirm danger open={withdrawing} onClose={() => setWithdrawing(false)} title="Withdraw your changes?" text={`The changes waiting for our team's approval are thrown away, and the live course stays as it is.${unsaved ? " What you haven't saved here goes too." : ""} This can't be undone.`} confirmLabel="Withdraw changes" onConfirm={withdraw} />
      <Sheet open={Boolean(preview)} onClose={() => setPreview(false)} title="Save your changes first?" closeLabel="Close">
        <div className="rt-q__form">
          <p className="rt-acc__note">The preview is the real course page, so it shows the course as saved. Save your changes to see them in it.</p>
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -purple-1 text-white" onClick={saveAndPreview} disabled={busy} aria-busy={ep.updating || undefined}>{ep.updating ? "Saving…" : "Save and preview"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => { const href = typeof preview === "string" ? preview : previewHref; setPreview(false); window.open(href, "_blank"); }}>Preview without them</button>
          </div>
        </div>
      </Sheet>
      <Sheet open={showNeed} onClose={() => setShowNeed(false)} title={ep.admin ? "Almost ready to publish" : "Almost ready to send"} closeLabel="Close" className="rt-pws-set__confirm">
        <div className="rt-q__form">
          <>
              <p className="rt-acc__note">{ep.admin ? "Add these, then publish the page:" : "Add these, then send the course for approval:"}</p>
              <ul className="rt-adm-list">
                {sections.filter((x) => needed.some((n) => n.section === x.key)).map((x) => (
                  <li key={x.key}>
                    <div>
                      <b>{x.key === "pricing" ? pricingLabel(draft.methods) : x.label}</b>
                      <small>{needed.filter((n) => n.section === x.key).map((n) => n.text.charAt(0).toUpperCase() + n.text.slice(1)).join(" · ")}</small>
                    </div>
                    <div className="rt-adm-list__side"><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setShowNeed(false); changeTab(x.key, { scroll: true }); }} >Go to step<span className="rt-sr">: {x.key === "pricing" ? pricingLabel(draft.methods) : x.label}</span></button></div>
                  </li>
                ))}
              </ul>
          </>
          <div className="rt-adm-cellrow"><button type="button" className="button -md -purple-1 text-white" onClick={() => setShowNeed(false)}>Keep editing</button></div>
        </div>
      </Sheet>
      <Toast toast={toast} onDone={clearToast} quiet />
    </div>
    </CourseEndpoints.Provider>
  );
}

// ---- Review --------------------------------------------------------------------------------------------------------------

// The last step of a course being built: every step at a glance (the side list's ticks and statuses, with what each still needs),
// a shared page's optional sections added or not. Add (a step with nothing in it yet, required or optional) or Change takes them to that step; the bar under it holds the one
// main button, Send for approval (Publish, for a shared page), which lists what is missing when something is.
function ReviewSection({ ticks, stepStatus, needed, admin, guide, onChange }) {
  const ready = !needed.length;
  return (
    <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-review-h">
      <h2 className="rt-acc__h2" id="rt-pws-ce-review-h">{admin ? "Review and publish" : "Review and send"}</h2>
      {ready
        ? <p className="rt-acc__notice -ok">{admin ? "Ready to publish." : "Ready to send."}</p>
        : <p className="rt-acc__notice -warn">{needed.length === 1 ? "1 thing to add" : `${needed.length} things to add`} before you {admin ? "publish" : "send"}.</p>}
      <h3 className="rt-adm-h3">Steps</h3>
      <ul className="rt-adm-list rt-pws-review">
        {ticks.map((x) => {
          const todo = needed.filter((n) => n.section === x.key);
          return (
            <li key={x.key}>
              <span className={`rt-pws-course-tick${x.ok ? " is-ok" : ""}`} aria-hidden="true">{x.ok ? <i className="icon-check text-10"></i> : null}</span>
              <div>
                <b>{x.label}</b>
                <small className={todo.length ? "rt-pws-review__todo" : undefined}>{todo.length ? todo.map((t) => t.text.charAt(0).toUpperCase() + t.text.slice(1)).join(" · ") : stepStatus(x)}</small>
              </div>
              <div className="rt-adm-list__side"><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => onChange(x.key)}>{todo.length || !x.ok ? "Add" : "Change"}<span className="rt-sr">: {x.label}</span></button></div>
            </li>
          );
        })}
      </ul>
      {admin && (
        <>
          <h3 className="rt-adm-h3">Optional sections</h3>
          <ul className="rt-adm-list rt-pws-review">
            {GUIDE_SECTIONS.map((x) => {
              const on = guide?.[x.key] !== undefined;
              const step = ticks.find((t) => t.key === x.step);
              return (
                <li key={x.key}>
                  <span className={`rt-pws-course-tick${on ? " is-ok" : ""}`} aria-hidden="true">{on ? <i className="icon-check text-10"></i> : null}</span>
                  <div><b>{x.label}</b><small>{on ? "Added" : "Not added"}{step ? ` · in ${step.label}` : ""}</small></div>
                  {step && <div className="rt-adm-list__side"><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => onChange(x.step)}>{on ? "Change" : "Add"}<span className="rt-sr">: {x.label}</span></button></div>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

// ---- shared parts ----------------------------------------------------------------------------------------------------------

// ---- A shared page's providers (admin only) ------------------------------------------------------------------------------------

// "2 live courses", under the tab's name
const providersStatus = (list) => {
  const live = list.filter((x) => x.status === "live").length;
  return live ? `${live} live ${live === 1 ? "course" : "courses"}` : "No live courses yet";
};

// What learners book on a shared page: the providers' courses on it, each with its learning options, its dates still to run (the
// next one) and its lowest price open to booking. A shared page has none of these of its own, so they are only shown here; each is
// changed on its own course (Edit course there, as staff), so this tab has nothing to save.
function ProvidersSection({ course }) {
  const link = useFromLink();
  const list = course.children || [];
  return (
    <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-prov-h">
      <h2 className="rt-acc__h2" id="rt-pws-ce-prov-h">Providers&apos; dates and prices</h2>
      <p className="rt-acc__note">This page has no learning options, dates or prices of its own: learners book the providers&apos; courses on it. Open a course to change its dates, prices or price plan.</p>
      {list.length ? (
        <div className="rt-adm-cp__tablewrap">
          <table className="rt-biz__table rt-adm-table rt-pws-ce__provs">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Learning options</th>
                <th scope="col">Dates</th>
                <th scope="col" className="rt-adm-num">From</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id}>
                  <td data-label="Course"><Link href={link(`/admin/catalogue/${x.id}`)} className="rt-adm-strong">{x.title}</Link><small className="rt-adm-muted">{x.provider}</small></td>
                  <td data-label="Learning options">{waysLabel(x) || "–"}</td>
                  <td data-label="Dates">{x.upcoming ? <>{x.upcoming} upcoming{x.nextOn && <small className="rt-adm-muted">Next: {shortDay(x.nextOn)}</small>}</> : waysOf(x).some(isDatedMethod) ? <span className="rt-adm-muted">None to come</span> : "–"}</td>
                  <td data-label="From" className="rt-adm-num-cell">{x.fromPence != null ? formatPrice(x.fromPence / 100) : <span className="rt-adm-muted">Nothing to book</span>}</td>
                  <td data-label="Status"><Pill tone={COURSE_TONE[x.status]}>{pw.courseStatuses[x.status]}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__note">No provider courses are listed on this page yet. A provider&apos;s course goes on it when our team approves it.</p>
      )}
    </section>
  );
}

// characters typed: "23 of 300", or while under a minimum "23 of at least 50" (a box with no real limit shows it only then)
function Counter({ value, max, min }) {
  const n = value.trim().length;
  if (min && n < min) return <span className="rt-field__hint rt-pws-course-count">{n} of at least {min}</span>;
  return max ? <span className="rt-field__hint rt-pws-course-count">{value.length} of {max}</span> : null;
}
const FieldErr = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);
const useSet = (setDraft) => (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));


// ---- Course landing page ---------------------------------------------------------------------------------------------------

function LandingSection({ course, draft, setDraft, errors, access, shared = false, onSaved, onImagesBusy }) {
  const set = useSet(setDraft);
  const subs = subcategoryOptions(draft.category);
  const topics = topicOptions(draft.category, draft.subcategory);
  // going back to the saved sub-category brings back its saved topic (a provider can't choose one: it would otherwise look changed)
  const saved = draftOf(course);
  const full = !access.full;
  const page = !access.page;

  return (
    <form className="rt-acc__card rt-pws-ce__groups" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-pws-course-form" aria-labelledby="rt-pws-ce-basics-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-basics-h">Course landing page</h2>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-title">Course title<Req /></label>
          <FieldErr id="rt-pws-ce-title" text={errors.title} />
          <input id="rt-pws-ce-title" value={draft.title} maxLength={LIMITS.title} onChange={(e) => set("title")(e.target.value)} disabled={page} placeholder="For example: Emergency First Aid at Work" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? "rt-pws-ce-title-e" : undefined} />
          <Counter value={draft.title} max={LIMITS.title} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-sub">Short description<Req /></label>
          <span className="rt-field__hint" id="rt-pws-ce-sub-h">Who it&apos;s for and what they get.</span>
          <FieldErr id="rt-pws-ce-sub" text={errors.summary} />
          <TextArea id="rt-pws-ce-sub" rows={2} value={draft.summary} maxLength={LIMITS.summary} onChange={(e) => set("summary")(e.target.value)} disabled={page} aria-invalid={errors.summary ? true : undefined} aria-describedby={`rt-pws-ce-sub-h${errors.summary ? " rt-pws-ce-sub-e" : ""}`} autoComplete="off" />
          <Counter value={draft.summary} max={LIMITS.summary} min={MIN.summary} />
        </div>
        <div className="rt-pws-course-grid3">
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-level">Course level<Req /></label>
            <FieldErr id="rt-pws-ce-level" text={errors.level} />
            <FieldSelect id="rt-pws-ce-level" label="Course level" placeholder="Choose a level" value={draft.level} onChange={set("level")} options={levelOptions()} disabled={full} invalid={Boolean(errors.level)} describedBy={errors.level ? "rt-pws-ce-level-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-cat">Course category<Req /></label>
            <FieldErr id="rt-pws-ce-cat" text={errors.category} />
            <FieldSelect id="rt-pws-ce-cat" label="Course category" placeholder="Choose a category" value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v, subcategory: "", topic: "" }))} options={categoryOptions()} disabled={full} invalid={Boolean(errors.category)} describedBy={errors.category ? "rt-pws-ce-cat-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-subcat">Course sub-category<Req /></label>
            <FieldErr id="rt-pws-ce-subcat" text={errors.subcategory} />
            <FieldSelect id="rt-pws-ce-subcat" label="Course sub-category" placeholder={draft.category ? "Choose a sub-category" : "Choose a category first"} value={draft.subcategory} onChange={(v) => setDraft((d) => ({ ...d, subcategory: v, topic: d.category === saved.category && v === saved.subcategory ? saved.topic : "" }))} options={subs} disabled={full || !draft.category} invalid={Boolean(errors.subcategory)} describedBy={errors.subcategory ? "rt-pws-ce-subcat-e" : undefined} />
          </div>
          {/* the topic: ReadTraining's choice (a shared page, staff). A provider's course gets it from our team when they approve it
              (admin.courses.decide), so a provider never sees the field */}
          {access.topic && (
            <div className="rt-field">
              <label htmlFor="rt-pws-ce-topic">Course topic</label>
              <FieldErr id="rt-pws-ce-topic" text={errors.topic} />
              <FieldSelect id="rt-pws-ce-topic" label="Course topic" placeholder={!draft.subcategory ? "Choose a sub-category first" : topics.length ? "Choose a topic" : "No topics for this sub-category"} value={draft.topic} onChange={set("topic")} options={topics} disabled={full || !topics.length} invalid={Boolean(errors.topic)} describedBy={errors.topic ? "rt-pws-ce-topic-e" : undefined} />
            </div>
          )}
        </div>
        <CardChoice name="rt-pws-ce-compliance" legend={<>{pw.compliance.legend}<Req /></>} value={draft.compliance === null ? "" : draft.compliance ? "yes" : "no"}
          onChange={(v) => !full && set("compliance")(v === "yes")} options={pw.compliance.options.map((o) => ({ ...o, disabled: full }))} error={errors.compliance} />
        {shared && <p className="rt-acc__note">{pw.compliance.sharedHint}</p>}
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-details">Course description<Req /></label>
          <span className="rt-field__hint" id="rt-pws-ce-details-h">What it covers and how it&apos;s taught and assessed.</span>
          <FieldErr id="rt-pws-ce-details" text={errors.description} />
          <TextArea id="rt-pws-ce-details" rows={8} maxLength={10000} value={draft.description} onChange={(e) => set("description")(e.target.value)} disabled={page} aria-invalid={errors.description ? true : undefined} aria-describedby={`rt-pws-ce-details-h${errors.description ? " rt-pws-ce-details-e" : ""}`} autoComplete="off" />
          <Counter value={draft.description} min={MIN.description} />
        </div>
      </section>

      <ImagesCard course={course} disabled={page} onSaved={onSaved} required={errors.images} onBusy={onImagesBusy} />

      <section className="rt-pws-course-form" aria-labelledby="rt-pws-ce-video-h">
        <h3 className="rt-adm-h3" id="rt-pws-ce-video-h">Overview video</h3>
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

// The course's images, uploaded straight away (not part of the draft) and shown in order; the first is the cover. Every change shows on screen at once, before the server answers: a chosen picture appears straight away
// (marked "Uploading…") and becomes the saved image when the upload finishes; a removed image goes, and a new cover moves first,
// the moment they are asked for. If the server refuses, the list goes back to how it was (unsaved ALT text kept) and says why. The course then loads again in the
// background. An upload and an ALT text save show their own label while they run (Uploading…, Saving…); every button waits while
// one change is saving, and Remove asks first.
function ImagesCard({ course, disabled, onSaved, required, onBusy }) {
  const ep = useEndpoints();
  const [list, setList] = useState(course.images);
  // what is running: null, "upload", "alt", "remove" or "cover"
  const [action, setAction] = useState(null);
  const [removing, setRemoving] = useState(null); // the image waiting for "Remove this image?"
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  // the saved list (what the server holds), kept in step with the course as it loads again
  const [saved, setSaved] = useState(course.images);
  // a change still saving: a reload that arrives meanwhile is an older copy, so it is left out (the one after the save follows)
  const runningRef = useRef(false);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  useEffect(() => {
    if (runningRef.current) return;
    // the course as loaded again, keeping what is still being typed (ALT text not saved yet) and a picture still uploading
    setList((cur) => [
      ...course.images.map((img) => {
        const mine = cur.find((c) => c.id === img.id);
        const was = savedRef.current.find((c) => c.id === img.id);
        const next = mine && was && (mine.alt || "") !== (was.alt || "") ? { ...img, alt: mine.alt } : img;
        // a picture just uploaded keeps showing from the file until its saved copy has loaded (see onFile)
        return mine?.url?.startsWith("blob:") ? { ...next, url: mine.url } : next;
      }),
      ...cur.filter((i) => i.uploading),
    ]);
    setSaved(course.images);
  }, [course.images]);
  const busy = Boolean(action);
  runningRef.current = busy;
  // the editor's buttons and steps wait while a picture change runs (and stop waiting if the card closes)
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);
  useEffect(() => () => onBusy?.(false), [onBusy]);
  const shown = list.filter((i) => !i.uploading);
  const changed = !same(shown.map((i) => [i.id, i.alt]), saved.map((i) => [i.id, i.alt]));
  useUnsavedChanges(changed && !disabled); // ALT text typed but not saved
  const refresh = ep.refresh;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (saved.length >= 10) return setError("A course can have up to 10 images. Remove one first.");
    setError("");
    // it counts as uploading from the moment it is chosen (making a big picture smaller takes a moment too)
    setAction("upload");
    let picture;
    try {
      picture = await prepareImage(file, "course");
    } catch (err) {
      setAction(null);
      return setError(err.message);
    }
    // the chosen picture shows at once, from the file itself, until the saved one replaces it
    const temp = { id: `uploading-${Date.now()}`, url: URL.createObjectURL(picture.blob), alt: "", uploading: true };
    setList((x) => [...x, temp]);
    const drop = () => {
      setList((x) => x.filter((i) => i.id !== temp.id));
      URL.revokeObjectURL(temp.url);
    };
    try {
      const { path, token } = await ep.uploadUrl(picture.type);
      const { error: upError } = await getSupabase().storage.from("course-media").uploadToSignedUrl(path, token, picture.blob, { contentType: picture.type });
      if (upError) throw new Error("The picture didn't upload. Please try again.");
      const added = await ep.addImage(path);
      // saved: it counts as saved now, and keeps showing the chosen picture until the saved copy has loaded (no blank box), then
      // takes the saved copy's address; the course loads again in the background
      const image = { id: added.id, url: added.url, alt: "" };
      setSaved((x) => [...x, image]);
      setList((x) => x.map((i) => (i.id === temp.id ? { ...image, url: temp.url } : i)));
      refresh();
      onSaved("Image added", { shown: true });
      whenLoaded(added.url).then(() => {
        setList((x) => x.map((i) => (i.id === image.id && i.url === temp.url ? { ...i, url: added.url } : i)));
        URL.revokeObjectURL(temp.url);
      });
    } catch (err) {
      drop();
      if (ep.stale(err)) return; // changed somewhere else: the editor's banner says so, with a way to load the latest version
      setError(err?.data ? errorText(err) : err.message || "The image didn't upload. Please try again.");
    } finally {
      setAction(null);
    }
  };
  // the list as asked for shows at once; if the server refuses, it goes back to how it was (any ALT text still being typed kept,
  // not wiped back to the saved words) and says why
  const saveList = async (next, message, running) => {
    setError("");
    setAction(running);
    const before = list;
    setList(next);
    try {
      await ep.setImages(next.map((i) => ({ id: i.id, alt: i.alt || "" })));
      setSaved(next);
      refresh();
      onSaved(message, { shown: true });
      return true;
    } catch (err) {
      setList(before);
      if (!ep.stale(err)) setError(errorText(err));
      return false;
    } finally {
      setAction(null);
    }
  };
  const doRemove = () => {
    const m = removing;
    setRemoving(null);
    saveList(shown.filter((x) => x.id !== m.id), "Image removed", "remove");
  };
  // the only image of a live (or paused) course can't go: the server refuses it, so the question says so instead
  const lastOfLive = shown.length === 1 && (course.status === "live" || course.status === "paused");

  return (
    <section className="rt-pws-course-form" aria-labelledby="rt-pws-ce-media-h" aria-busy={busy || undefined}>
      <h3 className="rt-adm-h3" id="rt-pws-ce-media-h">Course images<Req /></h3>
      {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      {required && !list.length && !error && <p className="rt-q__err"><span className="rt-sr">Error: </span>{required}</p>}
      {!disabled && (
        <div className="rt-pws-course-mediabar">
          <input ref={fileRef} type="file" accept={acceptFor("course")} className="rt-sr" id="rt-pws-ce-file" onChange={onFile} tabIndex={-1} aria-hidden="true" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()} disabled={busy || saved.length >= 10}>{action === "upload" ? "Uploading…" : "Upload course image"}</button>
          <span className="rt-field__hint">{saved.length >= 10 ? "A course can have up to 10 images. Remove one to add another." : shortHintFor("course")}</span>
        </div>
      )}
      {list.length ? (
        <>
          <ul className="rt-pws-course-media">
            {list.map((m, i) => (
              <li key={m.id} className={`rt-pws-course-mediaitem${m.uploading ? " is-uploading" : ""}`} aria-busy={m.uploading || undefined}>
                <img src={m.url} alt="" />
                {m.uploading ? (
                  <div className="rt-pws-course-mediabody"><Pill tone="info">Uploading…</Pill></div>
                ) : (
                <div className="rt-pws-course-mediabody">
                  <div className="rt-pws-course-mediahead">
                    {i === 0 ? <Pill tone="info">Cover</Pill> : !disabled ? <button type="button" className="fb-textlink rt-pws-course-linkbtn" disabled={busy} onClick={() => saveList([m, ...shown.filter((x) => x.id !== m.id)], "Cover image changed", "cover")}>Make cover</button> : <span></span>}
                    {!disabled && <button type="button" className="rt-pws-ce__iconbtn -danger" disabled={busy} onClick={() => setRemoving(m)} aria-haspopup="dialog" aria-label={`Remove image ${i + 1}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>}
                  </div>
                  <div className="rt-field">
                    <label htmlFor={`rt-pws-ce-alt-${i}`}>Alt text</label>
                    <span className="rt-field__hint">What the picture shows, for people who can&apos;t see it.</span>
                    <input id={`rt-pws-ce-alt-${i}`} value={m.alt || ""} maxLength={140} disabled={disabled} onChange={(e) => setList(list.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} onBlur={() => changed && !busy && saveList(shown, "Alt text saved", "alt")} placeholder="For example: learners practising CPR on a manikin" autoComplete="off" />
                  </div>
                </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : <EmptyState inCard title="No images yet" />}

      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={lastOfLive ? "This image can't be removed yet" : "Remove this image?"} closeLabel="Close" noClose>
        {removing && (
          <div className="rt-q__form">
            <img src={removing.url} alt="" className="rt-pws-course-removeimg" />
            {lastOfLive ? (
              <p className="rt-acc__note">A live course needs at least one image. Upload another, then remove this one.</p>
            ) : (
              <p className="rt-acc__note">The image is removed from the course and can’t be restored. {shown[0]?.id === removing.id && shown.length > 1 ? "The next image becomes the cover." : shown.length === 1 ? "The course then has no image, and needs one before it can be sent for approval." : ""}</p>
            )}
            <div className="rt-adm-cellrow">
              {!lastOfLive && <button type="button" className="button -md -outline-red-3 text-red-3" onClick={doRemove} disabled={busy}>Remove image</button>}
              <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setRemoving(null)}>{lastOfLive ? "OK" : "Cancel"}</button>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}

// ---- Course information ----------------------------------------------------------------------------------------------------

function InfoSection({ draft, setDraft, access, errors }) {
  const set = useSet(setDraft);
  const page = !access.page;
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-learn-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-learn-h">Course information</h2>
        <LineList id="rt-pws-ce-feature" label="Course features" hint={`Short facts shown as tags, like "1 day" or "Certificate valid 3 years". Press Enter or type a comma to add. Up to ${MOST.features}.`} items={draft.features} onChange={set("features")} max={LIMITS.feature} most={MOST.features} commas disabled={page} error={errors.features} />
        <LineList id="rt-pws-ce-obj" label={<>What will learners learn?<Req /></>} hint={`Add at least 4 (up to ${MOST.outcomes}), each starting with a verb. Press Enter to add. ${draft.outcomes.length} added${draft.outcomes.length < 4 ? `, ${4 - draft.outcomes.length} more to reach 4` : ""}.`} items={draft.outcomes} onChange={set("outcomes")} max={LIMITS.outcome} most={MOST.outcomes} placeholder="For example: Give CPR to an adult" ordered disabled={page} error={errors.outcomes} />
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-aud">Who is it for?</label>
          <span className="rt-field__hint" id="rt-pws-ce-aud-h">The people and jobs the course suits.</span>
          <FieldErr id="rt-pws-ce-aud" text={errors.audience} />
          <TextArea id="rt-pws-ce-aud" rows={3} maxLength={2000} value={draft.audience} onChange={(e) => set("audience")(e.target.value)} disabled={page} aria-invalid={errors.audience ? true : undefined} aria-describedby={`rt-pws-ce-aud-h${errors.audience ? " rt-pws-ce-aud-e" : ""}`} autoComplete="off" />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-req">Entry requirements</label>
          <span className="rt-field__hint" id="rt-pws-ce-req-h">What learners need before they book, like an age, ID or an earlier qualification. Lines starting with "- " show as a list. Leave it empty if there are none.</span>
          <FieldErr id="rt-pws-ce-req" text={errors.entryRequirements} />
          <TextArea id="rt-pws-ce-req" rows={3} maxLength={2000} value={draft.entryRequirements} onChange={(e) => set("entryRequirements")(e.target.value)} disabled={page} aria-invalid={errors.entryRequirements ? true : undefined} aria-describedby={`rt-pws-ce-req-h${errors.entryRequirements ? " rt-pws-ce-req-e" : ""}`} autoComplete="off" />
        </div>
      </section>
    </form>
  );
}

// ---- Syllabus and exam -----------------------------------------------------------------------------------------------------

function SyllabusSection({ draft, setDraft, access, errors = {} }) {
  const set = useSet(setDraft);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  // a unit or exam row with something in it is removed only after "Remove this …?" (an empty new row goes at once)
  const [removing, setRemoving] = useState(null); // { list: "units" | "exams", index, name }
  const askRemove = (list, index, name, empty) => (empty ? set(list)(draft[list].filter((_, j) => j !== index)) : setRemoving({ list, index, name }));
  const locked = !access.full;
  // the keyboard follows the moved unit: its same arrow, or the other one at the top or bottom of the list
  const move = (i, by, e) => {
    const list = e?.currentTarget.closest("ol");
    const next = [...draft.units];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    set("units")(next);
    requestAnimationFrame(() => {
      const [up, down] = list?.children[i + by]?.querySelectorAll("button") || [];
      const same = by < 0 ? up : down;
      (same && !same.disabled ? same : by < 0 ? down : up)?.focus();
    });
  };
  const setExam = (i, patch) => set("exams")(draft.exams.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <form className="rt-acc__card rt-pws-ce__groups" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-pws-course-form" aria-labelledby="rt-pws-ce-units-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-units-h">Syllabus</h2>
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setEditing(null); setSheet(true); }} disabled={draft.units.length >= MOST.units}>Add unit</button>}
        </div>
        {draft.units.length >= MOST.units && <p className="rt-acc__note">{`That's the most a course can have (${MOST.units}): remove one to add another.`}</p>}
        {draft.units.length > 0 && (
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-sylintro">Syllabus introduction</label>
          <span className="rt-field__hint" id="rt-pws-ce-sylintro-h">Optional.</span>
          <FieldErr id="rt-pws-ce-sylintro" text={errors.syllabusIntro} />
          <TextArea id="rt-pws-ce-sylintro" className="rt-pws-ce__line" rows={2} maxLength={600} value={draft.syllabusIntro} onChange={(e) => set("syllabusIntro")(e.target.value)} disabled={locked} aria-invalid={errors.syllabusIntro ? true : undefined} aria-describedby={`rt-pws-ce-sylintro-h${errors.syllabusIntro ? " rt-pws-ce-sylintro-e" : ""}`} autoComplete="off" />
        </div>
        )}
        <FieldErr id="rt-pws-ce-units" text={errors.units} />
        {draft.units.length ? (
          <ol className="rt-adm-list">
            {draft.units.map((u, i) => (
              <li key={`${u.title}-${i}`}>
                <div><b>{i + 1}. {u.title}</b>{u.body && <small className="rt-pws-ce__unitbody">{u.body}</small>}</div>
                {!locked && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={(e) => move(i, -1, e)} disabled={i === 0} aria-label={`Move up: ${u.title}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={(e) => move(i, 1, e)} disabled={i === draft.units.length - 1} aria-label={`Move down: ${u.title}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => { setEditing(i); setSheet(true); }} aria-label={`Edit: ${u.title}`} title="Edit"><i className="icon-edit text-14" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => askRemove("units", i, u.title || `unit ${i + 1}`, !u.title && !u.body)} aria-haspopup="dialog" aria-label={`Remove: ${u.title}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : <EmptyState inCard title="No units yet" text={errors.units ? undefined : "A course needs at least one before it can be sent for approval."} />}
      </section>

      <section className="rt-pws-course-form" aria-labelledby="rt-pws-ce-exam-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h3 className="rt-adm-h3" id="rt-pws-ce-exam-h">Exam and assessment</h3>
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => set("exams")([...draft.exams, { unit: "", passMark: "", duration: "", assessment: "" }])} disabled={draft.exams.length >= MOST.exams}>Add exam</button>}
        </div>
        <p className="rt-acc__note">One row per paper or practical. Leave it empty if there is no exam.{draft.exams.length >= MOST.exams ? ` That's the most a course can have (${MOST.exams} rows).` : ""}</p>
        {(draft.exams.length > 0 || draft.examsIntro) && (
          <div className="rt-field">
            <label htmlFor="rt-pws-ce-exintro">Assessment introduction</label>
            <span className="rt-field__hint" id="rt-pws-ce-exintro-h">Optional.</span>
            <FieldErr id="rt-pws-ce-exintro" text={errors.examsIntro} />
            <TextArea id="rt-pws-ce-exintro" className="rt-pws-ce__line" rows={2} maxLength={1200} value={draft.examsIntro} onChange={(e) => set("examsIntro")(e.target.value)} disabled={locked} aria-invalid={errors.examsIntro ? true : undefined} aria-describedby={`rt-pws-ce-exintro-h${errors.examsIntro ? " rt-pws-ce-exintro-e" : ""}`} autoComplete="off" />
          </div>
        )}
        <FieldErr id="rt-pws-ce-exams" text={errors.exams} />
        {draft.exams.length ? (
          <ol className="rt-pws-ce__exams">
            {draft.exams.map((e, i) => (
              <li key={i} className="rt-pws-ce__exam">
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-u${i}`}>Exam or unit<Req /></label>
                  <FieldErr id={`rt-pws-ce-ex-u${i}`} text={errors[`examUnit${i}`]} />
                  <input id={`rt-pws-ce-ex-u${i}`} value={e.unit} maxLength={120} onChange={(ev) => setExam(i, { unit: ev.target.value })} disabled={locked} placeholder="For example: Multiple choice paper" autoComplete="off" aria-invalid={errors[`examUnit${i}`] ? true : undefined} aria-describedby={errors[`examUnit${i}`] ? `rt-pws-ce-ex-u${i}-e` : undefined} />
                </div>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-d${i}`}>Duration<Req /></label>
                  <FieldErr id={`rt-pws-ce-ex-d${i}`} text={errors[`examDuration${i}`]} />
                  <input id={`rt-pws-ce-ex-d${i}`} value={e.duration} maxLength={40} onChange={(ev) => setExam(i, { duration: ev.target.value })} disabled={locked} placeholder="45 minutes" autoComplete="off" aria-invalid={errors[`examDuration${i}`] ? true : undefined} aria-describedby={errors[`examDuration${i}`] ? `rt-pws-ce-ex-d${i}-e` : undefined} />
                </div>
                {!locked && <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => askRemove("exams", i, e.unit || `exam row ${i + 1}`, !e.unit && !e.passMark && !e.duration && !e.assessment)} aria-haspopup="dialog" aria-label={`Remove exam row ${i + 1}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>}
                <PassMarkField id={`rt-pws-ce-ex-p${i}`} value={e.passMark} onChange={(v) => setExam(i, { passMark: v })} disabled={locked} error={errors[`passMark${i}`]} />
                <div className="rt-field rt-pws-ce__exam-wide">
                  <label htmlFor={`rt-pws-ce-ex-a${i}`}>Assessment</label>
                  {i === 0 && <span className="rt-field__hint" id="rt-pws-ce-ex-a-h">Optional, like 72 multiple-choice questions.</span>}
                  <FieldErr id={`rt-pws-ce-ex-a${i}`} text={errors[`examAssessment${i}`]} />
                  <input id={`rt-pws-ce-ex-a${i}`} value={e.assessment} maxLength={120} onChange={(ev) => setExam(i, { assessment: ev.target.value })} disabled={locked} placeholder={i === 0 ? undefined : "Optional"} autoComplete="off" aria-invalid={errors[`examAssessment${i}`] ? true : undefined} aria-describedby={[draft.exams.length && "rt-pws-ce-ex-a-h", errors[`examAssessment${i}`] && `rt-pws-ce-ex-a${i}-e`].filter(Boolean).join(" ") || undefined} />
                </div>
              </li>
            ))}
          </ol>
        ) : <EmptyState inCard title="No exam on this course" />}
      </section>

      <UnitSheet open={sheet} onClose={() => setSheet(false)} unit={editing === null ? null : draft.units[editing]} room={MOST.units - draft.units.length} onSave={(rows) => {
        if (editing === null) set("units")([...draft.units, ...rows]);
        else set("units")(draft.units.map((u, i) => (i === editing ? rows[0] : u)));
        setSheet(false);
      }} />
      <Confirm danger open={Boolean(removing)} onClose={() => setRemoving(null)} title={removing?.list === "exams" ? "Remove this exam row?" : "Remove this unit?"} text={removing ? `“${removing.name}” comes out of the syllabus when you save the course. Until then you can leave without saving to keep it.` : ""} confirmLabel={removing?.list === "exams" ? "Remove row" : "Remove unit"} onConfirm={() => { const r = removing; setRemoving(null); set(r.list)(draft[r.list].filter((_, j) => j !== r.index)); }} />
    </form>
  );
}

// Add one or more units (a title and what it covers), or edit one. `room`: how many more units the course can take.
function UnitSheet({ open, onClose, unit, room, onSave }) {
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
  const typed = JSON.stringify(rows) !== JSON.stringify([unit ? { ...unit } : { title: "", body: "" }]);
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
    <Sheet open={open} onClose={onClose} title={unit ? "Edit unit" : "Add units"} closeLabel="Close" unsaved={typed}>
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <p className="rt-acc__note">A title for each unit, and what it covers: one topic per line.</p>
        {rows.map((r, i) => (
          <fieldset key={i} className="rt-pws-course-repeat">
            <legend>Unit {i + 1}</legend>
            <div className="rt-field">
              <label htmlFor={`rt-pws-cu-t${i}`}>Unit title<Req /></label>
              {errors[`t${i}`] && <p className="rt-q__err" id={`rt-pws-cu-t${i}-e`}><span className="rt-sr">Error: </span>{errors[`t${i}`]}</p>}
              <input id={`rt-pws-cu-t${i}`} value={r.title} maxLength={120} onChange={(e) => change(i, "title", e.target.value)} placeholder="For example: Life-saving skills" aria-invalid={errors[`t${i}`] ? true : undefined} aria-describedby={errors[`t${i}`] ? `rt-pws-cu-t${i}-e` : undefined} autoComplete="off" />
            </div>
            <div className="rt-field">
              <label htmlFor={`rt-pws-cu-b${i}`}>What it covers</label>
              <TextArea id={`rt-pws-cu-b${i}`} rows={4} value={r.body} maxLength={2000} onChange={(e) => change(i, "body", e.target.value)} autoComplete="off" />
            </div>
            {rows.length > 1 && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove unit {i + 1}</button>}
          </fieldset>
        ))}
        {!unit && (rows.length < room ? <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setRows((x) => [...x, { title: "", body: "" }])}>Add another</button> : <p className="rt-acc__note">That fills the syllabus: a course can have up to {MOST.units} units.</p>)}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{unit ? "Update unit" : rows.length > 1 ? "Add units" : "Add unit"}</button>
      </form>
    </Sheet>
  );
}

// ---- FAQs ------------------------------------------------------------------------------------------------------------------

// The course's own questions and answers, written for this course only (the brief: never one block copied across courses).
function FaqSection({ draft, setDraft, access, errors }) {
  const set = useSet(setDraft);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = a new one, a number = that FAQ
  const [removing, setRemoving] = useState(null); // the FAQ waiting for "Remove this question?": { index, name }
  const locked = !access.full;
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-faqs-h">
        <div className="rt-acc__cardhead rt-pws-course-cardhead">
          <h2 className="rt-acc__h2" id="rt-pws-ce-faqs-h">FAQs</h2>
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(null)} disabled={draft.faqs.length >= MOST.faqs}>Add FAQ</button>}
        </div>
        {draft.faqs.length >= MOST.faqs && <p className="rt-acc__note">{`That's the most a course can have (${MOST.faqs}).`}</p>}
        <FieldErr id="rt-pws-ce-faqs" text={errors.faqs} />
        {draft.faqs.length ? (
          <ul className="rt-adm-list">
            {draft.faqs.map((f, i) => (
              <li key={`${f.question}-${i}`}>
                <div><b>{f.question}</b><small>{f.answer}</small></div>
                {!locked && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => setEditing(i)} aria-label={`Edit: ${f.question}`} title="Edit"><i className="icon-edit text-14" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => setRemoving({ index: i, name: f.question })} aria-haspopup="dialog" aria-label={`Remove: ${f.question}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <EmptyState inCard title="No FAQs on this course yet" />}
      </section>
      <FaqSheet open={editing !== undefined} onClose={() => setEditing(undefined)} faq={typeof editing === "number" ? draft.faqs[editing] : null} onSave={(f) => {
        set("faqs")(typeof editing === "number" ? draft.faqs.map((x, i) => (i === editing ? f : x)) : [...draft.faqs, f]);
        setEditing(undefined);
      }} />
      <Confirm danger open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove this question?" text={removing ? `“${removing.name}” comes off the course's FAQs when you save the course.` : ""} confirmLabel="Remove question" onConfirm={() => { const r = removing; setRemoving(null); set("faqs")(draft.faqs.filter((_, j) => j !== r.index)); }} />
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
  const typed = JSON.stringify(f) !== JSON.stringify(faq ? { ...faq } : { question: "", answer: "" });
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
    <Sheet open={open} onClose={onClose} title={faq ? "Edit FAQ" : "Add FAQ"} closeLabel="Close" unsaved={typed}>
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <div className="rt-field">
          <label htmlFor="rt-pws-cf-q">Question<Req /></label>
          {errors.q && <p className="rt-q__err" id="rt-pws-cf-q-e"><span className="rt-sr">Error: </span>{errors.q}</p>}
          <input id="rt-pws-cf-q" value={f.question} maxLength={160} onChange={(e) => setF({ ...f, question: e.target.value })} aria-invalid={errors.q ? true : undefined} aria-describedby={errors.q ? "rt-pws-cf-q-e" : undefined} autoComplete="off" />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-cf-a">Answer<Req /></label>
          {errors.a && <p className="rt-q__err" id="rt-pws-cf-a-e"><span className="rt-sr">Error: </span>{errors.a}</p>}
          <TextArea id="rt-pws-cf-a" rows={5} value={f.answer} maxLength={1200} onChange={(e) => setF({ ...f, answer: e.target.value })} aria-invalid={errors.a ? true : undefined} aria-describedby={errors.a ? "rt-pws-cf-a-e" : undefined} autoComplete="off" />
        </div>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{faq ? "Update FAQ" : "Add FAQ"}</button>
      </form>
    </Sheet>
  );
}

// ---- Course pricing --------------------------------------------------------------------------------------------------------

// Skill Saver, and the prices: the self-paced option has one price or a price plan; classroom and live online are priced on each
// date, so this step holds the course's dates (Create cohort opens the same form as the Cohorts page). The self-paced price saves
// with the learning options (a live course turning self-paced on needs one); the dates follow the options as saved.
// Prices include VAT and change straight away, even on a live course.
function PricingSection({ draft, setDraft, errors, access, course, onSaved, saving = false }) {
  const links = useWorkspaceLinks();
  const link = useFromLink();
  const set = useSet(setDraft);
  const locked = !access.pricing;
  const { organisationId, can } = useProviderAccess();
  const [adding, setAdding] = useState(false);
  const ep = useEndpoints();
  const selfPaced = draft.methods.includes("self-paced");
  const dated = draft.methods.filter(isDatedMethod);
  const savedDated = LEARNING_OPTIONS.filter((m) => isDatedMethod(m) && waysOf(course).includes(m));
  const plansQ = api.provider.plans.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) && selfPaced && !locked, retry: false });
  const plans = plansQ.data || [];
  const planHint = locked ? (draft.planId ? "On a price plan" : "No price plan") : plansQ.isLoading ? "Loading price plans…" : plans.length ? "Choose a price plan" : "No price plans yet";
  // Tiered is shown once chosen even before a plan is picked. Choosing it puts the flat price aside (so the course has no price
  // until a plan is picked, and the editor knows something changed); picking Flat again clears the plan and brings the price back.
  const [tieredPick, setTieredPick] = useState(Boolean(draft.planId));
  const flatPrice = useRef(draft.price);
  const tiered = tieredPick || Boolean(draft.planId);
  const setTiered = (on) => {
    if (on === tiered) return;
    setTieredPick(on);
    if (on) {
      flatPrice.current = draft.price;
      set("price")("");
    } else {
      set("planId")("");
      set("price")(flatPrice.current);
    }
  };
  // how many dates it has, or which way still has none learners can book (sending it for approval needs one on each)
  const lacking = datesNeeded(draft, course);
  // a date just created counts at once (its way has a date learners can book, so "Create a … cohort" goes), not only once the
  // course has loaded again (that follows, and has the last word); one starting today or earlier isn't shown to learners
  const counted = (saved) => {
    if (!saved?.startsOn || saved.startsOn <= todayIso()) return;
    ep.patch({ datesMissing: (course.datesMissing || []).filter((m) => m !== saved.method), bookableCohorts: (course.bookableCohorts || 0) + 1, cohortCount: (course.cohortCount || 0) + 1 });
  };
  const n = course.bookableCohorts;
  // its ways on dates still taking bookings (a date can be added to one of them only)
  const openDated = waysOf(course, { open: true }).filter(isDatedMethod);
  const dateLine = !openDated.length ? "Not taking bookings on dates: take bookings again in Learning options to add one"
    : !lacking.length ? `${n} upcoming ${n === 1 ? "date" : "dates"}`
    : lacking.length < dated.length ? `No ${lacking.map(methodName).join(" or ")} date learners can book yet`
    : course.cohortCount ? "No dates learners can book: they only see a date before its first day" : "No upcoming dates yet";
  // its two parts: the self-paced price (or plan) and the dates
  const selfPart = selfPaced && (
          <div className="rt-pws-ce__part">
            {dated.length > 0 && <h3 className="rt-adm-h3">{methodName("self-paced")}</h3>}
            {/* pricing mode: Flat (one price) or Tiered (packages from a price plan) */}
            <Choice name="rt-pws-ce-pricing" legend="Pricing" value={tiered ? "tiered" : "flat"} disabled={locked} onChange={(v) => !locked && setTiered(v === "tiered")}
              options={[{ value: "flat", label: "Flat: one price" }, { value: "tiered", label: "Tiered: packages from a price plan" }]} />
            {tiered ? (
              <div className="rt-field">
                <label htmlFor="rt-pws-ce-plan">Price plan<Req /></label>
                <p className="rt-field__hint" id="rt-pws-ce-plan-h">Learners choose a package when they book; the course shows the cheapest package as its price. {!locked && <Link href={link(links.plans())} className="rt-cd__link">{plans.length || plansQ.isLoading ? "Manage price plans" : "Create a price plan first"}</Link>}</p>
                <FieldErr id="rt-pws-ce-plan" text={errors.planId} />
                <FieldSelect id="rt-pws-ce-plan" label="Price plan" placeholder={planHint} value={draft.planId} disabled={locked} onChange={set("planId")}
                  options={plans.filter((p) => !p.archived || p.id === course.planId).map((p) => ({ value: p.id, label: `${p.name}: ${p.tiers.map((t) => `${t.name} ${formatPrice(t.pricePence / 100)}`).join(" · ")}` }))}
                  invalid={Boolean(errors.planId)} describedBy={`rt-pws-ce-plan-h${errors.planId ? " rt-pws-ce-plan-e" : ""}`} />
              </div>
            ) : (
              <div className="rt-field rt-pws-course-price">
                <label htmlFor="rt-pws-ce-pricein">Price per learner, including VAT (£)<Req /></label>
                <FieldErr id="rt-pws-ce-pricein" text={errors.price} />
                <input id="rt-pws-ce-pricein" type="text" inputMode="decimal" value={draft.price} disabled={locked} onChange={(e) => set("price")(e.target.value.replace(/£|,/g, "").trim())} aria-invalid={errors.price ? true : undefined} aria-describedby={errors.price ? "rt-pws-ce-pricein-e" : undefined} autoComplete="off" />
              </div>
            )}
          </div>
        );
  const datesPart = dated.length > 0 && (
          <div className="rt-pws-ce__part">
            {selfPaced && <h3 className="rt-adm-h3">Dates</h3>}
            {!same(dated, savedDated) ? (
              // a save still on its way (the step was opened while it ran): the dates show once it is saved, not "save first"
              <p className="rt-acc__note">{saving ? "Saving your learning options…" : "Save your learning options first: the dates follow from them."}</p>
            ) : (
              <>
                <FieldErr id="rt-pws-ce-dates" text={errors.dates && lacking.length ? datesGap(lacking) : ""} />
                <div className="rt-pws-ce__dates">
                  <p className="rt-pws-ce__datecount">{dateLine}</p>
                  {can("provider.cohorts.edit") && can("provider.pricing.edit") && openDated.length > 0 && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setAdding(true)} aria-describedby={errors.dates && lacking.length ? "rt-pws-ce-dates-e" : undefined}>Create cohort</button>}
                  {course.cohortCount > 0 && can("provider.cohorts.view") && <Link href={link(links.dates(course.id))} className="rt-cd__link">Manage this course&apos;s dates</Link>}
                </div>
              </>
            )}
          </div>
        );
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-price-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-price-h">{pricingLabel(draft.methods)}</h2>
        <FieldErr id="rt-pws-ce-saver" text={errors.skillSaver} />
        <div className="rt-pws-ce__loyalty">
          <label className="rt-fp__opt">
            <input name="skillSaver" type="checkbox" className="rt-fp__check" checked={draft.skillSaver} disabled={locked} onChange={(e) => set("skillSaver")(e.target.checked)} aria-describedby={errors.skillSaver ? "rt-pws-ce-saver-e" : undefined} />
            <span>Include this course in the Skill Saver loyalty programme</span>
          </label>
          <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link>
        </div>
        {/* the main way's part first: Dates when the course is mainly taught on dates, else the self-paced price */}
        {isDatedMethod(draft.method) ? <>{datesPart}{selfPart}</> : <>{selfPart}{datesPart}</>}
      </section>
      <CohortForm open={adding} onClose={() => { setAdding(false); ep.refresh(); }} suggestCourseId={course.id} onAnother={(id, saved) => { counted(saved); ep.refresh(); }} onSaved={(id, saved) => {
        setAdding(false);
        counted(saved);
        ep.refresh();
        onSaved("Cohort saved");
      }} />
    </form>
  );
}

// ---- Learning options ------------------------------------------------------------------------------------------------------

// learning options: the primary way the course is taught (shown first on its page and in search) and the other ways it is
// offered, switched on beside it. Choosing a primary switches it on, and the primary can't be switched off. A dated option with
// upcoming dates stays on until they are cancelled, and a retired one can be switched off but not on (the API checks both).
// Below them, with more than one way saved, each way taking bookings can stop new bookings ("Retire from future sales",
// saved at once, after "Stop new bookings for …?"): its booked dates still go ahead, and "Take bookings again" undoes it. The last
// way taking bookings can't be stopped (that is pausing the course), and one not taking bookings can't be made the primary.
function ModeSection({ course, draft, setDraft, access, errors, onBookings, bookingsBusy }) {
  const set = useSet(setDraft);
  const lo = pw.learningOptions;
  const locked = !access.full;
  const saved = waysOf(course);
  const selling = waysOf(course, { open: true });
  const closed = saved.filter((m) => isClosedWay(course, m));
  const retired = course.retiredMethods || [];
  const upcoming = (m) => course.upcomingByMethod?.[m] || 0;
  const inOrder = (list) => LEARNING_OPTIONS.filter((m) => list.includes(m));
  const choosePrimary = (m) => !locked && setDraft((d) => ({ ...d, method: m, methods: inOrder([...d.methods, m]) }));
  // turning self-paced off clears its price and plan too (the API does the same), so turning it on again starts without one
  const turn = (m, on) => setDraft((d) => ({ ...d, methods: inOrder(on ? [...d.methods, m] : d.methods.filter((x) => x !== m)), ...(m === "self-paced" && !on ? { price: "", planId: "" } : {}) }));
  const changed = draft.method !== course.method || !same(draft.methods, inOrder(saved));
  const isLive = course.status === "live" || course.status === "paused";
  const needsPrice = isLive && draft.methods.includes("self-paced") && !saved.includes("self-paced") && draft.price === "" && !draft.planId;
  // "Stop new bookings for …?" is open for this way; stopping the primary makes the first other way taking bookings the primary
  const [stopping, setStopping] = useState(null);
  const [stopError, setStopError] = useState("");
  const [stopRetry, setStopRetry] = useState(""); // the last try got no answer: said, with the button kept to try again
  const [reopening, setReopening] = useState(null); // "Take bookings again" working for this way
  const nextMain = stopping === course.method ? LEARNING_OPTIONS.find((m) => m !== stopping && selling.includes(m)) : null;
  const ask = (m) => {
    setStopError("");
    setStopping(m);
  };
  // the way moves to the other list, so its button goes: the keyboard goes to the card's heading
  const toCard = () => requestAnimationFrame(() => {
    const h = document.getElementById("rt-pws-ce-book-h");
    h?.setAttribute("tabindex", "-1");
    h?.focus();
  });
  const stop = async () => {
    setStopRetry("");
    const problem = await onBookings(stopping, false);
    if (problem?.retry) setStopRetry(problem.message);
    else if (problem) setStopError(problem.message);
    else {
      setStopping(null);
      toCard();
    }
  };

  return (
    <div className="rt-acc__stack">
      <form className="rt-acc__card rt-pws-course-form" noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="rt-pws-ce-mode-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-mode-h">{lo.title}</h2>
        {/* the main way, as New course's cards (with their icons) */}
        <fieldset className="rt-field rt-pws-ce__ways" aria-describedby={errors.method ? "rt-pws-ce-format-e" : undefined}>
          <legend>{lo.primary}<Req /></legend>
          <FieldErr id="rt-pws-ce-format" text={errors.method} />
          <WayCards name="rt-pws-ce-format" value={draft.method} onChange={choosePrimary} invalid={Boolean(errors.method)}
            options={pw.formats.map((f) => {
              // a retired option can stay the primary it already is, but not become one; nor can one not taking bookings
              const gone = retired.includes(f.key) && f.key !== course.method;
              const shut = isClosedWay(course, f.key);
              return { value: f.key, label: methodName(f.key), text: gone ? lo.retired : shut ? lo.closedPrimary : f.text, disabled: (locked && f.key !== draft.method) || gone || shut };
            })} />
        </fieldset>
        <fieldset className="rt-field rt-pws-ce__ways" aria-describedby={errors.methods ? "rt-pws-ce-ways-e" : undefined}>
          <legend>{lo.others}</legend>
          <FieldErr id="rt-pws-ce-ways" text={errors.methods} />
          {pw.formats.filter((f) => f.key !== draft.method).map((f) => {
            const on = draft.methods.includes(f.key);
            const held = on && saved.includes(f.key) && upcoming(f.key) > 0; // it has upcoming dates: on until they are cancelled
            const gone = retired.includes(f.key);
            const shut = isClosedWay(course, f.key);
            const note = held ? (shut ? lo.closedUpcoming(upcoming(f.key)) : lo.upcoming(upcoming(f.key))) : gone ? (on ? lo.retiredOn : lo.retired) : shut && on ? lo.closed : "";
            const noteId = `rt-pws-ce-way-${f.key}-n`;
            return (
              <label key={f.key} className={`rt-pws-optcard${on ? " is-on" : ""}${locked || (gone && !on) ? " is-off" : ""}${held ? " is-held" : ""}`}>
                <input type="checkbox" name="methods" value={f.key} checked={on} disabled={locked || held || (gone && !on)} onChange={(e) => turn(f.key, e.target.checked)} aria-describedby={note ? noteId : undefined} />
                <span>
                  <b>{methodName(f.key)}</b>
                  <small>{f.text}</small>
                  {note && <small className="rt-pws-ce__waynote" id={noteId}>{note}</small>}
                </span>
              </label>
            );
          })}
        </fieldset>
        <CardChoice name="rt-pws-ce-model" legend="How do learners reach you?" value={draft.model} onChange={(v) => access.full && set("model")(v)}
          options={Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label, text: m.text, tag: m.soon, disabled: (Boolean(m.soon) && value !== course.model) || (!access.full && value !== draft.model) }))} error={errors.model} />
        {draft.methods.includes("self-paced") && <p className="rt-acc__note">{lo.selfPacedNote}</p>}
        {needsPrice && <p className="rt-acc__notice -warn">{lo.liveSelfPaced}</p>}
      </form>
      {saved.length > 1 && (
        <section className="rt-acc__card rt-pws-ce__book" aria-labelledby="rt-pws-ce-book-h">
          <h2 className="rt-acc__h2" id="rt-pws-ce-book-h">{lo.bookings.title}</h2>
          <p className="rt-acc__note">{lo.bookings.lead}</p>
          <ul className="rt-adm-list">
            {selling.map((m) => (
              <li key={m}>
                <div>
                  <b>{methodName(m)}</b>
                  <small>{m === course.method ? lo.bookings.main : lo.bookings.open}</small>
                </div>
                {access.full && selling.length > 1 && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => ask(m)} disabled={bookingsBusy}>{lo.bookings.stop}<span className="rt-sr"> for {methodName(m)}</span></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {selling.length === 1 && course.status === "live" && <p className="rt-acc__note">{lo.bookings.pause}</p>}
          {closed.length > 0 && (
            <>
              <h3 className="rt-acc__h3">{lo.bookings.closedTitle}</h3>
              <ul className="rt-adm-list">
                {closed.map((m) => (
                  <li key={m}>
                    <div>
                      <b>{methodName(m)}</b>
                      <small>{retired.includes(m) ? lo.retired : lo.bookings.closedNote}</small>
                    </div>
                    {access.full && !retired.includes(m) && (
                      <div className="rt-adm-list__side">
                        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={async () => { setReopening(m); await onBookings(m, true); setReopening(null); toCard(); }} disabled={bookingsBusy} aria-busy={reopening === m || undefined}>{reopening === m ? lo.bookings.reopening : lo.bookings.reopen}<span className="rt-sr"> for {methodName(m)}</span></button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      <Confirm open={Boolean(stopping)} onClose={() => { setStopping(null); setStopRetry(""); }} busy={bookingsBusy} blocked={stopError} error={stopRetry}
        title={stopping ? lo.bookings.confirmTitle(methodName(stopping)) : ""}
        text={stopping ? lo.bookings.confirmText(methodName(stopping), nextMain ? methodName(nextMain) : "") : ""}
        confirmLabel={bookingsBusy ? lo.bookings.stopping : lo.bookings.stop} onConfirm={stop} />
    </div>
  );
}
