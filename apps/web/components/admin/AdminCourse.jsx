"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { refreshCourses } from "@/app/admin/actions";
import { useAdminAccess } from "@/lib/adminContext";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { categoryName, levelName, methodName, subcategoryName, topicName } from "@/lib/taxonomy";
import { isDatedMethod, wayName, waysOf } from "@/lib/courseModes";
import { Said, DetailSkeleton, formatWhen, Empty, PageLink, getQuery, setQuery, Req } from "./adminParts";
import { ErrorState } from "@/components/states/States";
import { AdminStatus, AdminTag } from "./AdminStatus";
import AdminCoursePrices from "./AdminCoursePrices";
import TextArea from "@/components/forms/TextArea";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

const copy = A.catalogue;
const d = copy.detail;
const ap = A.approvals;
// the decisions that need a note for the provider (it is emailed to them)
const NOTE = new Set(["changes", "rejectChange", "pause"]);
const APPROVALS = new Set(["approve", "approveChange"]);

// The topic a provider's course is listed under, chosen when approving it (or a change that moves it): the topics in use under its
// sub-category (API `topicChoice`, admin.courses), one required. Providers don't choose topics; our team does, here and in
// Approvals' Approve pop-up.
export const TOPIC_ERROR = "Choose the topic this course is listed under.";
export function TopicField({ id, choice, value, onChange, error }) {
  return (
    <div className="rt-field">
      <label htmlFor={id}>Topic<Req /></label>
      <small className="rt-field__hint" id={`${id}-h`}>Where the course is listed, and on which shared course page. The provider doesn't choose it.</small>
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      <FieldSelect id={id} label="Topic" placeholder="Choose a topic" value={value} onChange={onChange} options={choice.options.map((o) => ({ value: o.id, label: o.name }))} invalid={Boolean(error)} describedBy={`${id}-h${error ? ` ${id}-e` : ""}`} />
    </div>
  );
}

// One course for the admin (API admin.courses.get): what the provider (or our team, for a shared page) wrote, laid out to check,
// with its status, provider and shared page. A change waiting on a live course shows field by field, live against proposed. The
// decisions sit in the page head: approve or send back a new course, approve or turn down a change, pause a live course or put
// back one the team paused (each note is shown to the provider and emailed). A refusal (and an email that couldn't be sent) stays
// in a notice at the top until the next decision. Preview (in the catalogue table's menu) opens the course as visitors will see it, with a waiting change shown
// as if approved. A shared page lists the providers' courses on it and opens in the course editor to write it. Prices and packages
// show what learners will pay (AdminCoursePrices), checked before approving: plans have no approval of their own.
export default function AdminCourse({ id }) {
  const me = useAdminAccess();
  const courseId = /^\d+$/.test(String(id)) ? Number(id) : 0;
  const query = api.admin.courses.get.useQuery({ courseId }, { enabled: Boolean(courseId), retry: false });
  const utils = api.useUtils();
  const decide = api.admin.courses.decide.useMutation();
  const [asking, setAsking] = useState(null); // the decision being confirmed in the pop-up
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [topic, setTopic] = useState(""); // the topic chosen in the Approve pop-up (topicChoice)
  const [topicError, setTopicError] = useState("");
  const [said, setSaid] = useState("");
  const [problem, setProblem] = useState(""); // a refused decision, or an email that couldn't be sent: shown until the next one
  // after a decision, until the course has loaded again: the buttons stay locked, so the old status never shows with live buttons
  const [settling, setSettling] = useState(false);
  const formRef = useRef(null);
  const c = query.data;
  // Pause course from the catalogue table's menu (?do=pause): the same pop-up as here, with its checks
  useEffect(() => {
    if (!c || getQuery("do") !== "pause") return;
    setQuery("do", null);
    if (c.kind !== "shared" && c.status === "live" && me?.permissions?.includes("approve")) setAsking("pause");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  if (!courseId || query.error?.data?.code === "NOT_FOUND") return <Empty kind="missing" title="This course was not found." action={{ href: "/admin/catalogue", label: d.back }} />;
  if (query.isError) return <ErrorState title="We couldn't load this course." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!c) return <DetailSkeleton />;

  const shared = c.kind === "shared";
  const canDecide = Boolean(me?.permissions?.includes("approve")) && !shared;
  // a shared page with the catalogue switch; a provider's course with the approve switch (its content) or the pricing switch
  // (its prices), as ReadTraining staff (StaffEdit): the editor then offers only what their switches allow
  const canWrite = shared ? Boolean(me?.permissions?.includes("catalogue")) : ["approve", "pricing"].some((x) => me?.permissions?.includes(x));
  const providerReady = c.provider?.status === "active";
  // this course is waited for (the page shows its new status before it unlocks); the lists catch up behind it
  const refresh = async () => {
    utils.admin.courses.queue.invalidate();
    utils.admin.courses.counts.invalidate();
    utils.admin.courses.list.invalidate();
    await utils.admin.courses.get.invalidate({ courseId }).catch(() => {});
  };
  // a decision on the admin's own course (or its change): only as the sole approver, with a reason (API lib/soleApprover.mts); pausing
  // it isn't one, nor putting it back live after pausing it themselves
  const ownFor = (decision) => (decision === "approveChange" || decision === "rejectChange" ? c.ownChange : decision === "pause" || (decision === "resume" && c.pausedByYou) ? false : c.ownCourse);
  const allowedFor = (decision) => !ownFor(decision) || c.soleApprover;
  const needsNote = (decision) => NOTE.has(decision);
  // approving needs the topic chosen in the pop-up when the course's sub-category has topics (a change that keeps a topic that
  // still fits keeps it without asking)
  const needsTopic = (decision) => APPROVALS.has(decision) && Boolean(c.topicChoice?.ask);
  const run = async (decision, message, ownReason, chosenTopic) => {
    setProblem("");
    try {
      // the version on screen: when the change, or the course itself, was sent (the API refuses a decision on a newer one)
      const sent = decision === "approveChange" || decision === "rejectChange" ? c.change?.since : decision === "approve" || decision === "changes" ? c.submittedAt : null;
      const seen = sent ? new Date(sent).toISOString() : undefined;
      const r = await decide.mutateAsync({ courseId, decision, message, ownReason, seen, ...(chosenTopic ? { topic: chosenTopic } : {}) });
      setSettling(true);
      refreshCourses().catch(() => {});
      await refresh();
      setSettling(false);
      const text = { approve: "Approved: the course is live", changes: "Sent back to the provider with your note", approveChange: "Change approved: it is now the current version", rejectChange: "Change turned down", pause: "Course paused", resume: "Course back live" }[decision];
      setSaid(`${text}.${r.outbox ? ` ${ap.emailOutbox}` : r.emailed ? ` ${ap.emailed}` : ""}`);
      if (!r.outbox && !r.emailed) setProblem(ap.notEmailed);
      return "";
    } catch (e) {
      // a field's message (the note, the reason) or the refusal itself (a retired entry, something missing, another admin decided…)
      const { fields, general } = errorsFrom(e);
      return fields.topic || fields.message || fields.ownReason || general || Object.values(fields)[0] || "";
    }
  };
  const open = (decision) => {
    setAsking(decision);
    setNote("");
    setError("");
    setReason("");
    setReasonError("");
    setTopic(c.topicChoice?.current || "");
    setTopicError("");
  };
  // a decision goes straight through, unless it needs a note for the provider or is on the admin's own request; a refusal shows in
  // the notice at the top
  const act = async (decision) => {
    if (needsNote(decision) || ownFor(decision) || needsTopic(decision)) return open(decision);
    const failed = await run(decision);
    if (failed) setProblem(failed);
  };
  const send = async (e) => {
    e.preventDefault();
    const noteError = needsNote(asking) && !note.trim() ? { changes: "Enter what the provider needs to change.", rejectChange: "Enter why the change is not approved.", pause: "Enter why the course is paused. The provider sees it." }[asking] : "";
    const ownError = ownFor(asking) && reason.trim().length < 10 ? A.own.error : "";
    const pickError = needsTopic(asking) && !topic ? TOPIC_ERROR : "";
    setError(noteError);
    setReasonError(ownError);
    setTopicError(pickError);
    if (noteError || ownError || pickError) return focusFirstError(formRef.current);
    setTopicError("");
    const failed = await run(asking, needsNote(asking) ? note.trim() : undefined, ownFor(asking) ? reason.trim() : undefined, needsTopic(asking) ? topic : undefined);
    // shown under the field it is about: the topic (or any refusal when the topic is the pop-up's only field), the reason, the note
    if (failed) (needsTopic(asking) && (failed === TOPIC_ERROR || !ownFor(asking)) ? setTopicError : ownFor(asking) && !needsNote(asking) ? setReasonError : setError)(failed);
    else setAsking(null);
  };
  const busy = decide.isPending || settling;
  const sheetTitle = { approve: ap.approve, changes: ap.requestChanges, approveChange: ap.approveChange, rejectChange: ap.rejectChange, pause: ap.pause, resume: ap.resume }[asking] || "";
  // their own course, or their own change, waiting for a decision; and their own course another admin paused: another admin decides,
  // so a short line says why the decision buttons aren't there (the sole approver gets the buttons, and the pop-up asks for the reason)
  const own = Boolean((c.status === "pending" && c.ownCourse) || (c.pendingChanges && c.ownChange));
  const ownWhy = !canDecide || c.soleApprover ? "" : own ? ap.ownBlocked : c.ownCourse && c.status === "paused" && c.statusNote && !c.pausedByYou ? ap.ownPaused : "";
  // a course (or a change) waiting for a decision opens every section of its page: the admin reads it all before deciding
  const reviewing = c.status === "pending" || Boolean(c.pendingChanges);
  const place = [categoryName(c.category), subcategoryName(c.category, c.subcategory), topicName(c.category, c.subcategory, c.topic)].filter(Boolean).join(" › ");
  // where a waiting change files the course: its proposed category and sub-category, or the current ones it leaves as they are
  const proposedOf = (key) => c.change?.fields.find((f) => f.key === key);
  const proposedPlace = { category: proposedOf("category") ? proposedOf("category").proposed : c.category, subcategory: proposedOf("subcategory") ? proposedOf("subcategory").proposed : c.subcategory };

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      {problem && <p className="rt-acc__notice -warn" role="alert">{problem}</p>}
      <section className="rt-acc__card rt-adm-hero" aria-labelledby="rt-adm-course-h">
        <div className="rt-pws-course-herotext">
          <div className="rt-adm-item__top">
            <AdminStatus kind="course" status={c.status}>{copy.statuses[c.status]}</AdminStatus>
            <AdminTag>{copy.kind[c.kind]}</AdminTag>
            {c.pendingChanges && <AdminStatus kind="course" status="pending">{d.change}</AdminStatus>}
            <span className="rt-adm-item__when">Number {c.id}{c.updatedAt ? ` · Last changed ${formatWhen(new Date(c.updatedAt).getTime())}` : ""}</span>
          </div>
          <h1 className="rt-adm__h1 rt-adm-hero__name" id="rt-adm-course-h">{c.title}</h1>
          <p className="rt-acc__note">
            {c.provider ? <>{d.provider}: <PageLink href={`/admin/providers/${c.provider.slug}`} className="rt-adm-strong">{c.provider.name}</PageLink>{!providerReady && ` (${ap.providerState[c.provider.status] || "account not active"})`}</> : "Written by our team"}
            {c.parent && <> · {d.sharedPage}: <Link href={`/admin/catalogue/${c.parent.id}`}>{c.parent.title}</Link></>}
          </p>
          {c.parent && !c.parent.sameSubject && <p className="rt-acc__notice -warn">{d.otherSubject(c.parent.title)}</p>}
          {c.statusNote && (c.status === "changes" || c.status === "paused") && <p className="rt-adm-item__reason"><strong>{c.status === "changes" ? "Note to the provider:" : "Why it is paused:"}</strong> {c.statusNote}</p>}
          {canDecide && c.status === "pending" && !providerReady && <p className="rt-adm-item__block">{ap.providerNotActive(c.provider?.status)}</p>}
          {canDecide && c.status === "paused" && !c.statusNote && <p className="rt-acc__note">{ap.providerPaused}</p>}
        </div>
        {/* only the decision waiting on this page (or Edit course when there is none); the rest is in the catalogue table's menu */}
        <div className="rt-adm-hero__actions">
          {canDecide && c.status === "paused" && c.statusNote && providerReady && allowedFor("resume") ? (
            <button type="button" className="button -md -purple-1 text-white" disabled={busy} onClick={() => act("resume")}>{ap.resume}</button>
          ) : canDecide && ((c.status === "pending" && (allowedFor("changes") || (providerReady && allowedFor("approve")))) || (c.pendingChanges && (allowedFor("rejectChange") || allowedFor("approveChange")))) ? (
            <>
              {c.status === "pending" && allowedFor("changes") && <button type="button" className="button -md -outline-purple-1 text-purple-1" disabled={busy} onClick={() => act("changes")}>{ap.requestChanges}</button>}
              {c.pendingChanges && allowedFor("rejectChange") && <button type="button" className="button -md -outline-purple-1 text-purple-1" disabled={busy} onClick={() => act("rejectChange")}>{ap.rejectChange}</button>}
              {c.status === "pending" && providerReady && allowedFor("approve") && <button type="button" className="button -md -purple-1 text-white" disabled={busy} onClick={() => act("approve")}>{ap.approve}</button>}
              {c.pendingChanges && allowedFor("approveChange") && <button type="button" className="button -md -purple-1 text-white" disabled={busy} onClick={() => act("approveChange")}>{ap.approveChange}</button>}
            </>
          ) : canWrite && <Link href={`/admin/catalogue/${c.id}/edit`} className="button -md -purple-1 text-white">{shared ? d.edit : "Edit course"}</Link>}
          {ownWhy && <p className="rt-adm-item__hint">{ownWhy}</p>}
        </div>
      </section>

      {c.change && (
        <section className="rt-acc__card" aria-labelledby="rt-adm-change-h">
          <h2 className="rt-acc__h2" id="rt-adm-change-h">{d.change}</h2>
          <p className="rt-acc__note">{d.changeNote} Sent {formatWhen(new Date(c.change.since).getTime())}.</p>
          <div className="rt-biz__tablecard">
            <table className="rt-biz__table rt-adm-table rt-adm-diff">
              <thead><tr><th scope="col">Field</th><th scope="col">{d.now}</th><th scope="col">{d.proposed}</th></tr></thead>
              <tbody>
                {c.change.fields.map((f) => (
                  <tr key={f.key}>
                    <th scope="row" data-label="Field">{d.fields[f.key] || f.key}</th>
                    <td data-label={d.now}><Value k={f.key} v={f.now} place={c} /></td>
                    <td data-label={d.proposed}><Value k={f.key} v={f.proposed} place={proposedPlace} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {shared && (
        <section className="rt-acc__card" aria-labelledby="rt-adm-children-h">
          <h2 className="rt-acc__h2" id="rt-adm-children-h">{d.children}</h2>
          {c.children.length ? (
            <ul className="rt-adm-list">
              {c.children.map((x) => (
                <li key={x.id}>
                  <div><Link href={`/admin/catalogue/${x.id}`} className="rt-adm-strong">{x.title}</Link><small>{x.provider} · {x.upcoming} upcoming {x.upcoming === 1 ? "date" : "dates"}</small></div>
                  <AdminStatus kind="course" status={x.status}>{copy.statuses[x.status]}</AdminStatus>
                </li>
              ))}
            </ul>
          ) : <Empty inCard title="No provider courses yet" text={d.childrenNone} />}
        </section>
      )}

      <div className="rt-adm-detail">
        <div className="rt-adm-detail__main">
        <section className="rt-acc__card" aria-labelledby="rt-adm-cd-h">
          <h2 className="rt-acc__h2" id="rt-adm-cd-h">Details</h2>
          <dl className="rt-adm-dl">
            <div><dt>Category</dt><dd>{place || <span className="rt-adm-muted">Not chosen</span>}</dd></div>
            <div><dt>Level</dt><dd>{levelName(c.level) || <span className="rt-adm-muted">Not chosen</span>}</dd></div>
            <div><dt>Course type</dt><dd>{c.compliance === null ? <span className="rt-adm-muted">{pw.compliance.name(null)}</span> : pw.compliance.name(c.compliance)}
              {/* the provider's answer against the shared page's (our team's, the one the public sees): check before approving */}
              {!shared && c.parent && c.parent.compliance !== null && c.compliance !== null && c.parent.compliance !== c.compliance && (
                <p className="rt-acc__notice -warn rt-adm-mt">The shared page {c.parent.title} is marked {pw.compliance.name(c.parent.compliance)}. Check the provider&apos;s answer before approving.</p>
              )}
            </dd></div>
            {!shared && <div><dt>Learning options</dt><dd>{waysOf(c).length ? <>{methodName(c.method)}{waysOf(c).length > 1 && <span className="rt-adm-muted"> (primary) · also {waysOf(c).slice(1).map((m) => wayName(c, m)).join(", ")}</span>}</> : "–"}</dd></div>}
            {!shared && <div><dt>Price</dt><dd>{[
              waysOf(c).includes("self-paced") ? `Self-paced: ${c.pricePence != null ? formatPrice(c.pricePence / 100) : "not set"}` : "",
              waysOf(c).some(isDatedMethod) ? `Set on each date · ${c.upcomingCohorts} upcoming` : "",
            ].filter(Boolean).join(" · ") || "–"} <span className="rt-adm-muted">(see Prices and packages)</span></dd></div>}
            {!shared && <div><dt>Performance model</dt><dd>{pw.models[c.model]?.label}</dd></div>}
            {!shared && <div><dt>Skill Saver</dt><dd>{c.skillSaver ? "Yes" : "No"}</dd></div>}
            <div><dt>Shown in search</dt><dd>{c.listed && (shared || c.isPublic) ? "Yes" : "No"}</dd></div>
            <div><dt>Address</dt><dd>/course/{c.slug}</dd></div>
            <div><dt>Search title</dt><dd>{c.seoTitle || <span className="rt-adm-muted">The course title</span>}</dd></div>
            <div><dt>Search description</dt><dd>{c.seoDescription || <span className="rt-adm-muted">The short description</span>}</dd></div>
          </dl>
          {c.missing.length > 0 && <p className="rt-acc__note">Still missing: {c.missing.join("; ")}.</p>}
        </section>

        {/* a plan is edited on the provider's Price plans page, as staff: the pricing switch, an active or suspended provider */}
        <AdminCoursePrices pricing={c.pricing} planHref={me?.permissions?.includes("pricing") && c.provider && ["active", "suspended"].includes(c.provider.status) ? (id) => `/admin/providers/${c.provider.slug}/plans?plan=${id}` : null} />

      <section className="rt-acc__card" aria-labelledby="rt-adm-cc-h">
        <h2 className="rt-acc__h2" id="rt-adm-cc-h">The course page</h2>
        <dl className="rt-adm-dl rt-adm-read">
          <Row label="Short description" v={c.summary}><Text v={c.summary} /></Row>
          <Row label="Description" v={c.description}><Text v={c.description} /></Row>
          <Row label="Who it's for" v={c.audience}><Text v={c.audience} /></Row>
          <Row label="Entry requirements" v={c.entryRequirements}><Text v={c.entryRequirements} /></Row>
          <Row label="What learners will learn" v={c.outcomes}><Bullets items={c.outcomes} /></Row>
          <Row label="Features" v={c.features}><Bullets items={c.features} /></Row>
          <Row label="Line above the syllabus" v={c.syllabusIntro}><Text v={c.syllabusIntro} /></Row>
          <Row label="Syllabus" v={c.units}><Fold open={reviewing} label={count(c.units, "unit")}><Units units={c.units} /></Fold></Row>
          <Row label="Text above the exam table" v={c.examsIntro}><Text v={c.examsIntro} /></Row>
          <Row label="Exam and assessment" v={c.exams}><Fold open={reviewing} label={count(c.exams, "exam")}><Exams exams={c.exams} /></Fold></Row>
          <Row label="FAQs" v={c.faqs}><Fold open={reviewing} label={count(c.faqs, "question")}><Faqs faqs={c.faqs} /></Fold></Row>
        </dl>
      </section>
        </div>
        <aside className="rt-adm-detail__side">
        <section className="rt-acc__card" aria-labelledby="rt-adm-ci-h">
          <h2 className="rt-acc__h2" id="rt-adm-ci-h">Images and video</h2>
          {c.images.length ? (
            <ul className="rt-adm-thumbs">
              {c.images.map((i, n) => <li key={i.id}><img src={i.url} alt={i.alt || ""} />{n === 0 && <AdminTag>Cover</AdminTag>}<small>{i.alt || "No ALT text"}</small></li>)}
            </ul>
          ) : <Empty inCard icon="content" title="No images yet" text="Pictures added in the course editor show here; the first is the cover." />}
          <dl className="rt-adm-dl rt-adm-mt">
            <div><dt>Video</dt><dd>{c.videoUrl ? <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="rt-pws-ce__url">{c.videoUrl}</a> : <span className="rt-adm-muted">–</span>}</dd></div>
          </dl>
        </section>
        </aside>
      </div>

      <Sheet open={Boolean(asking)} onClose={() => setAsking(null)} title={`${sheetTitle}: ${c.title}`} closeLabel="Close">
        <form className="rt-q__form rt-biz__sheetform" onSubmit={send} noValidate ref={formRef}>
          <p className="rt-acc__note">{c.provider?.name}</p>
          {asking && needsTopic(asking) && <TopicField id="rt-adm-ctopic" choice={c.topicChoice} value={topic} onChange={(v) => { setTopic(v); setTopicError(""); }} error={topicError} />}
          {asking && needsNote(asking) && (
            <div className="rt-field">
              <label htmlFor="rt-adm-cnote">{ap.reasonLabel}<Req /></label>
              {error && <p className="rt-q__err" id="rt-adm-cnote-e"><span className="rt-sr">Error: </span>{error}</p>}
              <TextArea id="rt-adm-cnote" rows={5} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-adm-cnote-e" : undefined} />
            </div>
          )}
          {asking && ownFor(asking) && (
            <div className="rt-field">
              <label htmlFor="rt-adm-cown">{A.own.label}<Req /></label>
              <small className="rt-field__hint" id="rt-adm-cown-hint">{A.own.hint}</small>
              {reasonError && <p className="rt-q__err" id="rt-adm-cown-e"><span className="rt-sr">Error: </span>{reasonError}</p>}
              <TextArea id="rt-adm-cown" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={reasonError ? true : undefined} aria-describedby={`rt-adm-cown-hint${reasonError ? " rt-adm-cown-e" : ""}`} />
            </div>
          )}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>{sheetTitle}</button>
        </form>
      </Sheet>
    </div>
  );
}

// The course page's words, read as rows like Details: a gap shows as "Not written" in amber, so it is noticed. The long parts
// (syllabus, exams, FAQs) fold to a count on a live course and open while it waits for a decision.
const isEmpty = (v) => v === null || v === undefined || (typeof v === "string" ? !v.trim() : Array.isArray(v) && !v.length);
function Row({ label, v, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{isEmpty(v) ? <AdminStatus kind="content" status="missing">Not written</AdminStatus> : children}</dd>
    </div>
  );
}
const count = (list, word) => `${list.length} ${word}${list.length === 1 ? "" : "s"}`;
const Fold = ({ open, label, children }) => (
  <details className="rt-adm-fold" open={open || undefined}>
    <summary>{label}</summary>
    {children}
  </details>
);
const Bullets = ({ items }) => <ul className="rt-adm-read__list">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
// each unit numbered, its topics (one per line, as written) as bullets under it
const Units = ({ units }) => (
  <ol className="rt-adm-read__list">
    {units.map((u, i) => {
      const lines = (u.body || "").split("\n").map((l) => l.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
      return (
        <li key={i}>
          <b>{u.title}</b>
          {lines.length > 1 ? <Bullets items={lines} /> : lines.length === 1 && <p className="rt-adm-read__p">{lines[0]}</p>}
        </li>
      );
    })}
  </ol>
);
const Exams = ({ exams }) => (
  <div className="rt-biz__tablecard rt-adm-read__table">
    <table className="rt-biz__table rt-adm-table">
      <thead><tr><th scope="col">Exam</th>{exams.some((e) => e.assessment) && <th scope="col">Assessment</th>}<th scope="col">Pass mark</th><th scope="col">Duration</th></tr></thead>
      <tbody>
        {exams.map((e, i) => (
          <tr key={i}>
            <td data-label="Exam">{e.unit}</td>
            {exams.some((x) => x.assessment) && <td data-label="Assessment">{e.assessment || "–"}</td>}
            <td data-label="Pass mark">{e.passMark || "–"}</td>
            <td data-label="Duration">{e.duration || "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const Faqs = ({ faqs }) => <ul className="rt-adm-read__faqs">{faqs.map((f, i) => <li key={i}><b>{f.question}</b><Text v={f.answer} /></li>)}</ul>;

// a paragraph field: blank lines start new paragraphs
function Text({ v }) {
  if (!v) return <p className="rt-adm-muted">Not written.</p>;
  return v.split(/\n\s*\n/).map((p, i) => <p key={i} className="rt-adm-read__p rt-adm-read__pre">{p}</p>);
}

// any course field, as it reads: text, lists, units, exam rows, FAQs, catalogue places (`place`: the category and sub-category
// the value sits under, the current ones or the change's)
function Value({ k, v, place }) {
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return <span className="rt-adm-muted">None</span>;
  if (k === "category") return categoryName(v) || v;
  if (k === "subcategory") return subcategoryName(place.category, v) || v;
  if (k === "topic") return topicName(place.category, place.subcategory, v) || v;
  if (k === "level") return levelName(v) || v;
  if (k === "compliance") return pw.compliance.name(v);
  if (k === "units") return <ol className="rt-adm-read__list">{v.map((u, i) => <li key={i}><b>{u.title}</b>{u.body && <span className="rt-adm-read__pre">{u.body}</span>}</li>)}</ol>;
  if (k === "exams") return <ul className="rt-adm-read__list">{v.map((e, i) => <li key={i}><b>{e.unit}</b>{[e.assessment && `Assessment: ${e.assessment}`, e.passMark && `Pass mark: ${e.passMark}`, e.duration && `Duration: ${e.duration}`].filter(Boolean).join(" · ")}</li>)}</ul>;
  if (k === "faqs") return <ul className="rt-adm-read__list">{v.map((f, i) => <li key={i}><b>{f.question}</b>{f.answer}</li>)}</ul>;
  if (Array.isArray(v)) return <ul className="rt-adm-read__list">{v.map((x, i) => <li key={i}>{x}</li>)}</ul>;
  return <span className="rt-adm-read__pre">{String(v)}</span>;
}
