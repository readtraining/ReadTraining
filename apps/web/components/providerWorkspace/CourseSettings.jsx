"use client";

import React, { useEffect, useRef, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { useEndpoints } from "@/lib/courseEditorApi";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Choice, Toggle } from "./providerParts";
import { leaveWithoutAsking, useUnsavedChanges } from "@/lib/unsavedChanges";
import { contactHref } from "@/lib/forms";
import { isDatedMethod, waysOf } from "@/lib/courseModes";
import TextArea from "@/components/forms/TextArea";

// The course editor's self-saving parts: SEO settings, and the gear's course settings (a provider's course, or a shared course
// page in the admin). Each saves on its own (SEO with its button, the gear as you choose) and reports back through onSaved for the
// editor's toast. They change a live course straight away.

const Err = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);

// SEO settings: title (60), description (320) and keywords, with a search result preview.
export function SeoPanel({ course, onSaved, formId, onState, saveRef }) {
  const ep = useEndpoints();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(course.seoTitle || "");
  const [desc, setDesc] = useState(course.seoDescription || "");
  const [keywords, setKeywords] = useState(course.seoKeywords || []);
  const [word, setWord] = useState("");
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  // what is saved: leaving the page with anything else typed asks first (lib/unsavedChanges.js)
  const [saved, setSaved] = useState({ title: course.seoTitle || "", desc: course.seoDescription || "", keywords: course.seoKeywords || [] });
  const dirty = title !== saved.title || desc !== saved.desc || Boolean(word.trim()) || JSON.stringify(keywords) !== JSON.stringify(saved.keywords);
  useUnsavedChanges(dirty);
  useEffect(() => { onState?.({ dirty, busy }); }, [dirty, busy]); // eslint-disable-line react-hooks/exhaustive-deps -- onState is the editor's setter
  // the editor keeps this form open on its other steps: a newer copy of the course (saved in another tab, or by a colleague) shows
  // here while nothing is typed; typed words stay, and saving them over the newer copy is refused (the editor's banner)
  const savedKey = JSON.stringify([course.seoTitle || "", course.seoDescription || "", course.seoKeywords || []]);
  useEffect(() => {
    if (dirty) return;
    const s = { title: course.seoTitle || "", desc: course.seoDescription || "", keywords: course.seoKeywords || [] };
    setSaved(s);
    setTitle(s.title);
    setDesc(s.desc);
    setKeywords(s.keywords);
  }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the saved words change

  const addWords = (text) => {
    const add = text.split(",").map((w) => w.trim().toLowerCase().slice(0, 40)).filter((w) => w && !keywords.includes(w));
    if (add.length) setKeywords([...keywords, ...add].slice(0, 20));
    setWord("");
  };
  // every field is optional: an empty title or description is saved as none (search engines then use the course's own title and
  // short description, as the preview shows)
  // saves, then says whether it worked (the editor's Send for approval saves this form first)
  const save = () => {
    const all = word.trim() ? [...keywords, ...word.split(",").map((w) => w.trim().toLowerCase().slice(0, 40)).filter(Boolean)] : keywords;
    const seoKeywords = [...new Set(all)].slice(0, 20);
    setErrors({});
    setKeywords(seoKeywords);
    setWord("");
    setBusy(true);
    return ep.update({ seoTitle: title.trim() || null, seoDescription: desc.trim() || null, seoKeywords })
      .then(() => { setSaved({ title: title.trim(), desc: desc.trim(), keywords: seoKeywords }); setTitle(title.trim()); setDesc(desc.trim()); ep.refresh(); onSaved("SEO settings saved"); return true; })
      .catch((error) => {
        if (ep.stale(error)) return false; // changed somewhere else: the editor's banner says so
        const { fields, general } = errorsFrom(error);
        setErrors({ title: fields.seoTitle, desc: fields.seoDescription, form: general || fields.seoKeywords || Object.values(fields)[0] });
        requestAnimationFrame(() => focusFirstError(ref.current));
        return false;
      })
      .finally(() => setBusy(false));
  };
  useEffect(() => { if (saveRef) saveRef.current = save; });
  const submit = (e) => {
    e.preventDefault();
    save();
  };
  const locked = !ep.access.page;

  return (
    <form className="rt-q__form" id={formId} onSubmit={submit} noValidate ref={ref}>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-st">SEO title (optional)</label>
        <Err id="rt-pws-cset-st" text={errors.title} />
        <input id="rt-pws-cset-st" type="text" maxLength={60} autoComplete="off" value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={`${errors.title ? "rt-pws-cset-st-e " : ""}rt-pws-cset-st-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-st-c">{title.length} of 60 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-sd">SEO description (optional)</label>
        <Err id="rt-pws-cset-sd" text={errors.desc} />
        <TextArea id="rt-pws-cset-sd" rows={4} maxLength={320} autoComplete="off" value={desc} disabled={locked} onChange={(e) => setDesc(e.target.value)} aria-invalid={errors.desc ? true : undefined} aria-describedby={`${errors.desc ? "rt-pws-cset-sd-e " : ""}rt-pws-cset-sd-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-sd-c">{desc.length} of 320 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-kw">Course keywords (optional)</label>
        <small className="rt-field__hint" id="rt-pws-cset-kw-h">Press Enter or type a comma after each one. Up to 20.</small>
        {keywords.length > 0 && (
          <ul className="rt-pws-cset__tags">
            {keywords.map((k) => (
              <li key={k}><span>{k}</span>{!locked && <button type="button" onClick={() => setKeywords(keywords.filter((x) => x !== k))} aria-label={`Remove keyword ${k}`}><i className="icon-close text-10" aria-hidden="true"></i></button>}</li>
            ))}
          </ul>
        )}
        <input id="rt-pws-cset-kw" type="text" maxLength={200} autoComplete="off" value={word} disabled={locked}
          onChange={(e) => (e.target.value.includes(",") ? addWords(e.target.value) : setWord(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWords(word); } }}
          aria-describedby="rt-pws-cset-kw-h" />
      </div>
      <div className="rt-pws-cset__serp" role="group" aria-label="Search result preview">
        <p className="rt-pws-cset__previewlabel">Search result preview</p>
        <span className="rt-pws-cset__serpurl">readtraining.co.uk › course › {course.slug}</span>
        <span className="rt-pws-cset__serptitle">{title.trim() || course.title}</span>
        <span className="rt-pws-cset__serpdesc">{desc.trim() || course.summary || "Your description shows here."}</span>
      </div>
      {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
      {!locked && !formId && <div><button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : "Save"}</button></div>}
    </form>
  );
}

// The name typed to confirm deleting a course that has been live: its title, ignoring spaces around it and case (the API checks
// the same, sameName in modules/provider/courses.mts).
const sameName = (typed, title) => typed.trim().toLowerCase() === title.trim().toLowerCase();
// our team's reason for pausing a course, as one sentence (it may or may not end with a full stop)
const teamReason = (note = "") => {
  const t = note.trim().replace(/\.+$/, "");
  return /[!?]$/.test(t) ? t : `${t}.`;
};

// ---- pausing and deleting a provider's course: the gear and the Courses list's ⋮ menu share these, so both follow one rule ----

// Pause and Put back live are offered for a live course and for one the provider paused; a course our team paused has their
// reason (statusNote) and goes back live only through them
export const pausable = (course) => course.status === "live" || (course.status === "paused" && !course.statusNote);
export const PAUSE_NOTE = "Pausing takes the course off ReadTraining. Its dates stay, and you can put it back live at any time.";
// Whether a course can be sent for approval from a list (the course list's ⋮ menu, the Dashboard's to-do): a draft or one our team
// sent back, every editor step done, the provider account approved, and a role that sends courses. The API checks it all again.
export const canSend = (c, access) => (c.status === "draft" || c.status === "changes") && c.stepsLeft === 0 && access.status === "active" && access.can("provider.courses.edit") && !access.staff; // sending stays the provider's

// Send a course for approval from a list: the same call as the editor's last step. One already sent (another tab, a double
// click) counts as sent. `onDone(message, error)` says what happened; the lists load again either way.
export function useSendForApproval(onDone) {
  const { organisationId } = useProviderAccess();
  const utils = api.useUtils();
  const submit = api.provider.courses.submit.useMutation();
  const send = (c) => {
    if (submit.isPending) return;
    // shown as sent at once (In review, out of the to-do list) while the lists load again
    const sent = () => utils.provider.courses.list.setData({ organisationId }, (rows) => rows?.map((r) => (r.id === c.id ? { ...r, status: "pending", stepsLeft: null } : r)));
    submit.mutate({ organisationId, courseId: c.id }, {
      onSuccess: () => {
        sent();
        onDone(COURSE_SAID.sent);
      },
      onError: (e) => {
        if (e?.data?.code === "CONFLICT" && /already waiting/i.test(e.message)) return onDone(COURSE_SAID.sent);
        onDone(errorsFrom(e).general || "We couldn't send it. Check your connection, then try again.", true);
      },
      onSettled: () => utils.provider.courses.list.invalidate({ organisationId }),
    });
  };
  return { send, sendingId: submit.isPending ? submit.variables?.courseId : null };
}

export const COURSE_SAID = { sent: "Sent for approval. We'll email the decision to the account owner.", paused: "The course is paused", resumed: "The course is live again", withdrawn: "Withdrawn from review. The course is a draft again" };

// Why a course can't be deleted now (the API's deleteBlock), with the next step: waiting for review, Withdraw from review; paused
// by our team, their reason and Contact us; booked or reviewed, Pause. Nothing when it can be deleted.
// `onWithdraw`: the delete pop-up offers Withdraw from review as its next step; the gear has its own Review section for it
export function DeleteBlocked({ course, busy, withdrawing, onWithdraw }) {
  if (course.deleteBlock === "in_review") {
    return (
      <>
        <p className="rt-acc__note">This course is waiting for our team&apos;s review. Withdraw it from review to delete it.</p>
        {onWithdraw && <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} aria-busy={withdrawing || undefined} onClick={onWithdraw}>{withdrawing ? "Withdrawing…" : "Withdraw from review"}</button>}
      </>
    );
  }
  if (course.deleteBlock === "paused_by_team") return <p className="rt-acc__note">Our team has paused this course: {teamReason(course.statusNote)} You can&apos;t delete it while we&apos;ve paused it. <Link href={contactHref()} className="rt-cd__link">Contact us</Link> if you&apos;d like it removed.</p>;
  if (course.deleteBlock === "in_use") return <p className="rt-acc__note">Courses can&apos;t be deleted once learners have booked or reviewed them.{course.status === "live" ? " Pause it to take it off ReadTraining." : ""}</p>;
  return null;
}

// "Delete this course?": a course that has been live is deleted only with its name typed (it leaves ReadTraining, and our team is
// told); any other asks once. Cancel is locked while it deletes. A refusal (booked, reviewed or sent for review meanwhile) is
// said here, and the course loads again, so the gear and the list then show why.
export function DeleteCourseForm({ course, onKeep, onDeleted }) {
  const { organisationId } = useProviderAccess();
  const utils = api.useUtils();
  const remove = api.provider.courses.remove.useMutation();
  const [typed, setTyped] = useState(""); // the course name, typed to confirm deleting a course that has been live
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const nameRef = useRef(null);
  const wasLive = Boolean(course.publishedAt) || course.status === "live" || course.status === "paused";
  const submit = (e) => {
    e.preventDefault();
    if (wasLive && !sameName(typed, course.title)) return;
    setError("");
    setNameError("");
    remove.mutate({ organisationId, courseId: course.id, ...(wasLive ? { confirmTitle: typed } : {}) }, {
      onSuccess: () => {
        // gone from the course list at once (the list the gear goes back to shows its saved copy while it loads again)
        utils.provider.courses.list.setData({ organisationId }, (rows) => rows?.filter((r) => r.id !== course.id));
        utils.provider.courses.list.invalidate({ organisationId });
        onDeleted();
      },
      onError: (er) => {
        const { fields, general } = errorsFrom(er);
        if (fields.confirmTitle) {
          setNameError(fields.confirmTitle);
          return requestAnimationFrame(() => nameRef.current?.focus());
        }
        utils.provider.courses.get.invalidate({ organisationId, courseId: course.id });
        utils.provider.courses.list.invalidate({ organisationId });
        setError(general || Object.values(fields)[0]);
      },
    });
  };
  return (
    <form className="rt-q__form" noValidate onSubmit={submit}>
      {wasLive ? (
        <>
          <p className="rt-acc__note">This takes “{course.title}” off ReadTraining straight away, with its dates and images, and can&apos;t be undone. Type the course name to confirm.</p>
          <div className="rt-field">
            <label htmlFor="rt-pws-del-name">Course name</label>
            <Err id="rt-pws-del-name" text={nameError} />
            <input id="rt-pws-del-name" ref={nameRef} type="text" autoComplete="off" spellCheck={false} maxLength={200} value={typed} onChange={(e) => { setTyped(e.target.value); setNameError(""); }} aria-invalid={nameError ? true : undefined} aria-describedby={nameError ? "rt-pws-del-name-e" : undefined} />
          </div>
        </>
      ) : (
        <p className="rt-acc__note">“{course.title}”, its dates and its images will be deleted. This can&apos;t be undone.</p>
      )}
      {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-adm-cellrow">
        <button type="submit" className="button -md -outline-red-3 text-red-3" disabled={remove.isPending || (wasLive && !sameName(typed, course.title))} aria-busy={remove.isPending || undefined}>{remove.isPending ? "Deleting…" : "Delete course"}</button>
        <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onKeep} disabled={remove.isPending}>Cancel</button>
      </div>
    </form>
  );
}

// The gear on every editor page (Hurak's course settings): its visibility (Public, or Private: only people with its link can book
// it; one choice, as Hurak v2's "Publish on marketplace"), where it is listed (read only: the subject decides, as on Hurak, placeOn
// in the API), the address to share, pausing a live course, and deleting it (DeleteBlocked says
// when it can't be, and a course our team paused has no Put back live; DeleteCourseForm asks). Each choice saves at once.
export function CourseGear({ course, open, onClose, onSaved, onStale }) {
  const router = useRouter();
  // the editor's calls: the version its draft is based on goes with each change here, and the new one comes back
  const ep = useEndpoints();
  const { organisationId, can, staff } = useProviderAccess();
  const utils = api.useUtils();
  const update = api.provider.courses.update.useMutation();
  const pause = api.provider.courses.setPaused.useMutation();
  const withdraw = api.provider.courses.withdrawReview.useMutation();
  const [confirm, setConfirm] = useState(false);
  const [askPause, setAskPause] = useState(false); // "Pause course" asks first
  const [error, setError] = useState("");
  const edit = can("provider.courses.edit");
  // pausing or putting back live stays the provider's own decision (ReadTraining staff working here don't get it)
  const pauses = edit && !staff && pausable(course);
  const dated = waysOf(course).some(isDatedMethod); // taught on dates: the gear links to them
  const [url, setUrl] = useState("");
  React.useEffect(() => setUrl(`${window.location.origin}/course/${course.slug}`), [course.slug]);

  const refresh = () => {
    utils.provider.courses.get.invalidate({ organisationId, courseId: course.id });
    utils.provider.courses.list.invalidate({ organisationId });
  };
  const fail = (e) => {
    // changed somewhere else since the editor loaded it: the editor says so, with a way to load the latest version
    if (onStale && e?.data?.code === "CONFLICT" && /changed somewhere else/i.test(e.message)) return onStale();
    setError(errorsFrom(e).general || Object.values(errorsFrom(e).fields)[0]);
  };
  const doPause = (paused) => {
    setError("");
    pause.mutate({ organisationId, courseId: course.id, paused, seen: ep?.seen() }, {
      onSuccess: (r) => { ep?.keep(r); refresh(); setAskPause(false); onSaved(paused ? COURSE_SAID.paused : COURSE_SAID.resumed); },
      onError: (e) => { setAskPause(false); fail(e); },
    });
  };
  const change = (patch, message, undo) => {
    setError("");
    update.mutate({ organisationId, courseId: course.id, ...patch, seen: ep?.seen() }, { onSuccess: (r) => { ep?.keep(r); refresh(); onSaved(message); }, onError: (e) => { undo?.(); fail(e); } });
  };
  // Visibility moves the moment it is chosen (the save follows); the saved course takes over once it has reloaded, or a failed
  // save puts it back
  const [shownPublic, setShownPublic] = useState(null);
  useEffect(() => setShownPublic(null), [course.isPublic, course.listed]);
  const isPublic = shownPublic ?? (course.isPublic && course.listed);
  const choose = (v) => {
    if (!edit || (v === "public") === isPublic) return;
    setShownPublic(v === "public");
    change({ isPublic: v === "public" }, v === "private" ? "The course is private" : "The course is public", () => setShownPublic(null));
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
  const doWithdraw = () => {
    setError("");
    withdraw.mutate({ organisationId, courseId: course.id, seen: ep?.seen() }, {
      onSuccess: (r) => { ep?.keep(r); refresh(); onSaved(COURSE_SAID.withdrawn); },
      onError: fail,
    });
  };
  const leaveConfirm = () => {
    setConfirm(false);
    setError("");
  };
  const close = () => {
    leaveConfirm();
    onClose();
  };
  const busy = update.isPending || pause.isPending || withdraw.isPending;
  const working = useIsMutating() > 0; // a change or the delete is on its way: the gear stays open for its answer

  return (
    <Sheet open={open} onClose={close} title={confirm ? "Delete this course?" : "Course settings"} closeLabel="Close" noClose={confirm} busy={working}>
      {confirm ? (
        <DeleteCourseForm course={course} onKeep={leaveConfirm} onDeleted={() => leaveWithoutAsking(() => router.push("/provider/courses"))} />
      ) : (
        <div className="rt-q__form rt-pws-gear" aria-busy={busy || undefined}>
          <p className="rt-acc__note">Changes are saved as you make them.</p>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          {/* who can find the course */}
          <section className="rt-pws-gear__sec" aria-labelledby="rt-pws-gear-vis">
            <h3 className="rt-pws-gear__h" id="rt-pws-gear-vis">Visibility</h3>
            <Choice name="rt-pws-gear-enrol" legend="Visibility" quietLegend hint="Private courses don't show in search; you share the link or book learners yourself." value={isPublic ? "public" : "private"} disabled={!edit || update.isPending} onChange={choose} options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]} />
            {/* where learners find it: decided by its subject, so shown here, not chosen */}
            <p className="rt-acc__note">{course.parent ? <>Listed on the shared course page <b>{course.parent.title}</b>, beside other providers.</> : "Listed on its own page."}</p>
          </section>
          <section className="rt-pws-gear__sec" aria-labelledby="rt-pws-gear-share">
            <h3 className="rt-pws-gear__h" id="rt-pws-gear-share">Sharing</h3>
            <div className="rt-field">
              <label htmlFor="rt-pws-gear-url">Course address</label>
              <p className="rt-field__hint">Share it on your website or social media{course.status === "live" ? "." : ". It works once the course is live."}</p>
              <div className="rt-pws-course-addrow">
                <input id="rt-pws-gear-url" value={url} readOnly onFocus={(e) => e.target.select()} />
                <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={copy}>Copy</button>
              </div>
            </div>
          </section>
          {(pauses || dated) && (
            <section className="rt-pws-gear__sec" aria-labelledby="rt-pws-gear-avail">
              <h3 className="rt-pws-gear__h" id="rt-pws-gear-avail">Availability</h3>
              {pauses && (
                <div className="rt-pws-gear__row">
                  <p className="rt-acc__note">{course.status === "live" ? PAUSE_NOTE : "This course is paused: it doesn't show on ReadTraining."}</p>
                  {/* pausing takes the course off the site, so it asks first (putting it back live doesn't) */}
                  {askPause ? (
                    <div className="rt-pws-gear__btns" role="group" aria-label="Pause this course?">
                      <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => setAskPause(false)}>Cancel</button>
                      <button type="button" className="button -sm -purple-1 text-white" disabled={busy} aria-busy={pause.isPending || undefined} onClick={() => doPause(true)}>{pause.isPending ? "Pausing…" : "Pause course"}</button>
                    </div>
                  ) : (
                    <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} aria-busy={pause.isPending || undefined} onClick={() => (course.status === "live" ? setAskPause(true) : doPause(false))}>{course.status === "live" ? "Pause course" : pause.isPending ? "Putting back live…" : "Put back live"}</button>
                  )}
                </div>
              )}
              {dated && <Link href={`/provider/cohorts?course=${course.id}`} className="rt-cd__link rt-pws-gear__more">See this course&apos;s dates<span aria-hidden="true">{"\u00a0"}→</span></Link>}
            </section>
          )}
          {course.status === "pending" && can("provider.courses.edit") && !staff && (
            <section className="rt-pws-gear__sec" aria-labelledby="rt-pws-gear-rev">
              <h3 className="rt-pws-gear__h" id="rt-pws-gear-rev">Review</h3>
              <div className="rt-pws-gear__row">
                <p className="rt-acc__note">Waiting for our team&apos;s review. Withdraw it to make it a draft again.</p>
                <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} aria-busy={withdraw.isPending || undefined} onClick={doWithdraw}>{withdraw.isPending ? "Withdrawing…" : "Withdraw from review"}</button>
              </div>
            </section>
          )}
          {can("provider.courses.delete") && (
            <section className="rt-pws-gear__danger" aria-labelledby="rt-pws-gear-del">
              <h3 className="rt-pws-gear__h -danger" id="rt-pws-gear-del">Delete course</h3>
              {course.deleteBlock ? <DeleteBlocked course={course} /> : (
                <div className="rt-pws-gear__row">
                  <p className="rt-acc__note">Removes the course with its dates and images. This can&apos;t be undone.</p>
                  <button type="button" className="button -sm -outline-red-3 text-red-3" onClick={() => setConfirm(true)}>Delete course</button>
                </div>
              )}
            </section>
          )}
          <div className="rt-pws-set__actions">
            <button type="button" className={`button -md ${askPause ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={close}>Done</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// "Take off the site?": the providers' live courses on the page leave the search with it, named here (up to five), and their
// providers are emailed (API admin.courses.setSharedStatus)
function offWarning(children = []) {
  const live = children.filter((x) => x.status === "live").map((x) => `“${x.title}” (${x.provider})`);
  if (!live.length) return "No provider has a live course on this page, so nothing else is hidden.";
  const named = live.length > 5 ? `${live.slice(0, 5).join(", ")} and ${live.length - 5} more` : live.length > 1 ? `${live.slice(0, -1).join(", ")} and ${live[live.length - 1]}` : live[0];
  return `This also hides ${named} from ReadTraining's search until the page is published again. We email ${live.length === 1 ? "that provider" : "each of those providers"}.`;
}

// The gear on a shared course page in the admin: the page's address, showing it in ReadTraining's search, taking it off the site or
// publishing it, and deleting a page that has never been live and has no providers' courses on it.
export function SharedGear({ course, open, onClose, onSaved }) {
  const router = useRouter();
  const ep = useEndpoints();
  const utils = api.useUtils();
  const remove = api.admin.courses.removeShared.useMutation();
  const [confirm, setConfirm] = useState(false);
  const [askOff, setAskOff] = useState(false); // "Take off the site" asks first
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
    <Sheet open={open} onClose={close} title={confirm ? "Delete this page?" : "Page settings"} closeLabel="Close" noClose={confirm}>
      {confirm ? (
        <div className="rt-q__form">
          <p className="rt-acc__note">“{course.title}” and its images will be deleted for good.</p>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -outline-red-3 text-red-3" disabled={remove.isPending} onClick={() => remove.mutate({ courseId: course.id }, { onSuccess: () => { utils.admin.courses.list.invalidate(); leaveWithoutAsking(() => router.push("/admin/catalogue")); }, onError: (e) => setError(errorsFrom(e).general) })}>{remove.isPending ? "Deleting…" : "Delete page"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(false)} disabled={remove.isPending}>Cancel</button>
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
              <p className="rt-acc__note">{askOff ? offWarning(course.children) : "Taking the page off the site hides it and the providers' courses on it, until it is published again."}</p>
              {/* it hides every provider's course on the page too, so it asks first */}
              {askOff ? (
                <div className="rt-adm-cellrow" role="group" aria-label="Take this page off the site?">
                  <button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => { setAskOff(false); run(() => ep.setStatus("paused"), "The page is off the site"); }}>Yes, take it off</button>
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => setAskOff(false)}>Keep it on the site</button>
                </div>
              ) : (
                <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => setAskOff(true)}>Take off the site</button>
              )}
            </div>
          )}
          {edit && (
            <div className="rt-pws-gear__danger">
              {blocked ? <p className="rt-acc__note">{blocked}</p> : <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setConfirm(true)}>Delete page</button>}
            </div>
          )}
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={close}>Done</button>
        </div>
      )}
    </Sheet>
  );
}
