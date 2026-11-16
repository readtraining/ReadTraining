"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { COURSE_TONE, Loading, Pill, RowMenu, Search, Tabs, ToolSelect, getQuery, setQuery } from "./providerParts";
import { categoryName, categoryOptions, methodName, subcategoryName } from "@/lib/taxonomy";
import { isDatedMethod, waysLabel, waysOf } from "@/lib/courseModes";
import { EmptyState, ErrorState } from "@/components/states/States";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { useNewCourse } from "./NewCourse";
import { CohortForm } from "./ProviderCohorts";
import { COURSE_SAID, DeleteBlocked, DeleteCourseForm, PAUSE_NOTE, pausable } from "./CourseSettings";
import { Confirm } from "./settingsForm";

const FILTERS = ["q", "format", "enrolment", "category", "model", "status"];
const enrolmentOf = (c) => (c.isPublic ? "public" : "private");

// The provider's courses, from the API: asked for only by a role that may see them (the API would refuse, and log, the rest).
export const useProviderCourses = () => {
  const { organisationId, can } = useProviderAccess();
  return api.provider.courses.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) && can("provider.courses.view") });
};

// Every course the provider runs, with Hurak's filters (search, learning option, enrolment type, and under Filters the category and
// performance model; status as tabs with counts), all kept in the address. Our layout: one card holding the status tabs, the filters and the courses as a compact table (one
// course per row: image or "Upload course image", mode, category, status, enrolment, performance model, upcoming dates; the row
// opens the course, and its ⋮ menu has the actions its role allows), then Hurak's offer of a free sales and marketing consultation.
export default function ProviderCourses() {
  const { organisationId, can, status } = useProviderAccess();
  const router = useRouter();
  const utils = api.useUtils();
  const newCourse = useNewCourse();
  const waiting = status === "pending" || status === "changes_requested"; // not approved yet
  const query = useProviderCourses();
  const courses = query.data;
  const [f, setF] = useState({ q: "", format: "", enrolment: "", category: "", model: "", status: "" });
  const [more, setMore] = useState(false);
  // the ⋮ menu's actions: Create cohort's pop-up, "Pause this course?", "Delete this course?" (by id, so it shows the course as
  // the list loads it again) and the message after each
  const [cohortFor, setCohortFor] = useState({ open: false, courseId: "" });
  const [pausing, setPausing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const pause = api.provider.courses.setPaused.useMutation();
  const withdraw = api.provider.courses.withdrawReview.useMutation();
  const duplicate = api.provider.courses.duplicate.useMutation();

  useEffect(() => {
    const next = Object.fromEntries(FILTERS.map((k) => [k, getQuery(k) || ""]));
    if (!pw.formats.some((x) => x.key === next.format)) next.format = "";
    if (!pw.enrolment[next.enrolment]) next.enrolment = "";
    if (!categoryName(next.category)) next.category = "";
    if (!pw.models[next.model]) next.model = "";
    if (!pw.courseStatuses[next.status]) next.status = "";
    setF(next);
    if (next.category || next.model) setMore(true);
  }, []);

  if (!can("provider.courses.view")) return <EmptyState title="Courses aren't part of your role" text="Ask your provider's owner or an admin if you need to see the courses." />;
  if (query.isError) return <ErrorState title="We couldn't load your courses." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!courses) return <Loading rows={4} />;
  if (!courses.length) {
    // not approved yet: say when courses can be added, and where the application is
    if (waiting) return <EmptyState title="No courses yet" text={pw.notApproved.text} action={pw.notApproved.action} />;
    return <EmptyState title="No courses yet" text="Create your first course: describe it, add its dates and send it to us for approval." action={can("provider.courses.edit") ? { label: "New course", onClick: newCourse } : null} />;
  }

  const needle = f.q.trim().toLowerCase();
  const list = courses.filter((c) => (!needle || c.title.toLowerCase().includes(needle))
    && (!f.format || waysOf(c).includes(f.format)) && (!f.enrolment || enrolmentOf(c) === f.enrolment) && (!f.category || c.category === f.category)
    && (!f.model || c.model === f.model) && (!f.status || c.status === f.status));
  const filtered = Object.values(f).some((v) => v.trim());
  const set = (k) => (v) => {
    setF((x) => ({ ...x, [k]: v }));
    setQuery(k, k === "q" ? v.trim() : v);
  };
  const reset = () => {
    setF(Object.fromEntries(FILTERS.map((k) => [k, ""])));
    FILTERS.forEach((k) => setQuery(k, ""));
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
    ...(can("provider.cohorts.edit") && waysOf(c).some(isDatedMethod) ? [{ label: "Create cohort", onClick: () => setCohortFor({ open: true, courseId: String(c.id) }) }] : []),
    ...(can("provider.courses.edit") && pausable(c) ? [{ label: c.status === "live" ? "Pause course" : "Put back live", onClick: () => (c.status === "live" ? setPausing(c) : setPaused(c, false)) }] : []),
    ...(can("provider.courses.edit") ? [{ label: "Duplicate course", onClick: () => copy(c) }] : []),
    ...(can("provider.courses.delete") ? [{ label: "Delete course", danger: true, onClick: () => setDeletingId(c.id) }] : []),
  ];

  const statusTabs = [{ key: "", label: "All" }, ...Object.entries(pw.courseStatuses).map(([key, label]) => ({ key, label }))]
    .map((t) => ({ ...t, count: courses.filter((c) => (!t.key || c.status === t.key)).length }));
  const catOf = (c) => [categoryName(c.category), subcategoryName(c.category, c.subcategory)].filter(Boolean).join(" › ");

  return (
    <div className="rt-acc__stack">
      <section className="rt-cx" aria-label="Your courses">
        <div className="rt-cx__top">
          <Tabs tabs={statusTabs.map((t) => ({ key: t.key, label: t.label, count: t.count }))} value={f.status} onChange={set("status")} label="Course status" />
        </div>
        <div className="rt-cx__bar" role="search" aria-label="Find courses">
          <Search value={f.q} onChange={set("q")} label="Search your courses" />
          <ToolSelect id="rt-pws-cf-format" label="Learning option" value={f.format} onChange={set("format")} options={[{ value: "", label: "All learning options" }, ...pw.formats.map((x) => ({ value: x.key, label: methodName(x.key) }))]} />
          <ToolSelect id="rt-pws-cf-enr" label="Enrolment type" value={f.enrolment} onChange={set("enrolment")} options={[{ value: "", label: "All enrolment types" }, ...Object.entries(pw.enrolment).map(([value, label]) => ({ value, label }))]} />
          <button type="button" className={`rt-cx__more${more ? " is-on" : ""}`} aria-expanded={more} aria-controls="rt-pws-cf-more" onClick={() => setMore(!more)}><i className="icon-setting text-14" aria-hidden="true"></i>Filters{(f.category || f.model) && <span className="rt-cx__dot" aria-label="filters on"></span>}</button>
          {filtered && <button type="button" className="rt-cd__link" onClick={reset}>Clear filters</button>}
        </div>
        {more && (
          <div className="rt-cx__bar -more" id="rt-pws-cf-more">
            <ToolSelect id="rt-pws-cf-cat" label="Category" value={f.category} onChange={set("category")} options={[{ value: "", label: "All categories" }, ...categoryOptions()]} />
            <ToolSelect id="rt-pws-cf-model" label="Performance model" value={f.model} onChange={set("model")} options={[{ value: "", label: "All performance models" }, ...Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label }))]} />
          </div>
        )}
        <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "course" : "courses"}`}</p>

        {list.length ? (
          <table className="rt-cx-table">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Course status</th>
                <th scope="col">Enrolment</th>
                <th scope="col">Performance model</th>
                <th scope="col" className="-num">Upcoming dates</th>
                <th scope="col"><span className="rt-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const href = `/provider/courses/${c.id}`;
                const meta = [waysLabel(c), catOf(c)].filter(Boolean).join(" · ");
                return (
                  <tr key={c.id}>
                    <td data-label="Course">
                      <span className="rt-cx-course">
                        {c.coverUrl ? <img src={c.coverUrl} alt="" className="rt-cx-course__img" /> : can("provider.courses.editPage") ? <Link href={href} className="rt-cx-course__img -none" title="Upload course image"><i className="icon-cloud text-16" aria-hidden="true"></i><span className="rt-sr">Upload course image for {c.title}</span></Link> : <span className="rt-cx-course__img -none" aria-hidden="true"><i className="icon-cloud text-16"></i></span>}
                        <span className="rt-cx-course__text">
                          <Link href={href} className="rt-cx-course__title" title={c.title}>{c.title}</Link>
                          <small title={meta}>{meta}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Course status"><Pill tone={COURSE_TONE[c.status]}>{pw.courseStatuses[c.status]}</Pill>{c.pendingChange && <small className="rt-cx-note">Changes waiting for approval</small>}</td>
                    <td data-label="Enrolment">{pw.enrolment[enrolmentOf(c)]}</td>
                    <td data-label="Performance model">{pw.models[c.model]?.label}</td>
                    <td data-label="Upcoming dates" className="-num">{waysOf(c).some(isDatedMethod) ? c.upcomingCohorts : "—"}</td>
                    <td data-label="Actions" className="-act"><RowMenu label={`Actions for ${c.title}`} items={actions(c, href)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState inCard title="No courses match." text="Try another search or clear the filters." action={{ label: "Clear filters", onClick: reset }} />
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

