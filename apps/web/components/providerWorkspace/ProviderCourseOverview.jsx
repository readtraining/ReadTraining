"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Toast from "@/components/courses/Toast";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { formatPrice } from "@/lib/format";
import { isDatedMethod, waysLabel, waysOf } from "@/lib/courseModes";
import { EmptyState, ErrorState } from "@/components/states/States";
import { COURSE_TONE, Loading, Pill, Tabs, ToolSelect, getQuery, setQuery } from "./providerParts";
import { ColWidths } from "@/components/admin/adminParts";
import { CohortCell, CohortForm, CohortStatus, Seats, WHEN, askWhen, cohortState, inWhen, todayIso, useSchedule } from "./ProviderCohorts";

// One course's overview (course Details): a head card with the cover picture, status, learning options and performance model,
// the shared course page it is listed on, Edit course and Preview; then its tabs, in this order: Learners, Venues, Cohorts,
// Packages and Orders, opening on Cohorts (the chosen tab is kept in ?tab=). Venues, cohorts and packages are real (API
// provider.venues.forCourse, provider.cohorts.list with the course, provider.plans.forCourse). Booking arrives in a later
// milestone, so Learners and Orders say there are none yet (never the workspace's demo records). Each tab shows only to a role that
// may see what is in it (the shared permission table); a tutor sees the cohorts they teach and their venues.

const TABS = [
  { key: "learners", label: "Learners", may: (can, me) => can("provider.learners.view") || can("provider.learners.view", { tutorUserId: me }) },
  { key: "venues", label: "Venues", may: (can, me) => can("provider.cohorts.view") || can("provider.cohorts.view", { tutorUserId: me }) },
  { key: "cohorts", label: "Cohorts", may: (can, me) => can("provider.cohorts.view") || can("provider.cohorts.view", { tutorUserId: me }) },
  { key: "packages", label: "Packages", may: (can) => can("provider.pricing.view") },
  { key: "orders", label: "Orders", may: (can) => can("provider.orders.view") },
];
const DEFAULT_TAB = "cohorts";
const PER_PAGE = 10;
const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function ProviderCourseOverview({ courseId }) {
  const id = /^\d+$/.test(String(courseId)) ? Number(courseId) : 0;
  const { organisationId, userId, can } = useProviderAccess();
  const allowed = can("provider.courses.view");
  const query = api.provider.courses.get.useQuery({ organisationId, courseId: id }, { enabled: Boolean(organisationId && id) && allowed, retry: false });
  const tabs = TABS.filter((t) => t.may(can, userId));
  const first = tabs.some((t) => t.key === DEFAULT_TAB) ? DEFAULT_TAB : tabs[0]?.key;
  const [tab, setTab] = useState(null);
  useEffect(() => {
    const t = getQuery("tab");
    if (tabs.some((x) => x.key === t)) setTab(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- read the address once
  const shown = tab || first;
  const back = { label: "Back to courses", href: "/provider/courses" };

  if (!allowed) return <EmptyState title="Courses aren't part of your role" text="Ask your provider's owner or an admin if you need to see the courses." />;
  if (!id || query.error?.data?.code === "NOT_FOUND") return <EmptyState title="This course was not found" text="It may have been deleted, or it belongs to another provider." action={back} />;
  if (query.isError) return <ErrorState title="We couldn't load this course." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  const course = query.data;
  if (!course) return <Loading detail />;

  const pick = (t) => {
    setTab(t);
    setQuery("tab", t === first ? "" : t);
  };
  const label = tabs.find((t) => t.key === shown)?.label;

  return (
    <div className="rt-acc__stack">
      <Head course={course} />
      {tabs.length ? (
        <>
          <Tabs tabs={tabs} value={shown} onChange={pick} label="Show for this course" sections />
          <section aria-label={label}>
            {shown === "learners" && <EmptyState title="No learners yet." text="Learners appear here once they book this course." />}
            {shown === "venues" && <VenuesTab course={course} />}
            {shown === "cohorts" && <CohortsTab course={course} />}
            {shown === "packages" && <PackagesTab course={course} />}
            {shown === "orders" && <EmptyState title="No orders yet." text="Orders for this course appear here once learners book." />}
          </section>
        </>
      ) : (
        <EmptyState title="Nothing more to show for your role" text="This course's learners, dates, prices and orders aren't part of your role." />
      )}
    </div>
  );
}

// The head card: picture, status, learning options and performance model, the shared page it is listed on, and its two buttons.
function Head({ course }) {
  const { can } = useProviderAccess();
  const cover = course.images[0];
  const edit = can("provider.courses.editPage");
  return (
    <section className="rt-acc__card rt-pws-cov__head" aria-label="Course summary">
      {cover ? <img src={cover.url} alt="" className="rt-pws-cov__img" /> : (
        <span className="rt-pws-cov__img -none" aria-hidden="true"><i className="icon-cloud text-20"></i></span>
      )}
      <div className="rt-pws-cov__text">
        <p className="rt-pws-ce__meta">
          <Pill tone={COURSE_TONE[course.status]}>{pw.courseStatuses[course.status]}</Pill>
          <span>{[waysLabel(course), pw.models[course.model]?.label].filter(Boolean).join(" · ")}</span>
        </p>
        {course.pendingChanges && <p className="rt-acc__note">Changes waiting for approval: learners see the live version until our team has checked them.</p>}
        {course.parent && <p className="rt-acc__note">Listed on the shared course page <b>{course.parent.title}</b>.</p>}
        {!cover && <p className="rt-acc__note">No picture yet: a course needs one before it can be sent for approval.</p>}
      </div>
      <div className="rt-pws-cov__actions">
        <Link href={`/provider/courses/${course.id}/preview`} target="_blank" rel="noopener" className="button -md -outline-purple-1 text-purple-1">Preview<span className="rt-sr"> (opens in a new tab)</span></Link>
        <Link href={`/provider/courses/${course.id}`} className="button -md -purple-1 text-white">{edit ? "Edit course" : "View course"}</Link>
      </div>
    </section>
  );
}

// A course whose learning options aren't chosen yet has neither dates nor venues: say where to choose them.
function NoMethod({ course }) {
  const { can } = useProviderAccess();
  return <EmptyState title="No learning options yet" text="Choose how this course is taught (classroom, live online or self-paced), then add its dates." action={can("provider.courses.edit") ? { label: "Choose learning options", href: `/provider/courses/${course.id}?tab=mode` } : null} />;
}

// ---- Cohorts ----------------------------------------------------------------------------------------------------------------

// This course's cohorts, in the Cohorts list's look (CohortCell, status, tutor, places, price), upcoming first; each opens its
// cohort page. "When" (kept in ?when=) shows past ones or all. Create cohort opens the cohort form with this course chosen.
function CohortsTab({ course }) {
  const { organisationId, can } = useProviderAccess();
  const [when, setWhen] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const s = useSchedule(askWhen(when), course.id);
  const utils = api.useUtils();
  useEffect(() => {
    const w = getQuery("when");
    if (WHEN.some((x) => x.value === w)) setWhen(w);
  }, []);
  useEffect(() => setPage(1), [when]);

  const dated = waysOf(course).filter(isDatedMethod);
  if (!waysOf(course).length) return <NoMethod course={course} />;
  if (!dated.length) return <EmptyState title="No dates for a self-paced course" text="This course is offered self-paced only, so it has no dates: learners start as soon as they book." />;
  if (s.cohorts.isError) return <ErrorState title="We couldn't load this course's cohorts." text="Check your connection, then try again." onRetry={() => s.cohorts.refetch()} />;

  // new cohorts only for a dated option still taking bookings
  const selling = waysOf(course, { open: true }).filter(isDatedMethod);
  const edit = can("provider.cohorts.edit") && can("provider.pricing.edit") && selling.length > 0;
  const refresh = () =>
    Promise.all([
      utils.provider.cohorts.list.invalidate(),
      utils.provider.courses.get.invalidate({ organisationId, courseId: course.id }),
      utils.provider.courses.list.invalidate({ organisationId }),
      utils.provider.venues.forCourse.invalidate({ organisationId, courseId: course.id }),
      utils.provider.plans.forCourse.invalidate({ organisationId, courseId: course.id }),
    ]);
  const create = () => setFormOpen(true);
  const form = (
    <>
      <CohortForm open={formOpen} onClose={() => setFormOpen(false)} suggestCourseId={String(course.id)} mode={selling[0]}
        onSaved={(cohortId) => { setFormOpen(false); refresh(); setToast({ message: "Cohort saved", href: `/provider/cohorts/${cohortId}`, label: "Open" }); }} onAnother={() => refresh()} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
  const toolbar = (
    <div className="rt-adm-toolbar">
      <ToolSelect id="rt-cov-when" label="When" value={when} onChange={(v) => { setWhen(v); setQuery("when", v === "upcoming" ? "" : v); }} options={WHEN} />
      {edit && <button type="button" className="button -md -purple-1 text-white" onClick={create}>Create cohort</button>}
    </div>
  );
  if (!s.cohorts.data) return <div className="rt-acc__stack">{toolbar}<Loading rows={2} /></div>;

  const today = todayIso();
  const tutors = s.tutors.data || [];
  // a tutor sees only the dates they teach (no team list), so a tutor on them is the tutor themselves
  const tutorName = (uid, k) => tutors.find((t) => t.userId === uid)?.name ?? (!s.may.team && uid ? "You" : uid ? k?.tutorName : undefined);
  const list = s.cohorts.data.filter((k) => inWhen(k, when)).map((k) => ({ ...k, status: cohortState(k, today) }));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const empty = { upcoming: ["No upcoming cohorts", "A cohort is one run of this course on set dates. Add one so learners can book it once the course is live."], past: ["No past cohorts", "Cohorts of this course that have finished show here."], cancelled: ["No cancelled cohorts", "Cohorts of this course that were cancelled show here."], all: ["No cohorts yet", "A cohort is one run of this course on set dates."] }[when];

  return (
    <div className="rt-acc__stack">
      {toolbar}
      <p className="rt-sr" aria-live="polite">{count(list.length, "cohort")}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-coh__table">
            <ColWidths widths={["38%", "23%", "10%", "13%", null]} />
            <thead>
              <tr>
                <th scope="col">Cohort</th>
                <th scope="col">Tutor</th>
                <th scope="col">Places</th>
                <th scope="col">Price</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.slice((at - 1) * PER_PAGE, at * PER_PAGE).map((k) => (
                <tr key={k.id}>
                  <td data-label="Cohort"><CohortCell k={k} forCourse /></td>
                  <td data-label="Tutor">{tutorName(k.tutorUserId, k) || <span className="rt-adm-muted">Not assigned</span>}</td>
                  <td data-label="Places"><Seats booked={0} max={k.capacity} /></td>
                  <td data-label="Price">{k.planId ? "From " : ""}{formatPrice(k.pricePence / 100)}{k.wasPricePence ? <small className="rt-adm-muted"> was {formatPrice(k.wasPricePence / 100)}</small> : null}</td>
                  <td data-label="Status">
                    <CohortStatus k={k} status={k.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && <div className="rt-pws-coh__pages"><CataloguePagination page={at} totalPages={pages} hrefFor={(p) => `?tab=cohorts&page=${p}`} onNavigate={setPage} /></div>}
        </div>
      ) : (
        <EmptyState title={empty[0]} text={empty[1]} action={edit && when !== "past" ? { label: "Create cohort", onClick: create } : null} />
      )}
      {form}
    </div>
  );
}

// ---- Venues ---------------------------------------------------------------------------------------------------------------

// The venues this course's dates use, with how many upcoming cohorts each has; managed on the Venues page.
function VenuesTab({ course }) {
  const { organisationId, can } = useProviderAccess();
  const ways = waysOf(course);
  const classroom = ways.includes("classroom");
  const query = api.provider.venues.forCourse.useQuery({ organisationId, courseId: course.id }, { enabled: Boolean(organisationId) && classroom });

  if (!ways.length) return <NoMethod course={course} />;
  if (!classroom) return <EmptyState title="Venues don't apply" text={ways.includes("live-online") ? "This course isn't taught in a classroom: live online learners join from anywhere." : "Self-paced courses are studied online, so they have no venue."} />;
  if (query.isError) return <ErrorState title="We couldn't load this course's venues." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!query.data) return <Loading rows={2} />;
  if (!query.data.length) return <EmptyState title="No venues yet." text="Venues appear here once this course has classroom dates." />;

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__card rt-biz__tablecard">
        <table className="rt-biz__table rt-adm-table">
          <thead>
            <tr>
              <th scope="col">Venue</th>
              <th scope="col">Town</th>
              <th scope="col">Postcode</th>
              <th scope="col">Upcoming cohorts</th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((v) => (
              <tr key={v.id}>
                <td data-label="Venue"><strong>{v.name}</strong><small className="rt-adm-muted">{v.street}{v.active ? "" : " · Archived"}</small></td>
                <td data-label="Town">{v.city}</td>
                <td data-label="Postcode">{v.postcode || <span className="rt-adm-muted">Not given</span>}</td>
                <td data-label="Upcoming cohorts" className="rt-adm-num-cell">{v.upcoming}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {can("provider.venues.view") && <p className="rt-acc__note">Add, change or archive venues in <Link href="/provider/venues" className="rt-cd__link">Venues</Link>.</p>}
    </div>
  );
}

// ---- Packages -------------------------------------------------------------------------------------------------------------

// The price plans this course is sold on: its upcoming dates' plans and a self-paced course's own, each with its packages and how
// this course uses it; dates with their own price are counted below. Plans are made and changed in Price plans.
function PackagesTab({ course }) {
  const { organisationId, can } = useProviderAccess();
  const query = api.provider.plans.forCourse.useQuery({ organisationId, courseId: course.id }, { enabled: Boolean(organisationId) });
  const selfPaced = waysOf(course).includes("self-paced");

  if (query.isError) return <ErrorState title="We couldn't load this course's price plans." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!query.data) return <Loading rows={2} />;
  const { plans, ownPriceDates } = query.data;
  const own = ownPriceDates > 0 && <p className="rt-acc__note">{count(ownPriceDates, "upcoming date")} of this course {ownPriceDates === 1 ? "uses its" : "use their"} own price.</p>;

  if (!plans.length) {
    if (selfPaced) return <EmptyState title="No price plan" text="This course has its own price. Choose a price plan in its price settings to sell it in packages." action={can("provider.pricing.edit") ? { label: "Open price settings", href: `/provider/courses/${course.id}?tab=pricing` } : null} />;
    const text = ownPriceDates ? "This course's dates use their own prices. Put a date on a price plan to sell it in packages." : "This course has no upcoming dates. Put a date on a price plan to sell it in packages.";
    return <EmptyState title="No price plans" text={text} action={{ label: "Price plans", href: "/provider/packages" }} />;
  }

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__card rt-biz__tablecard">
        <table className="rt-biz__table rt-adm-table rt-pws-pkgs">
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col">Packages</th>
              <th scope="col">On this course</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td data-label="Plan">
                  <Link href={`/provider/packages?q=${encodeURIComponent(p.name)}`} className="rt-adm-strong">{p.name}</Link>
                  {p.archived && <small className="rt-adm-muted">Archived</small>}
                </td>
                <td data-label="Packages">
                  <ul className="rt-pws-pkgs__tiers">
                    {p.tiers.map((t) => <li key={t.name}><span>{t.name}</span> <b className="rt-pws-money__num">{formatPrice(t.pricePence / 100)}</b></li>)}
                  </ul>
                </td>
                <td data-label="On this course">{p.forCourse.course ? "This course's price" : count(p.forCourse.dates, "upcoming date")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {own}
      <p className="rt-acc__note">Plans are made and changed in <Link href="/provider/packages" className="rt-cd__link">Price plans</Link>; a change there shows on every date that uses the plan.</p>
    </div>
  );
}
