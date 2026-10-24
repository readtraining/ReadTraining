"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { useEndpoints } from "@/lib/courseEditorApi";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Choice, Toggle } from "./providerParts";

// The course editor's self-saving parts: SEO settings, and the gear's course settings (a provider's course, or a shared course
// page in the admin). Each saves on its own (SEO with its button, the gear as you choose) and reports back through onSaved for the
// editor's toast. They change a live course straight away.

const Err = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);

// SEO settings: title (60), description (320) and keywords, with a search result preview.
export function SeoPanel({ course, onSaved }) {
  const ep = useEndpoints();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(course.seoTitle || "");
  const [desc, setDesc] = useState(course.seoDescription || "");
  const [keywords, setKeywords] = useState(course.seoKeywords || []);
  const [word, setWord] = useState("");
  const [errors, setErrors] = useState({});
  const ref = useRef(null);

  const addWords = (text) => {
    const add = text.split(",").map((w) => w.trim().toLowerCase().slice(0, 40)).filter((w) => w && !keywords.includes(w));
    if (add.length) setKeywords([...keywords, ...add].slice(0, 20));
    setWord("");
  };
  const submit = (e) => {
    e.preventDefault();
    const all = word.trim() ? [...keywords, ...word.split(",").map((w) => w.trim().toLowerCase().slice(0, 40)).filter(Boolean)] : keywords;
    const er = {};
    if (!title.trim()) er.title = "Enter the SEO title.";
    if (!desc.trim()) er.desc = "Enter the SEO description.";
    setErrors(er);
    if (Object.keys(er).length) return focusFirstError(ref.current);
    const seoKeywords = [...new Set(all)].slice(0, 20);
    setKeywords(seoKeywords);
    setWord("");
    setBusy(true);
    ep.update({ seoTitle: title.trim(), seoDescription: desc.trim(), seoKeywords })
      .then(() => { ep.refresh(); onSaved("SEO settings saved"); })
      .catch((error) => setErrors({ form: errorsFrom(error).general || Object.values(errorsFrom(error).fields)[0] }))
      .finally(() => setBusy(false));
  };
  const locked = !ep.access.page;

  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-st">SEO title</label>
        <Err id="rt-pws-cset-st" text={errors.title} />
        <input id="rt-pws-cset-st" type="text" maxLength={60} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={`${errors.title ? "rt-pws-cset-st-e " : ""}rt-pws-cset-st-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-st-c">{title.length} of 60 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-sd">SEO description</label>
        <Err id="rt-pws-cset-sd" text={errors.desc} />
        <textarea id="rt-pws-cset-sd" rows={4} maxLength={320} autoComplete="off" value={desc} onChange={(e) => setDesc(e.target.value)} aria-invalid={errors.desc ? true : undefined} aria-describedby={`${errors.desc ? "rt-pws-cset-sd-e " : ""}rt-pws-cset-sd-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-sd-c">{desc.length} of 320 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-kw">Course keywords (optional)</label>
        <small className="rt-field__hint" id="rt-pws-cset-kw-h">Press Enter or type a comma after each one. Up to 20.</small>
        {keywords.length > 0 && (
          <ul className="rt-pws-cset__tags">
            {keywords.map((k) => (
              <li key={k}><span>{k}</span><button type="button" onClick={() => setKeywords(keywords.filter((x) => x !== k))} aria-label={`Remove keyword ${k}`}><i className="icon-close text-10" aria-hidden="true"></i></button></li>
            ))}
          </ul>
        )}
        <input id="rt-pws-cset-kw" type="text" maxLength={200} autoComplete="off" value={word}
          onChange={(e) => (e.target.value.includes(",") ? addWords(e.target.value) : setWord(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWords(word); } }}
          aria-describedby="rt-pws-cset-kw-h" />
      </div>
      <div className="rt-pws-cset__serp" aria-label="Search result preview">
        <p className="rt-pws-cset__previewlabel">Search result preview</p>
        <span className="rt-pws-cset__serpurl">readtraining.co.uk › course › {course.slug}</span>
        <span className="rt-pws-cset__serptitle">{title.trim() || course.title}</span>
        <span className="rt-pws-cset__serpdesc">{desc.trim() || course.summary || "Your description shows here."}</span>
      </div>
      {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
      {!locked && <div><button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : "Save"}</button></div>}
    </form>
  );
}

// The gear on every editor page (Hurak's course settings): who can enrol (public or private), the address to share, the shared
// course page it is listed under, showing it in ReadTraining's search, pausing a live course, and deleting a course that has never
// been live. Each choice saves at once.
export function CourseGear({ course, open, onClose, onSaved }) {
  const router = useRouter();
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const update = api.provider.courses.update.useMutation();
  const pause = api.provider.courses.setPaused.useMutation();
  const remove = api.provider.courses.remove.useMutation();
  const shared = api.provider.courses.sharedPages.useQuery({ organisationId }, { enabled: open && Boolean(organisationId) });
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const edit = can("provider.courses.edit");
  const [url, setUrl] = useState("");
  React.useEffect(() => setUrl(`${window.location.origin}/course/${course.slug}`), [course.slug]);

  const refresh = () => {
    utils.provider.courses.get.invalidate({ organisationId, courseId: course.id });
    utils.provider.courses.list.invalidate({ organisationId });
  };
  const fail = (e) => setError(errorsFrom(e).general || Object.values(errorsFrom(e).fields)[0]);
  const change = (patch, message) => {
    setError("");
    update.mutate({ organisationId, courseId: course.id, ...patch }, { onSuccess: () => { refresh(); onSaved(message); }, onError: fail });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onSaved("Course address copied");
    } catch {
      document.getElementById("rt-pws-gear-url")?.select();
      onSaved("Press Ctrl+C to copy the link");
    }
  };
  const doRemove = () => {
    setError("");
    remove.mutate({ organisationId, courseId: course.id }, { onSuccess: () => { utils.provider.courses.list.invalidate({ organisationId }); router.push("/provider/courses"); }, onError: fail });
  };
  const close = () => {
    setConfirm(false);
    setError("");
    onClose();
  };
  const busy = update.isPending || pause.isPending || remove.isPending;
  const pages = shared.data || [];
  const parentOptions = [{ value: "", label: "None: the course has its own page" }, ...pages.map((p) => ({ value: String(p.id), label: p.title }))];
  if (course.parent && !pages.some((p) => p.id === course.parent.id)) parentOptions.push({ value: String(course.parent.id), label: course.parent.title });

  return (
    <Sheet open={open} onClose={close} title={confirm ? "Delete this course?" : "Course settings"} closeLabel="Close">
      {confirm ? (
        <div className="rt-q__form">
          <p className="rt-acc__note">“{course.title}”, its dates and its images will be deleted for good.</p>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -purple-1 text-white" onClick={doRemove} disabled={busy} aria-busy={remove.isPending || undefined}>{remove.isPending ? "Deleting…" : "Delete course"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(false)}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="rt-q__form" aria-busy={busy || undefined}>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <Choice name="rt-pws-gear-enrol" legend="Enrollment (privacy)" hint="Private courses don't show in search; you share the link or book learners yourself." value={course.isPublic ? "public" : "private"} onChange={(v) => edit && change({ isPublic: v === "public" }, v === "private" ? "The course is private" : "The course is public")} options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]} />
          <div className="rt-field">
            <label htmlFor="rt-pws-gear-url">Course address</label>
            <p className="rt-field__hint">Share it on your website or social media{course.status === "live" ? "." : ". It works once the course is live."}</p>
            <div className="rt-pws-course-addrow">
              <input id="rt-pws-gear-url" value={url} readOnly onFocus={(e) => e.target.select()} />
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={copy}>Copy</button>
            </div>
          </div>
          {(pages.length > 0 || course.parent) && (
            <div className="rt-field">
              <label htmlFor="rt-pws-gear-parent">Shared course page</label>
              <p className="rt-field__hint" id="rt-pws-gear-parent-h">A page on ReadTraining that lists every provider running this course, so learners can compare dates and prices.</p>
              <FieldSelect id="rt-pws-gear-parent" label="Shared course page" value={course.parent ? String(course.parent.id) : ""} onChange={(v) => change({ parentId: v ? Number(v) : null }, v ? "Listed on the shared course page" : "The course now has its own page")} options={parentOptions} disabled={!edit || busy} describedBy="rt-pws-gear-parent-h" />
            </div>
          )}
          <Toggle id="rt-pws-gear-market" checked={course.listed} disabled={!edit || busy} onChange={(v) => change({ listed: v }, v ? "The course shows in ReadTraining's search" : "The course is hidden from ReadTraining's search")} label="Show this course in ReadTraining's search" hint="If it is off, learners can still book through the course address you share." />
          {edit && (course.status === "live" || (course.status === "paused" && !course.statusNote)) && (
            <div className="rt-field">
              <p className="rt-acc__note">{course.status === "live" ? "Pausing takes the course off ReadTraining. Its dates stay, and you can put it back live at any time." : "This course is paused: it doesn't show on ReadTraining."}</p>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => { setError(""); pause.mutate({ organisationId, courseId: course.id, paused: course.status === "live" }, { onSuccess: () => { refresh(); onSaved(course.status === "live" ? "The course is paused" : "The course is live again"); }, onError: fail }); }}>{course.status === "live" ? "Pause course" : "Put back live"}</button>
            </div>
          )}
          {can("provider.courses.delete") && (
            <div className="rt-pws-gear__danger">
              {course.publishedAt
                ? <p className="rt-acc__note">A course that has been live can&apos;t be deleted, so its history stays. Pause it to take it off ReadTraining.</p>
                : <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setConfirm(true)}>Delete course</button>}
            </div>
          )}
          {course.method !== "self-paced" && <p className="rt-acc__note"><Link href={`/provider/cohorts?course=${course.id}`} className="rt-cd__link">See this course&apos;s dates</Link></p>}
        </div>
      )}
    </Sheet>
  );
}

// The gear on a shared course page in the admin: the page's address, showing it in ReadTraining's search, taking it off the site or
// publishing it, and deleting a page that has never been live and has no providers' courses on it.
export function SharedGear({ course, open, onClose, onSaved }) {
  const router = useRouter();
  const ep = useEndpoints();
  const utils = api.useUtils();
  const remove = api.admin.courses.removeShared.useMutation();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  React.useEffect(() => setUrl(`${window.location.origin}/course/${course.slug}`), [course.slug]);
  const edit = ep.access.full;
  const run = (fn, message) => {
    setError("");
    setBusy(true);
    fn().then(() => { ep.refresh(); onSaved(message); }).catch((e) => setError(errorsFrom(e).general || Object.values(errorsFrom(e).fields)[0])).finally(() => setBusy(false));
  };
  const close = () => {
    setConfirm(false);
    setError("");
    onClose();
  };
  const blocked = course.children?.length ? `${course.children.length} ${course.children.length === 1 ? "provider course is" : "providers' courses are"} listed on this page, so it can't be deleted. Take it off the site instead.` : course.publishedAt ? "A page that has been live can't be deleted, so its history stays. Take it off the site instead." : "";

  return (
    <Sheet open={open} onClose={close} title={confirm ? "Delete this page?" : "Page settings"} closeLabel="Close">
      {confirm ? (
        <div className="rt-q__form">
          <p className="rt-acc__note">“{course.title}” and its images will be deleted for good.</p>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -purple-1 text-white" disabled={remove.isPending} onClick={() => remove.mutate({ courseId: course.id }, { onSuccess: () => { utils.admin.courses.list.invalidate(); router.push("/admin/catalogue"); }, onError: (e) => setError(errorsFrom(e).general) })}>{remove.isPending ? "Deleting…" : "Delete page"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(false)}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="rt-q__form" aria-busy={busy || undefined}>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <div className="rt-field">
            <label htmlFor="rt-adm-gear-url">Page address</label>
            <p className="rt-field__hint">{course.status === "live" ? "Where learners find the page." : "It works once the page is published."}</p>
            <input id="rt-adm-gear-url" value={url} readOnly onFocus={(e) => e.target.select()} />
          </div>
          <Toggle id="rt-adm-gear-listed" checked={course.listed} disabled={!edit || busy} onChange={(v) => run(() => ep.update({ listed: v }), v ? "The page shows in ReadTraining's search" : "The page is hidden from ReadTraining's search")} label="Show this page in ReadTraining's search" hint="If it is off, the page still works from its address." />
          {edit && course.status === "live" && (
            <div className="rt-field">
              <p className="rt-acc__note">Taking the page off the site hides it and the providers' courses on it, until it is published again.</p>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => run(() => ep.setStatus("paused"), "The page is off the site")}>Take off the site</button>
            </div>
          )}
          {edit && (
            <div className="rt-pws-gear__danger">
              {blocked ? <p className="rt-acc__note">{blocked}</p> : <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setConfirm(true)}>Delete page</button>}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
