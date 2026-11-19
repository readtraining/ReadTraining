"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { COURSE_TONE, Pill, RowMenu, Search, Tabs, ToolSelect, getQuery, setQuery } from "./providerParts";
import { SortTh, useSort } from "@/components/admin/adminParts";
import { categoryName, categoryOptions, methodName, subcategoryName } from "@/lib/taxonomy";
import { isDatedMethod, waysLabel, waysOf } from "@/lib/courseModes";
import { EmptyState, ErrorState } from "@/components/states/States";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { useNewCourse } from "./NewCourse";
import { CohortForm } from "./ProviderCohorts";
import { COURSE_SAID, DeleteBlocked, DeleteCourseForm, PAUSE_NOTE, pausable } from "./CourseSettings";
import { Confirm } from "./settingsForm";

const FILTERS = ["q", "format", "visibility", "category", "model", "status"];
const visibilityOf = (c) => (c.isPublic && c.listed ? "public" : "private"); // the gear's Visibility
const STATUS_ORDER = Object.keys(pw.courseStatuses);
const thisYear = () => new Date().getFullYear();
// "Thu 26 Nov" (with the year when it isn't this year); `iso` is a YYYY-MM-DD day
const dayLabel = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== thisYear() ? { year: "numeric" } : {}) });
};

// The provider's courses, from the API: asked for only by a role that may see them (the API would refuse, and log, the rest).
export const useProviderCourses = () => {
  const { organisationId, can } = useProviderAccess();
  return api.provider.courses.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) && can("provider.courses.view") });
};

// Every course the provider runs, with Hurak's filters in one row (search, learning option, visibility, category and performance
// model, and Clear filters once one is set; status as tabs with counts), all kept in the address. Our layout: one card holding the
// status tabs, the filters and the courses as a compact table, last edited first and sortable by its headers. One course per row:
// picture or "Upload course image", its ways of learning and subject; its status with a line only when there is something to do (a draft
// ready to send, our team's note, edits in review); visibility; its next date. The row opens where its next step is (a draft or
// one sent back: the editor; the rest: its Details page), and its ⋮ menu has the actions its role allows. Then Hurak's offer of a free
// sales and marketing consultation.
export default function ProviderCourses() {
  const { organisationId, can, status, staff } = useProviderAccess();
  const sorter = useSort(); // none chosen: the API's own order, last edited first
  const router = useRouter();
  const utils = api.useUtils();
  const newCourse = useNewCourse();
  const waiting = status === "pending" || status === "changes_requested"; // not approved yet
  const query = useProviderCourses();
  const courses = query.data;
  const [f, setF] = useState({ q: "", format: "", visibility: "", category: "", model: "", status: "" });
  // the ⋮ menu's actions: Create cohort's pop-up, "Pause this course?", "Delete this course?" (by id, so it shows the course as
  // the list loads it again) and the message after each
  const [cohortFor, setCohortFor] = useState({ open: false, courseId: "" });
  const [pausing, setPausing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showFilters, setShowFilters] = useState(false); // phones: the filters' fold
  const pause = api.provider.courses.setPaused.useMutation();
  const withdraw = api.provider.courses.withdrawReview.useMutation();
  const duplicate = api.provider.courses.duplicate.useMutation();

  useEffect(() => {
    const next = Object.fromEntries(FILTERS.map((k) => [k, getQuery(k) || ""]));
    if (!pw.formats.some((x) => x.key === next.format)) next.format = "";
    if (!pw.visibility[next.visibility]) next.visibility = "";
    if (!categoryName(next.category)) next.category = "";
    if (!pw.models[next.model]) next.model = "";
    if (!pw.courseStatuses[next.status]) next.status = "";
    setF(next);
  }, []);

  if (!can("provider.courses.view")) return <EmptyState title="Courses aren't part of your role" text="Ask your provider's owner or an admin if you need to see the courses." />;
  if (query.isError) return <ErrorState title="We couldn't load your courses." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!courses) return <CoursesSkeleton />;
  if (!courses.length) {
    // not approved yet: say when courses can be added, and where the application is
    if (waiting) return <EmptyState title="No courses yet" text={pw.notApproved.text} action={pw.notApproved.action} />;
    return <EmptyState title="No courses yet" text="Create your first course: describe it, add its dates and send it to us for approval." action={can("provider.courses.edit") && !staff ? { label: "New course", onClick: newCourse } : null} />;
  }

  const needle = f.q.trim().toLowerCase();
  const list = courses.filter((c) => (!needle || c.title.toLowerCase().includes(needle))
    && (!f.format || waysOf(c).includes(f.format)) && (!f.visibility || visibilityOf(c) === f.visibility) && (!f.category || c.category === f.category)
    && (!f.model || c.model === f.model) && (!f.status || c.status === f.status));
  const filtered = FILTERS.some((k) => k !== "status" && f[k].trim()); // a status tab is a view, not a filter
  const filterCount = FILTERS.filter((k) => k !== "status" && k !== "q" && f[k]).length;
  const set = (k) => (v) => {
    setF((x) => ({ ...x, [k]: v }));
    setQuery(k, k === "q" ? v.trim() : v);
  };
  // clears the search and the filters; the status tab stays
  const reset = () => {
    setF((x) => ({ ...Object.fromEntries(FILTERS.map((k) => [k, ""])), status: x.status }));
    FILTERS.forEach((k) => k !== "status" && setQuery(k, ""));
  };

  const refresh = () => utils.provider.courses.list.invalidate({ organisationId });
  const failed = (e) => setToast({ message: errorsFrom(e).general || Object.values(errorsFrom(e).fields)[0] || "We couldn't do that. Please try again." });
  const setPaused = (c, paused) => pause.mutate({ organisationId, courseId: c.id, paused }, {
    onSuccess: () => { setPausing(null); refresh(); setToast({ message: paused ? COURSE_SAID.paused : COURSE_SAID.resumed }); },
    onError: (e) => { setPausing(null); refresh(); failed(e); },
  });
  // the copy is a new draft: its editor opens, saying it is a copy
  const copy = (c) => {
    if (duplicate.isPending) return;
    setToast({ message: `Copying “${c.title}”…` });
    duplicate.mutate({ organisationId, courseId: c.id }, {
      onSuccess: ({ id }) => { refresh(); router.push(`/provider/courses/${id}?copied=1`); },
      onError: failed,
    });
  };
  const withdrawReview = (c) => withdraw.mutate({ organisationId, courseId: c.id }, {
    onSuccess: () => { refresh(); setToast({ message: COURSE_SAID.withdrawn }); },
    onError: (e) => { refresh(); failed(e); },
  });
  const deleting = deletingId ? courses.find((c) => c.id === deletingId) : null;
  // each item only when it applies and the person's role allows it (the API checks again); Delete, red, last
  const actions = (c, href) => [
    // Details first, as Hurak's: the course's own page with its Learners, Venues, Cohorts, Packages and Orders tabs
    { label: "Details", href: `${href}/overview` },
    ...(can("provider.courses.editPage") ? [{ label: "Edit course", href }] : []),
    { label: "Preview", href: `${href}/preview` },
    // new dates set their prices, so they need the right to change prices too (ReadTraining staff without the pricing switch)
    ...(can("provider.cohorts.edit") && can("provider.pricing.edit") && waysOf(c, { open: true }).some(isDatedMethod) ? [{ label: "Create cohort", onClick: () => setCohortFor({ open: true, courseId: String(c.id) }) }] : []),
    // pausing and copying a course stay the provider's own (not for ReadTraining staff working here)
    ...(can("provider.courses.edit") && !staff && pausable(c) ? [{ label: c.status === "live" ? "Pause course" : "Put back live", onClick: () => (c.status === "live" ? setPausing(c) : setPaused(c, false)) }] : []),
    ...(can("provider.courses.edit") && !staff ? [{ label: "Duplicate course", onClick: () => copy(c) }] : []),
    ...(can("provider.courses.delete") ? [{ label: "Delete course", danger: true, onClick: () => setDeletingId(c.id) }] : []),
  ];

  const statusTabs = [{ key: "", label: "All" }, ...Object.entries(pw.courseStatuses).map(([key, label]) => ({ key, label }))]
    .map((t) => ({ ...t, count: courses.filter((c) => (!t.key || c.status === t.key)).length }));
  const catOf = (c) => [categoryName(c.category), subcategoryName(c.category, c.subcategory)].filter(Boolean).join(" › ");
  // under the status, only when the provider has something to do or to know: a draft that is ready to send, our team's note on
  // one sent back, and edits to a live course waiting for review (the Dashboard's to-do list has each draft's steps left)
  const nextStep = (c) => {
    if (c.status === "draft") return c.stepsLeft ? "" : status === "active" ? "Ready to send for review" : "";
    if (c.status === "changes") return c.statusNote ? `“${c.statusNote.split("\n")[0]}”` : "";
    return c.status === "live" && c.pendingChange ? "Edits in review" : "";
  };
  // a course with dates: its next one; one taught only self-paced has none; a live one with none says so
  const dates = (c) => {
    if (!waysOf(c).some(isDatedMethod)) return <span className="rt-cx-muted">Self-paced</span>;
    if (!c.nextDate) return <span className="rt-cx-muted">{c.status === "live" ? "No dates yet" : "—"}</span>;
    return dayLabel(c.nextDate);
  };
  const rows = sorter.apply(list, {
    title: (c) => c.title.toLowerCase(),
    status: (c) => STATUS_ORDER.indexOf(c.status),
    visibility: (c) => visibilityOf(c),
    next: (c) => (waysOf(c).some(isDatedMethod) ? c.nextDate : null),
  });

  return (
    <div className="rt-acc__stack">
      <section className="rt-cx" aria-label="Your courses">
        <div className="rt-cx__top">
          <Tabs tabs={statusTabs.map((t) => ({ key: t.key, label: t.label, count: t.count }))} value={f.status} onChange={set("status")} label="Course status" />
          {filtered && list.length > 0 && <button type="button" className="rt-cd__link rt-cx__clear" onClick={reset}>Clear filters</button>}
        </div>
        <div className={`rt-cx__bar${showFilters ? " is-open" : ""}`} role="search" aria-label="Find courses">
          <Search value={f.q} onChange={set("q")} label="Search your courses" />
          {/* phones: the four filters fold behind one button, so their names can be read */}
          <button type="button" className="rt-cx__filters" aria-expanded={showFilters} onClick={() => setShowFilters((o) => !o)}>
            Filters{filterCount > 0 && <span className="rt-tr__filter-n">{filterCount}</span>}
          </button>
          <ToolSelect id="rt-pws-cf-format" label="Learning option" value={f.format} onChange={set("format")} options={[{ value: "", label: "All learning options" }, ...pw.formats.map((x) => ({ value: x.key, label: methodName(x.key) }))]} />
          <ToolSelect id="rt-pws-cf-vis" label="Visibility" value={f.visibility} onChange={set("visibility")} options={[{ value: "", label: "Public and private" }, ...Object.entries(pw.visibility).map(([value, label]) => ({ value, label }))]} />
          <ToolSelect id="rt-pws-cf-cat" label="Category" value={f.category} onChange={set("category")} options={[{ value: "", label: "All categories" }, ...categoryOptions()]} />
          <ToolSelect id="rt-pws-cf-model" label="Performance model" value={f.model} onChange={set("model")} options={[{ value: "", label: "All performance models" }, ...Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label }))]} />
        </div>
        <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "course" : "courses"}`}</p>

        {list.length ? (
          <table className="rt-cx-table">
            <thead>
              <tr>
                <SortTh label="Course" col="title" sorter={sorter} />
                <SortTh label="Status" col="status" sorter={sorter} />
                <SortTh label="Visibility" col="visibility" sorter={sorter} />
                <SortTh label="Next date" col="next" sorter={sorter} />
                <th scope="col"><span className="rt-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const href = `/provider/courses/${c.id}`;
                // the row opens where the next step is: the editor for a course still being written or sent back, else its Details
                const open = c.status === "draft" || c.status === "changes" ? href : `${href}/overview`;
                const meta = [waysLabel(c), catOf(c)].filter(Boolean).join(" · ");
                const step = nextStep(c);
                return (
                  <tr key={c.id}>
                    <td data-label="Course">
                      <span className="rt-cx-course">
                        {c.coverUrl ? <img src={c.coverUrl} alt="" className="rt-cx-course__img" /> : can("provider.courses.editPage") ? <Link href={`${href}?focus=images`} className="rt-cx-course__img -none" title="Upload course image"><i className="icon-cloud text-16" aria-hidden="true"></i><span className="rt-sr">Upload course image for {c.title}</span></Link> : <span className="rt-cx-course__img -none" aria-hidden="true"><i className="icon-cloud text-16"></i></span>}
                        <span className="rt-cx-course__text">
                          <Link href={open} className="rt-cx-course__title" title={c.title}>{c.title}</Link>
                          <small title={meta}>{meta}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Status"><Pill tone={COURSE_TONE[c.status]}>{pw.courseStatuses[c.status]}</Pill>{step && <small className="rt-cx-note" title={c.status === "changes" ? c.statusNote || undefined : undefined}>{step}</small>}</td>
                    <td data-label="Visibility">{pw.visibility[visibilityOf(c)]}</td>
                    <td data-label="Next date">{dates(c)}</td>
                    <td data-label="Actions" className="-act"><RowMenu label={`Actions for ${c.title}`} items={actions(c, href)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          filtered
            ? <EmptyState inCard title="No courses match." text="Try another search or clear the filters." action={{ label: "Clear filters", onClick: reset }} />
            : <EmptyState inCard title={pw.noCourses[f.status] || "No courses here yet."} />
        )}
      </section>

      <section className="rt-cl-promo" aria-labelledby="rt-pws-cm-h">
        <span className="rt-cl-promo__icon" aria-hidden="true"><i className="icon-bar-chart-2 text-20"></i></span>
        <div>
          <h2 className="rt-cl-promo__title" id="rt-pws-cm-h">Let us help you increase sales</h2>
          <p className="rt-acc__note">Book a free consultation with our sales and marketing team.</p>
        </div>
        <Link href="/contact-us" className="button -sm -outline-purple-1 text-purple-1">Schedule meeting</Link>
      </section>

      <CohortForm open={cohortFor.open} onClose={() => setCohortFor((x) => ({ ...x, open: false }))} suggestCourseId={cohortFor.courseId}
        onSaved={(id) => { setCohortFor((x) => ({ ...x, open: false })); refresh(); utils.provider.cohorts.list.invalidate(); setToast({ message: "Cohort saved", href: `/provider/cohorts/${id}`, label: "Open" }); }}
        onAnother={() => { refresh(); utils.provider.cohorts.list.invalidate(); }} />
      <Confirm open={Boolean(pausing)} onClose={() => setPausing(null)} title="Pause this course?" text={PAUSE_NOTE} confirmLabel={pause.isPending ? "Pausing…" : "Yes, pause it"} busy={pause.isPending} onConfirm={() => setPaused(pausing, true)} />
      <DeleteSheet course={deleting} onClose={() => setDeletingId(null)} withdrawing={withdraw.isPending} onWithdraw={() => withdrawReview(deleting)}
        onDeleted={() => { setToast({ message: `“${deleting.title}” deleted` }); setDeletingId(null); }} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// Loading, in the page's own shape: the status tabs, the search and filters, then course rows (picture, name and line, status,
// visibility, next date, ⋮), so nothing moves when the courses arrive
function CoursesSkeleton() {
  return (
    <div className="rt-acc__stack" aria-busy="true" aria-label="Loading your courses">
      <div className="rt-cx rt-cx-skel" aria-hidden="true">
        <div className="rt-cx__top"><span className="rt-skel -tabs"></span></div>
        <div className="rt-cx__bar"><span className="rt-skel -search"></span><span className="rt-skel -filters"></span></div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rt-cx-skel__row">
            <span className="rt-skel -img"></span>
            <span className="rt-cx-skel__text"><span className="rt-skel rt-skel--line -title"></span><span className="rt-skel rt-skel--line -meta"></span></span>
            <span className="rt-skel rt-skel--line -cell"></span>
            <span className="rt-skel rt-skel--line -cell"></span>
            <span className="rt-skel rt-skel--line -cell"></span>
            <span className="rt-skel -menu"></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// "Delete this course?" from the ⋮ menu: the gear's own confirmation (DeleteCourseForm), or why it can't be deleted now with the
// next step (DeleteBlocked: after Withdraw from review it asks, as the list loads the course again)
function DeleteSheet({ course, onClose, withdrawing, onWithdraw, onDeleted }) {
  const blocked = course?.deleteBlock === "in_use" || course?.deleteBlock === "paused_by_team";
  return (
    <Sheet open={Boolean(course)} onClose={onClose} title={blocked ? "This course can't be deleted" : "Delete this course?"} closeLabel="Close" className="rt-pws-set__confirm" noClose>
      {course && (course.deleteBlock ? (
        <div className="rt-q__form">
          <DeleteBlocked course={course} busy={withdrawing} withdrawing={withdrawing} onWithdraw={onWithdraw} />
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Close</button>
          </div>
        </div>
      ) : (
        <DeleteCourseForm key={course.id} course={course} onKeep={onClose} onDeleted={onDeleted} />
      ))}
    </Sheet>
  );
}

