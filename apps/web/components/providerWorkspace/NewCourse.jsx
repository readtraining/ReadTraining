"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet, { DISCARD_MESSAGE } from "@/components/testPrep/runner/Sheet";
import { leaveWithoutAsking, useUnsavedChanges } from "@/lib/unsavedChanges";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { CardChoice, Loading } from "./providerParts";
import { useTaxonomy } from "@/lib/taxonomyContext";
import { categoryOptions, pagesForSubject, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";

// New course: one pop-up on one screen, over whatever workspace page it was opened from (ProviderShell holds it). It asks the
// working title, the category, sub-category and topic (optional: the course itself, which also picks the right shared page), whether to list it on the shared course page when that
// sub-category has one (changeable later in the course settings, the gear), and Skill Saver (an opt-in tick box, unticked, as in
// the editor's Dates and prices step). The performance model (a new course starts as Bookings) is set in its editor step. Create draft makes a classroom draft and opens the editor.
const NewCourseContext = createContext(() => {});
export const NewCourseProvider = NewCourseContext.Provider;
export const useNewCourse = () => useContext(NewCourseContext);

// a "New course" button anywhere in the workspace: opens the pop-up where the person is
export function NewCourseButton({ className = "button -sm -purple-1 text-white", children = "New course" }) {
  const open = useNewCourse();
  return <button type="button" className={className} onClick={open}>{children}</button>;
}

const BLANK = { title: "", category: "", subcategory: "", topic: "", shared: "", parentId: "", skillSaver: false };

// anything typed or chosen: closing (×, Esc, the backdrop, Cancel), a link or closing the tab asks first; none once it is created
export function NewCourseSheet({ open, onClose }) {
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(open && dirty);
  useEffect(() => {
    if (!open) setDirty(false);
  }, [open]);
  const cancel = () => {
    if (dirty && !window.confirm(DISCARD_MESSAGE)) return;
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="New course" closeLabel="Close" unsaved={dirty} className="rt-pws-nc__sheet">
      {open && <NewCourseForm onCancel={cancel} onDirty={setDirty} />}
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
  const pages = f.subcategory ? pagesForSubject(shared.data || [], f) : [];
  // one shared page for the subject is the one; with several, the person picks
  const parentId = pages.length === 1 ? String(pages[0].id) : f.parentId;
  const parentOk = pages.some((p) => String(p.id) === parentId);
  const toPage = pages.length > 0 && f.shared === "yes";
  const ref = useRef(null);
  // a change clears the message of what changed and of the questions that depend on it
  const DEPENDS = { category: ["subcategory", "topic", "shared", "parentId"], subcategory: ["topic", "shared", "parentId"], topic: ["shared", "parentId"], shared: ["parentId"] };
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }));
    setErrors((e) => {
      const gone = Object.keys(patch).flatMap((k) => [k, ...(DEPENDS[k] || [])]);
      return gone.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !gone.includes(k))) : e;
    });
  };
  const topics = topicOptions(f.category, f.subcategory);
  const dirty = Object.values(f).some((v) => (typeof v === "boolean" ? v : String(v).trim() !== ""));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  const save = (ev) => {
    ev.preventDefault();
    const e = {};
    const t = f.title.trim();
    // the title as the API checks it (3 to 80 characters)
    if (!t) e.title = "Enter a working title. You can change it later.";
    else if (t.length < 3) e.title = "Enter a title of at least 3 characters.";
    if (!f.category) e.category = "Choose a category.";
    if (!f.subcategory) e.subcategory = "Choose a sub-category.";
    else if (pages.length && !f.shared) e.shared = "Choose where learners find it.";
    else if (toPage && !parentOk) e.parentId = "Choose the course page.";
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(ref.current);
    setFailed("");
    create.mutate(
      { organisationId, title: t, category: f.category, subcategory: f.subcategory, topic: f.topic || null, method: "classroom", model: "bookings", skillSaver: f.skillSaver, parentId: toPage ? Number(parentId) : null },
      {
        onSuccess: ({ id }) => {
          onDirty(false);
          leaveWithoutAsking(() => router.push(`/provider/courses/${id}?created=1`));
        },
        onError: (error) => setFailed(errorsFrom(error).general || Object.values(errorsFrom(error).fields)[0]),
      },
    );
  };
  const busy = create.isPending || create.isSuccess;
  const Err = ({ k }) => (errors[k] ? <p className="rt-q__err" id={`rt-pws-nc-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p> : null);

  // not approved yet: courses come after our team's approval (the API refuses them too); otherwise it's the person's role
  if (status === "pending" || status === "changes_requested") return <EmptyState title={pw.notApproved.title} text={pw.notApproved.text} action={pw.notApproved.action} />;
  if (!can("provider.courses.edit")) return <ErrorState title="You can't create courses." text="Ask the owner or an admin of your provider account to give you the Course editor role." />;
  // the categories come from the catalogue list; without it a course can't be filed
  if (!categoryOptions().length) return taxonomy?.loading ? <Loading rows={2} /> : <ErrorState title="We couldn't load the course categories." text="Check your connection, then try again." onRetry={taxonomy?.retry} />;

  return (
    <form className="rt-q__form rt-pws-nc" onSubmit={save} noValidate ref={ref}>
      {/* the course: its name and the subject it is filed under */}
      <div className="rt-pws-nc__group">
        <div className="rt-field">
          <div className="rt-pws-nc__labelrow">
            <label htmlFor="rt-pws-nc-title">Working title</label>
            <span className="rt-pws-nc__count" aria-hidden="true">{f.title.length}/80</span>
          </div>
          <Err k="title" />
          <input id="rt-pws-nc-title" value={f.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} placeholder="For example: Emergency First Aid at Work" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? "rt-pws-nc-title-e" : undefined} />
        </div>
        <div className="rt-pws-nc__row">
          <div className="rt-field">
            <label htmlFor="rt-pws-nc-category">Category</label>
            <Err k="category" />
            <FieldSelect id="rt-pws-nc-category" label="Category" placeholder="Choose a category" value={f.category} onChange={(v) => set({ category: v, subcategory: "", topic: "", shared: "", parentId: "" })} options={categoryOptions()} invalid={Boolean(errors.category)} describedBy={errors.category ? "rt-pws-nc-category-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-pws-nc-subcategory">Sub-category</label>
            <Err k="subcategory" />
            <FieldSelect id="rt-pws-nc-subcategory" label="Sub-category" placeholder={f.category ? "Choose a sub-category" : "Choose a category first"} value={f.subcategory} onChange={(v) => set({ subcategory: v, topic: "", shared: "", parentId: "" })} options={subcategoryOptions(f.category)} disabled={!f.category} invalid={Boolean(errors.subcategory)} describedBy={errors.subcategory ? "rt-pws-nc-subcategory-e" : undefined} />
          </div>
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-nc-topic">Topic <span className="rt-pws-nc__opt">(optional)</span></label>
          <FieldSelect id="rt-pws-nc-topic" label="Topic" placeholder={!f.subcategory ? "Choose a sub-category first" : topics.length ? "Choose a topic" : "No topics for this sub-category"} value={f.topic} onChange={(v) => set({ topic: v, shared: "", parentId: "" })} options={topics} disabled={!topics.length} />
        </div>
      </div>

      {/* where it is listed and whether it is in Skill Saver, as the site's option cards */}
      <div className="rt-pws-nc__group">
        {pages.length > 0 && (
          <CardChoice name="rt-pws-nc-shared" legend="Where should learners find it?" value={f.shared} onChange={(v) => set({ shared: v, parentId: "" })} error={errors.shared}
            options={[
              { value: "yes", label: "On our shared course page", text: "Listed beside other providers, so learners compare dates and prices." },
              { value: "no", label: "On its own page", text: "Only your course. You can change this later." },
            ]} />
        )}
        {toPage && pages.length > 1 && (
          <div className="rt-field">
            <label htmlFor="rt-pws-nc-parentId">Shared course page</label>
            <Err k="parentId" />
            <FieldSelect id="rt-pws-nc-parentId" label="Shared course page" placeholder="Choose the course page" value={parentOk ? parentId : ""} onChange={(v) => set({ parentId: v })} options={pages.map((p) => ({ value: String(p.id), label: p.title }))} invalid={Boolean(errors.parentId)} describedBy={errors.parentId ? "rt-pws-nc-parentId-e" : undefined} />
          </div>
        )}
        <label className={`rt-pws-optcard${f.skillSaver ? " is-on" : ""}`}>
          <input id="rt-pws-nc-saver" name="skillSaver" type="checkbox" checked={f.skillSaver} onChange={(e) => set({ skillSaver: e.target.checked })} />
          <span>
            <b>Include in Skill Saver</b>
            <small>Learners get money off their next course, and yours shows the badge. <Link href="/skill-saver" className="rt-cd__link" target="_blank" rel="noopener noreferrer">Learn more</Link></small>
          </span>
        </label>
      </div>
      {failed && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{failed}</p>}
      <div className="rt-pws-set__actions">
        <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{create.isSuccess ? "Opening the editor…" : create.isPending ? "Creating draft…" : "Create draft"}</button>
        <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
