"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Toast from "@/components/courses/Toast";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { formatPrice } from "@/lib/format";
import { methodName } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";
import { COHORT_TONE, Loading, Pill } from "./providerParts";
import { CancelSheet, CohortForm, DeleteSheet, Seats, cohortState, dayRange, longDay, timeRange } from "./ProviderCohorts";

// One run of a course (Hurak's Manage cohort), from the API: its course, dates and times, venue or joining link, places, price,
// whether it takes bookings and its tutor, with Edit, Cancel and Delete. Learners appear under it once booking opens (a later
// milestone); until then the list is empty.

const STATUSES = { upcoming: "Upcoming", progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

const useCohort = (cohortId) => {
  const { organisationId } = useProviderAccess();
  return api.provider.cohorts.get.useQuery({ organisationId, cohortId }, { enabled: Boolean(organisationId), retry: false });
};

// The page's heading: the cohort's course and dates.
export function CohortDetailTitle({ cohortId, fallback }) {
  const k = useCohort(cohortId).data;
  return k ? `${k.courseTitle}, ${dayRange(k.startsOn, k.endsOn)}` : fallback;
}

export default function ProviderCohortDetail({ cohortId }) {
  const router = useRouter();
  const { organisationId, can } = useProviderAccess();
  const query = useCohort(cohortId);
  const utils = api.useUtils();
  const bookable = api.provider.cohorts.setBookable.useMutation();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const k = query.data;

  if (query.error?.data?.code === "NOT_FOUND") return <EmptyState title="This cohort was not found." text="It may have been deleted." action={{ href: "/provider/cohorts", label: "All cohorts" }} />;
  if (query.isError) return <ErrorState title="We couldn't load this cohort." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!k) return <Loading rows={3} />;

  const edit = can("provider.cohorts.edit");
  const status = cohortState(k);
  const cancelled = Boolean(k.cancelledAt);
  const refresh = () => {
    utils.provider.cohorts.get.invalidate({ organisationId, cohortId });
    utils.provider.cohorts.list.invalidate();
    utils.provider.courses.list.invalidate({ organisationId });
    utils.provider.courses.get.invalidate();
  };
  const where = k.venue ? [k.venue.name, k.venue.street, k.venue.city, k.venue.postcode].filter(Boolean).join(", ") : "Online";
  const toggle = () => bookable.mutate({ organisationId, cohortId, bookable: !k.bookable }, {
    onSuccess: () => { refresh(); setToast({ message: k.bookable ? "Bookings turned off" : "Bookings turned on" }); },
    onError: (e) => setToast({ message: errorsFrom(e).general }),
  });

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card" aria-labelledby="rt-coh-det-h">
        <div className="rt-acc__cardhead rt-adm-cardhead">
          <h2 className="rt-acc__h2" id="rt-coh-det-h">Cohort details</h2>
          <Pill tone={COHORT_TONE[status]}>{STATUSES[status]}</Pill>
        </div>
        <dl className="rt-pws-coh__details">
          <div><dt>Course</dt><dd><Link href={`/provider/courses/${k.courseId}`} className="rt-adm-strong">{k.courseTitle}</Link><small>{methodName(k.method)}</small></dd></div>
          <div><dt>Dates</dt><dd>{dayRange(k.startsOn, k.endsOn)}{k.sessions.length > 1 && <small>{k.sessions.length} sessions</small>}</dd></div>
          <div><dt>{k.method === "classroom" ? "Venue" : "Joining link"}</dt><dd>{k.method === "classroom" ? where : k.joinUrl ? <a href={k.joinUrl} target="_blank" rel="noopener noreferrer" className="rt-pws-ce__url">{k.joinUrl}</a> : <span className="rt-adm-muted">Not added yet</span>}</dd></div>
          <div><dt>Places</dt><dd><Seats booked={0} max={k.capacity} /></dd></div>
          <div><dt>Price</dt><dd>{formatPrice(k.pricePence / 100)}{k.wasPricePence ? <small>was {formatPrice(k.wasPricePence / 100)}</small> : null}<small>Including VAT</small></dd></div>
          <div>
            <dt>Bookings</dt>
            <dd className="rt-pws-coh__inline">
              <Pill tone={k.bookable && !cancelled ? "ok" : "muted"}>{k.bookable && !cancelled ? "On" : "Off"}</Pill>
              {edit && !cancelled && <button type="button" className="rt-cd__link" onClick={toggle} disabled={bookable.isPending}>{k.bookable ? "Turn bookings off" : "Turn bookings on"}</button>}
            </dd>
          </div>
          <div><dt>Tutor</dt><dd>{k.tutorName || <span className="rt-adm-muted">Not assigned</span>}</dd></div>
          {k.details && <div><dt>Cohort structure</dt><dd>{k.details}</dd></div>}
        </dl>
        <h3 className="rt-pws-coh__h3">Sessions</h3>
        <ol className="rt-adm-list">
          {k.sessions.map((s, i) => (
            <li key={`${s.date}-${i}`}><div><b>{s.end && s.end !== s.date ? `${longDay(s.date)} to ${longDay(s.end)}` : longDay(s.date)}</b><small>{timeRange(s)}</small></div></li>
          ))}
        </ol>
        {edit && !cancelled && (
          <div className="rt-pws-coh__heroactions">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(true)}>Edit cohort details</button>
            {k.endsOn >= new Date().toISOString().slice(0, 10) && <button type="button" className="rt-pws-coh__remove rt-adm-danger" onClick={() => setCancelling(true)}>Cancel cohort</button>}
          </div>
        )}
        {cancelled && <p className="rt-adm-item__block">This cohort is cancelled{k.cancelReason ? `: ${k.cancelReason}` : "."}</p>}
        {edit && <p className="rt-acc__note"><button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setDeleting(true)}>Delete cohort</button></p>}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-coh-ppl-h">
        <h2 className="rt-acc__h2" id="rt-coh-ppl-h">Students</h2>
        <EmptyState inCard title="No learners yet." text="Learners booked on these dates show here, with the register, results and certificates. Online booking opens in a later update." />
      </section>

      <CohortForm open={editing} onClose={() => setEditing(false)} cohort={k} onSaved={() => { setEditing(false); refresh(); setToast({ message: "Cohort saved" }); }} />
      <CancelSheet cohort={cancelling ? k : null} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); refresh(); setToast({ message: "Cohort cancelled" }); }} />
      <DeleteSheet cohort={deleting ? k : null} onClose={() => setDeleting(false)} onDone={() => { utils.provider.cohorts.list.invalidate(); router.push("/provider/cohorts"); }} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
