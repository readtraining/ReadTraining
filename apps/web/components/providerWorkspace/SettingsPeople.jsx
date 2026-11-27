"use client";

import React, { useRef, useState } from "react";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import Sheet from "@/components/testPrep/runner/Sheet";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { addQuestion, answerQuestion, deleteQuestion } from "@/lib/providerWorkspace";
import { useProviderAccess } from "@/lib/providerAccess";
import { api } from "@/lib/trpc/react";
import { errorsFrom, errorText } from "@/lib/useMe";
import { Loading, Pill, RowMenu, Tabs, ToolSelect, formatDay } from "./providerParts";
import { ColWidths } from "@/components/admin/adminParts";
import { Confirm, Field, aria, isEmail, useParam } from "./settingsForm";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState, ErrorState } from "@/components/states/States";
import TextArea from "@/components/forms/TextArea";

// Settings › QA (learners' questions about a course, answered here and shown on the course page, plus questions the provider
// answers up front) and the Team page (who can use the workspace, with a role each; the account owner can't be changed or removed).

const ROLE = Object.fromEntries(pw.roles.map((r) => [r.key, r]));

// ---- questions -------------------------------------------------------------------------------------------------------------

function AnswerForm({ q, onDone, say }) {
  const [v, setV] = useState(q.answer || "");
  const [error, setError] = useState("");
  useUnsavedChanges(v.trim() !== (q.answer || "").trim());
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
      <Field id={id} label={q.answer ? "Your answer" : "Answer this question"} required error={error} hint="Shown on the course page under the question.">
        <TextArea {...aria(id, error, true)} rows={3} maxLength={1500} autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} />
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
  useUnsavedChanges(adding && Boolean(f.question.trim() || f.answer.trim())); // only while the add form is open
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
    setF({ course: "", question: "", answer: "" });
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
          <Field id="rt-qa-c" label="Course" required error={errors.course}>
            <FieldSelect id="rt-qa-c" label="Course" placeholder="Choose a course" value={f.course} onChange={(value) => setF((x) => ({ ...x, course: value }))} options={courses.map((c) => ({ value: c.id, label: c.title }))} invalid={Boolean(errors.course)} describedBy={aria("rt-qa-c", errors.course)["aria-describedby"]} />
          </Field>
          <Field id="rt-qa-q" label="Question" required error={errors.question}>
            <input {...aria("rt-qa-q", errors.question)} type="text" maxLength={200} autoComplete="off" value={f.question} onChange={(e) => setF((x) => ({ ...x, question: e.target.value }))} />
          </Field>
          <Field id="rt-qa-a" label="Answer" required error={errors.answer}>
            <TextArea {...aria("rt-qa-a", errors.answer)} rows={5} maxLength={1500} autoComplete="off" value={f.answer} onChange={(e) => setF((x) => ({ ...x, answer: e.target.value }))} />
          </Field>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Add question</button>
        </form>
      </Sheet>

      <Confirm danger open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this question?" confirmLabel="Delete question"
        text={removing ? `“${removing.question}” will be removed from the course page.` : ""}
        onConfirm={() => { deleteQuestion(removing.id); setRemoving(null); say("Question deleted"); }} />
    </div>
  );
}

// ---- team ------------------------------------------------------------------------------------------------------------------

// Team (owners and admins): everyone with their role and whether they've joined; invite by email with a role (they get an email
// with a link to /provider/join), change a role, send an invite again, remove someone or cancel their invite. The owner can't be
// changed or removed and nobody changes their own role (the API checks the same rules, provider.team).
export function TeamTab({ say }) {
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const manage = can("provider.team.manage");
  const list = api.provider.team.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const setRole = api.provider.team.setRole.useMutation();
  const resend = api.provider.team.resend.useMutation();
  const remove = api.provider.team.remove.useMutation();
  const [show, setShow] = useParam("show", "all");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const refresh = () => utils.provider.team.list.invalidate({ organisationId });
  const fail = (e) => say(errorText(e), { error: true });

  if (list.isError) return <ErrorState title="We couldn't load your team." text="Check your connection, then try again." onRetry={() => list.refetch()} />;
  if (!list.data) return <Loading rows={3} />;
  const { me, members } = list.data;
  const shown = members.filter((m) => show === "all" || (show === "invited" ? m.status === "invited" : m.status === "active"));
  const tabs = [
    { key: "all", label: "Everyone", count: members.length },
    { key: "active", label: "Joined", count: members.filter((m) => m.status === "active").length },
    { key: "invited", label: "Invited", count: members.filter((m) => m.status === "invited").length },
  ];
  const who = (m) => m.name || m.email;
  const changeRole = (m, role) =>
    setRole.mutate({ organisationId, userId: m.userId, role }, { onSuccess: (r) => { refresh(); say(`${who(m)} is now ${ROLE[role]?.label}${r.untutored ? `. ${r.untutored === 1 ? "The date they tutored now has" : `The ${r.untutored} dates they tutored now have`} no tutor` : ""}`); }, onError: fail });
  const resendTo = (m) =>
    resend.mutate({ organisationId, userId: m.userId }, { onSuccess: (r) => say(r.outbox ? `Invite saved to the test outbox for ${m.email}` : r.emailed ? `Invite sent again to ${m.email}` : `The email to ${m.email} couldn't be sent. Try again.`), onError: fail });

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={show} onChange={setShow} label="Show team members" />
        {manage && <button type="button" className="button -md -purple-1 text-white" onClick={() => setInviting(true)}>Invite</button>}
      </div>
      {shown.length === 0 ? (
        <EmptyState title={show === "invited" ? "No invites waiting." : "No one here yet."} />
      ) : (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <ColWidths widths={manage ? ["36%", "36%", null, "64px"] : ["36%", "36%", null]} />
            <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th>{manage && <th scope="col"><span className="rt-sr">Actions</span></th>}</tr></thead>
            <tbody>
              {shown.map((m) => {
                const owner = m.role === "owner";
                const mine = m.userId === me;
                return (
                  <tr key={m.userId}>
                    <td data-label="Member"><b>{who(m)}{mine ? " (you)" : ""}</b>{m.name && <small>{m.email}</small>}</td>
                    <td data-label="Role">
                      {owner || mine || !manage ? (
                        owner ? <Pill tone="info">Account owner</Pill> : ROLE[m.role]?.label
                      ) : (
                        <div className="rt-field rt-adm-select -inline">
                          <FieldSelect id={`rt-team-role-${m.userId}`} label={`Role for ${who(m)}`} value={m.role} onChange={(role) => role !== m.role && changeRole(m, role)} options={pw.roles.map((r) => ({ value: r.key, label: r.label }))} compact float />
                        </div>
                      )}
                    </td>
                    <td data-label="Status">{m.status === "active" ? <Pill tone="ok">Joined</Pill> : m.expired ? <Pill tone="muted">Invite expired</Pill> : <Pill tone="warn">Invited</Pill>}</td>
                    {manage && (
                      <td data-label="Actions" className="-act">
                        {!owner && !mine && (
                          <RowMenu label={`Actions for ${who(m)}`} items={[
                            ...(m.status === "invited" ? [{ label: "Resend invite", onClick: () => resendTo(m) }] : []),
                            { label: m.status === "invited" ? "Cancel invite" : "Remove from team", danger: true, onClick: () => setRemoving(m) },
                          ]} />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InviteSheet open={inviting} onClose={() => setInviting(false)} onDone={(text) => { setInviting(false); refresh(); say(text); }} />

      <Confirm danger open={Boolean(removing)} onClose={() => setRemoving(null)} busy={remove.isPending}
        title={removing ? (removing.status === "invited" ? `Cancel the invite to ${who(removing)}?` : `Remove ${who(removing)}?`) : ""}
        confirmLabel={removing?.status === "invited" ? "Cancel invite" : "Remove from team"}
        text={removing ? (removing.status === "invited" ? "Their invite link stops working." : `They lose access straight away.${removing.tutoring ? ` They tutor ${removing.tutoring} upcoming ${removing.tutoring === 1 ? "date, which will have" : "dates, which will have"} no tutor.` : ""}`) : ""}
        onConfirm={() => remove.mutate({ organisationId, userId: removing.userId }, { onSuccess: () => { const m = removing; setRemoving(null); refresh(); say(m.status === "invited" ? `Invite to ${m.email} cancelled` : `${who(m)} removed`); }, onError: (e) => { setRemoving(null); fail(e); } })} />
    </div>
  );
}

// Invite someone: their email and a role (its description under it)
function InviteSheet({ open, onClose, onDone }) {
  const { organisationId } = useProviderAccess();
  const invite = api.provider.team.invite.useMutation();
  const [f, setF] = useState({ email: "", role: "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const close = () => {
    if (invite.isPending) return;
    setF({ email: "", role: "" });
    setErrors({});
    onClose();
  };
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEmail(f.email)) errs.email = "Enter an email address in the correct format, like name@example.com.";
    if (!f.role) errs.role = "Choose their role.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    try {
      const email = f.email.trim();
      const r = await invite.mutateAsync({ organisationId, email, role: f.role });
      setF({ email: "", role: "" });
      onDone(r.outbox ? `Invite saved to the test outbox for ${email}` : r.emailed ? `Invite sent to ${email}` : `${email} is invited, but the email couldn't be sent. Use Resend invite.`);
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setErrors({ ...fields, ...(general && !Object.keys(fields).length ? { email: general } : {}) });
      focusFirstError(formRef.current);
    }
  };
  return (
    <Sheet open={open} onClose={close} title="Invite to your team" closeLabel="Close" className="rt-pws-set__sheet">
      <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
        <Field id="rt-team-email" label="Email address" required error={errors.email}>
          <input {...aria("rt-team-email", errors.email)} type="email" autoComplete="off" spellCheck={false} value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} />
        </Field>
        <Field id="rt-team-role" label="Role" required error={errors.role} hint={f.role ? ROLE[f.role].can : undefined}>
          <FieldSelect id="rt-team-role" label="Role" placeholder="Choose a role" value={f.role} onChange={(value) => setF((x) => ({ ...x, role: value }))} options={pw.roles.map((r) => ({ value: r.key, label: r.label }))} invalid={Boolean(errors.role)} describedBy={aria("rt-team-role", errors.role, Boolean(f.role))["aria-describedby"]} inline />
        </Field>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={invite.isPending}>{invite.isPending ? "Sending…" : "Send invite"}</button>
      </form>
    </Sheet>
  );
}
