"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { addQuestion, answerQuestion, changeRole, deleteQuestion, inviteMember, removeMember } from "@/lib/providerWorkspace";
import { Pill, Tabs, ToolSelect, formatDay } from "./providerParts";
import { Confirm, Field, aria, isEmail, useParam } from "./settingsForm";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";

// Settings › QA (learners' questions about a course, answered here and shown on the course page, plus questions the provider
// answers up front) and the Team page (who can use the workspace, with a role each; the account owner can't be changed or removed).

const ROLE = Object.fromEntries(pw.roles.map((r) => [r.key, r]));

// ---- questions -------------------------------------------------------------------------------------------------------------

function AnswerForm({ q, onDone, say }) {
  const [v, setV] = useState(q.answer || "");
  const [error, setError] = useState("");
  const ref = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    if (!v.trim()) {
      setError("Write the answer first.");
      return focusFirstError(ref.current);
    }
    answerQuestion(q.id, v.trim());
    say(q.answer ? "Answer updated" : "Answer posted");
    onDone();
  };
  const id = `rt-qa-ans-${q.id}`;
  return (
    <form className="rt-adm-noteform rt-pws-set__answer" onSubmit={submit} noValidate ref={ref}>
      <Field id={id} label={q.answer ? "Your answer" : "Answer this question"} error={error} hint="Shown on the course page under the question.">
        <textarea {...aria(id, error, true)} rows={3} maxLength={1500} autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
      <div className="rt-pws-set__actions">
        <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{q.answer ? "Save answer" : "Post answer"}</button>
        {q.answer && <button type="button" className="rt-pws-set__textbtn" onClick={onDone}>Cancel</button>}
      </div>
    </form>
  );
}

export function QaTab({ data, say }) {
  const [show, setShow] = useParam("show", "open");
  const [course, setCourse] = useParam("course", "all");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ course: "", question: "", answer: "" });
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);
  const formRef = useRef(null);

  const inCourse = data.qa.filter((x) => course === "all" || x.courseId === course);
  const list = inCourse.filter((x) => (show === "open" ? !x.answer : show === "answered" ? x.answer : true)).sort((a, b) => b.at - a.at);
  const tabs = [
    { key: "open", label: "To answer", count: inCourse.filter((x) => !x.answer).length },
    { key: "answered", label: "Answered", count: inCourse.filter((x) => x.answer).length },
    { key: "all", label: "All", count: inCourse.length },
  ];
  const courses = data.courses.filter((c) => c.title);

  const openAdd = () => {
    setF({ course: course === "all" ? "" : course, question: "", answer: "" });
    setErrors({});
    setAdding(true);
  };
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.course) errs.course = "Choose the course.";
    if (!f.question.trim()) errs.question = "Enter the question.";
    if (!f.answer.trim()) errs.answer = "Enter the answer.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    addQuestion(f.course, f.question.trim(), f.answer.trim());
    setAdding(false);
    say("Question added");
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={show} onChange={setShow} label="Show questions" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-qa-course" label="Course" value={course} onChange={setCourse} options={[{ value: "all", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} />
          <button type="button" className="button -md -purple-1 text-white" onClick={openAdd}>Add question</button>
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "question" : "questions"}`}</p>
      {data.qa.length === 0 ? (
        <EmptyState title="No questions yet" text="When learners ask about a course, their questions arrive here. You can also answer common ones up front." action={{ label: "Add question", onClick: openAdd }} />
      ) : list.length === 0 ? (
        <EmptyState title={show === "open" ? "Every question is answered." : "No questions match."} />
      ) : (
        <ul className="rt-adm-items">
          {list.map((x) => (
            <li key={x.id} className="rt-acc__card rt-pws-set__qa">
              <div className="rt-adm-item__top">
                {!x.answer && <Pill tone="warn">To answer</Pill>}
                <span className="rt-adm-item__when">{data.byId.course[x.courseId]?.title || "Course removed"} · {x.from === "learner" ? `Asked by ${x.name || "a learner"}` : "Added by your team"} · {formatDay(x.at)}</span>
              </div>
              <p className="rt-pws-set__title">{x.question}</p>
              {x.answer && editing !== x.id && <p className="rt-adm-item__reason">{x.answer}</p>}
              {(!x.answer || editing === x.id) ? (
                <AnswerForm q={x} say={say} onDone={() => setEditing(null)} />
              ) : (
                <div className="rt-pws-set__actions">
                  <button type="button" className="rt-pws-set__textbtn" onClick={() => setEditing(x.id)}>Edit answer</button>
                  {x.from === "provider" && <button type="button" className="rt-pws-set__textbtn rt-adm-danger" onClick={() => setRemoving(x)}>Delete</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add question" closeLabel="Close" className="rt-pws-set__sheet">
        <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
          <p className="rt-acc__note">Answer a question learners often ask before they book. It shows on the course page.</p>
          <Field id="rt-qa-c" label="Course" error={errors.course}>
            <FieldSelect id="rt-qa-c" label="Course" placeholder="Choose a course" value={f.course} onChange={(value) => setF((x) => ({ ...x, course: value }))} options={courses.map((c) => ({ value: c.id, label: c.title }))} invalid={Boolean(errors.course)} describedBy={aria("rt-qa-c", errors.course)["aria-describedby"]} />
          </Field>
          <Field id="rt-qa-q" label="Question" error={errors.question}>
            <input {...aria("rt-qa-q", errors.question)} type="text" maxLength={200} autoComplete="off" value={f.question} onChange={(e) => setF((x) => ({ ...x, question: e.target.value }))} />
          </Field>
          <Field id="rt-qa-a" label="Answer" error={errors.answer}>
            <textarea {...aria("rt-qa-a", errors.answer)} rows={5} maxLength={1500} autoComplete="off" value={f.answer} onChange={(e) => setF((x) => ({ ...x, answer: e.target.value }))} />
          </Field>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Add question</button>
        </form>
      </Sheet>

      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this question?" confirmLabel="Delete question"
        text={removing ? `“${removing.question}” will be removed from the course page.` : ""}
        onConfirm={() => { deleteQuestion(removing.id); setRemoving(null); say("Question deleted"); }} />
    </div>
  );
}

// ---- team ------------------------------------------------------------------------------------------------------------------

export function TeamTab({ data, say }) {
  const [show, setShow] = useParam("show", "all");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ email: "", role: "" });
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);
  const formRef = useRef(null);

  const list = data.team.filter((t) => show === "all" || t.status === show).sort((a, b) => Number(Boolean(b.owner)) - Number(Boolean(a.owner)));
  const tabs = [
    { key: "all", label: "Everyone", count: data.team.length },
    { key: "active", label: "Active", count: data.team.filter((t) => t.status === "active").length },
    { key: "pending", label: "Invited", count: data.team.filter((t) => t.status === "pending").length },
  ];
  const cohortsOf = (id) => data.cohorts.filter((k) => k.tutorId === id && k.status === "upcoming").length;

  const openAdd = () => {
    setF({ email: "", role: "" });
    setErrors({});
    setAdding(true);
  };
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEmail(f.email)) errs.email = "Enter their work email address, like name@yourcompany.co.uk.";
    if (!f.role) errs.role = "Choose what they can do.";
    if (!Object.keys(errs).length && inviteMember(f.email.trim(), f.role) === false) errs.email = "This person is already in your team.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    setAdding(false);
    say(`Invite sent to ${f.email.trim()}`);
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={show} onChange={setShow} label="Show team members" />
        <button type="button" className="button -md -purple-1 text-white" onClick={openAdd}>Add team member</button>
      </div>
      <p className="rt-acc__note" aria-live="polite">{`${list.length} linked team ${list.length === 1 ? "member" : "members"} found.`}</p>
      {list.length === 0 ? (
        <EmptyState title={show === "pending" ? "No invites waiting." : "No one here yet."} />
      ) : (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td data-label="Member"><b>{t.name || t.email}</b>{t.name && <small>{t.email}</small>}{t.id === data.me.id && <small>That's you</small>}</td>
                  <td data-label="Role">
                    {t.owner ? (
                      <span className="rt-adm-cellrow"><Pill tone="info">Account owner</Pill><span className="rt-adm-muted">{ROLE[t.role]?.label}</span></span>
                    ) : (
                      <div className="rt-field rt-adm-select -inline">
                        <label htmlFor={`rt-team-role-${t.id}`} className="rt-sr">Role for {t.name || t.email}</label>
                        <FieldSelect id={`rt-team-role-${t.id}`} label={`Role for ${t.name || t.email}`} value={t.role} onChange={(value) => { changeRole(t.id, value); say(`${t.name || t.email} is now ${ROLE[value].label}`); }} options={pw.roles.map((r) => ({ value: r.key, label: r.label }))} compact />
                      </div>
                    )}
                  </td>
                  <td data-label="Status"><Pill tone={t.status === "active" ? "ok" : "warn"}>{t.status === "active" ? "Active" : "Invite sent"}</Pill></td>
                  <td data-label="Actions">
                    {!t.owner && (
                      <div className="rt-adm-rowactions">
                        {t.status === "pending" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => say(`Invite sent again to ${t.email}`)}>Resend invite<span className="rt-sr"> to {t.email}</span></button>}
                        <button type="button" className="rt-pws-set__textbtn rt-adm-danger" onClick={() => setRemoving(t)}>Remove<span className="rt-sr"> {t.name || t.email}</span></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="rt-acc__card rt-pws-set__roles">
        <summary>What each role can do</summary>
        <dl className="rt-adm-dl">
          {pw.roles.map((r) => <div key={r.key}><dt>{r.label}</dt><dd>{r.can}</dd></div>)}
        </dl>
        <p className="rt-acc__note">The account owner can do everything, including closing the account. Only ReadTraining support can change the owner.</p>
      </details>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add team member" closeLabel="Close" className="rt-pws-set__sheet">
        <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
          <p className="rt-acc__note">We email them an invite. They sign in with this email address to join your workspace.</p>
          <Field id="rt-team-email" label="Email address" error={errors.email}>
            <input {...aria("rt-team-email", errors.email)} type="email" autoComplete="email" spellCheck={false} value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} />
          </Field>
          <Field id="rt-team-role" label="Role" error={errors.role} hint={f.role ? ROLE[f.role].can : "Choose a role to see what they can do."}>
            <FieldSelect id="rt-team-role" label="Role" placeholder="Choose a role" value={f.role} onChange={(value) => setF((x) => ({ ...x, role: value }))} options={pw.roles.filter((r) => r.key !== "admin").map((r) => ({ value: r.key, label: r.label }))} invalid={Boolean(errors.role)} describedBy={aria("rt-team-role", errors.role, true)["aria-describedby"]} />
          </Field>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Send invite</button>
        </form>
      </Sheet>

      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title={removing ? `Remove ${removing.name || removing.email}?` : ""} confirmLabel="Remove from team"
        text={removing ? `They will lose access to this workspace straight away.${cohortsOf(removing.id) ? ` They tutor ${cohortsOf(removing.id)} upcoming ${cohortsOf(removing.id) === 1 ? "cohort, which will show no tutor" : "cohorts, which will show no tutor"} until you choose another.` : ""}` : ""}
        onConfirm={() => { removeMember(removing.id); say(`${removing.name || removing.email} removed`); setRemoving(null); }} />
    </div>
  );
}
