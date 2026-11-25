"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Toast from "@/components/courses/Toast";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorText } from "@/lib/useMe";
import { formatPrice } from "@/lib/format";
import { methodName } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { Loading, Pill } from "./providerParts";
import { CancelSheet, CohortForm, CohortStatus, DeleteSheet, MoveSheet, Seats, cohortState, dayRange, deletable, longDay, timeRange, todayIso, tutorOptions } from "./ProviderCohorts";

// One run of a course (Manage cohort), from the API: its course, dates and times, venue or joining link, places, price,
// whether it takes bookings and its tutor, with Edit, Move to another course, Cancel and Delete. Learners appear under it once booking opens (a later
// milestone); until then the list is empty.

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
  const assignTutor = api.provider.cohorts.setTutor.useMutation();
  // the team members who can teach (the tutor menu): for those who see every date
  const tutorsQ = api.provider.cohorts.tutors.useQuery({ organisationId }, { enabled: Boolean(organisationId) && can("provider.cohorts.view"), retry: false });
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [toast, setToast] = useState(null);
  const [said, setSaid] = useState(""); // bookings on or off and the tutor are on screen already, so they are only read out
  // bookings on or off shows at once, before the cohort loads again; gone again if the save fails
  const [bookableNow, setBookableNow] = useState(null);
  const k = query.data && (bookableNow === null ? query.data : { ...query.data, bookable: bookableNow });

  if (query.error?.data?.code === "NOT_FOUND") return <EmptyState title="This cohort was not found." text="It may have been deleted." action={{ href: "/provider/cohorts", label: "All cohorts" }} />;
  if (query.isError) return <ErrorState title="We couldn't load this cohort." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!k) return <Loading detail />;

  const edit = can("provider.cohorts.edit");
  const status = cohortState(k);
  const cancelled = Boolean(k.cancelledAt);
  const refresh = () =>
    Promise.all([
      utils.provider.cohorts.get.invalidate({ organisationId, cohortId }),
      utils.provider.cohorts.list.invalidate(),
      utils.provider.courses.list.invalidate({ organisationId }),
      utils.provider.courses.get.invalidate(),
    ]);
  const where = k.venue ? [k.venue.name, k.venue.street, k.venue.city, k.venue.postcode].filter(Boolean).join(", ") : "Online";
  const toggle = () => {
    const to = !k.bookable;
    setBookableNow(to);
    bookable.mutate({ organisationId, cohortId, bookable: to }, {
      onSuccess: async () => { setSaid(to ? "Bookings turned on" : "Bookings turned off"); await refresh(); setBookableNow(null); },
      onError: (e) => { setBookableNow(null); setToast({ message: errorText(e) }); },
    });
  };

  // only the tutor changes (nothing else on the dates is sent, so a colleague's change to them stays)
  const setTutor = (v) =>
    assignTutor.mutate({ organisationId, cohortId, tutorUserId: v || null }, {
      onSuccess: () => { setSaid(v ? "Tutor assigned" : "Tutor removed"); refresh(); },
      onError: (e) => setToast({ message: errorText(e) }),
    });
  const tutors = tutorsQ.data || [];
  const today = todayIso();

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card" aria-labelledby="rt-coh-det-h">
        <div className="rt-acc__cardhead rt-adm-cardhead">
          <h2 className="rt-acc__h2" id="rt-coh-det-h">Cohort details</h2>
          <CohortStatus k={k} status={status} />
        </div>
        {/* its learning option isn't taking bookings on the course: these dates can't be booked until it takes them again */}
        {!cancelled && k.optionClosed && (
          <p className="rt-acc__notice -warn">{methodName(k.method)} isn’t taking new bookings on this course, so nobody can book these dates.{can("provider.courses.edit") && <> <Link href={`/provider/courses/${k.courseId}?tab=mode`} className="rt-cd__link">Take bookings again in Learning options</Link></>}</p>
        )}
        <dl className="rt-pws-coh__details">
          <div><dt>Course</dt><dd><Link href={`/provider/courses/${k.courseId}`} className="rt-adm-strong">{k.courseTitle}</Link><small>{methodName(k.method)}</small></dd></div>
          <div><dt>Dates</dt><dd>{dayRange(k.startsOn, k.endsOn)}{k.sessions.length > 1 && <small>{k.sessions.length} sessions</small>}</dd></div>
          <div><dt>{k.method === "classroom" ? "Venue" : "Joining link"}</dt><dd>{k.method === "classroom" ? where : k.joinUrl ? <a href={k.joinUrl} target="_blank" rel="noopener noreferrer" className="rt-pws-ce__url">{k.joinUrl}</a> : <span className="rt-adm-muted">Not added yet</span>}</dd></div>
          <div><dt>Places</dt><dd><Seats booked={k.taken ?? 0} max={k.capacity} /></dd></div>
          <div><dt>Price</dt><dd>{k.planId ? "From " : ""}{formatPrice(k.pricePence / 100)}{k.wasPricePence ? <small>was {formatPrice(k.wasPricePence / 100)}</small> : null}<small>Including VAT</small></dd></div>
          <div>
            <dt>Bookings</dt>
            <dd className="rt-pws-coh__inline">
              {!cancelled && k.optionClosed
                ? <Pill tone="warn">Stopped</Pill>
                : <Pill tone={k.bookable && !cancelled ? "ok" : "muted"}>{k.bookable && !cancelled ? "On" : "Off"}</Pill>}
              {edit && !cancelled && !k.optionClosed && k.endsOn >= today && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={toggle} disabled={bookable.isPending} aria-busy={bookable.isPending || undefined}>{bookable.isPending ? "Saving…" : k.bookable ? "Turn bookings off" : "Turn bookings on"}</button>}
            </dd>
          </div>
          <div>
            <dt>Tutor</dt>
            <dd>
              {edit && !cancelled && tutors.length ? (
                <div className="rt-field rt-adm-select -inline">
                  <FieldSelect id="rt-coh-det-tutor" label="Tutor" value={k.tutorUserId || ""} onChange={setTutor} options={tutorOptions(tutors, k)} disabled={assignTutor.isPending} compact />
                </div>
              ) : (k.tutorName || <span className="rt-adm-muted">Not assigned</span>)}
            </dd>
          </div>
          {k.details && <div><dt>Cohort structure</dt><dd>{k.details}</dd></div>}
        </dl>
        <h3 className="rt-pws-coh__h3">Sessions</h3>
        <ol className="rt-adm-list">
          {k.sessions.map((s, i) => (
            <li key={`${s.date}-${i}`}><div><b>{s.end && s.end !== s.date ? `${longDay(s.date)} to ${longDay(s.end)}` : longDay(s.date)}</b><small>{timeRange(s)}</small></div></li>
          ))}
        </ol>
        {cancelled && <p className="rt-acc__notice -warn">This cohort is cancelled{k.cancelReason ? `: ${k.cancelReason}` : "."}</p>}
        {edit && (
          <div className="rt-pws-coh__heroactions">
            {!cancelled && k.endsOn >= today && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(true)}>Edit cohort details</button>}
            {!cancelled && k.endsOn >= today && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setMoving(true)}>Move to another course</button>}
            {/* the destructive actions together, apart from Edit */}
            <div className="rt-pws-danger-group">
              {!cancelled && k.endsOn >= today && <button type="button" className="rt-pws-coh__remove rt-adm-danger" onClick={() => setCancelling(true)}>Cancel cohort</button>}
              {deletable(k, today) && <button type="button" className="rt-pws-coh__remove rt-adm-danger" onClick={() => setDeleting(true)}>Delete cohort</button>}
            </div>
          </div>
        )}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-coh-ppl-h">
        <h2 className="rt-acc__h2" id="rt-coh-ppl-h">Students</h2>
        {/* places can already be booked (by our team, for a customer) before the learner list, register and results exist */}
        <EmptyState inCard title={k.taken ? `${k.taken} ${k.taken === 1 ? "place" : "places"} booked.` : "No learners yet."} text={k.taken ? "Their names, the register, results and certificates show here once online booking opens." : "Learners booked on these dates show here once online booking opens."} />
      </section>

      <CohortForm open={editing} onClose={() => setEditing(false)} cohort={k} onSaved={() => { setEditing(false); refresh(); setToast({ message: "Cohort saved" }); }} />
      <CancelSheet cohort={cancelling ? k : null} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); refresh(); setToast({ message: "Cohort cancelled" }); }} />
      <MoveSheet cohort={moving ? k : null} onClose={() => setMoving(false)} onDone={(title) => { setMoving(false); refresh(); utils.provider.courses.list.invalidate(); setToast({ message: `Moved to ${title}` }); }} />
      <DeleteSheet cohort={deleting ? k : null} onClose={() => setDeleting(false)} onCancelInstead={() => { setDeleting(false); setCancelling(true); }} onDone={() => { utils.provider.cohorts.list.invalidate(); router.push("/provider/cohorts"); }} />
      <Toast toast={toast} onDone={() => setToast(null)} />
      <p className="rt-sr" aria-live="polite">{said}</p>
    </div>
  );
}
