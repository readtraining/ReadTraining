"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Confirm } from "./settingsForm";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { CourseEndpoints, isStale, useCourseEndpoints, useEndpoints } from "@/lib/courseEditorApi";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { acceptFor, hintFor, prepareImage, whenLoaded } from "@/lib/images";
import { getSupabase } from "@/lib/supabase/client";
import { errorsFrom } from "@/lib/useMe";
import { videoEmbed } from "@/lib/catalogueData";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { CourseGear, SeoPanel, SharedGear } from "./CourseSettings";
import { CohortForm } from "./ProviderCohorts";
import { COURSE_TONE, CardChoice, Choice, Loading, Pill, getQuery, setQuery } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { categoryOptions, levelOptions, methodName, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";
import FilterScrollPill from "@/components/courses/FilterScrollPill";

// The course editor's sections, in the order a provider fills them in, each ticked in the side list when it is complete. Mode of
// study comes before the price, as the price step depends on it: a self-paced course has one price, a course on dates is priced
// on each date, so its step is its dates. FAQs and SEO are optional: they never stop a course being sent for approval.
const SECTIONS = [
  { key: "landing", label: "Course landing page" },
  { key: "info", label: "Course information" },
  { key: "syllabus", label: "Syllabus and exam" },
  { key: "faqs", label: "FAQs", optional: true },
  { key: "mode", label: "Mode of study" },
  { key: "pricing", label: "Price" },
  { key: "seo", label: "SEO settings", optional: true },
];
// the price step's name: a course on dates is priced on each date
const pricingLabel = (method) => (method === "self-paced" ? "Price" : "Dates and prices");
// a shared course page (written by ReadTraining's team) has no price, dates or way of teaching of its own: its providers' courses do
const SHARED_SECTIONS = ["landing", "info", "syllabus", "faqs", "seo"];
const FORM_SECTIONS = ["landing", "info", "syllabus", "faqs", "mode", "pricing"];
const LIMITS = { title: 80, summary: 300, feature: 70, outcome: 160 };
// how many of each list a course can have (the API's limits, provider/courses.mts `content`)
const MOST = { features: 12, outcomes: 20, units: 40, exams: 20, faqs: 30 };
const MAX_PRICE = 100000; // pounds (the API's pricePence limit)
// The section that shows each field's error, by the API's names (a list's rows come under the list's name) and the editor's own
// (passMark0, examUnit0: one exam row's fields). Saving with errors goes to the first section that has one.
const SECTION_OF = {
  model: "mode", title: "landing", summary: "landing", description: "landing", category: "landing", subcategory: "landing", topic: "landing", level: "landing", videoUrl: "landing",
  features: "info", outcomes: "info", audience: "info", entryRequirements: "info",
  images: "landing", units: "syllabus", exams: "syllabus", faqs: "faqs", price: "pricing", planId: "pricing", skillSaver: "pricing", method: "mode",
};
const sectionOf = (key) => SECTION_OF[key] || (/^(passMark|examUnit|examDuration)\d+$/.test(key) ? "syllabus" : null);
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
  const pct = t.match(/(\d+(?:\.\d+)?)\s*(?:%|per\s*cent\b)/);
  if (pct && Number(pct[1]) > 100) return "A percentage pass mark can't be over 100%.";
  const score = t.match(SCORE) || t.match(SCORE_OF);
  if (score && (Number(score[2]) === 0 || Number(score[1]) > Number(score[2]))) return "The pass mark can't be more than the total, like 26 out of 40.";
  return "";
}
const STATUS_NOTES = {
  draft: "This course is a draft. Only your team can see it.",
  pending: "We're checking this course. If you change it now (apart from its search and privacy settings), it comes back to you as a draft and you send it for approval again.",
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
const NO_DATES_NOTE = "This course has no upcoming dates, so learners won't see a date until you add one.";
const PAGE_FIELDS = ["title", "summary", "description", "audience", "entryRequirements", "outcomes", "features", "videoUrl"];
const PRICE_FIELDS = ["price", "planId", "skillSaver"];

// The draft the editor works on: the saved course, with any change still waiting for approval on top (so the provider keeps
// editing their latest version).
const draftOf = (c) => {
  const p = c.pendingChanges?.content || {};
  const pick = (k) => (p[k] !== undefined ? p[k] : c[k]);
  return {
    model: c.model, method: c.method || "classroom", skillSaver: c.skillSaver, planId: c.planId || "", price: c.pricePence == null || c.planId ? "" : (c.pricePence / 100).toFixed(2).replace(/\.00$/, ""),
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
  // priced: a self-paced course has its own price; one on dates is priced on each date, so it has a price once it has a date
  if (key === "pricing") return d.method === "self-paced" ? d.price !== "" || Boolean(d.planId) : course.upcomingCohorts > 0;
  if (key === "mode") return Boolean(d.method);
  return Boolean(course.seoTitle && course.seoDescription);
}

// What is still needed before the course can be sent for approval (or a shared page published): the same rules the API checks
// (provider/courses.mts `missing`), worked out from the draft so typing an item ticks it off at once. Each item names the
// section that holds it, so the list can take the provider straight there.
function stillNeeded(d, course) {
  const out = [];
  const add = (section, text) => out.push({ section, text });
  if (!d.summary.trim()) add("landing", "a short description");
  if (!d.description.trim()) add("landing", "a description");
  if (!d.category || !d.subcategory) add("landing", "a category and sub-category");
  if (!d.level) add("landing", "a level");
  if (!course.images.length) add("landing", "at least one picture");
  if (d.outcomes.length < 4) add("info", `at least 4 things learners will learn (${d.outcomes.length} so far)`);
  if (!d.units.length) add("syllabus", "at least one syllabus unit");
  if (course.kind === "provider" && !d.method) add("mode", "how it is taught");
  if (course.kind === "provider" && d.method === "self-paced" && d.price === "" && !d.planId) add("pricing", "a price or a price plan");
  // filed under something no longer offered (retired in Catalogue settings since it was chosen): the API refuses to send it
  for (const entry of course.retired || []) {
    const [, name, word] = entry.match(/^(.*) \(([^)]+)\)$/) || [];
    const key = RETIRED_KEY[word];
    if (key && d[key] === (course[key] || "")) add(key === "method" ? "mode" : "landing", `another ${word}: ${name} is no longer offered`);
  }
  return out;
}
// What the step `key` still needs before Continue moves on, as { field: message } (the same rules as stillNeeded and the API's
// `missing`; optional fields never stop it). Save still saves a half-finished step, and the side list still opens any step.
function stepGaps(d, course, key) {
  const e = {};
  if (key === "landing") {
    if (!d.summary.trim()) e.summary = "Enter a short description.";
    if (!d.level) e.level = "Choose a level.";
    if (!d.category) e.category = "Choose a category.";
    if (!d.subcategory) e.subcategory = "Choose a sub-category.";
    if (!d.description.trim()) e.description = "Enter the course description.";
    if (!course.images.length) e.images = "Upload at least one picture.";
  }
  if (key === "info" && d.outcomes.length < 4) e.outcomes = `Add at least 4 things learners will learn (${d.outcomes.length} so far).`;
  if (key === "syllabus" && !d.units.length) e.units = "Add at least one unit.";
  // an exam row (optional) needs all three parts: the course page shows it as a line of a table
  if (key === "syllabus") d.exams.forEach((x, i) => {
    if (!x.unit.trim()) e[`examUnit${i}`] = "Name this exam or unit, or remove the row.";
    if (!x.passMark.trim()) e[`passMark${i}`] = "Enter the pass mark, like 70% or 26 out of 40.";
    if (!x.duration.trim()) e[`examDuration${i}`] = "Enter how long it takes, like 45 minutes.";
  });
  if (key === "mode" && course.kind === "provider" && !d.method) e.method = "Choose how the course is taught.";
  if (key === "pricing" && course.kind === "provider" && d.method === "self-paced" && d.price === "" && !d.planId) e.price = "Enter the price per learner, or choose a price plan.";
  return e;
}
// the draft's field for each kind of catalogue entry the API names as retired ("Name (sub-category)": provider/courses.mts retired)
const RETIRED_KEY = { category: "category", "sub-category": "subcategory", topic: "topic", level: "level", "delivery method": "method" };

// What changed in the draft, as the API takes it. The catalogue place goes as one (category, sub-category and topic together).
function changes(draft, base, access) {
  const out = {};
  const keys = Object.keys(draft).filter((k) => !same(draft[k], base[k]));
  for (const k of keys) {
    if (!access.full && !PAGE_FIELDS.includes(k)) continue;
    if (!access.pricing && PRICE_FIELDS.includes(k)) continue;
    if (k === "planId") out.planId = draft.planId || null;
    else if (k === "price") {
      if (!draft.planId) out.pricePence = draft.price === "" ? null : Math.round(Number(draft.price) * 100);
    }
    else if (["category", "subcategory", "topic"].includes(k)) Object.assign(out, { category: draft.category, subcategory: draft.subcategory, topic: draft.topic || null });
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

// One course, as Hurak's editor: the "Publish your course" list on the left (one item per section, ticked when complete, kept in
// ?tab=), the section on the right. The sections' fields are one draft saved with "Save"; images and SEO save themselves. The
// header shows the status and performance model, with Preview and the gear (course settings). "Send for approval" sends a draft
// once nothing required is missing. Leaving with unsaved changes asks first. Course data comes from the API.
// scope "admin": the same editor for a shared course page in the admin (lib/courseEditorApi.js): no pricing or mode of study,
// changes go live on Save, and the page is published from here instead of sent for approval.
// The page title (ProviderShell's h1): the course's name once it has loaded.
export function CourseTitle({ courseId, scope = "provider", fallback }) {
  const id = /^\d+$/.test(String(courseId)) ? Number(courseId) : 0;
  return useCourseEndpoints(scope, id).query.data?.title || fallback;
}

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
  const [showNeed, setShowNeed] = useState(false); // "Almost ready to send" is open: Send for approval was pressed with something missing
  const [submitError, setSubmitError] = useState("");
  // sent (or published) just now: the button gives way at once, without waiting for the course to load again
  const [sent, setSent] = useState(false);
  // what was just sent (or published) stays said where the button was, not only in the passing message at the bottom
  const [sentNote, setSentNote] = useState("");
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
  const [preview, setPreview] = useState(false);
  const formRef = useRef(null);
  const navRef = useRef(null);
  const loadedFor = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  const saved = useCallback((message) => setToast({ message }), []);
  const access = ep.access;
  // a provider our team hasn't approved yet can open its courses but not change them (the shared permission table)
  const { status: providerStatus } = useProviderAccess();
  const notApproved = !ep.admin && (providerStatus === "pending" || providerStatus === "changes_requested");
  const sections = ep.admin ? SECTIONS.filter((x) => SHARED_SECTIONS.includes(x.key)) : SECTIONS;
  const back = ep.admin ? { label: "Back to the catalogue", href: "/admin/catalogue" } : { label: "Back to courses", href: "/provider/courses" };

  useEffect(() => {
    const t = getQuery("tab");
    if (sections.some((x) => x.key === t)) setTab(t);
    // just made by the new course steps: say so (once; the address loses ?created so a reload doesn't say it again)
    if (getQuery("created")) {
      const message = "Draft created. Fill in each section, then send it for approval.";
      setToast({ message });
      setSaid(message);
      setQuery("created", "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- read the address once

  // the course as loaded again has its new status: show that
  useEffect(() => setSent(false), [course?.status]);

  const dirty = Boolean(draft && base && !same(draft, base));
  // the course as loaded: the first time, or a newer version (another tab or a colleague) while nothing is unsaved here, fills
  // the draft; with unsaved edits they are kept, and their save is refused as out of date (the banner offers the latest). The
  // editor's own changes keep the version they returned (lib/courseEditorApi.js), so loading again after them changes nothing.
  useEffect(() => {
    if (!course) return;
    const fresh = loadedFor.current !== course.id;
    if (!fresh && (course.version === ep.seen() || dirty)) return;
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

  if (!id || query.error?.data?.code === "NOT_FOUND" || (ep.admin && course && course.kind !== "shared")) return <EmptyState title="This course was not found" text={ep.admin ? "It may have been deleted. Only shared course pages are edited here." : "It may have been deleted, or it belongs to another provider."} action={back} />;
  if (query.isError) return <ErrorState title="We couldn't load this course." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!course || !draft) return <Loading rows={3} />;

  const status = sent ? (ep.admin ? "live" : "pending") : course.status;
  const canSubmit = access.full && (ep.admin ? status !== "live" : status === "draft" || status === "changes");
  const isLive = course.status === "live" || course.status === "paused";
  // a course taught on dates can go live without one, but learners then have no date to book
  const noDates = course.kind === "provider" && (course.method === "classroom" || course.method === "live-online") && !course.upcomingCohorts;
  const ticks = sections.map((x) => ({ ...x, label: x.key === "pricing" ? pricingLabel(base.method) : x.label, ok: sectionOk(base, course, x.key) }));
  const steps = ticks.filter((x) => !x.optional);
  // a step's status under its name, from what is saved: Complete (a mode of study names itself), "3 to add", No dates yet, Optional
  const stepStatus = (x) => {
    if (x.key === "mode" && x.ok) return methodName(base.method);
    if (x.ok) return "Complete";
    if (x.key === "pricing" && base.method !== "self-paced") return "No dates yet";
    if (x.optional) return "Optional";
    const n = x.key === "info" ? Math.max(0, 4 - base.outcomes.length) : Object.keys(stepGaps(base, course, x.key)).length;
    return n ? `${n} to add` : "";
  };
  const done = steps.filter((x) => x.ok).length;
  // the section before and after this one, for the bar under the form (Back, Save and continue)
  const at = sections.findIndex((x) => x.key === tab);
  const prev = ticks[at - 1];
  const next = ticks[at + 1];
  const needed = stillNeeded(draft, course);
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
    requestAnimationFrame(() => focusFirstError(formRef.current));
  };
  // checks what the API would refuse, so the provider is shown the field, then saves what changed
  const save = async () => {
    const e = {};
    if (!draft.title.trim() || draft.title.trim().length < 3) e.title = "Enter a title of at least 3 characters.";
    if (draft.price !== "" && !PRICE_RE.test(draft.price)) e.price = "Enter the price in pounds, like 95 or 95.50.";
    else if (draft.price !== "" && Number(draft.price) > MAX_PRICE) e.price = "Enter a price of £100,000 or less.";
    // a live self-paced course shows its price (the API refuses it without one)
    else if (isLive && draft.method === "self-paced" && draft.price === "" && !draft.planId) {
      e.price = "Enter the price per learner: a live self-paced course needs one.";
      e.planId = "Choose a price plan: a live self-paced course needs a price.";
    }
    // the same rule as the course page's player and the API (videoEmbed): one YouTube or Vimeo video that can actually play
    if (draft.videoUrl.trim() && !videoEmbed(draft.videoUrl.trim())) e.videoUrl = "Use a link to one YouTube or Vimeo video, starting https://";
    draft.exams.forEach((x, i) => {
      if (!x.unit.trim()) e[`examUnit${i}`] = "Name this exam or unit, or remove the row.";
      const problem = x.passMark.trim() ? passMarkProblem(x.passMark) : "Enter the pass mark, like 70% or 26 out of 40.";
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
      const message = r.pendingChange ? "Saved. Your changes go live once our team has checked them." : r.backToDraft ? "Saved. The course is back with you as a draft: send it for approval again when you're ready." : ep.admin && course.status === "live" ? "Saved. The page shows the changes now." : "Course saved.";
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
  // send for approval (a provider's course) or publish (a shared page), saving first if needed. Nothing is sent while something
  // required is missing (or the provider isn't approved yet): the box under the button says what to do, and gets the focus.
  const submit = async () => {
    setSubmitError("");
    if (needed.length || ep.waiting) return setShowNeed(true);
    if (dirty && !(await save())) return;
    try {
      if (ep.admin) await ep.setStatus("live");
      else await ep.submit();
      setSent(true);
      refresh();
      const message = ep.admin ? "Published. The page is live and providers can list their courses on it." : "Sent for approval. We'll email you within 2 working days.";
      setSentNote(message);
      setSaid(message);
      setToast({ message });
    } catch (error) {
      // already sent (from another tab, or before this page caught up): nothing went wrong, so say so and show it
      if (!ep.admin && error?.data?.code === "CONFLICT" && /already waiting/i.test(error.message)) {
        setSent(true);
        refresh();
        const message = "This course is already waiting for approval. We'll email you within 2 working days.";
        setSentNote(message);
        setToast({ message });
        return;
      }
      if (ep.stale(error)) return;
      const message = errorsFrom(error).general || "We couldn't send it. Check your connection, then try again.";
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
      const message = errorsFrom(error).general || "We couldn't withdraw your changes. Check your connection, then try again.";
      setSaid(message);
      setToast({ message });
    }
  };
  // Preview: the real course page for this course (/provider/courses/<id>/preview, or the shared page's under /admin), in a new tab.
  // It shows what is saved, so with unsaved changes it asks first. The tab is opened at the click (a tab opened after the save
  // finishes would be blocked as a pop-up) and pointed at the preview once the save is done.
  const previewHref = ep.admin ? `/admin/catalogue/${course.id}/preview` : `/provider/courses/${course.id}/preview`;
  const openPreview = () => {
    if (dirty) return setPreview(true);
    window.open(previewHref, "_blank");
  };
  const saveAndPreview = async () => {
    const tab = window.open("", "_blank");
    const ok = await save();
    setPreview(false);
    if (ok && tab) tab.location.href = previewHref;
    else if (ok) window.open(previewHref, "_blank");
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
      refresh();
      setToast({ message: "Loaded the latest version. Make your change again, then save." });
    } catch {
      setToast({ message: "We couldn't load it. Check your connection, then try again." });
    } finally {
      setReloading(false);
    }
  };
  function changeTab(t, { scroll = false } = {}) {
    setTab(t);
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
    if (FORM_SECTIONS.includes(tab) && dirty && access.page && !(await save())) return;
    const gaps = check && access.page ? stepGaps(draft, course, tab) : {};
    gapRef.current = Object.keys(gaps);
    if (gapRef.current.length) return showErrors(gaps);
    changeTab(x.key, { scroll: true });
  };
  const lastSaved = course.updatedAt ? SAVED_AT.format(new Date(course.updatedAt)) : "";
  const busy = ep.updating || ep.submitting;
  const sectionProps = { course, draft, setDraft, errors, access };

  return (
    <CourseEndpoints.Provider value={ep}>
    <div className="rt-acc__stack rt-pws-cepage">
      <p className="rt-sr" aria-live="polite">{said}</p>
      <section className="rt-pws-ce__head" aria-label="Course">
        <div className="rt-pws-ce__headtext">
          <p className="rt-pws-ce__meta">
            <span title={status === "draft" ? (ep.admin ? SHARED_NOTES : STATUS_NOTES).draft : undefined}><Pill tone={COURSE_TONE[status]}>{pw.courseStatuses[status]}</Pill>{status === "draft" && <span className="rt-sr">: {(ep.admin ? SHARED_NOTES : STATUS_NOTES).draft}</span>}</span>
            <span>{ep.admin ? "Shared course page" : `${pw.models[course.model]?.label} · ${methodName(course.method)}`}{lastSaved ? ` · Last saved ${lastSaved}` : ""}</span>
          </p>
          {ep.admin && <h2 className="rt-acc__h2 rt-adm-hero__name">{course.title}</h2>}
          {status !== "draft" && <p className="rt-acc__note">{(ep.admin ? SHARED_NOTES : STATUS_NOTES)[status]}</p>}
          {status === "changes" && course.statusNote && <p className="rt-adm-item__block"><b>What to change:</b> {course.statusNote}</p>}
          {course.parent && <p className="rt-acc__note">Listed on the shared course page <b>{course.parent.title}</b>.</p>}
          {!ep.admin && course.lastChange?.status === "rejected" && course.lastChange.note && !course.pendingChanges && <p className="rt-adm-item__block"><b>Your last change was not approved:</b> {course.lastChange.note}</p>}
          {!ep.admin && course.status === "paused" && course.statusNote && <p className="rt-adm-item__block"><b>Paused by our team:</b> {course.statusNote} Contact us to put it back live.</p>}
          {isLive && course.retired?.length > 0 && <p className="rt-adm-item__block"><b>No longer offered on ReadTraining:</b> {course.retired.join(", ")}. {ep.admin ? "Choose another and save." : "Choose another and save: once our team has approved the change, the course can be live again."}</p>}
          {!ep.admin && isLive && noDates && <p className="rt-acc__note">{NO_DATES_NOTE}</p>}
        </div>
        <div className="rt-pws-ce__headactions">
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={openPreview}>Preview<span className="rt-sr"> (opens in a new tab)</span></button>
          <button type="button" className="rt-pws-ce__gear" onClick={() => setGear(true)} aria-label="Course settings"><i className="icon-setting text-16" aria-hidden="true"></i></button>
        </div>
      </section>

      {stale && (
        <div className="rt-acc__notice -warn rt-pws-ce__stale" role="alert" tabIndex={-1} ref={staleRef}>
          <b>This course was changed somewhere else since you opened it.</b>
          <p>Someone else, or you in another tab, saved a newer version. Your changes are not saved, so nothing was overwritten. Copy anything you want to keep, then load the latest version and make your change again.</p>
          <button type="button" className="button -sm -purple-1 text-white" onClick={loadLatest} disabled={reloading} aria-busy={reloading || undefined}>{reloading ? "Loading…" : "Load the latest version"}</button>
        </div>
      )}
      {course.pendingChanges && (
        <section className="rt-acc__card rt-pws-ce__pending" aria-label="Changes waiting for approval">
          <p className="rt-acc__note"><b>Your changes are waiting for approval.</b> Learners see the live version until our team has checked them (saved {SAVED_AT.format(new Date(course.pendingChanges.since))}). You can keep editing: new changes join the same request.</p>
          {access.page && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setWithdrawing(true)} aria-haspopup="dialog" disabled={ep.discarding}>{ep.discarding ? "Withdrawing…" : "Withdraw changes"}</button>}
        </section>
      )}
      {!access.page && <p className="rt-adm-item__block">{ep.admin ? "You can see this page but not change it: that needs the catalogue switch." : notApproved ? pw.notApproved.text : "Your role can see this course but not change it."}</p>}
      {!ep.admin && access.page && !access.full && <p className="rt-adm-item__block">Your role can change the page wording and search settings. Ask an owner or admin to change the rest.</p>}

      <div className="rt-pws-ce">
        <nav className="rt-acc__card rt-pws-ce__nav rt-pill-scroll" aria-labelledby="rt-pws-ce-nav-h" tabIndex={-1} ref={navRef}>
          <h2 className="rt-adm-h3" id="rt-pws-ce-nav-h">{isLive ? (ep.admin ? "Page sections" : "Course sections") : ep.admin ? "Publish the page" : "Publish your course"}</h2>
          <div className="rt-pws-ce__progress">
            <p>{done === steps.length ? "Every required step is complete" : `${done} of ${steps.length} required steps complete`}</p>
            <div className="rt-pws-wiz__bar" aria-hidden="true"><span style={{ "--rt-wiz": `${(done / steps.length) * 100}%` }}></span></div>
          </div>
          <ol className="rt-pws-ce__steps">
            {ticks.map((x) => (
              <li key={x.key}>
                <button type="button" className={`rt-pws-ce__step${tab === x.key ? " is-on" : ""}`} onClick={() => changeTab(x.key)} aria-current={tab === x.key ? "step" : undefined}>
                  <span className={`rt-pws-course-tick${x.ok ? " is-ok" : ""}`} aria-hidden="true">{x.ok ? <i className="icon-check text-10"></i> : null}</span>
                  <span className="rt-pws-ce__steptext">{x.label}<small className={`rt-pws-ce__stepstatus${!x.ok && !x.optional ? " -todo" : ""}`}><span className="rt-sr">: </span>{stepStatus(x)}</small></span>
                </button>
              </li>
            ))}
          </ol>
          {canSubmit ? (
            <>
              <button type="button" className={`button -md rt-btn-block ${needed.length || ep.waiting ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={submit} disabled={busy} aria-haspopup={needed.length || ep.waiting ? "dialog" : undefined} aria-describedby={submitError ? "rt-pws-ce-need" : undefined} aria-busy={ep.submitting || undefined}>{ep.admin ? (ep.submitting ? "Publishing…" : "Publish") : ep.submitting ? "Sending…" : "Send for approval"}</button>
              {submitError && <p className="rt-q__err rt-pws-ce__need" id="rt-pws-ce-need" tabIndex={-1} ref={needRef} role="alert"><span className="rt-sr">Error: </span>{submitError}</p>}
            </>
          ) : (
            <>
              <p className="rt-pws-ce__status"><Pill tone={COURSE_TONE[status]}>{pw.courseStatuses[status]}</Pill></p>
              {sentNote && <p className="rt-acc__notice -ok">{sentNote}</p>}
            </>
          )}
          <FilterScrollPill scrollRef={navRef} />
        </nav>

        <div className="rt-pws-ce__main" ref={formRef}>
          {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
          {tab === "landing" && <LandingSection {...sectionProps} shared={ep.admin} onSaved={saved} />}
          {tab === "info" && <InfoSection {...sectionProps} />}
          {tab === "syllabus" && <SyllabusSection {...sectionProps} />}
          {tab === "faqs" && <FaqSection {...sectionProps} />}
          {!ep.admin && tab === "mode" && <ModeSection {...sectionProps} />}
          {!ep.admin && tab === "pricing" && <PricingSection {...sectionProps} onSaved={saved} />}
          {tab === "seo" && (
            <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-seo-h">
              <h2 className="rt-acc__h2" id="rt-pws-ce-seo-h">SEO settings</h2>
              <p className="rt-acc__note">How the course page shows in Google and other search results.</p>
              <SeoPanel course={course} onSaved={saved} formId="rt-pws-ce-seo-form" onState={setSeo} />
            </section>
          )}
          <div className="rt-acc__card rt-pws-ce__bar">
            {prev ? <button type="button" className="rt-cd__link" onClick={() => goTo(prev)} disabled={busy}><i className="icon-arrow-left text-12" aria-hidden="true"></i><span className="rt-sr">Back to </span>{prev.label}</button> : <span></span>}
            <div className="rt-pws-ce__baractions">
              {tab === "seo" && <span className="rt-pws-course-unsaved">{seo.dirty ? <><i className="icon-edit text-12" aria-hidden="true"></i>Unsaved changes</> : "All changes saved"}</span>}
              {tab === "seo" && access.page && <button type="submit" form="rt-pws-ce-seo-form" className={`button -md ${next ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} disabled={seo.busy} aria-busy={seo.busy || undefined}>{seo.busy ? "Saving…" : "Save"}</button>}
              {FORM_SECTIONS.includes(tab) && <span className="rt-pws-course-unsaved">{dirty ? <><i className="icon-edit text-12" aria-hidden="true"></i>Unsaved changes</> : "All changes saved"}</span>}
              {FORM_SECTIONS.includes(tab) && access.page && <button type="button" className={`button -md ${next ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={save} disabled={busy} aria-busy={ep.updating || undefined}>{ep.updating ? "Saving…" : "Save"}</button>}
              {next && <button type="button" className="button -md -purple-1 text-white" onClick={() => goTo(next, { check: true })} disabled={busy}>{FORM_SECTIONS.includes(tab) && dirty && access.page ? "Save and continue" : "Continue"}<span className="rt-sr">: {next.label}</span></button>}
            </div>
          </div>
        </div>
      </div>

      {ep.admin ? <SharedGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} /> : <CourseGear course={course} open={gear} onClose={() => setGear(false)} onSaved={saved} onStale={() => { setGear(false); setStale(true); requestAnimationFrame(() => staleRef.current?.focus()); }} />}
      <Confirm open={withdrawing} onClose={() => setWithdrawing(false)} title="Withdraw your changes?" text="The changes waiting for our team's approval are thrown away, and the live course stays as it is. This can't be undone." confirmLabel="Withdraw changes" onConfirm={withdraw} />
      <Sheet open={preview} onClose={() => setPreview(false)} title="Save your changes first?" closeLabel="Close">
        <div className="rt-q__form">
          <p className="rt-acc__note">The preview is the real course page, so it shows the course as saved. Save your changes to see them in it.</p>
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -purple-1 text-white" onClick={saveAndPreview} disabled={busy} aria-busy={ep.updating || undefined}>{ep.updating ? "Saving…" : "Save and preview"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => { setPreview(false); window.open(previewHref, "_blank"); }}>Preview without them</button>
          </div>
        </div>
      </Sheet>
      <Sheet open={showNeed} onClose={() => setShowNeed(false)} title={ep.waiting ? "Your account is waiting for approval" : ep.admin ? "Almost ready to publish" : "Almost ready to send"} closeLabel="Close" className="rt-pws-set__confirm">
        <div className="rt-q__form">
          {ep.waiting ? (
            <p className="rt-acc__note">You can build this course now. Once our team approves your provider account, you can send it for approval.</p>
          ) : (
            <>
              <p className="rt-acc__note">{ep.admin ? "Add these, then publish the page:" : "Add these, then send the course for approval:"}</p>
              <ul className="rt-adm-list">
                {sections.filter((x) => needed.some((n) => n.section === x.key)).map((x) => (
                  <li key={x.key}>
                    <div>
                      <b>{x.key === "pricing" ? pricingLabel(draft.method) : x.label}</b>
                      <small>{needed.filter((n) => n.section === x.key).map((n) => n.text.charAt(0).toUpperCase() + n.text.slice(1)).join(" · ")}</small>
                    </div>
                    <div className="rt-adm-list__side"><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setShowNeed(false); changeTab(x.key, { scroll: true }); }} aria-label={`Go to ${x.key === "pricing" ? pricingLabel(draft.method) : x.label}`}>Go to step</button></div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="rt-adm-cellrow"><button type="button" className="button -md -purple-1 text-white" onClick={() => setShowNeed(false)}>Keep editing</button></div>
        </div>
      </Sheet>
      <Toast toast={toast} onDone={clearToast} />
    </div>
    </CourseEndpoints.Provider>
  );
}

// ---- shared parts ----------------------------------------------------------------------------------------------------------

function Counter({ value, max }) {
  return <span className="rt-field__hint rt-pws-course-count">{value.length} of {max}</span>;
}
const FieldErr = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);
const useSet = (setDraft) => (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

// A list of short lines added one at a time (features, learning outcomes), with Enter or the Add button; outcomes can be reordered.
// `max` is each line's length, `most` how many lines there can be (adding stops there, and says so); `error` a save's message.
function LineList({ id, label, hint, items, onChange, max, most, placeholder, ordered = false, commas = false, disabled, error }) {
  const [value, setValue] = useState("");
  const [twice, setTwice] = useState(""); // what was typed is already on the list
  const full = items.length >= most;
  const add = (text = value) => {
    const parts = (commas ? text.split(",") : [text]).map((x) => x.trim().slice(0, max)).filter(Boolean);
    const fresh = parts.filter((p) => !items.includes(p));
    if (parts.length && !fresh.length) {
      setTwice(`"${parts[0]}" is already on the list.`);
      return;
    }
    setTwice("");
    if (fresh.length) onChange([...items, ...fresh].slice(0, most));
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
      <span className="rt-field__hint" id={`${id}-h`}>{full && !disabled ? `That's the most a course can have (${most}). Remove one to add another.` : hint}</span>
      <FieldErr id={id} text={error || twice} />
      {!disabled && (
        <div className="rt-pws-course-addrow">
          <input id={id} value={value} maxLength={max} disabled={full} onChange={(e) => { setTwice(""); if (commas && e.target.value.includes(",")) add(e.target.value); else setValue(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} aria-invalid={error || twice ? true : undefined} aria-describedby={`${id}-h${error || twice ? ` ${id}-e` : ""}`} autoComplete="off" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => add()} disabled={full}>Add</button>
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
        <p className="rt-acc__note">What learners read first: the title, a short description and where the course is filed. Every field is required unless it says (optional).</p>
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
          <textarea id="rt-pws-ce-sub" rows={2} value={draft.summary} maxLength={LIMITS.summary} onChange={(e) => set("summary")(e.target.value)} disabled={page} aria-invalid={errors.summary ? true : undefined} aria-describedby={`rt-pws-ce-sub-h${errors.summary ? " rt-pws-ce-sub-e" : ""}`} autoComplete="off" />
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
            <FieldErr id="rt-pws-ce-topic" text={errors.topic} />
            <FieldSelect id="rt-pws-ce-topic" label="Course topic" placeholder={topics.length ? "Choose a topic" : "No topics for this sub-category"} value={draft.topic} onChange={set("topic")} options={topics} disabled={full || !topics.length} invalid={Boolean(errors.topic)} />
          </div>
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-details">Course description</label>
          <span className="rt-field__hint" id="rt-pws-ce-details-h">What the course covers, how it is taught and assessed. Leave a blank line between paragraphs.</span>
          <FieldErr id="rt-pws-ce-details" text={errors.description} />
          <textarea id="rt-pws-ce-details" rows={8} maxLength={10000} value={draft.description} onChange={(e) => set("description")(e.target.value)} disabled={page} aria-invalid={errors.description ? true : undefined} aria-describedby={`rt-pws-ce-details-h${errors.description ? " rt-pws-ce-details-e" : ""}`} autoComplete="off" />
        </div>
      </section>

      <ImagesCard course={course} disabled={page} onSaved={onSaved} required={errors.images} />

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

// The course's images, uploaded straight away (not part of the draft) and shown in order; the first is the cover. Every change shows on screen at once, before the server answers: a chosen picture appears straight away
// (marked "Uploading…") and becomes the saved image when the upload finishes; a removed image goes, and a new cover moves first,
// the moment they are asked for. If the server refuses, the list goes back to how it was (unsaved ALT text kept) and says why. The course then loads again in the
// background. An upload and an ALT text save show their own label while they run (Uploading…, Saving…); every button waits while
// one change is saving, and Remove asks first.
function ImagesCard({ course, disabled, onSaved, required }) {
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
    let picture;
    try {
      picture = await prepareImage(file, "course");
    } catch (err) {
      return setError(err.message);
    }
    setAction("upload");
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
      onSaved("Image added");
      whenLoaded(added.url).then(() => {
        setList((x) => x.map((i) => (i.id === image.id && i.url === temp.url ? { ...i, url: added.url } : i)));
        URL.revokeObjectURL(temp.url);
      });
    } catch (err) {
      drop();
      if (ep.stale(err)) return; // changed somewhere else: the editor's banner says so, with a way to load the latest version
      setError(err?.data ? errorsFrom(err).general : err.message || "The picture didn't upload. Please try again.");
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
      onSaved(message);
      return true;
    } catch (err) {
      setList(before);
      if (!ep.stale(err)) setError(errorsFrom(err).general);
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
    <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-media-h" aria-busy={busy || undefined}>
      <h2 className="rt-acc__h2" id="rt-pws-ce-media-h">Course images</h2>
      <p className="rt-acc__note">They show at the top of the course page; the first image is the cover in search results. Images are saved as soon as you add or change them.</p>
      {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      {required && !list.length && <p className="rt-q__err"><span className="rt-sr">Error: </span>{required}</p>}
      {!disabled && (
        <div className="rt-pws-course-mediabar">
          <input ref={fileRef} type="file" accept={acceptFor("course")} className="rt-sr" id="rt-pws-ce-file" onChange={onFile} tabIndex={-1} aria-hidden="true" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()} disabled={busy}>{action === "upload" ? "Uploading…" : "Upload course image"}</button>
          <span className="rt-field__hint">{hintFor("course")} No text on the image.</span>
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
                    <label htmlFor={`rt-pws-ce-alt-${i}`}>ALT text</label>
                    <span className="rt-field__hint">What the picture shows, for people who can&apos;t see it.</span>
                    <input id={`rt-pws-ce-alt-${i}`} value={m.alt || ""} maxLength={140} disabled={disabled} onChange={(e) => setList(list.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} placeholder="For example: learners practising CPR on a manikin" autoComplete="off" />
                  </div>
                </div>
                )}
              </li>
            ))}
          </ul>
          {changed && !disabled && <div><button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => saveList(shown, "ALT text saved", "alt")}>{action === "alt" ? "Saving…" : "Save ALT text"}</button></div>}
        </>
      ) : <EmptyState inCard title="No images yet. Upload one: a course needs an image before it can be sent for approval." />}

      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={lastOfLive ? "This image can't be removed yet" : "Remove this image?"} closeLabel="Close">
        {removing && (
          <div className="rt-q__form">
            <img src={removing.url} alt="" className="rt-pws-course-removeimg" />
            {lastOfLive ? (
              <p className="rt-acc__note">A live course needs at least one image. Upload another, then remove this one.</p>
            ) : (
              <p className="rt-acc__note">It comes off the course page and is deleted for good. {shown[0]?.id === removing.id && shown.length > 1 ? "The next image becomes the cover." : shown.length === 1 ? "The course then has no image, and needs one before it can be sent for approval." : ""}</p>
            )}
            <div className="rt-adm-cellrow">
              {!lastOfLive && <button type="button" className="button -md -purple-1 text-white" onClick={doRemove} disabled={busy}>Remove image</button>}
              <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setRemoving(null)}>{lastOfLive ? "OK" : "Keep it"}</button>
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
        <p className="rt-acc__note">These show on the public course page and help it perform in search. Every field is required unless it says (optional).</p>
        <LineList id="rt-pws-ce-feature" label="Course features (optional)" hint={`Short facts shown as tags, like "1 day" or "Certificate valid 3 years". Press Enter or type a comma to add. Up to ${MOST.features}.`} items={draft.features} onChange={set("features")} max={LIMITS.feature} most={MOST.features} commas disabled={page} error={errors.features} />
        <LineList id="rt-pws-ce-obj" label="What will learners learn?" hint={`Add at least 4 (up to ${MOST.outcomes}), each starting with a verb. Press Enter to add. ${draft.outcomes.length} added${draft.outcomes.length < 4 ? `, ${4 - draft.outcomes.length} more to reach 4` : ""}.`} items={draft.outcomes} onChange={set("outcomes")} max={LIMITS.outcome} most={MOST.outcomes} placeholder="For example: Give CPR to an adult" ordered disabled={page} error={errors.outcomes} />
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-aud">Who is it for? (optional)</label>
          <span className="rt-field__hint" id="rt-pws-ce-aud-h">The people and jobs the course suits.</span>
          <FieldErr id="rt-pws-ce-aud" text={errors.audience} />
          <textarea id="rt-pws-ce-aud" rows={3} maxLength={2000} value={draft.audience} onChange={(e) => set("audience")(e.target.value)} disabled={page} aria-invalid={errors.audience ? true : undefined} aria-describedby={`rt-pws-ce-aud-h${errors.audience ? " rt-pws-ce-aud-e" : ""}`} autoComplete="off" />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-ce-req">Entry requirements (optional)</label>
          <span className="rt-field__hint" id="rt-pws-ce-req-h">What learners need before they book, like an age, ID or an earlier qualification. Leave it empty if there are none.</span>
          <FieldErr id="rt-pws-ce-req" text={errors.entryRequirements} />
          <textarea id="rt-pws-ce-req" rows={3} maxLength={2000} value={draft.entryRequirements} onChange={(e) => set("entryRequirements")(e.target.value)} disabled={page} aria-invalid={errors.entryRequirements ? true : undefined} aria-describedby={`rt-pws-ce-req-h${errors.entryRequirements ? " rt-pws-ce-req-e" : ""}`} autoComplete="off" />
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
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setEditing(null); setSheet(true); }} disabled={draft.units.length >= MOST.units}>Add unit</button>}
        </div>
        <p className="rt-acc__note">The course&apos;s units, in order. Learners open each one on the course page to see what it covers.{draft.units.length >= MOST.units ? ` That's the most a course can have (${MOST.units}): remove one to add another.` : ""}</p>
        <FieldErr id="rt-pws-ce-units" text={errors.units} />
        {draft.units.length ? (
          <ol className="rt-adm-list">
            {draft.units.map((u, i) => (
              <li key={`${u.title}-${i}`}>
                <div><b>{i + 1}. {u.title}</b>{u.body && <small className="rt-pws-ce__unitbody">{u.body}</small>}</div>
                {!locked && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move up: ${u.title}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => move(i, 1)} disabled={i === draft.units.length - 1} aria-label={`Move down: ${u.title}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn" onClick={() => { setEditing(i); setSheet(true); }} aria-label={`Edit: ${u.title}`} title="Edit"><i className="icon-edit text-14" aria-hidden="true"></i></button>
                    <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => askRemove("units", i, u.title || `unit ${i + 1}`, !u.title && !u.body)} aria-haspopup="dialog" aria-label={`Remove: ${u.title}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
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
          {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => set("exams")([...draft.exams, { unit: "", passMark: "", duration: "" }])} disabled={draft.exams.length >= MOST.exams}>Add row</button>}
        </div>
        <p className="rt-acc__note">If the course ends with an exam, add one row per paper or practical, each with what it covers, its pass mark and how long it takes. Leave it empty if there is no exam.{draft.exams.length >= MOST.exams ? ` That's the most a course can have (${MOST.exams} rows).` : ""}</p>
        <FieldErr id="rt-pws-ce-exams" text={errors.exams} />
        {draft.exams.length ? (
          <ol className="rt-pws-ce__exams">
            {draft.exams.map((e, i) => (
              <li key={i} className="rt-pws-ce__exam">
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-u${i}`}>Exam or unit</label>
                  <FieldErr id={`rt-pws-ce-ex-u${i}`} text={errors[`examUnit${i}`]} />
                  <input id={`rt-pws-ce-ex-u${i}`} value={e.unit} maxLength={120} onChange={(ev) => setExam(i, { unit: ev.target.value })} disabled={locked} placeholder="For example: Multiple choice paper" autoComplete="off" aria-invalid={errors[`examUnit${i}`] ? true : undefined} aria-describedby={errors[`examUnit${i}`] ? `rt-pws-ce-ex-u${i}-e` : undefined} />
                </div>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-p${i}`}>Pass mark</label>
                  {errors[`passMark${i}`] && <p className="rt-q__err" id={`rt-pws-ce-ex-p${i}-e`}><span className="rt-sr">Error: </span>{errors[`passMark${i}`]}</p>}
                  <input id={`rt-pws-ce-ex-p${i}`} value={e.passMark} maxLength={40} onChange={(ev) => setExam(i, { passMark: ev.target.value })} disabled={locked} placeholder="For example: 70%" autoComplete="off" aria-invalid={errors[`passMark${i}`] ? true : undefined} aria-describedby={errors[`passMark${i}`] ? `rt-pws-ce-ex-p${i}-e` : undefined} />
                </div>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-ce-ex-d${i}`}>Duration</label>
                  <FieldErr id={`rt-pws-ce-ex-d${i}`} text={errors[`examDuration${i}`]} />
                  <input id={`rt-pws-ce-ex-d${i}`} value={e.duration} maxLength={40} onChange={(ev) => setExam(i, { duration: ev.target.value })} disabled={locked} placeholder="For example: 45 minutes" autoComplete="off" aria-invalid={errors[`examDuration${i}`] ? true : undefined} aria-describedby={errors[`examDuration${i}`] ? `rt-pws-ce-ex-d${i}-e` : undefined} />
                </div>
                {!locked && <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => askRemove("exams", i, e.unit || `exam row ${i + 1}`, !e.unit && !e.passMark && !e.duration)} aria-haspopup="dialog" aria-label={`Remove exam row ${i + 1}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>}
              </li>
            ))}
          </ol>
        ) : <EmptyState inCard title="No exam on this course." />}
      </section>

      <UnitSheet open={sheet} onClose={() => setSheet(false)} unit={editing === null ? null : draft.units[editing]} room={MOST.units - draft.units.length} onSave={(rows) => {
        if (editing === null) set("units")([...draft.units, ...rows]);
        else set("units")(draft.units.map((u, i) => (i === editing ? rows[0] : u)));
        setSheet(false);
      }} />
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title={removing?.list === "exams" ? "Remove this exam row?" : "Remove this unit?"} text={removing ? `“${removing.name}” comes out of the syllabus when you save the course. Until then you can leave without saving to keep it.` : ""} confirmLabel={removing?.list === "exams" ? "Remove row" : "Remove unit"} onConfirm={() => { const r = removing; setRemoving(null); set(r.list)(draft[r.list].filter((_, j) => j !== r.index)); }} />
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
        {!unit && (rows.length < room ? <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setRows((x) => [...x, { title: "", body: "" }])}>Add another</button> : <p className="rt-acc__note">That fills the syllabus: a course can have up to {MOST.units} units.</p>)}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{unit ? "Save unit" : "Add to course"}</button>
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
        <p className="rt-acc__note">Questions learners ask about this course, with your answers. They show on the course page.{draft.faqs.length >= MOST.faqs ? ` That's the most a course can have (${MOST.faqs}).` : ""}</p>
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
        ) : <EmptyState inCard title="No FAQs on this course yet." />}
      </section>
      <FaqSheet open={editing !== undefined} onClose={() => setEditing(undefined)} faq={typeof editing === "number" ? draft.faqs[editing] : null} onSave={(f) => {
        set("faqs")(typeof editing === "number" ? draft.faqs.map((x, i) => (i === editing ? f : x)) : [...draft.faqs, f]);
        setEditing(undefined);
      }} />
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove this question?" text={removing ? `“${removing.name}” comes off the course's FAQs when you save the course.` : ""} confirmLabel="Remove question" onConfirm={() => { const r = removing; setRemoving(null); set("faqs")(draft.faqs.filter((_, j) => j !== r.index)); }} />
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

// Skill Saver, and the price: a self-paced course has one price or a price plan; classroom and live online courses are priced on
// each date, so this step holds their dates (Create cohort opens the same form as the Cohorts page).
// Prices include VAT and change straight away, even on a live course.
function PricingSection({ draft, setDraft, errors, access, course, onSaved }) {
  const set = useSet(setDraft);
  const locked = !access.pricing;
  const { organisationId, can } = useProviderAccess();
  const [adding, setAdding] = useState(false);
  const ep = useEndpoints();
  const enquiries = course.model === "enquiries";
  const plans = api.provider.plans.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) && draft.method === "self-paced", retry: false }).data || [];
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
  return (
    <form className="rt-acc__stack" noValidate onSubmit={(e) => e.preventDefault()}>
      <section className="rt-acc__card rt-pws-course-form" aria-labelledby="rt-pws-ce-price-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-price-h">{pricingLabel(draft.method)}</h2>
        <div className="rt-pws-ce__loyalty">
          <label className="rt-fp__opt">
            <input name="skillSaver" type="checkbox" className="rt-fp__check" checked={draft.skillSaver} disabled={locked} onChange={(e) => set("skillSaver")(e.target.checked)} />
            <span>Include this course in the Skill Saver loyalty programme</span>
          </label>
          <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link>
        </div>
        <FieldErr id="rt-pws-ce-saver" text={errors.skillSaver} />
        {draft.method === "self-paced" ? (
          <>
            {/* Hurak's pricing mode: Flat (one price) or Tiered (packages from a price plan) */}
            <Choice name="rt-pws-ce-pricing" legend="Pricing" value={tiered ? "tiered" : "flat"} onChange={(v) => !locked && setTiered(v === "tiered")}
              options={[{ value: "flat", label: "Flat: one price" }, { value: "tiered", label: "Tiered: packages from a price plan" }]} />
            {tiered ? (
              <div className="rt-field">
                <label htmlFor="rt-pws-ce-plan">Price plan</label>
                <p className="rt-acc__note" id="rt-pws-ce-plan-h">Learners choose a package when they book; the course shows the cheapest package as its price. <Link href="/provider/packages" className="rt-cd__link">{plans.length ? "Manage price plans" : "Create a price plan first"}</Link></p>
                <FieldErr id="rt-pws-ce-plan" text={errors.planId} />
                <FieldSelect id="rt-pws-ce-plan" label="Price plan" placeholder={plans.length ? "Choose a price plan" : "No price plans yet"} value={draft.planId} disabled={locked} onChange={set("planId")}
                  options={plans.filter((p) => !p.archived || p.id === course.planId).map((p) => ({ value: p.id, label: `${p.name}: ${p.tiers.map((t) => `${t.name} ${formatPrice(t.pricePence / 100)}`).join(" · ")}` }))}
                  invalid={Boolean(errors.planId)} describedBy="rt-pws-ce-plan-h" />
              </div>
            ) : (
              <div className="rt-field rt-pws-course-price">
                <label htmlFor="rt-pws-ce-pricein">Price per learner, including VAT</label>
                <FieldErr id="rt-pws-ce-pricein" text={errors.price} />
                <div className="rt-pws-course-money">
                  <span aria-hidden="true">£</span>
                  <input id="rt-pws-ce-pricein" type="text" inputMode="decimal" value={draft.price} disabled={locked} onChange={(e) => set("price")(e.target.value.trim())} aria-invalid={errors.price ? true : undefined} aria-describedby={errors.price ? "rt-pws-ce-pricein-e" : undefined} autoComplete="off" />
                </div>
              </div>
            )}
          </>
        ) : draft.method !== course.method ? (
          <p className="rt-acc__note">Save the new mode of study first: its dates and prices follow from it.</p>
        ) : (
          <>
            <p className="rt-acc__note">Each date (a cohort) has its own {course.method === "classroom" ? "venue, " : "joining link, "}places and price: you can charge more for a Saturday or a busy month. {enquiries ? "Learners see the dates once the course is live and send you an enquiry." : "Learners see the dates once the course is live; online booking opens in a later update."}</p>
            <div className="rt-pws-ce__dates">
              <p className="rt-pws-ce__datecount">{course.upcomingCohorts ? `${course.upcomingCohorts} upcoming ${course.upcomingCohorts === 1 ? "date" : "dates"}` : "No upcoming dates yet"}</p>
              {can("provider.cohorts.edit") && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setAdding(true)}>Create cohort</button>}
              {course.cohortCount > 0 && <Link href={`/provider/cohorts?course=${course.id}`} className="rt-cd__link">Manage this course&apos;s dates</Link>}
            </div>
          </>
        )}
      </section>
      <CohortForm open={adding} onClose={() => setAdding(false)} suggestCourseId={course.id} onSaved={() => {
        setAdding(false);
        ep.refresh();
        onSaved("Dates added");
      }} />
    </form>
  );
}

// ---- Mode of study ---------------------------------------------------------------------------------------------------------

function ModeSection({ course, draft, setDraft, access, errors }) {
  const set = useSet(setDraft);
  const locked = !access.full || course.cohortCount > 0;

  return (
    <div className="rt-acc__stack">
      <form className="rt-acc__card rt-pws-course-form" noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="rt-pws-ce-mode-h">
        <h2 className="rt-acc__h2" id="rt-pws-ce-mode-h">Mode of study</h2>
        {course.cohortCount > 0 && <p className="rt-adm-item__block">This course has dates, so how it is taught can&apos;t change. Remove its dates first, or create a new course for another mode of study.</p>}
        <CardChoice name="rt-pws-ce-format" legend="How is the course taught?" value={draft.method} onChange={(v) => !locked && set("method")(v)}
          options={pw.formats.map((f) => ({ value: f.key, label: methodName(f.key), text: f.text, disabled: locked && f.key !== draft.method }))} />
        <FieldErr id="rt-pws-ce-format" text={errors.method} />
        <CardChoice name="rt-pws-ce-model" legend="How do learners reach you?" value={draft.model} onChange={(v) => access.full && set("model")(v)}
          options={Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label, text: m.text, disabled: !access.full && value !== draft.model }))} />
        <FieldErr id="rt-pws-ce-model" text={errors.model} />
        {draft.method !== course.method && <p className="rt-acc__note">{draft.method === "self-paced" && (course.status === "live" || course.status === "paused") ? "Save to change how the course is taught. A live self-paced course needs its price: add it in the Price step first." : "Save to change how the course is taught."}</p>}
      </form>

      {draft.method === "self-paced" && draft.method === course.method && (
        <section className="rt-acc__card rt-pws-course-form" aria-label="Self-paced">
          <p className="rt-acc__note">Self-paced courses have no dates: learners start straight away. The course shows on ReadTraining with its price; lessons for self-paced courses come in a later update.</p>
        </section>
      )}
    </div>
  );
}
