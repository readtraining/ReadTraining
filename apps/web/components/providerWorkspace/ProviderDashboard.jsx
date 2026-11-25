"use client";

import React, { useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { useMe } from "@/lib/useMe";
import { useProviderAccess } from "@/lib/providerAccess";
import { ErrorState } from "@/components/states/States";
import { COURSE_TONE, Pill } from "./providerParts";
import { Seats, todayIso, useSchedule, whyNotOnSale } from "./ProviderCohorts";
import ProviderChecklist from "./ProviderChecklist";
import ProviderAccountStatus from "./ProviderAccountStatus";
import NavIcon from "@/components/admin/navIcons";
import { NewCourseButton } from "./NewCourse";
import { canSend, useSendForApproval } from "./CourseSettings";
import Toast from "@/components/courses/Toast";

// Our dashboard (everything on it opens the page it comes from), from real records only: the provider's courses
// and dates (API provider.courses.list / provider.cohorts.list, fetched again whenever the window regains focus). Top to bottom:
// the account's status message; the greeting with how many things there are to do and the Create cohort button;
// the to-do list (courses our team sent back, upcoming cohorts with no tutor, unfinished drafts with their editor steps left, most
// urgent first; each row gone once it is done, and only the rows this role may act on); the getting-set-up checklist folded to its
// next step (ProviderChecklist compact) until every step is done; the courses by status beside the ones waiting for our team; and
// the next cohorts. Orders, revenue and reviews come here once booking is real.

const greet = (h) => (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
// whole UK days from one yyyy-mm-dd day to another
const DAY_MS = 864e5;
const daysFrom = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const ukDay = (at) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(at));
// how soon a cohort starts, in words: "today", "tomorrow", "in 3 days"
const soon = (n) => (n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);
const sentAgo = (n) => (n <= 0 ? "Sent today" : n === 1 ? "Sent yesterday" : `Sent ${n} days ago`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// the to-do list shows this many rows until See all
const TODO_SHOWN = 5;
// With our team shows this many, then links to the full list
const SENT_SHOWN = 5;

// a skeleton line inside the real layout while the records load, so nothing moves when they arrive
const Bar = ({ w }) => <span className="rt-skel rt-skel--line rt-dash__bar" style={{ width: w }} aria-hidden="true"></span>;
const SkelRows = ({ n = 3, className }) => (
  <ul className={className} aria-hidden="true">
    {Array.from({ length: n }, (_, i) => <li key={i} className="rt-dash__skel"><Bar w={`${70 - i * 12}%`} /></li>)}
  </ul>
);

export default function ProviderDashboard() {
  const { person, data: meData } = useMe();
  const schedule = useSchedule("upcoming");
  const access = useProviderAccess();
  const [allTodo, setAllTodo] = React.useState(false);
  const failed = schedule.cohorts.isError || schedule.courses.isError;
  const loading = !failed && (!schedule.cohorts.data || !schedule.courses.data || (schedule.may.team && schedule.tutors.isLoading));
  const courses = schedule.courses.data || [];
  const today = todayIso();
  // dates still to start (today's too), soonest first, as the API sends them
  const upcoming = (schedule.cohorts.data || []).filter((k) => !k.cancelledAt && k.startsOn >= today);
  // the team list is for roles that see every date; a tutor sees only the dates they teach, so those are theirs
  const tutorName = (id) => (schedule.may.team ? schedule.tutors.data?.find((t) => t.userId === id)?.name : id && "You");

  const [toast, setToast] = useState(null);
  const sender = useSendForApproval((message, error) => setToast({ message, error }));
  // the to-do list: real things to act on, most urgent first, only those this person's role can do
  const editsCourses = access.can("provider.courses.edit");
  const todo = loading || failed ? [] : [
    ...(editsCourses ? courses.filter((c) => c.status === "changes") : []).map((c) => ({
      key: `changes-${c.id}`, tone: "warn", href: `/provider/courses/${c.id}`, cta: "Edit",
      text: <><b>{c.title}</b> · our team asked for changes</>, label: `${c.title}: our team asked for changes`,
    })),
    ...(access.can("provider.cohorts.edit") ? upcoming.filter((k) => !k.tutorUserId) : []).map((k) => {
      const when = `starts ${soon(daysFrom(today, k.startsOn))}`;
      return { key: `tutor-${k.id}`, href: `/provider/cohorts/${k.id}`, cta: "Assign", text: <>No tutor for <b>{k.courseTitle}</b> · {when}</>, label: `No tutor for ${k.courseTitle}, ${when}` };
    }),
    ...(editsCourses ? courses.filter((c) => c.status === "draft") : []).map((c) => {
      // every required editor step done: it only needs sending (once the provider account is approved)
      const left = c.stepsLeft ? `${plural(c.stepsLeft, "step", "steps")} to finish` : "ready to send for approval";
      // a ready one is sent from here; the rest open the editor
      const send = canSend(c, access) && { onClick: () => sender.send(c), cta: sender.sendingId === c.id ? "Sending…" : "Send for approval" };
      return { key: `draft-${c.id}`, tone: "muted", href: `/provider/courses/${c.id}`, cta: "Continue", ...send, text: <><b>{c.title}</b> · {left}</>, label: `${c.title}: ${left}` };
    }),
  ];
  const shownTodo = allTodo ? todo : todo.slice(0, TODO_SHOWN);

  // with our team: the courses waiting for approval, longest waiting first, with when they were sent
  const sentAt = (c) => new Date(c.submittedAt || c.updatedAt).getTime();
  const waiting = courses.filter((c) => c.status === "pending").sort((a, b) => sentAt(a) - sentAt(b));
  const statuses = Object.keys(pw.courseStatuses).map((k) => ({ k, n: courses.filter((c) => c.status === k).length }));
  // the visitor's own clock (a provider in Lahore at 2:51pm sees "Good afternoon"), and the signed-in person's own first name
  const hour = new Date().getHours();
  const firstName = meData?.profile?.firstName || person?.name?.split(" ")[0] || "";

  return (
    <div className="rt-acc__stack rt-dash" aria-busy={loading || undefined}>
      <ProviderAccountStatus place="dashboard" />
      {access.can("provider.payoutAccount.manage") && <PayoutBanner />}
      <section className="rt-dash__hello" aria-labelledby="rt-dash-hi">
        <div>
          <h2 className="rt-dash__hi" id="rt-dash-hi">{greet(hour)}{firstName ? `, ${firstName}` : ""}</h2>
          <p className="rt-dash__sub">{loading ? <Bar w="180px" /> : failed ? "" : todo.length ? `You have ${plural(todo.length, "thing", "things")} to do.` : "You're all caught up."}</p>
        </div>
        <div className="rt-dash__quick">
          {access.can("provider.cohorts.edit") && access.can("provider.pricing.edit") && <Link href="/provider/cohorts?new=1" className="button -sm -purple-1 text-white">Create cohort</Link>}
        </div>
      </section>

      {failed ? (
        <ErrorState title="We couldn't load your dashboard." onRetry={() => { schedule.cohorts.refetch(); schedule.courses.refetch(); }} />
      ) : (
        <>
          <section className="rt-acc__card" aria-labelledby="rt-dash-todo">
            <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-todo">To do</h2></div>
            {loading ? <SkelRows className="rt-dash__list" /> : todo.length ? (
              <>
                <ul className="rt-dash__list" id="rt-dash-todo-list">
                  {shownTodo.map((t) => (
                    <li key={t.key}>
                      <span className={`rt-dash__dot${t.tone ? ` -${t.tone}` : ""}`} aria-hidden="true"></span>
                      {/* a row with its own button (Send for approval): its words open the course, the button only sends */}
                      {t.onClick ? <Link href={t.href} className="rt-dash__text rt-dash__open">{t.text}</Link> : <span className="rt-dash__text">{t.text}</span>}
                      {t.onClick
                        ? <button type="button" className="rt-dash__go" onClick={t.onClick} disabled={Boolean(sender.sendingId)} aria-busy={sender.sendingId ? true : undefined}>{t.cta}<span className="rt-sr">: {t.label}</span><i className="icon-arrow-right text-10" aria-hidden="true"></i></button>
                        : <Link href={t.href} className="rt-dash__go">{t.cta}<span className="rt-sr">: {t.label}</span><i className="icon-arrow-right text-10" aria-hidden="true"></i></Link>}
                    </li>
                  ))}
                </ul>
                {todo.length > TODO_SHOWN && (
                  <button type="button" className="rt-pws-check__toggle rt-dash__more" aria-expanded={allTodo} aria-controls="rt-dash-todo-list" onClick={() => setAllTodo((v) => !v)}>
                    {allTodo ? "Show fewer" : `See all (${todo.length})`}
                  </button>
                )}
              </>
            ) : (
              <div className="rt-dash__clear"><i className="icon-check text-16" aria-hidden="true"></i><p>You&apos;re all caught up.</p></div>
            )}
          </section>

          <ProviderChecklist compact />

          {schedule.may.courses && (
            <div className="rt-dash__grid">
              <section className="rt-acc__card rt-dash__courses" aria-labelledby="rt-dash-courses">
                <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-courses">Your courses</h2><Link href="/provider/courses" className="rt-cd__link">All courses</Link></div>
                <ul className="rt-dash__status">
                  {statuses.map(({ k, n }) => (
                    <li key={k}>
                      <Link href={`/provider/courses?status=${k}`}><Pill tone={COURSE_TONE[k]}>{pw.courseStatuses[k]}</Pill><b>{loading ? <Bar w="16px" /> : n}</b></Link>
                    </li>
                  ))}
                </ul>
                {editsCourses && <NewCourseButton className="button -sm -purple-1 text-white rt-btn-block" />}
              </section>

              <section className="rt-acc__card" aria-labelledby="rt-dash-team">
                <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-team">With our team</h2>{waiting.length > SENT_SHOWN && <Link href="/provider/courses?status=pending" className="rt-cd__link">See all ({waiting.length})</Link>}</div>
                {loading ? <SkelRows n={2} className="rt-dash__sent" /> : waiting.length ? (
                  <ul className="rt-dash__sent">
                    {waiting.slice(0, SENT_SHOWN).map((c) => (
                      <li key={c.id}>
                        <Link href={`/provider/courses/${c.id}`}><span>{c.title}</span><small>{sentAgo(daysFrom(ukDay(sentAt(c)), today))}</small></Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="rt-acc__note">Nothing is waiting for our team.</p>}
              </section>
            </div>
          )}

          {schedule.may.dates && (
            <section className="rt-acc__card" aria-labelledby="rt-dash-next">
              <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-next">Coming up</h2><Link href="/provider/calendar" className="rt-cd__link">Calendar</Link></div>
              {loading ? <SkelRows className="rt-dash__cohorts" /> : upcoming.length ? (
                <ul className="rt-dash__cohorts">
                  {upcoming.slice(0, 5).map((k) => (
                    <li key={k.id}>
                      <span className={`rt-dash__date -c-${k.method === "live-online" ? "blue" : "purple"}`} aria-hidden="true"><small>{new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${k.startsOn}T00:00:00Z`))}</small><b>{Number(k.startsOn.slice(8))}</b></span>
                      <span className="rt-dash__cmeta">
                        <span className="rt-dash__ctitle"><Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{k.courseTitle}</Link>{!tutorName(k.tutorUserId) && <Pill tone="warn">No tutor</Pill>}</span>
                        <small><span className="rt-dash__soon">Starts {soon(daysFrom(today, k.startsOn))}</span> · {k.venue ? k.venue.name : "Online"}{tutorName(k.tutorUserId) ? ` · ${tutorName(k.tutorUserId)}` : ""}{whyNotOnSale(k) ? ` · ${whyNotOnSale(k)}` : ""}</small>
                      </span>
                      <Seats booked={k.taken ?? 0} max={k.capacity} />
                    </li>
                  ))}
                </ul>
              ) : <p className="rt-acc__note">No cohorts coming up.{access.can("provider.cohorts.edit") && access.can("provider.pricing.edit") && <> <Link href="/provider/cohorts?new=1">Create one</Link>.</>}</p>}
            </section>
          )}
        </>
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// "Connect your payout account to get paid": to the person who connects it (the owner), on every visit until it is connected
// (Milestone 4, Stripe). Until then there is nothing to connect, so its button says "Coming soon" (pw.payouts.connect is null).
function PayoutBanner() {
  const c = pw.payouts;
  return (
    <section className="rt-pws-status" aria-labelledby="rt-pws-payout-h">
      <span className="rt-pws-status__icon"><NavIcon name="payouts" className="" /></span>
      <div className="rt-pws-status__body"><h2 className="rt-pws-status__title" id="rt-pws-payout-h">{c.banner}</h2></div>
      {c.connect
        ? <Link href={c.connect} className="button -sm -purple-1 text-white">{c.label}</Link>
        : <button type="button" className="button -sm -outline-purple-1 text-purple-1" disabled>{c.soon}<span className="rt-sr">: {c.label}</span></button>}
    </section>
  );
}
