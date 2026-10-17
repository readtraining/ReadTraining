"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { pw } from "@/data/providerWorkspace";
import { saveCourse } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { Choice, Pill, Toggle } from "./providerParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";

const copy = {
  intro: "Build the course from units and activities: text, downloads, assignments, quizzes, video, a certificate and Scorm packages. Learners see them in their account after booking.",
  liveNote: "For a course on set dates or live online, this is optional: pre-course reading and follow-up material learners open after booking.",
  emptyTitle: "Add your first unit",
  emptyText: "Units group activities, like “Getting started” or “Assessment”.",
  unsaved: "You have changes that are not saved yet.",
  save: "Save activities",
  saved: "Course activities saved",
};
const VIDEO_RE = /^https?:\/\/((www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/\d+)|\S+\.mp4(\?\S*)?$)/i;
const newId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const clone = (x) => JSON.parse(JSON.stringify(x || []));
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const blankQuestion = () => ({ text: "", options: ["", ""], correct: null });
const blankLesson = () => ({ id: "", type: "text", title: "", minutes: "", body: "", url: "", file: null, pass: 80, questions: [blankQuestion()], instructions: "", preview: false, issueOn: "complete" });

// Course activities (Hurak's LMS types: Text, Download / Resource, Assignment, Quiz, Video, Certificate, Scorm). Units hold the
// activities; each type has its own fields. Changes stay on this page until "Save activities" stores them with the course.
export default function CourseCurriculum({ course }) {
  const [sections, setSections] = useState(() => clone(course.curriculum));
  const [dirty, setDirty] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addErr, setAddErr] = useState("");
  const [renaming, setRenaming] = useState(null); // { id, title, error }
  const [confirm, setConfirm] = useState(null); // { kind: "section" | "lesson", sectionId, lessonId, name }
  const [lessonFor, setLessonFor] = useState(null); // { sectionId, lesson }
  const [toast, setToast] = useState(null);
  const addRef = useRef(null);
  const doneToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setSections(clone(course.curriculum));
    setDirty(false);
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reload only when another course opens

  const change = (next) => {
    setSections(next);
    setDirty(true);
  };
  const move = (list, i, by) => {
    const j = i + by;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  const lessons = sections.reduce((n, s) => n + s.lessons.length, 0);
  const minutes = sections.reduce((n, s) => n + s.lessons.reduce((m, l) => m + (Number(l.minutes) || 0), 0), 0);
  const live = course.format !== "self-paced";

  const addSection = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAddErr("Enter a unit title.");
      return focusFirstError(addRef.current);
    }
    change([...sections, { id: newId("S"), title: newTitle.trim().slice(0, 80), lessons: [] }]);
    setNewTitle("");
    setAddErr("");
  };
  const saveRename = (e) => {
    e.preventDefault();
    if (!renaming.title.trim()) {
      setRenaming({ ...renaming, error: "Enter a unit title." });
      return focusFirstError(e.currentTarget);
    }
    change(sections.map((s) => (s.id === renaming.id ? { ...s, title: renaming.title.trim().slice(0, 80) } : s)));
    setRenaming(null);
  };
  const remove = () => {
    if (confirm.kind === "section") change(sections.filter((s) => s.id !== confirm.sectionId));
    else change(sections.map((s) => (s.id === confirm.sectionId ? { ...s, lessons: s.lessons.filter((l) => l.id !== confirm.lessonId) } : s)));
    setConfirm(null);
  };
  const moveLesson = (sectionId, i, by) => change(sections.map((s) => (s.id === sectionId ? { ...s, lessons: move(s.lessons, i, by) } : s)));
  const putLesson = (sectionId, lesson) => {
    change(sections.map((s) => {
      if (s.id !== sectionId) return s;
      const at = s.lessons.findIndex((l) => l.id === lesson.id);
      return { ...s, lessons: at >= 0 ? s.lessons.map((l) => (l.id === lesson.id ? lesson : l)) : [...s.lessons, lesson] };
    }));
    setLessonFor(null);
  };
  const save = () => {
    saveCourse(course.id, { curriculum: sections });
    setDirty(false);
    setToast({ message: copy.saved });
  };

  return (
    <div className="rt-acc__stack rt-pws-cur">
      <section className="rt-acc__card rt-pws-cur__head" aria-labelledby="rt-pws-cur-h">
        <div>
          <h2 className="rt-acc__h2" id="rt-pws-cur-h">Course activities</h2>
          <p className="rt-acc__note">{live ? copy.liveNote : copy.intro}</p>
          <p className="rt-pws-cur__totals" aria-live="polite">
            {sections.length} {sections.length === 1 ? "unit" : "units"} · {lessons} {lessons === 1 ? "activity" : "activities"} · {minutes} minutes
          </p>
        </div>
        <div className="rt-pws-cur__save">
          {dirty && <p className="rt-acc__note rt-pws-cur__unsaved">{copy.unsaved}</p>}
          <button type="button" className="button -md -purple-1 text-white" onClick={save}>{copy.save}</button>
        </div>
      </section>

      {sections.length === 0 && <EmptyState title={copy.emptyTitle} text={copy.emptyText} />}

      {sections.map((s, si) => (
        <section key={s.id} className="rt-acc__card rt-pws-cur__section" aria-label={`Unit ${si + 1}: ${s.title}`}>
          <div className="rt-pws-cur__sechead">
            {renaming?.id === s.id ? (
              <form className="rt-pws-cur__rename" onSubmit={saveRename} noValidate>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-cur-rn-${s.id}`}>Unit title</label>
                  {renaming.error && <p className="rt-q__err" id={`rt-pws-cur-rn-${s.id}-e`}><span className="rt-sr">Error: </span>{renaming.error}</p>}
                  <input id={`rt-pws-cur-rn-${s.id}`} type="text" maxLength={80} autoComplete="off" value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} aria-invalid={renaming.error ? true : undefined} aria-describedby={renaming.error ? `rt-pws-cur-rn-${s.id}-e` : undefined} autoFocus />
                </div>
                <div className="rt-adm-cellrow">
                  <button type="submit" className="button -sm -outline-purple-1 text-purple-1">Save title</button>
                  <button type="button" className="rt-pws-cur__textbtn" onClick={() => setRenaming(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <h3 className="rt-pws-cur__title"><span className="rt-pws-cur__num">Unit {si + 1}</span>{s.title}</h3>
            )}
            {renaming?.id !== s.id && (
              <div className="rt-pws-cur__tools">
                <button type="button" className="rt-pws-cur__icon" onClick={() => setRenaming({ id: s.id, title: s.title, error: "" })} aria-label={`Rename unit ${s.title}`}><i className="icon-edit text-14" aria-hidden="true"></i></button>
                <button type="button" className="rt-pws-cur__icon" onClick={() => change(move(sections, si, -1))} disabled={si === 0} aria-label={`Move section ${s.title} up`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                <button type="button" className="rt-pws-cur__icon" onClick={() => change(move(sections, si, 1))} disabled={si === sections.length - 1} aria-label={`Move section ${s.title} down`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                <button type="button" className="rt-pws-cur__icon -danger" onClick={() => setConfirm({ kind: "section", sectionId: s.id, name: s.title, count: s.lessons.length })} aria-label={`Delete section ${s.title}`}><i className="icon-bin text-14" aria-hidden="true"></i></button>
              </div>
            )}
          </div>

          {s.lessons.length > 0 ? (
            <ol className="rt-pws-cur__lessons">
              {s.lessons.map((l, li) => {
                const t = pw.lessonTypes[l.type] || pw.lessonTypes.text;
                return (
                  <li key={l.id} className="rt-pws-cur__lesson">
                    <span className="rt-pws-cur__ltype" aria-hidden="true"><i className={`${t.icon} text-14`}></i></span>
                    <div className="rt-pws-cur__lbody">
                      <b>{l.title}</b>
                      <small>
                        {t.label}{Number(l.minutes) > 0 && ` · ${l.minutes} min`}
                        {l.type === "quiz" && ` · ${l.questions?.length || 0} ${l.questions?.length === 1 ? "question" : "questions"}, pass ${l.pass}%`}
                        {l.type === "download" && l.file && ` · ${l.file.name}`}
                      </small>
                    </div>
                    {l.preview && <Pill tone="info">Free preview</Pill>}
                    <div className="rt-pws-cur__tools">
                      <button type="button" className="rt-pws-cur__icon" onClick={() => setLessonFor({ sectionId: s.id, lesson: l })} aria-label={`Edit activity ${l.title}`}><i className="icon-edit text-14" aria-hidden="true"></i></button>
                      <button type="button" className="rt-pws-cur__icon" onClick={() => moveLesson(s.id, li, -1)} disabled={li === 0} aria-label={`Move activity ${l.title} up`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                      <button type="button" className="rt-pws-cur__icon" onClick={() => moveLesson(s.id, li, 1)} disabled={li === s.lessons.length - 1} aria-label={`Move activity ${l.title} down`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                      <button type="button" className="rt-pws-cur__icon -danger" onClick={() => setConfirm({ kind: "lesson", sectionId: s.id, lessonId: l.id, name: l.title })} aria-label={`Delete lesson ${l.title}`}><i className="icon-bin text-14" aria-hidden="true"></i></button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState inCard title="No activities in this unit yet." />
          )}
          <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-pws-cur__add" onClick={() => setLessonFor({ sectionId: s.id, lesson: null })}>Add an activity<span className="rt-sr"> to {s.title}</span></button>
        </section>
      ))}

      <form className="rt-acc__card rt-pws-cur__newsec" onSubmit={addSection} noValidate ref={addRef}>
        <div className="rt-field">
          <label htmlFor="rt-pws-cur-new">Add a unit</label>
          {addErr && <p className="rt-q__err" id="rt-pws-cur-new-e"><span className="rt-sr">Error: </span>{addErr}</p>}
          <input id="rt-pws-cur-new" type="text" maxLength={80} autoComplete="off" placeholder="For example: Getting started" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} aria-invalid={addErr ? true : undefined} aria-describedby={addErr ? "rt-pws-cur-new-e" : undefined} />
        </div>
        <button type="submit" className="button -sm -outline-purple-1 text-purple-1">Add unit</button>
      </form>

      <Sheet open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.kind === "section" ? "Delete this unit?" : "Delete this activity?"} closeLabel="Close">
        {confirm && (
          <div className="rt-q__form">
            <p className="rt-acc__note">
              {confirm.kind === "section"
                ? `“${confirm.name}” and its ${confirm.count} ${confirm.count === 1 ? "activity" : "activities"} will be removed when you save.`
                : `“${confirm.name}” will be removed when you save the curriculum.`}
            </p>
            <div className="rt-adm-cellrow">
              <button type="button" className="button -md -purple-1 text-white" onClick={remove}>Delete</button>
              <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(null)}>Keep it</button>
            </div>
          </div>
        )}
      </Sheet>

      <LessonSheet value={lessonFor} onClose={() => setLessonFor(null)} onSave={putLesson} />
      <Toast toast={toast} onDone={doneToast} />
    </div>
  );
}

// Add or change one lesson: its type, title and length, the type's own fields, and whether it is a free preview.
function LessonSheet({ value, onClose, onSave }) {
  const [l, setL] = useState(blankLesson);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    setL(value.lesson ? { ...blankLesson(), ...clone([value.lesson])[0] } : blankLesson());
    setErrors({});
  }, [value]);

  const set = (k, v) => setL((x) => ({ ...x, [k]: v }));
  const setQ = (i, patch) => setL((x) => ({ ...x, questions: x.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-pws-cur-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;
  const aria = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `rt-pws-cur-${k}-e` } : {});

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!l.title.trim()) er.title = "Enter an activity title.";
    if (l.minutes !== "" && (!Number.isInteger(Number(l.minutes)) || Number(l.minutes) < 1 || Number(l.minutes) > 600)) er.minutes = "Enter whole minutes between 1 and 600, or leave it empty.";
    if (l.type === "text" && !l.body.trim()) er.body = "Write the lesson text.";
    if (l.type === "video" && !VIDEO_RE.test(l.url.trim())) er.url = "Enter a YouTube, Vimeo or .mp4 link, like https://vimeo.com/123456.";
    if (l.type === "download" && !l.file) er.file = "Choose the file learners will download.";
    if (l.type === "assignment" && !l.instructions.trim()) er.instructions = "Write what learners need to do.";
    if (l.type === "scorm" && !l.file) er.file = "Choose the Scorm package (.zip).";
    if (l.type === "quiz") {
      const pass = Number(l.pass);
      if (!Number.isInteger(pass) || pass < 1 || pass > 100) er.pass = "Enter a pass mark between 1 and 100.";
      l.questions.forEach((q, i) => {
        if (!q.text.trim()) er[`q${i}`] = "Write the question.";
        q.options.forEach((o, j) => !o.trim() && (er[`q${i}o${j}`] = "Write this answer or remove it."));
        if (q.correct === null || q.correct >= q.options.length) er[`q${i}c`] = "Choose the right answer.";
      });
    }
    setErrors(er);
    if (Object.keys(er).length) return focusFirstError(formRef.current);
    const keep = { id: l.id || newId("LS"), type: l.type, title: l.title.trim().slice(0, 120), minutes: l.minutes === "" ? 0 : Number(l.minutes), preview: l.preview };
    if (l.type === "text") keep.body = l.body.trim();
    if (l.type === "video") keep.url = l.url.trim();
    if (l.type === "download" || l.type === "scorm") keep.file = l.file;
    if (l.type === "certificate") keep.issueOn = l.issueOn;
    if (l.type === "assignment") keep.instructions = l.instructions.trim();
    if (l.type === "quiz") Object.assign(keep, { pass: Number(l.pass), questions: l.questions.map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()), correct: q.correct })) });
    onSave(value.sectionId, keep);
  };

  return (
    <Sheet open={Boolean(value)} onClose={onClose} title={value?.lesson ? "Edit activity" : "Add an activity"} closeLabel="Close" className="rt-pws-cur__sheet">
      <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
        <div className="rt-field">
          <label htmlFor="rt-pws-cur-type">Activity type</label>
          <FieldSelect id="rt-pws-cur-type" label="Activity type" value={l.type} onChange={(value) => set("type", value)} options={Object.entries(pw.lessonTypes).map(([k, t]) => ({ value: k, label: t.label }))} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-cur-title">Activity title</label>
          {err("title")}
          <input id="rt-pws-cur-title" type="text" maxLength={120} autoComplete="off" value={l.title} onChange={(e) => set("title", e.target.value)} {...aria("title")} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-cur-minutes">Length in minutes (optional)</label>
          {err("minutes")}
          <input id="rt-pws-cur-minutes" className="rt-adm-num" type="number" inputMode="numeric" min="1" max="600" autoComplete="off" value={l.minutes} onChange={(e) => set("minutes", e.target.value)} {...aria("minutes")} />
        </div>

        {l.type === "text" && (
          <div className="rt-field">
            <label htmlFor="rt-pws-cur-body">Lesson text</label>
            {err("body")}
            <textarea id="rt-pws-cur-body" rows={8} maxLength={20000} autoComplete="off" value={l.body} onChange={(e) => set("body", e.target.value)} {...aria("body")} />
          </div>
        )}
        {l.type === "video" && (
          <div className="rt-field">
            <label htmlFor="rt-pws-cur-url">Video link</label>
            <small className="rt-field__hint" id="rt-pws-cur-url-h">A YouTube or Vimeo page, or a link to an .mp4 file.</small>
            {err("url")}
            <input id="rt-pws-cur-url" type="url" inputMode="url" autoComplete="url" placeholder="https://" value={l.url} onChange={(e) => set("url", e.target.value)} aria-invalid={errors.url ? true : undefined} aria-describedby={errors.url ? "rt-pws-cur-url-e rt-pws-cur-url-h" : "rt-pws-cur-url-h"} />
          </div>
        )}
        {l.type === "download" && (
          <div className="rt-field">
            <label htmlFor="rt-pws-cur-file">File</label>
            <small className="rt-field__hint">PDF, Word, PowerPoint or Excel, up to 30 MB.</small>
            {err("file")}
            {l.file && <p className="rt-pws-cur__file"><i className="icon-document text-14" aria-hidden="true"></i>{l.file.name} · {kb(l.file.size)}</p>}
            <input id="rt-pws-cur-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 30 * 1048576) return setErrors((x) => ({ ...x, file: "This file is larger than 30 MB. Choose a smaller one." }));
              setErrors((x) => ({ ...x, file: undefined }));
              set("file", { name: f.name, size: f.size });
            }} {...aria("file")} />
          </div>
        )}
        {l.type === "scorm" && (
          <div className="rt-field">
            <label htmlFor="rt-pws-cur-scorm">Scorm package</label>
            <small className="rt-field__hint">A SCORM 1.2 or 2004 package (.zip), up to 200 MB.</small>
            {err("file")}
            {l.file && <p className="rt-pws-cur__file"><i className="icon-document text-14" aria-hidden="true"></i>{l.file.name} · {kb(l.file.size)}</p>}
            <input id="rt-pws-cur-scorm" type="file" accept=".zip" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (!/\.zip$/i.test(f.name)) return setErrors((x) => ({ ...x, file: "Choose a .zip file." }));
              if (f.size > 200 * 1048576) return setErrors((x) => ({ ...x, file: "This file is larger than 200 MB. Choose a smaller one." }));
              setErrors((x) => ({ ...x, file: undefined }));
              set("file", { name: f.name, size: f.size });
            }} {...aria("file")} />
          </div>
        )}
        {l.type === "certificate" && (
          <Choice name="rt-pws-cur-issue" legend="When do learners get the certificate?" value={l.issueOn} onChange={(v) => set("issueOn", v)} options={[{ value: "complete", label: "When they finish every activity" }, { value: "pass", label: "When they pass the quiz" }]} />
        )}
        {l.type === "assignment" && (
          <div className="rt-field">
            <label htmlFor="rt-pws-cur-instr">Instructions</label>
            {err("instructions")}
            <textarea id="rt-pws-cur-instr" rows={6} maxLength={5000} autoComplete="off" value={l.instructions} onChange={(e) => set("instructions", e.target.value)} {...aria("instructions")} />
          </div>
        )}
        {l.type === "quiz" && (
          <>
            <div className="rt-field">
              <label htmlFor="rt-pws-cur-pass">Pass mark (%)</label>
              {err("pass")}
              <input id="rt-pws-cur-pass" className="rt-adm-num" type="number" inputMode="numeric" min="1" max="100" autoComplete="off" value={l.pass} onChange={(e) => set("pass", e.target.value)} {...aria("pass")} />
            </div>
            {l.questions.map((q, i) => (
              <fieldset key={i} className="rt-pws-cur__q">
                <legend>Question {i + 1}</legend>
                <div className="rt-field">
                  <label htmlFor={`rt-pws-cur-q${i}`}>Question</label>
                  {err(`q${i}`)}
                  <input id={`rt-pws-cur-q${i}`} type="text" maxLength={300} autoComplete="off" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} {...aria(`q${i}`)} />
                </div>
                <fieldset className="rt-field rt-pws-cur__opts" aria-describedby={errors[`q${i}c`] ? `rt-pws-cur-q${i}c-e` : undefined}>
                  <legend>Answers (choose the right one)</legend>
                  {err(`q${i}c`)}
                  {q.options.map((o, j) => (
                    <div key={j} className="rt-pws-cur__opt">
                      <label className="rt-fp__opt">
                        <input type="radio" className="rt-fp__radio" name={`rt-pws-cur-q${i}c`} checked={q.correct === j} onChange={() => setQ(i, { correct: j })} />
                        <span className="rt-sr">Answer {j + 1} is right</span>
                      </label>
                      <div className="rt-field">
                        <label htmlFor={`rt-pws-cur-q${i}o${j}`} className="rt-sr">Answer {j + 1}</label>
                        {err(`q${i}o${j}`)}
                        <input id={`rt-pws-cur-q${i}o${j}`} type="text" maxLength={200} autoComplete="off" placeholder={`Answer ${j + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} {...aria(`q${i}o${j}`)} />
                      </div>
                      {q.options.length > 2 && (
                        <button type="button" className="rt-pws-cur__icon -danger" aria-label={`Remove answer ${j + 1}`} onClick={() => setQ(i, { options: q.options.filter((_, k) => k !== j), correct: q.correct === j ? null : q.correct > j ? q.correct - 1 : q.correct })}><i className="icon-close text-12" aria-hidden="true"></i></button>
                      )}
                    </div>
                  ))}
                </fieldset>
                <div className="rt-adm-cellrow">
                  {q.options.length < 4 && <button type="button" className="rt-pws-cur__textbtn" onClick={() => setQ(i, { options: [...q.options, ""] })}>Add an answer</button>}
                  {l.questions.length > 1 && <button type="button" className="rt-pws-cur__textbtn -danger" onClick={() => set("questions", l.questions.filter((_, k) => k !== i))}>Remove question {i + 1}</button>}
                </div>
              </fieldset>
            ))}
            <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-pws-cur__addq" onClick={() => set("questions", [...l.questions, blankQuestion()])}>Add a question</button>
          </>
        )}

        <Toggle id="rt-pws-cur-preview" checked={l.preview} onChange={(v) => set("preview", v)} label="Free preview" hint="Anyone can open this activity from the course page before booking." />
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{value?.lesson ? "Save activity" : "Add activity"}</button>
      </form>
    </Sheet>
  );
}
