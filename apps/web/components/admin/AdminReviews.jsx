"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { demoCourseHref } from "@/data/demoCourses";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { hideReview, keepReview, showReview } from "@/lib/adminReviews";
import { focusFirstError } from "@/lib/focusFirstError";
import { Said, Search, TableSkeleton, Tabs, formatWhen, Pager, usePaging } from "./adminParts";
import { AdminStatus } from "./AdminStatus";

const copy = A.reviews;
const TABS = Object.keys(copy.tabs);
const STARS = ["0", "5", "4", "3", "2", "1"];

// Review moderation (Part B, B3): every review across every course and provider, by tab (no reply yet, challenged by the provider,
// hidden), rating and search. With the "reviews" switch an admin hides a review with a reason (or shows it again) and settles a
// provider's challenge either way: hide it, or keep it up. DEMO records (lib/adminReviews.js) until reviews are real.
export default function AdminReviews() {
  const data = useAdmin();
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("reviews");
  const [tab, setTab] = useState("all");
  const [stars, setStars] = useState("0");
  const [q, setQ] = useState("");
  const [hiding, setHiding] = useState(null);
  const [said, setSaid] = useState("");
  const pages = usePaging({ key: "", dir: -1 });
  if (!data) return <TableSkeleton rows={5} />;

  const needle = q.trim().toLowerCase();
  const inTab = {
    all: () => true,
    unanswered: (r) => !r.reply && !r.hidden,
    challenged: (r) => Boolean(r.challenge),
    hidden: (r) => Boolean(r.hidden),
  };
  const list = data.reviews
    .filter((r) => inTab[tab](r) && (stars === "0" || r.rating === Number(stars)) && (!needle || `${r.course} ${r.provider} ${r.learner}`.toLowerCase().includes(needle)))
    .sort((a, b) => Boolean(b.challenge) - Boolean(a.challenge) || b.at - a.at);
  const clear = () => { setTab("all"); setStars("0"); setQ(""); pages.restart(); };

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <div className="rt-adm-toolbar">
        <Tabs tabs={TABS.map((key) => ({ key, label: copy.tabs[key], count: data.reviews.filter(inTab[key]).length }))} value={tab} onChange={(k) => { setTab(k); pages.restart(); }} label="Show reviews" />
        <div className="rt-adm-toolbar__end">
          <div className="rt-adm-select -inline"><FieldSelect id="rt-adm-rv-stars" label={copy.stars} value={stars} onChange={(v) => { setStars(v); pages.restart(); }} options={STARS.map((s) => ({ value: s, label: copy.starOptions[s] }))} compact /></div>
          <Search value={q} onChange={(v) => { setQ(v); pages.restart(); }} label={copy.search} />
        </div>
      </div>
      {!canEdit && <p className="rt-acc__notice">{copy.readOnly}</p>}

      {list.length ? (
        <ul className="rt-adm-items">
          {list.slice((pages.page - 1) * pages.limit, pages.page * pages.limit).map((r) => (
            <li key={r.id} className={`rt-acc__card rt-adm-item rt-adm-review${r.hidden ? " is-hidden" : ""}`}>
              <div className="rt-adm-item__body">
                <div className="rt-adm-item__top">
                  <span className="rt-adm-stars" aria-label={copy.rating.replace("{n}", r.rating)}>{"★".repeat(r.rating)}<span aria-hidden="true">{"★".repeat(5 - r.rating)}</span></span>
                  {r.challenge && <AdminStatus kind="review" status="challenge">{copy.challenge}</AdminStatus>}
                  {r.hidden && <AdminStatus kind="review" status="hidden">{copy.hiddenTag}</AdminStatus>}
                  <span className="rt-adm-item__when">{r.learner} · {formatWhen(r.at)}</span>
                </div>
                <p className="rt-adm-strong rt-adm-review__title">{r.title}</p>
                <p className="rt-adm-review__text">{r.text}</p>
                <p className="rt-acc__note"><Link href={demoCourseHref(r.courseId)} className="rt-adm-strong">{r.course}</Link> · {r.provider}</p>
                {r.reply ? <p className="rt-adm-item__reason"><strong>{copy.reply}:</strong> {r.reply}</p> : !r.hidden && <p className="rt-acc__note">{copy.noReply}</p>}
                {r.challenge && <p className="rt-adm-item__reason"><strong>{copy.providerNote}</strong> {r.challenge}</p>}
                {r.hidden && <p className="rt-acc__note">{copy.hiddenNote.replace("{who}", r.hidden.by || "an admin").replace("{reason}", r.hidden.reason)}</p>}
              </div>
              {canEdit && (
                <div className="rt-adm-item__actions">
                  {r.hidden ? (
                    <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { showReview(r); setSaid(copy.shown); }}>{copy.show}</button>
                  ) : (
                    <>
                      {r.challenge && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { keepReview(r); setSaid(copy.kept); }}>{copy.keep}</button>}
                      <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setHiding(r)}>{copy.hide}</button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={copy.none} action={{ label: copy.clear, onClick: clear }} />
      )}
      {list.length > 0 && <Pager paging={pages} total={list.length} label="reviews" />}

      <Sheet open={Boolean(hiding)} onClose={() => setHiding(null)} title={copy.hideTitle} closeLabel="Close">
        {hiding && <HideForm review={hiding} onDone={() => { setHiding(null); setSaid(copy.hiddenDone); }} />}
      </Sheet>
    </div>
  );
}

function HideForm({ review, onDone }) {
  const [reason, setReason] = useState(review.challenge ? review.challenge.slice(0, 300) : "");
  const [error, setError] = useState("");
  const ref = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(copy.reasonError);
      return focusFirstError(ref.current);
    }
    hideReview(review, reason.trim());
    onDone();
  };
  return (
    <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
      <p className="rt-adm-strong">{review.title}</p>
      <p className="rt-acc__note">{copy.hideText}</p>
      <div className="rt-field">
        <label htmlFor="rt-adm-rv-reason">{copy.reason}</label>
        <small className="rt-field__hint" id="rt-adm-rv-reason-hint">{copy.reasonHint}</small>
        {error && <p className="rt-q__err" id="rt-adm-rv-reason-e"><span className="rt-sr">Error: </span>{error}</p>}
        <textarea id="rt-adm-rv-reason" rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={`rt-adm-rv-reason-hint${error ? " rt-adm-rv-reason-e" : ""}`} />
      </div>
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{copy.hide}</button>
    </form>
  );
}
