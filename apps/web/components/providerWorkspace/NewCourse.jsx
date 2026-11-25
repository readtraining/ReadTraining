"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet, { DISCARD_MESSAGE } from "@/components/testPrep/runner/Sheet";
import { leaveWithoutAsking, useUnsavedChanges } from "@/lib/unsavedChanges";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorText } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { CardChoice, KeepWidth, Loading, WayCards } from "./providerParts";
import { useTaxonomy } from "@/lib/taxonomyContext";
import { categoryName, categoryOptions, getTaxonomy, methodName, pagesForSubject, subcategoryName, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { LEARNING_OPTIONS } from "@/lib/courseModes";
import { EmptyState, ErrorState } from "@/components/states/States";
import { Req } from "./settingsForm";

// New course: one pop-up on one screen, over whatever workspace page it was opened from (ProviderShell holds it). What the
// course is (working title; category and sub-category: the topic is chosen by our team when they approve it, admin.courses.decide)
// and how it is taught (its primary learning option, three cards in a row; more ways later in the editor's Learning options), plus Skill Saver
// (an unticked opt-in, changeable later in the editor's Dates and prices step). Where learners find it is not asked: when the subject has a shared course page, the course goes on it (sharedPageFor), said in one quiet line, and the
// course settings (the gear) can change it later. The pop-up also does some of the work: the subject is suggested from the
// title (subjectFor; "Use this" fills both), and a title the provider already has is pointed out (a note, not a block).
// The cursor starts in the title, Enter creates the draft, and the performance model (Bookings to start) is set in its editor
// step. Create course saves it as a draft and opens the editor.
const NewCourseContext = createContext(() => {});
export const NewCourseProvider = NewCourseContext.Provider;
export const useNewCourse = () => useContext(NewCourseContext);

// a "New course" button (the Courses page's main action, the Dashboard's empty Courses card): opens the pop-up where the person is;
// nothing for someone whose role can't create courses, nor for ReadTraining staff working here (a new course is the provider's)
export function NewCourseButton({ className = "button -sm -purple-1 text-white", children = "New course" }) {
  const open = useNewCourse();
  const { can, staff } = useProviderAccess();
  if (!can("provider.courses.edit") || staff) return null;
  return <button type="button" className={className} onClick={open}>{children}</button>;
}

// The subject a title points to, from the catalogue's own names: the topic (or, failing that, the sub-category) whose
// meaningful words all appear in the title (three or more words: at least three in four), the most words winning and a name
// found whole in the title first. Words like "course", "level" or "award" say nothing about the subject, and plurals count as
// one word. Null when nothing fits, or when the title fits two subjects about equally well (it names two courses: "Emergency
// Paediatric First Aid at Work"), so nothing is suggested rather than a guess.
const STOP = new Set(["a", "an", "and", "the", "of", "for", "in", "at", "to", "with", "on", "your", "course", "courses", "training", "level", "award", "certificate", "qualification", "day", "online", "uk"]);
const plain = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const wordsOf = (s) => plain(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
export function subjectFor(title) {
  const said = new Set(wordsOf(title));
  if (!said.size) return null;
  const text = ` ${plain(title)} `;
  const fits = [];
  const consider = (name, pick, bonus) => {
    const words = wordsOf(name);
    if (!words.length) return;
    const hits = words.filter((w) => said.has(w)).length;
    if (hits < (words.length <= 2 ? words.length : Math.ceil(words.length * 0.75))) return;
    const score = hits * 10 + (text.includes(` ${plain(name)} `) ? 15 : 0) + bonus; // a name found whole is the strongest sign
    fits.push({ score, ...pick });
  };
  for (const c of getTaxonomy().categories) {
    for (const sub of c.subcategories || []) {
      // a topic's name points to its sub-category too (the topic itself is our team's choice)
      consider(sub.name, { category: c.slug, subcategory: sub.slug }, 0);
      for (const t of sub.topics || []) consider(t.name, { category: c.slug, subcategory: sub.slug }, 1);
    }
  }
  fits.sort((a, b) => b.score - a.score);
  const [best] = fits;
  const rival = fits.find((x) => x.subcategory !== best?.subcategory);
  if (!best || (rival && best.score - rival.score < 8)) return null;
  return { category: best.category, subcategory: best.subcategory };
}

// the one shared page a course with this sub-category goes on for now: the sub-category's only page; none when it has several
// (the topic our team chooses at approval decides), so nothing is guessed
const sharedPageFor = (pages) => (pages.length === 1 ? pages[0] : null);

// how each learning option reads on its card: one short line, so three fit side by side
const WAY_TEXT = { classroom: "At a venue, on your dates", "live-online": "By video, on your dates", "self-paced": "Any time, at their own pace" };
// and its icon from the site's own line icons (the header's set): a building, a screen, a clock

const BLANK = { title: "", method: "classroom", category: "", subcategory: "", compliance: "", skillSaver: false };

// anything typed or chosen: closing (×, Esc, the backdrop, Cancel), a link or closing the tab asks first; none once it is created
export function NewCourseSheet({ open, onClose }) {
  const [dirty, setDirty] = useState(false);
  // each opening starts a fresh form (its key), and the form stays in the pop-up while it fades out, so closing never shows an
  // empty box
  const [round, setRound] = useState(0);
  useUnsavedChanges(open && dirty);
  useEffect(() => {
    if (open) setRound((r) => r + 1);
    else setDirty(false);
  }, [open]);
  const cancel = () => {
    if (dirty && !window.confirm(DISCARD_MESSAGE)) return;
    onClose();
  };
  const creating = useIsMutating() > 0; // the draft is being created: it opens in the editor once it is
  return (
    <Sheet open={open} onClose={onClose} title="New course" closeLabel="Close" unsaved={dirty} busy={creating} className="rt-pws-nc__sheet">
      <NewCourseForm key={round} onCancel={cancel} onDirty={setDirty} />
    </Sheet>
  );
}

function NewCourseForm({ onCancel, onDirty }) {
  const router = useRouter();
  const taxonomy = useTaxonomy();
  const { organisationId, can, status } = useProviderAccess();
  const [f, setF] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [failed, setFailed] = useState("");
  const create = api.provider.courses.create.useMutation();
  const shared = api.provider.courses.sharedPages.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const mine = api.provider.courses.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const pages = f.subcategory ? pagesForSubject(shared.data || [], f) : [];
  const page = sharedPageFor(pages);
  const ref = useRef(null);
  // a change clears the message of what changed and of the questions that depend on it
  const DEPENDS = { category: ["subcategory"] };
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }));
    setErrors((e) => {
      const gone = Object.keys(patch).flatMap((k) => [k, ...(DEPENDS[k] || [])]);
      return gone.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !gone.includes(k))) : e;
    });
  };
  const hasTopics = topicOptions(f.category, f.subcategory).length > 0;
  // the subject the title points to, offered until a category is chosen; a course of theirs with the same title, pointed out
  const suggestion = useMemo(() => (f.category || f.title.trim().length < 4 ? null : subjectFor(f.title)), [f.title, f.category]);
  const twin = useMemo(() => {
    const t = plain(f.title);
    return t.length < 3 ? null : (mine.data || []).find((c) => plain(c.title || "") === t) || null;
  }, [f.title, mine.data]);
  // the cursor starts in the title, once the pop-up is actually showing (it fades in, and on a busy page that takes longer:
  // focusing a field that isn't visible yet silently fails and typing would go to the page behind). It waits for the pop-up
  // to put focus on its heading first (so screen readers hear the title), and never takes focus from a field the person
  // has already gone to.
  useEffect(() => {
    let tries = 0;
    let timer;
    const place = () => {
      const field = document.getElementById("rt-pws-nc-title");
      const sheet = field?.closest(".rt-dd");
      const at = document.activeElement;
      const theirs = sheet?.contains(at) && at !== field && at?.tagName !== "H2";
      if (!field || theirs || at === field) return;
      if (sheet.classList.contains("is-in") && getComputedStyle(field).visibility === "visible" && tries > 0) field.focus({ preventScroll: true });
      if (document.activeElement !== field && ++tries < 40) timer = setTimeout(place, 50);
    };
    timer = setTimeout(place, 50);
    return () => clearTimeout(timer);
  }, []);
  // anything changed from the starting values (the learning option starts as In-person classroom, so that alone isn't a change)
  const dirty = Object.entries(f).some(([k, v]) => (typeof v === "string" ? v.trim() : v) !== BLANK[k]);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  const save = (ev) => {
    ev.preventDefault();
    const e = {};
    const t = f.title.trim();
    // the title as the API checks it (3 to 60 characters)
    if (!t) e.title = "Enter a working title. You can change it later.";
    else if (t.length < 3) e.title = "Enter a title of at least 3 characters.";
    if (!f.category) e.category = "Choose a category.";
    else if (!f.subcategory) e.subcategory = "Choose a sub-category."; // only once a category is chosen (until then it can't be)
    if (!f.compliance) e.compliance = pw.compliance.error;
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(ref.current);
    setFailed("");
    create.mutate(
      { organisationId, title: t, category: f.category, subcategory: f.subcategory, compliance: f.compliance === "yes", method: f.method, model: "bookings", skillSaver: f.skillSaver },
      {
        onSuccess: ({ id }) => {
          onDirty(false);
          leaveWithoutAsking(() => router.push(`/provider/courses/${id}?created=1`));
        },
        onError: (error) => setFailed(errorText(error)),
      },
    );
  };
  const busy = create.isPending || create.isSuccess;
  const Err = ({ k }) => (errors[k] ? <p className="rt-q__err" id={`rt-pws-nc-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p> : null);

  // not approved yet: courses come after our team's approval (the API refuses them too); otherwise it's the person's role
  if (status === "pending" || status === "changes_requested") return <EmptyState title={pw.notApproved.title} text={pw.notApproved.text} action={pw.notApproved.action} />;
  if (status === "suspended") return <EmptyState title={pw.accountStatus.suspended.title} text={pw.accountStatus.suspended.text} action={pw.accountStatus.suspended.action} />;
  if (!can("provider.courses.edit")) return <ErrorState title="You can't create courses." text="Ask the owner or an admin of your provider account to give you the Course editor role." />;
  // the categories come from the catalogue list; without it a course can't be filed
  if (!categoryOptions().length) return taxonomy?.loading ? <Loading rows={2} /> : <ErrorState title="We couldn't load the course categories." text="Check your connection, then try again." onRetry={taxonomy?.retry} />;

  return (
    <form className="rt-q__form rt-pws-nc" onSubmit={save} noValidate ref={ref}>
      {/* the course: its name and the subject it is filed under */}
      <div className="rt-pws-nc__group">
        <div className="rt-field">
          <div className="rt-pws-nc__labelrow">
            <label htmlFor="rt-pws-nc-title">Working title<Req /></label>
            <span className="rt-pws-nc__count" aria-hidden="true">{f.title.length}/60</span>
          </div>
          <Err k="title" />
          <input id="rt-pws-nc-title" value={f.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="For example: Emergency First Aid at Work" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={[errors.title && "rt-pws-nc-title-e", twin && "rt-pws-nc-twin"].filter(Boolean).join(" ") || undefined} />
          {twin && (
            <p className="rt-pws-nc__note" id="rt-pws-nc-twin">
              You already have “{twin.title}” ({pw.courseStatuses[twin.status] || twin.status}). <Link href={`/provider/courses/${twin.id}/overview`} className="rt-cd__link">Open it</Link>, or carry on to make another.
            </p>
          )}
        </div>
        {/* the subject the title points to, announced politely as it appears */}
        <div aria-live="polite" className="rt-pws-nc__live">
          {suggestion && (
            <p className="rt-pws-nc__suggest">
              <span>Looks like <b>{[categoryName(suggestion.category), subcategoryName(suggestion.category, suggestion.subcategory)].join(" › ")}</b></span>
              <button type="button" className="rt-pws-set__textbtn" onClick={() => {
                set({ category: suggestion.category, subcategory: suggestion.subcategory });
                // the button goes once the subject is filled in: the keyboard moves on to the sub-category
                requestAnimationFrame(() => (document.getElementById("rt-pws-nc-subcategory") || document.getElementById("rt-pws-nc-category"))?.focus());
              }}>Use this</button>
            </p>
          )}
        </div>
        <div className="rt-pws-nc__row">
          <div className="rt-field">
            <label htmlFor="rt-pws-nc-category">Category<Req /></label>
            <Err k="category" />
            <FieldSelect id="rt-pws-nc-category" label="Category" placeholder="Choose a category" value={f.category} onChange={(v) => set({ category: v, subcategory: "" })} options={categoryOptions()} invalid={Boolean(errors.category)} describedBy={errors.category ? "rt-pws-nc-category-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-nc-subcategory">Sub-category<Req /></label>
            <Err k="subcategory" />
            <FieldSelect id="rt-pws-nc-subcategory" label="Sub-category" placeholder={f.category ? "Choose a sub-category" : "Choose a category first"} value={f.subcategory} onChange={(v) => set({ subcategory: v })} options={subcategoryOptions(f.category)} disabled={!f.category} invalid={Boolean(errors.subcategory)} describedBy={errors.subcategory ? "rt-pws-nc-subcategory-e" : undefined} />
          </div>
        </div>
        {/* where it is listed: the sub-category's shared page when there is one; the topic (and so the page, when the
            sub-category has several) is our team's choice when they approve it */}
        {f.subcategory && (page || hasTopics) && (
          <p className="rt-pws-nc__note" id="rt-pws-nc-page">
            {page ? `Listed on the shared course page for ${page.title}, beside other providers.` : ""}
            {page && hasTopics ? " " : ""}
            {hasTopics ? "Our team chooses the exact topic when they approve the course." : ""}
          </p>
        )}
        <CardChoice name="rt-pws-nc-compliance" legend={<>{pw.compliance.legend}<Req /></>} value={f.compliance} onChange={(v) => set({ compliance: v })} options={pw.compliance.options} error={errors.compliance} />
        <p className="rt-pws-nc__hint">{pw.compliance.hint}</p>
      </div>

      {/* how it is taught (its primary learning option) and Skill Saver */}
      <div className="rt-pws-nc__group">
        <fieldset className="rt-field rt-pws-nc__ways" aria-describedby="rt-pws-nc-ways-h">
          <legend>How will you teach it?</legend>
          <p className="rt-pws-nc__hint" id="rt-pws-nc-ways-h">Pick the main way. You can add more ways later in the course editor.</p>
          <WayCards name="rt-pws-nc-method" value={f.method} onChange={(m) => set({ method: m })}
            options={LEARNING_OPTIONS.filter((m) => methodName(m)).map((m) => ({ value: m, label: methodName(m), text: WAY_TEXT[m] }))} />
        </fieldset>
        <div className="rt-pws-nc__check">
          <input id="rt-pws-nc-saver" name="skillSaver" type="checkbox" className="rt-fp__check" checked={f.skillSaver} onChange={(e) => set({ skillSaver: e.target.checked })} aria-describedby="rt-pws-nc-saver-h" />
          <div>
            <label htmlFor="rt-pws-nc-saver">Include in Skill Saver</label>
            <p id="rt-pws-nc-saver-h">Learners get money off their next course, and yours shows the badge. <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link></p>
          </div>
        </div>
      </div>
      {failed && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{failed}</p>}
      <div className="rt-pws-set__actions">
        <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}><KeepWidth label="Create course" busy={busy} working={create.isSuccess ? "Opening the editor…" : "Saving…"} /></button>
        <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
