import React, { useEffect, useRef } from "react";
import Link from "next/link";

const STATUS = { valid: { key: "valid", pill: "-correct", icon: "icon-check" }, expired: { key: "expired", pill: "-incorrect", icon: "icon-calendar" }, "not-found": { key: "notFound", pill: "-unanswered", icon: "icon-search" } };
// formatted here, not through lib/legal or lib/courses, so this client component does not pull their data into the bundle
const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const formatLongDate = (iso) => longDate.format(new Date(`${iso}T00:00:00Z`));
const checkedAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" });

// A check's result, in place of the form in the same card. The status pill is the mock test result's (.rt-tr__status), the
// details a two-column list. The heading takes focus when the result appears, so screen readers read it out.
// `outcome` is { status, certificate?, checkedAt }; `onAgain` clears the form, `onRetry` goes back to it with the details kept.
export default function CheckerResult({ outcome, copy, onAgain, onRetry }) {
  const headingRef = useRef(null);
  useEffect(() => headingRef.current?.focus(), []);

  const s = STATUS[outcome.status];
  const t = copy[s.key];
  const c = outcome.certificate;
  const f = copy.fields;
  const rows = c && [
    [f.name, c.name],
    [f.course, c.course],
    [f.qualification, c.qualification],
    [f.awardingBody, c.awardingBody],
    [f.provider, c.provider],
    [f.number, c.number],
    [f.issued, formatLongDate(c.issued)],
    [f.expires, c.expires ? formatLongDate(c.expires) : f.noExpiry],
  ];
  const text = outcome.status === "valid" && !c.expires ? t.noExpiry : t.text.replace("{date}", c?.expires ? formatLongDate(c.expires) : "");

  return (
    <div className="fb-frame">
      <div className="fb-frame__body rt-contact__form rt-cert__result">
        <span className={`rt-tr__status ${s.pill} rt-cert__status`}><i className={`${s.icon} text-10`} aria-hidden="true"></i>{t.status}</span>
        <h2 className="rt-contact__form-title" tabIndex={-1} ref={headingRef}>{t.title}</h2>
        <p className="rt-cert__text">{text}</p>
        {rows && (
          <dl className="rt-cert__details">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {t.reasons && (
          <>
            <ul className="rt-cert__reasons">
              {t.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <p className="rt-cert__text">{t.help.text} <Link href={t.help.link.href}>{t.help.link.label}</Link>.</p>
          </>
        )}
        {t.link && <Link href={t.link.href} className="fb-textlink rt-cert__more">{t.link.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
        {c && <p className="rt-cert__checked">{copy.checked} {checkedAt.format(outcome.checkedAt)}</p>}
        <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-btn-block rt-cert__again" onClick={t.retry ? onRetry : onAgain}>
          {t.retry || copy.again}
        </button>
      </div>
    </div>
  );
}
