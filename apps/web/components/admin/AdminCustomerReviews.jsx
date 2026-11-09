"use client";

import React, { useMemo, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import ReviewStars from "@/components/customerReviews/ReviewStars";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { refreshReviews } from "@/app/admin/actions";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { useTaxonomy } from "@/lib/taxonomyContext";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Pager, RowMenu, Said, TableSkeleton, Tabs, Empty, usePaging } from "./adminParts";
import { describedBy, field } from "./contentParts";
import DateField from "./DateField";
import { AdminStatus } from "./AdminStatus";

const copy = A.customerReviews;
const f = copy.fields;
const today = () => new Date().toISOString().slice(0, 10);
const BLANK = { name: "", text: "", rating: "", reviewDate: "", dateIsApproximate: false, topic: "", origin: "", originUrl: "", onHome: false, published: true };
const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: n === 1 ? f.rating.star : f.rating.stars.replace("{n}", n) }));

// every topic in the catalogue list, as "Category › Sub-category › Topic" (value "category/sub-category/topic")
function useTopicOptions() {
  const taxonomy = useTaxonomy();
  return useMemo(() => {
    const out = [];
    for (const c of taxonomy.categories) {
      if (c.active === false) continue;
      for (const s of c.subcategories ?? []) for (const t of s.topics ?? []) out.push({ value: `${c.slug}/${s.slug}/${t.slug}`, label: `${c.name} › ${s.name} › ${t.name}`, short: t.name });
    }
    return out;
  }, [taxonomy]);
}

const dateText = (r) => (!r.reviewDate ? copy.noDate : r.dateIsApproximate ? copy.about.replace("{date}", formatDate(r.reviewDate)) : formatDate(r.reviewDate));

// Customer reviews (real, API admin.reviews): reviews of Read Training that the website shows. Every admin sees them; with the
// "content" switch an admin adds a real customer's review (any rating from 1 to 5, as they gave it), edits it, publishes or
// hides it, or deletes it. Up to 4 go on the home page; a review names a course only when its text clearly names it, and says
// where it was first posted when that is known. After every change the site's saved copy is marked out of date, so it shows
// within seconds. Booking reviews (a later milestone) arrive waiting; their words are the learner's, so they are only published
// or hidden here.
export default function AdminCustomerReviews() {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("content");
  const [tab, setTab] = useState("all");
  const [sheet, setSheet] = useState(null); // null, or { review } (undefined review = a new one)
  const [removing, setRemoving] = useState(null);
  const [said, setSaid] = useState("");
  const utils = api.useUtils();
  const setStatus = api.admin.reviews.setStatus.useMutation();
  const remove = api.admin.reviews.remove.useMutation();
  const list = api.admin.reviews.list.useQuery({ status: tab === "all" ? undefined : tab }, { placeholderData: (prev) => prev });
  // a page at a time (there are hundreds): the list loads once, the pages are cut here
  const pages = usePaging({ key: "", dir: -1 });
  const topics = useTopicOptions();
  const courseOf = (topic) => (topic ? topics.find((t) => t.value === topic)?.short || topic : copy.general);

  const changed = async (message) => {
    await utils.admin.reviews.invalidate();
    utils.admin.activity.list.invalidate();
    await refreshReviews();
    setSaid(message);
  };
  const toggle = async (r) => {
    try {
      const status = r.status === "published" ? "hidden" : "published";
      await setStatus.mutateAsync({ id: r.id, status });
      await changed((status === "hidden" ? copy.hidden : copy.published).replace("{name}", r.name));
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
  };
  const confirmRemove = async () => {
    try {
      await remove.mutateAsync({ id: removing.id });
      const name = removing.name;
      setRemoving(null);
      await changed(copy.removed.replace("{name}", name));
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
  };
  const counts = list.data?.counts;
  const rows = list.data?.reviews ?? [];
  const c = copy.columns;
  const tabs = ["all", "published", "hidden", ...(counts?.pending ? ["pending"] : [])];

  // nothing at all yet: the empty state has the button, so the toolbar doesn't repeat it
  const blank = Boolean(list.data) && !rows.length && tab === "all";
  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <p className="rt-acc__note rt-adm-help">{copy.legal}</p>
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs.map((key) => ({ key, label: copy.tabs[key], count: counts ? (key === "all" ? counts.published + counts.hidden + counts.pending : counts[key]) : undefined }))} value={tab} onChange={(t) => { setTab(t); pages.restart(); }} label="Show reviews" />
        <div className="rt-adm-toolbar__end">
          {counts && <span className="rt-adm-muted">{copy.homeCount.replace("{n}", counts.home).replace("{max}", list.data.homeMax)}</span>}
          {canEdit && !blank && <button type="button" className="button -md -purple-1 text-white" onClick={() => setSheet({})}>{copy.add}</button>}
        </div>
      </div>
      {!canEdit && <p className="rt-acc__notice">{copy.readOnly}</p>}

      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <TableSkeleton rows={4} />
      ) : rows.length ? (
        <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">{c.name}</th><th scope="col">{c.course}</th><th scope="col">{c.date}</th><th scope="col">{c.home}</th><th scope="col">{c.status}</th>{canEdit && <th scope="col"><span className="rt-sr">Actions</span></th>}</tr></thead>
            <tbody>
              {rows.slice((pages.page - 1) * pages.limit, pages.page * pages.limit).map((x) => (
                <tr key={x.id}>
                  <td data-label={c.name} className="rt-adm-rv__who">
                    <span className="rt-adm-strong">{x.name}</span>
                    <small className="rt-adm-rv__line"><ReviewStars rating={x.rating} />{x.origin && <span>{x.origin}</span>}</small>
                    <small className="rt-adm-rv__text">{x.text}</small>
                  </td>
                  <td data-label={c.course}>{courseOf(x.topic)}</td>
                  <td data-label={c.date}>{dateText(x)}</td>
                  <td data-label={c.home}>{x.onHome ? copy.onHome : "–"}</td>
                  <td data-label={c.status}><AdminStatus kind="siteReview" status={x.status}>{copy.statuses[x.status]}</AdminStatus></td>
                  {canEdit && (
                    <td data-label="Actions">
                      <RowMenu
                        label={`Actions for the review from ${x.name}`}
                        items={[
                          ...(x.source === "imported" ? [{ label: copy.edit, onClick: () => setSheet({ review: x }) }] : []),
                          { label: x.status === "published" ? copy.hide : copy.publish, onClick: () => toggle(x) },
                          ...(x.source === "imported" ? [{ label: copy.remove, onClick: () => setRemoving(x), danger: true }] : []),
                        ]}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pager paging={pages} total={rows.length} label="reviews" />
        </div>
      ) : tab !== "all" ? (
        <Empty kind="none" title={copy.none} />
      ) : (
        <Empty title={copy.empty} text={copy.emptyText} action={canEdit ? { label: copy.add, onClick: () => setSheet({}) } : undefined} />
      )}

      <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.review ? copy.sheet.edit : copy.sheet.add} closeLabel="Close">
        {sheet && <ReviewForm review={sheet.review} topics={topics} onDone={async (message) => { setSheet(null); await changed(message); }} />}
      </Sheet>

      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={copy.removeTitle} closeLabel="Close">
        {removing && (
          <div className="rt-q__form rt-biz__sheetform">
            <p className="rt-adm-strong">{removing.name}<small className="rt-adm-rv__line"><ReviewStars rating={removing.rating} /></small></p>
            <p className="rt-acc__note">{copy.removeText}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={confirmRemove} disabled={remove.isPending}>{copy.remove}</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ReviewForm({ review, topics, onDone }) {
  const create = api.admin.reviews.create.useMutation();
  const update = api.admin.reviews.update.useMutation();
  const [v, setV] = useState(() =>
    review
      ? { name: review.name, text: review.text, rating: String(review.rating), reviewDate: review.reviewDate ?? "", dateIsApproximate: review.dateIsApproximate, topic: review.topic ?? "", origin: review.origin ?? "", originUrl: review.originUrl ?? "", onHome: review.onHome, published: review.status === "published" }
      : BLANK,
  );
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const ref = useRef(null);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const check = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.checked }));

  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    const found = {};
    if (!v.name.trim()) found.name = "Enter the reviewer’s name.";
    if (v.text.trim().length < 10) found.text = "Enter what they wrote, at least 10 characters.";
    if (!v.rating) found.rating = "Choose the star rating they gave.";
    if (v.dateIsApproximate && !v.reviewDate) found.reviewDate = "Enter the date, or untick “approximate”.";
    if (v.originUrl.trim() && !/^https:\/\/\S+$/.test(v.originUrl.trim())) found.originUrl = "Enter the full link, starting https://, or leave it empty.";
    if (v.originUrl.trim() && !v.origin.trim()) found.origin = "Enter where it was posted, like Google, to go with the link.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    const input = {
      name: v.name.trim(),
      rating: Number(v.rating),
      text: v.text.trim(),
      reviewDate: v.reviewDate || null,
      dateIsApproximate: Boolean(v.reviewDate) && v.dateIsApproximate,
      topic: v.topic || null,
      origin: v.origin.trim() || null,
      originUrl: v.origin.trim() && v.originUrl.trim() ? v.originUrl.trim() : null,
      onHome: v.onHome,
      status: v.published ? "published" : "hidden",
    };
    try {
      if (review) await update.mutateAsync({ ...input, id: review.id });
      else await create.mutateAsync(input);
      await onDone((review ? copy.updated : copy.created).replace("{name}", input.name));
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(g);
      if (Object.keys(fields).length) focusFirstError(ref.current);
    }
  };
  const text = (k, props = {}) => (
    <input id={`rt-rv-${k}`} type="text" autoComplete="off" value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(`rt-rv-${k}`, f[k]?.hint, errors[k])} {...props} />
  );

  return (
    <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
      {field("rt-rv-name", f.name.label, f.name.hint, errors.name, text("name", { maxLength: 60 }))}
      {field("rt-rv-text", f.text.label, f.text.hint, errors.text, <textarea id="rt-rv-text" rows={7} maxLength={2000} value={v.text} onChange={set("text")} aria-invalid={errors.text ? true : undefined} aria-describedby={describedBy("rt-rv-text", f.text.hint, errors.text)} />)}
      {field("rt-rv-rating", f.rating.label, f.rating.hint, errors.rating, <FieldSelect id="rt-rv-rating" label={f.rating.label} value={v.rating} onChange={(r) => setV((x) => ({ ...x, rating: r }))} options={[{ value: "", label: f.rating.choose }, ...RATINGS]} invalid={Boolean(errors.rating)} describedBy={describedBy("rt-rv-rating", f.rating.hint, errors.rating)} />)}
      {field("rt-rv-reviewDate", f.reviewDate.label, f.reviewDate.hint, errors.reviewDate, <DateField id="rt-rv-reviewDate" clearable max={today()} value={v.reviewDate} onChange={(d) => setV((x) => ({ ...x, reviewDate: d }))} invalid={Boolean(errors.reviewDate)} describedBy={describedBy("rt-rv-reviewDate", f.reviewDate.hint, errors.reviewDate)} />)}
      {v.reviewDate && (
        <label className="rt-bk__check" htmlFor="rt-rv-approx"><input id="rt-rv-approx" type="checkbox" checked={v.dateIsApproximate} onChange={check("dateIsApproximate")} />{f.approximate.label}</label>
      )}
      {field("rt-rv-topic", f.topic.label, f.topic.hint, errors.topic, <FieldSelect id="rt-rv-topic" label={f.topic.label} value={v.topic} onChange={(t) => setV((x) => ({ ...x, topic: t }))} options={[{ value: "", label: f.topic.general }, ...topics]} invalid={Boolean(errors.topic)} describedBy={describedBy("rt-rv-topic", f.topic.hint, errors.topic)} />)}
      {field("rt-rv-origin", f.origin.label, f.origin.hint, errors.origin, text("origin", { maxLength: 40 }))}
      {field("rt-rv-originUrl", f.originUrl.label, f.originUrl.hint, errors.originUrl, text("originUrl", { type: "url", maxLength: 500, inputMode: "url" }))}
      <div className="rt-field">
        <label className="rt-bk__check" htmlFor="rt-rv-onHome"><input id="rt-rv-onHome" type="checkbox" checked={v.onHome} onChange={check("onHome")} aria-describedby="rt-rv-onHome-hint" />{f.onHome.label}</label>
        <small className="rt-field__hint" id="rt-rv-onHome-hint">{f.onHome.hint}</small>
        {errors.onHome && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.onHome}</p>}
      </div>
      <div className="rt-field">
        <label className="rt-bk__check" htmlFor="rt-rv-published"><input id="rt-rv-published" type="checkbox" checked={v.published} onChange={check("published")} aria-describedby="rt-rv-published-hint" />{f.published.label}</label>
        <small className="rt-field__hint" id="rt-rv-published-hint">{f.published.hint}</small>
      </div>
      {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={create.isPending || update.isPending}>{review ? copy.sheet.save : copy.sheet.create}</button>
    </form>
  );
}
