"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { businessAccount as biz } from "@/data/businessAccount";
import { getBusiness } from "@/lib/businessAccount";
import { courseHref } from "@/data/courseSlugs";
import { formatDay, formatDateRange, formatPrice } from "@/lib/format";
import { CertPill, PlacesBar, ResultPill } from "./bizParts";
import { DownloadCertificate, useCertificateDownload } from "./BizCertificate";
import { Stats } from "@/components/admin/adminParts";
import { EmptyState } from "@/components/states/States";

const copy = biz.dashboard;
const Arrow = () => <i className="icon-arrow-right text-12" aria-hidden="true"></i>;

// The Business account home (the main actions are in the page head): four numbers that link to their sections, each with a short
// line; the credit account (what is due matters, so it comes next); the upcoming training with each course's places and Assign (Hurak's unassigned licences and courses as one list); the
// certificates that need renewing beside the recent results (a failed one has Rebook); and the recent valid certificates with
// Download.
export default function BizDashboard() {
  const [data, setData] = useState(null);
  const cert = useCertificateDownload();
  useEffect(() => setData(getBusiness()), []);
  if (!data) return null;

  const upcoming = data.purchases.filter((p) => p.state === "upcoming").sort((a, b) => (a.date < b.date ? -1 : 1));
  const toAssign = upcoming.reduce((s, p) => s + p.free, 0);
  const renewals = data.certificates.filter((c) => c.state !== "valid");
  const expired = renewals.filter((c) => c.state === "expired").length;
  const valid = data.certificates.filter((c) => c.state === "valid").sort((a, b) => (a.issued < b.issued ? 1 : -1));
  // a certificate that expires soon is still valid today, so the number counts it too
  const current = data.certificates.filter((c) => c.state !== "expired").length;
  const invited = data.learners.filter((l) => l.status === "invited").length;
  const s = copy.stats;
  const stats = [
    { label: s.learners.label, value: data.learners.length, icon: "icon-person-3", href: "/business/learners", hint: s.learners.hint(data.learners.length - invited, invited) },
    { label: s.unassigned.label, value: toAssign, icon: "icon-list", href: "/business/assignments", hint: s.unassigned.hint(toAssign) },
    { label: s.certificates.label, value: current, icon: "icon-badge", href: "#rt-biz-certs-h", hint: s.certificates.hint },
    { label: s.renewals.label, value: renewals.length, icon: "icon-calendar", href: "#rt-biz-renew-h", hint: s.renewals.hint(expired, renewals.length - expired) },
  ];
  const usedPct = Math.min(100, (data.credit.used / data.credit.limit) * 100);
  const cc = copy.certificates.columns;

  return (
    <div className="rt-acc__stack rt-biz__dash">
      <Stats items={stats} iconSize={18} />

      <section className="rt-acc__card" aria-labelledby="rt-biz-credit-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-biz-credit-h">{copy.billing.title}</h2>
          <Link href="/business/billing" className="fb-textlink">{copy.billing.cta}<Arrow /></Link>
        </div>
        <div className="rt-biz__creditrow">
          <dl className="rt-biz__creditnums">
            <div><dt>{biz.billing.credit.available}</dt><dd className="-ok">{formatPrice(data.credit.available)}</dd></div>
            <div><dt>{biz.billing.credit.used}</dt><dd>{formatPrice(data.credit.used)} <small>of {formatPrice(data.credit.limit)}</small></dd></div>
            <div><dt>{biz.billing.credit.due}</dt><dd>{formatPrice(data.credit.due)}{data.credit.due > 0 && <small>{biz.billing.credit.next(formatPrice(data.credit.nextAmount), formatDay(data.credit.dueDate))}</small>}</dd></div>
          </dl>
          {data.credit.due > 0 && <Link href="/business/billing" className="button -md -purple-1 text-white">{copy.billing.pay}</Link>}
        </div>
        <div className="rt-biz__meter" role="img" aria-label={`${Math.round(usedPct)}% of your credit used`}><span style={{ width: `${usedPct}%` }}></span></div>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-biz-up-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-biz-up-h">{copy.upcoming.title}</h2>
          <Link href="/business/bookings" className="fb-textlink">{copy.upcoming.all}<Arrow /></Link>
        </div>
        {upcoming.length ? (
          <ul className="rt-biz__assignlist">
            {upcoming.map((p) => (
              <li key={p.id}>
                <div className="rt-biz__assignmain">
                  <b>{p.title}</b>
                  <span>{formatDateRange(p.date, p.endDate)} · {p.venue ? `${p.venue}, ${p.city}` : "Live online"}</span>
                  <PlacesBar purchase={p} />
                </div>
                {p.free > 0 ? (
                  <Link href={`/business/assignments?place=${p.id}`} className="button -md -purple-1 text-white">{copy.upcoming.assign}<span className="rt-sr"> on {p.title}</span></Link>
                ) : (
                  <Link href={`/business/assignments?place=${p.id}`} className="button -md -outline-purple-1 text-purple-1">{copy.upcoming.manage}<span className="rt-sr"> on {p.title}</span></Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState inCard title={copy.upcoming.none} />
        )}
      </section>

      <div className="rt-acc__duo rt-biz__duo">
        <section className="rt-acc__card" aria-labelledby="rt-biz-renew-h">
          <h2 className="rt-acc__h2" id="rt-biz-renew-h">{copy.renewals.title}</h2>
          {renewals.length ? (
            <ul className="rt-acc__certs rt-biz__rows">
              {renewals.slice(0, 4).map((c) => (
                <li key={c.number}>
                  <div>
                    <b>{c.learner}</b>
                    <span>{c.title}</span>
                    <span>{c.state === "expired" ? "Expired" : "Expires"} {formatDay(c.expires)}</span>
                  </div>
                  <div className="rt-acc__certside">
                    <CertPill state={c.state} />
                    <Link href={courseHref(c.courseId)} className="fb-textlink">{copy.renewals.cta}<span className="rt-sr"> for {c.learner}</span><Arrow /></Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState inCard title={copy.renewals.none} />
          )}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-biz-res-h">
          <h2 className="rt-acc__h2" id="rt-biz-res-h">{copy.results.title}</h2>
          {data.results.length ? (
            <ul className="rt-acc__certs rt-biz__rows">
              {data.results.slice(0, 4).map((r) => (
                <li key={`${r.learnerId}-${r.courseId}-${r.date}`}>
                  <div>
                    <b>{r.learner}</b>
                    <span>{r.title}</span>
                    <span>{formatDay(r.date)}</span>
                  </div>
                  <div className="rt-acc__certside">
                    <ResultPill result={r} />
                    {r.outcome === "failed" && <Link href={courseHref(r.courseId)} className="fb-textlink">{copy.results.rebook}<span className="rt-sr"> {r.title} for {r.learner}</span><Arrow /></Link>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState inCard title={copy.results.none} />
          )}
        </section>
      </div>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-biz-certs-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-biz-certs-h">{copy.certificates.title}</h2>
          <Link href="/business/learners" className="fb-textlink">{copy.certificates.all}<Arrow /></Link>
        </div>
        {valid.length ? (
          <table className="rt-biz__table rt-biz__certtable">
            <thead><tr>{cc.map((c) => <th key={c} scope="col">{c}</th>)}<th scope="col"><span className="rt-sr">Download</span></th></tr></thead>
            <tbody>
              {valid.slice(0, 5).map((c) => (
                <tr key={c.number}>
                  <td data-label={cc[0]}><b>{c.learner}</b><small>{c.number}</small></td>
                  <td data-label={cc[1]}>{c.title}</td>
                  <td data-label={cc[2]}>{formatDay(c.issued)}</td>
                  <td data-label={cc[3]}>{formatDay(c.expires)}</td>
                  <td className="rt-biz__act"><DownloadCertificate cert={c} onDownload={cert.download} label={copy.certificates.download} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState inCard title={copy.certificates.none} />
        )}
      </section>

      {cert.page}
    </div>
  );
}
