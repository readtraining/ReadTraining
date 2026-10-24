"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useAdminAccess } from "@/lib/adminContext";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { categoryName, levelName, methodName, subcategoryName, topicName } from "@/lib/taxonomy";
import { Said, DetailSkeleton, formatWhen } from "./adminParts";
import { EmptyState, ErrorState } from "@/components/states/States";
import { AdminStatus, AdminTag } from "./AdminStatus";

const copy = A.catalogue;
const d = copy.detail;
const ap = A.approvals;

// One course for the admin (API admin.courses.get): what the provider (or our team, for a shared page) wrote, laid out to check,
// with its status, provider and shared page. A change waiting on a live course shows field by field, live against proposed. The
// decisions sit in the page head: approve or send back a new course, approve or turn down a change, pause a live course or put
// back one the team paused (each note is shown to the provider and emailed). A shared page lists the providers' courses on it and
// opens in the course editor to write it.
export default function AdminCourse({ id }) {
  const me = useAdminAccess();
  const courseId = /^\d+$/.test(String(id)) ? Number(id) : 0;
  const query = api.admin.courses.get.useQuery({ courseId }, { enabled: Boolean(courseId), retry: false });
  const utils = api.useUtils();
  const decide = api.admin.courses.decide.useMutation();
  const [asking, setAsking] = useState(null); // "changes" | "rejectChange" | "pause"
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [said, setSaid] = useState("");
  const formRef = useRef(null);
  const c = query.data;

  if (!courseId || query.error?.data?.code === "NOT_FOUND") return <EmptyState title="This course was not found." text="It may have been deleted." action={{ href: "/admin/catalogue", label: d.back }} />;
  if (query.isError) return <ErrorState title="We couldn't load this course." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!c) return <DetailSkeleton />;

  const shared = c.kind === "shared";
  const canDecide = Boolean(me?.permissions?.includes("approve")) && !shared;
  const canWrite = Boolean(me?.permissions?.includes("catalogue")) && shared;
  const providerReady = c.provider?.status === "active";
  const refresh = () => {
    utils.admin.courses.get.invalidate({ courseId });
    utils.admin.courses.queue.invalidate();
    utils.admin.courses.counts.invalidate();
    utils.admin.courses.list.invalidate();
  };
  const run = async (decision, message) => {
    try {
      const r = await decide.mutateAsync({ courseId, decision, message });
      refresh();
      const text = { approve: "Approved: the course is live", changes: "Sent back to the provider with your note", approveChange: "Change approved: it is now the live version", rejectChange: "Change turned down", pause: "Course paused", resume: "Course back live" }[decision];
      setSaid(`${text}.${r.emailed ? " The provider was emailed." : decision === "resume" ? "" : " The email to the provider could not be sent."}`);
      return "";
    } catch (e) {
      const { fields, general } = errorsFrom(e);
      return fields.message || general;
    }
  };
  const open = (decision) => {
    setAsking(decision);
    setNote("");
    setError("");
  };
  const send = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setError({ changes: "Enter what the provider needs to change.", rejectChange: "Enter why the change is not approved.", pause: "Enter why the course is paused. The provider sees it." }[asking]);
      return focusFirstError(formRef.current);
    }
    const failed = await run(asking, note.trim());
    if (failed) setError(failed);
    else setAsking(null);
  };
  const busy = decide.isPending;
  const sheetTitle = { changes: ap.requestChanges, rejectChange: ap.rejectChange, pause: ap.pause }[asking] || "";
  const place = [categoryName(c.category), subcategoryName(c.category, c.subcategory), topicName(c.category, c.subcategory, c.topic)].filter(Boolean).join(" › ");

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <section className="rt-acc__card rt-adm-hero" aria-labelledby="rt-adm-course-h">
        <div className="rt-pws-course-herotext">
          <div className="rt-adm-item__top">
            <AdminStatus kind="course" status={c.status}>{copy.statuses[c.status]}</AdminStatus>
            <AdminTag>{copy.kind[c.kind]}</AdminTag>
            {c.pendingChanges && <AdminStatus kind="course" status="pending">{d.change}</AdminStatus>}
            <span className="rt-adm-item__when">Number {c.id}{c.updatedAt ? ` · Last changed ${formatWhen(new Date(c.updatedAt).getTime())}` : ""}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name" id="rt-adm-course-h">{c.title}</h2>
          <p className="rt-acc__note">
            {c.provider ? <>{d.provider}: <Link href={`/admin/providers/${c.provider.slug}`} className="rt-adm-strong">{c.provider.name}</Link>{!providerReady && " (not approved yet)"}</> : "Written by our team"}
            {c.parent && <> · {d.sharedPage}: <Link href={`/admin/catalogue/${c.parent.id}`}>{c.parent.title}</Link></>}
          </p>
          {c.statusNote && (c.status === "changes" || c.status === "paused") && <p className="rt-adm-item__reason"><strong>{c.status === "changes" ? "Note to the provider:" : "Why it is paused:"}</strong> {c.statusNote}</p>}
          {canDecide && c.status === "pending" && !providerReady && <p className="rt-adm-item__block">{ap.providerNotActive}</p>}
        </div>
        <div className="rt-adm-hero__actions">
          {canDecide && c.status === "pending" && providerReady && <button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => run("approve")}>{ap.approve}</button>}
          {canDecide && c.status === "pending" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => open("changes")}>{ap.requestChanges}</button>}
          {canDecide && c.pendingChanges && <button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => run("approveChange")}>{ap.approveChange}</button>}
          {canDecide && c.pendingChanges && <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => open("rejectChange")}>{ap.rejectChange}</button>}
          {canDecide && c.status === "live" && !c.pendingChanges && <button type="button" className="rt-cd__link rt-adm-danger" disabled={busy} onClick={() => open("pause")}>{ap.pause}</button>}
          {canDecide && c.status === "paused" && c.statusNote && providerReady && <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled={busy} onClick={() => run("resume")}>{ap.resume}</button>}
          {canWrite && <Link href={`/admin/catalogue/${c.id}/edit`} className="button -sm -purple-1 text-white">{d.edit}</Link>}
          {c.status === "live" && <Link href={`/course/${c.slug}`} className="button -sm -outline-purple-1 text-purple-1" target="_blank" rel="noopener noreferrer">{d.publicPage}</Link>}
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
                    <td data-label={d.now}><Value k={f.key} v={f.now} c={c} /></td>
                    <td data-label={d.proposed}><Value k={f.key} v={f.proposed} c={c} /></td>
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
          ) : <EmptyState inCard title={d.childrenNone} />}
        </section>
      )}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-cd-h">
          <h2 className="rt-acc__h2" id="rt-adm-cd-h">Details</h2>
          <dl className="rt-adm-dl">
            <div><dt>Category</dt><dd>{place || <span className="rt-adm-muted">Not chosen</span>}</dd></div>
            <div><dt>Level</dt><dd>{levelName(c.level) || <span className="rt-adm-muted">Not chosen</span>}</dd></div>
            {!shared && <div><dt>How it is taught</dt><dd>{methodName(c.method) || "–"}</dd></div>}
            {!shared && <div><dt>Price</dt><dd>{c.method === "self-paced" ? (c.pricePence != null ? formatPrice(c.pricePence / 100) : "Not set") : `Set on each date · ${c.upcomingCohorts} upcoming`}</dd></div>}
            {!shared && <div><dt>Performance model</dt><dd>{pw.models[c.model]?.label}</dd></div>}
            {!shared && <div><dt>Skill Saver</dt><dd>{c.skillSaver ? "Yes" : "No"}</dd></div>}
            <div><dt>Shown in search</dt><dd>{c.listed && (shared || c.isPublic) ? "Yes" : "No"}</dd></div>
            <div><dt>Address</dt><dd>/course/{c.slug}</dd></div>
            <div><dt>Search title</dt><dd>{c.seoTitle || <span className="rt-adm-muted">The course title</span>}</dd></div>
            <div><dt>Search description</dt><dd>{c.seoDescription || <span className="rt-adm-muted">The short description</span>}</dd></div>
          </dl>
          {c.missing.length > 0 && <p className="rt-acc__note">Still missing: {c.missing.join("; ")}.</p>}
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-ci-h">
          <h2 className="rt-acc__h2" id="rt-adm-ci-h">Images and video</h2>
          {c.images.length ? (
            <ul className="rt-adm-thumbs">
              {c.images.map((i, n) => <li key={i.id}><img src={i.url} alt={i.alt || ""} />{n === 0 && <AdminTag>Cover</AdminTag>}<small>{i.alt || "No ALT text"}</small></li>)}
            </ul>
          ) : <p className="rt-adm-muted">No images.</p>}
          {c.videoUrl ? <p className="rt-acc__note">Video: <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="rt-pws-ce__url">{c.videoUrl}</a></p> : <p className="rt-adm-muted">No video.</p>}
        </section>
      </div>

      <section className="rt-acc__card rt-adm-read" aria-labelledby="rt-adm-cc-h">
        <h2 className="rt-acc__h2" id="rt-adm-cc-h">The course page</h2>
        <h3 className="rt-adm-h3">Short description</h3>
        <Text v={c.summary} />
        <h3 className="rt-adm-h3">Description</h3>
        <Text v={c.description} />
        <h3 className="rt-adm-h3">Who it&apos;s for</h3>
        <Text v={c.audience} />
        <h3 className="rt-adm-h3">Entry requirements</h3>
        <Text v={c.entryRequirements} />
        <h3 className="rt-adm-h3">What learners will learn</h3>
        <Value k="outcomes" v={c.outcomes} c={c} />
        <h3 className="rt-adm-h3">Features</h3>
        <Value k="features" v={c.features} c={c} />
        <h3 className="rt-adm-h3">Syllabus</h3>
        <Value k="units" v={c.units} c={c} />
        <h3 className="rt-adm-h3">Exam and assessment</h3>
        <Value k="exams" v={c.exams} c={c} />
        <h3 className="rt-adm-h3">FAQs</h3>
        <Value k="faqs" v={c.faqs} c={c} />
      </section>

      <Sheet open={Boolean(asking)} onClose={() => setAsking(null)} title={`${sheetTitle}: ${c.title}`} closeLabel="Close">
        <form className="rt-q__form rt-biz__sheetform" onSubmit={send} noValidate ref={formRef}>
          <p className="rt-acc__note">{c.provider?.name}</p>
          <div className="rt-field">
            <label htmlFor="rt-adm-cnote">{ap.reasonLabel}</label>
            {error && <p className="rt-q__err" id="rt-adm-cnote-e"><span className="rt-sr">Error: </span>{error}</p>}
            <textarea id="rt-adm-cnote" rows={5} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-adm-cnote-e" : undefined} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>{sheetTitle}</button>
        </form>
      </Sheet>
    </div>
  );
}

// a paragraph field: blank lines start new paragraphs; empty shows as such
function Text({ v }) {
  if (!v) return <p className="rt-adm-muted">Not written.</p>;
  return v.split(/\n\s*\n/).map((p, i) => <p key={i} className="rt-adm-read__p">{p}</p>);
}

// any course field, as it reads: text, lists, units, exam rows, FAQs, catalogue places
function Value({ k, v, c }) {
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return <span className="rt-adm-muted">None</span>;
  if (k === "category") return categoryName(v) || v;
  if (k === "subcategory") return subcategoryName(c.category, v) || v;
  if (k === "topic") return topicName(c.category, c.subcategory, v) || v;
  if (k === "level") return levelName(v) || v;
  if (k === "units") return <ol className="rt-adm-read__list">{v.map((u, i) => <li key={i}><b>{u.title}</b>{u.body && <span className="rt-adm-read__pre">{u.body}</span>}</li>)}</ol>;
  if (k === "exams") return <ul className="rt-adm-read__list">{v.map((e, i) => <li key={i}><b>{e.unit}</b>{[e.passMark && `Pass mark: ${e.passMark}`, e.duration && `Duration: ${e.duration}`].filter(Boolean).join(" · ")}</li>)}</ul>;
  if (k === "faqs") return <ul className="rt-adm-read__list">{v.map((f, i) => <li key={i}><b>{f.question}</b>{f.answer}</li>)}</ul>;
  if (Array.isArray(v)) return <ul className="rt-adm-read__list">{v.map((x, i) => <li key={i}>{x}</li>)}</ul>;
  return <span className="rt-adm-read__pre">{String(v)}</span>;
}
