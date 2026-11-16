"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sheet, { DISCARD_MESSAGE } from "@/components/testPrep/runner/Sheet";
import { leaveWithoutAsking, useUnsavedChanges } from "@/lib/unsavedChanges";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { Choice, Loading } from "./providerParts";
import { useTaxonomy } from "@/lib/taxonomyContext";
import { categoryOptions, pagesForSubject, subcategoryOptions } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";

// New course: one pop-up on one screen, over whatever workspace page it was opened from (ProviderShell holds it). It asks only
// what the editor doesn't: the working title, the category and sub-category the course is filed under, and, when that
// sub-category has a shared course page, whether to list the course on it. Everything else is set once, in its editor step:
// the topic (Landing page), the performance model (Mode of study; a new course starts as Bookings), Skill Saver (Pricing; off),
// and the shared page can change later in the course settings (the gear). Create draft makes a classroom draft and opens the editor.
const NewCourseContext = createContext(() => {});
export const NewCourseProvider = NewCourseContext.Provider;
export const useNewCourse = () => useContext(NewCourseContext);

// a "New course" button anywhere in the workspace: opens the pop-up where the person is
export function NewCourseButton({ className = "button -sm -purple-1 text-white", children = "New course" }) {
  const open = useNewCourse();
  return <button type="button" className={className} onClick={open}>{children}</button>;
}

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No, give it its own page" }];
const BLANK = { title: "", category: "", subcategory: "", shared: "", parentId: "" };

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
    <Sheet open={open} onClose={onClose} title="New course" closeLabel="Close" unsaved={dirty}>
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
  const DEPENDS = { category: ["subcategory", "shared", "parentId"], subcategory: ["shared", "parentId"], shared: ["parentId"] };
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }));
    setErrors((e) => {
      const gone = Object.keys(patch).flatMap((k) => [k, ...(DEPENDS[k] || [])]);
      return gone.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !gone.includes(k))) : e;
    });
  };
  const dirty = Object.values(f).some((v) => String(v).trim() !== "");
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
    else if (pages.length && !f.shared) e.shared = "Choose Yes or No.";
    else if (toPage && !parentOk) e.parentId = "Choose the course page.";
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(ref.current);
    setFailed("");
    create.mutate(
      { organisationId, title: t, category: f.category, subcategory: f.subcategory, topic: null, method: "classroom", model: "bookings", skillSaver: false, parentId: toPage ? Number(parentId) : null },
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
    <form className="rt-q__form" onSubmit={save} noValidate ref={ref}>
      <div className="rt-field">
        <label htmlFor="rt-pws-nc-title">Working title</label>
        <p className="rt-field__hint" id="rt-pws-nc-title-h">You can change it later.</p>
        <Err k="title" />
        <input id="rt-pws-nc-title" value={f.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} placeholder="For example: Emergency First Aid at Work" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={`rt-pws-nc-title-h${errors.title ? " rt-pws-nc-title-e" : ""}`} />
        <span className="rt-field__hint rt-pws-course-count">{f.title.length} of 80</span>
      </div>
      <div className="rt-pws-nc__row">
        <div className="rt-field">
          <label htmlFor="rt-pws-nc-category">Category</label>
          <Err k="category" />
          <FieldSelect id="rt-pws-nc-category" label="Category" placeholder="Choose a category" value={f.category} onChange={(v) => set({ category: v, subcategory: "", shared: "", parentId: "" })} options={categoryOptions()} invalid={Boolean(errors.category)} describedBy={errors.category ? "rt-pws-nc-category-e" : undefined} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-nc-subcategory">Sub-category</label>
          <Err k="subcategory" />
          <FieldSelect id="rt-pws-nc-subcategory" label="Sub-category" placeholder={f.category ? "Choose a sub-category" : "Choose a category first"} value={f.subcategory} onChange={(v) => set({ subcategory: v, shared: "", parentId: "" })} options={subcategoryOptions(f.category)} disabled={!f.category} invalid={Boolean(errors.subcategory)} describedBy={errors.subcategory ? "rt-pws-nc-subcategory-e" : undefined} />
        </div>
      </div>
      {pages.length > 0 && (
        <Choice name="rt-pws-nc-shared" legend="Advertise it on our shared course page?" hint="A page on ReadTraining that lists every provider running this course, so learners can compare dates and prices. You can change this later in the course settings." value={f.shared} onChange={(v) => set({ shared: v, parentId: "" })} error={errors.shared} options={YES_NO} />
      )}
      {toPage && pages.length > 1 && (
        <div className="rt-field">
          <label htmlFor="rt-pws-nc-parentId">Shared course page</label>
          <Err k="parentId" />
          <FieldSelect id="rt-pws-nc-parentId" label="Shared course page" placeholder="Choose the course page" value={parentOk ? parentId : ""} onChange={(v) => set({ parentId: v })} options={pages.map((p) => ({ value: String(p.id), label: p.title }))} invalid={Boolean(errors.parentId)} describedBy={errors.parentId ? "rt-pws-nc-parentId-e" : undefined} />
        </div>
      )}
      <p className="rt-acc__note">Create draft opens the course editor, where you add everything else. Nobody sees the course until our team approves it.</p>
      {failed && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{failed}</p>}
      <div className="rt-pws-set__actions">
        <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{create.isSuccess ? "Opening the editor…" : create.isPending ? "Creating draft…" : "Create draft"}</button>
        <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
