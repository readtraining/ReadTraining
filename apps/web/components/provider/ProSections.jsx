"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { provider as d } from "@/data/provider";

const Pill = ({ children, onDark }) => (
  <div className={`rt-eyebrow rt-eyebrow--pill${onDark ? " -onDark" : ""}`}><span className="rt-eyebrow__dot"></span>{children}</div>
);
const Head = ({ eyebrow, title, text, onDark, max = "22ch" }) => (
  <>
    <Pill onDark={onDark}>{eyebrow}</Pill>
    <h2 className={`sectionTitle__title mt-20${onDark ? " text-white" : ""}`} style={{ maxWidth: max }}>{title}</h2>
    {text && <p className="sectionTitle__text" style={{ maxWidth: 640, color: onDark ? "rgba(255,255,255,0.72)" : undefined }}>{text}</p>}
  </>
);
const Check = ({ children, dark }) => (
  <li className={`bz-check${dark ? " -dark" : ""}`}><i className="icon-check text-9"></i><span>{children}</span></li>
);
const Status = ({ s }) => {
  const k = /published|complete|ready/i.test(s) ? "ok" : /draft|progress|scheduled/i.test(s) ? "warn" : "info";
  return <span className={`bz-status -${k}`}>{s}</span>;
};
const Initials = ({ name }) => <span className="bz-row__avatar">{name.split(" ").map((x) => x[0]).join("")}</span>;

/* 1. Hero (home-4 masthead) */
export function ProHero() {
  const h = d.hero;
  useEffect(() => {
    import("gsap").then((m) => {
      const gsap = m.gsap || m.default; const container = document.querySelector(".pr-masthead"); if (!container) return;
      const targets = container.querySelectorAll(".js-mouse-move");
      const onMove = (e) => { const relX = e.pageX - container.offsetLeft, relY = e.pageY - container.offsetTop; targets.forEach((el) => { const mv = Number(el.getAttribute("data-move")); gsap.to(el, { x: ((relX - container.offsetWidth / 2) / container.offsetWidth) * mv, y: ((relY - container.offsetHeight / 2) / container.offsetHeight) * mv, duration: 0.2 }); }); };
      document.addEventListener("mousemove", onMove); container.__off = () => document.removeEventListener("mousemove", onMove);
    });
    return () => document.querySelector(".pr-masthead")?.__off?.();
  }, []);
  return (
    <section className="masthead -type-3 bg-light-6 bz-masthead pr-masthead">
      <div className="container">
        <div className="row y-gap-30 items-center justify-center">
          <div className="col-xl-6 col-lg-11 relative z-5">
            <div className="masthead__content">
              <span className="bz-hero2__trust"><i className="icon-badge"></i>{h.trust}</span>
              <h1 className="masthead__title mt-20">{h.title}</h1>
              <p className="masthead__text text-17 text-dark-1 mt-20" style={{ maxWidth: 560 }}>{h.text}</p>
              <div className="d-flex flex-wrap items-center mt-30" style={{ gap: "12px 14px" }}>
                <Link href={h.primary.href} className="button -md -purple-1 text-white">{h.primary.label} <i className="icon-arrow-right text-13 ml-10"></i></Link>
                <Link href={h.secondary.href} className="button -md -outline-dark-1 text-dark-1">{h.secondary.label}</Link>
              </div>
              <div className="bz-hero2__note mt-15">{h.points.join(" · ")}</div>
            </div>
          </div>
          <div className="col-xl-6 col-lg-8 relative z-2">
            <div className="masthead-image bz-masthead__image">
              <div className="masthead-image__img1">
                <div className="masthead-image__shape xl:d-none"><Image width={800} height={800} src="/assets/img/home-4/masthead/shape.svg" alt="" /></div>
                <Image width={1180} height={440} data-move="20" className="js-mouse-move bz-dashImg" src="/assets/img/business/provider-dashboard.png" alt="Provider workspace dashboard" priority />
              </div>
              <div className="masthead-image__el1">
                <div data-move="40" className="lg:d-none img-el px-20 py-15 d-flex items-center bg-white rounded-8 shadow-4 js-mouse-move">
                  <div className="size-50 d-flex justify-center items-center bg-purple-3 rounded-full"><i className="icon-basket text-18 text-purple-1"></i></div>
                  <div className="ml-15"><div className="text-purple-1 text-15 fw-500 lh-1">New booking</div><div className="mt-3 text-13">2 places · Manchester</div></div>
                </div>
              </div>
              <div className="masthead-image__el2">
                <div data-move="40" className="shadow-4 img-el px-20 py-15 d-flex items-center bg-white rounded-8 js-mouse-move">
                  <div className="img-el__side"><div className="size-50 d-flex justify-center items-center bg-dark-1 rounded-full"><i className="icon-check text-14 text-green-1"></i></div></div>
                  <div className="ml-15"><div className="text-purple-1 text-15 fw-500 lh-1">Payout sent</div><div className="mt-3 text-13">£3,140 · 28 Sep</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 2. Workflow (template StepsOne pattern) */
export function ProWorkflow() {
  const w = d.workflow; const icons = ["icon-list", "icon-calendar", "icon-person-2", "icon-global-search"];
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-20 justify-center text-center"><div className="col-xl-7 col-lg-9"><div className="rt-section-head"><Head eyebrow={w.eyebrow} title={w.title} text={w.text} max="30ch" /></div></div></div>
        <div className="bz-stepsRow pt-60 lg:pt-40">
          {w.steps.map((st, i) => (
            <React.Fragment key={st.title}>
              <div className="bz-stepsRow__item">
                <div className="d-flex flex-column items-center text-center">
                  <div className="relative size-120 d-flex justify-center items-center rounded-full bg-light-4">
                    <i className={`${icons[i]} text-40 text-purple-1`}></i>
                    <div className="side-badge"><div className="size-35 d-flex justify-center items-center rounded-full bg-dark-1"><span className="text-14 fw-500 text-white">0{i + 1}</span></div></div>
                  </div>
                  <div className="text-17 fw-500 text-dark-1 mt-30">{st.title}</div>
                  <div className="text-14 text-light-1 mt-8" style={{ lineHeight: 1.55 }}>{st.text}</div>
                </div>
              </div>
              {i < 3 && <div className="bz-stepsRow__line xl:d-none"><Image width={142} height={21} src={`/assets/img/misc/lines/${(i % 2) + 1}.svg`} alt="" /></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 3. Cohorts: copy left, schedule card right */
export function ProCohorts() {
  const c = d.cohorts; const k = c.card;
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <Head eyebrow={c.eyebrow} title={c.title} text={c.text} />
            <div className="bz-options mt-30">
              {c.options.map((o, i) => (
                <div key={o.title} className="bz-option"><span className="bz-option__icon"><i className={`${i ? "icon-person-2" : "icon-online-learning"} text-14`}></i></span><div><div className="bz-option__title">{o.title}</div><div className="bz-option__text">{o.text}</div></div></div>
              ))}
            </div>
          </div>
          <div className="col-xl-6 col-lg-6">
            <div className="bz-card">
              <div className="bz-card__head"><div><span className="bz-card__label">Cohorts and dates</span><b>{k.month}</b></div><span className="bz-status -info"><i className="icon-calendar text-10 mr-5"></i>Calendar</span></div>
              <div className="bz-counts">{k.stats.map((s) => <div key={s.label}><span>{s.label}</span><b>{s.value}</b></div>)}</div>
              <div className="bz-table">
                {k.rows.map((r) => (
                  <div key={r.course} className="bz-table__row" style={{ gridTemplateColumns: "1.6fr auto auto" }}>
                    <div><b>{r.course}</b><span>{r.meta}</span></div>
                    <div className="text-right"><span className="bz-table__label">Seats</span><b>{r.seats}</b></div>
                    <Status s={r.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 4. Learners: list card left, copy right */
export function ProLearners() {
  const l = d.learners; const k = l.card;
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-6 col-lg-6 order-2 order-lg-1">
            <div className="bz-card">
              <div className="bz-card__head"><div><b>Learners</b><span className="bz-card__sub">Records, activity and follow-up</span></div><span className="bz-status -info">{k.total}</span></div>
              <div className="bz-progress">
                {k.rows.map((r) => (
                  <div key={r.name} className="bz-progress__row">
                    <Initials name={r.name} />
                    <div className="bz-progress__body">
                      <div className="bz-progress__top"><b>{r.name}</b><Status s={r.status} /></div>
                      <span>{r.course}</span>
                      {r.pct !== undefined && <div className="bz-bar"><span style={{ width: `${r.pct}%` }}></span></div>}
                    </div>
                    <b className="bz-progress__pct">{r.pct !== undefined ? `${r.pct}%` : r.note}</b>
                  </div>
                ))}
              </div>
              <div className="pr-followup"><div><b>{k.followUp.title}</b><span>{k.followUp.text}</span></div><button type="button" className="button -sm -purple-1 text-white">{k.followUp.action}</button></div>
            </div>
          </div>
          <div className="col-xl-5 col-lg-6 order-1 order-lg-2">
            <Head eyebrow={l.eyebrow} title={l.title} text={l.text} />
            <ul className="bz-checks -stack mt-25">{l.points.map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 5. Campaigns: copy left, campaigns card right */
export function ProCampaigns() {
  const c = d.campaigns; const k = c.card;
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <Head eyebrow={c.eyebrow} title={c.title} text={c.text} />
            <ul className="bz-checks -stack mt-25">{c.points.map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
          <div className="col-xl-6 col-lg-6">
            <div className="bz-card">
              <div className="bz-card__head"><div><b>Marketing campaigns</b><span className="bz-card__sub">Targeted learner email campaigns</span></div></div>
              <div className="bz-rows pt-15">
                {k.rows.map((r) => (
                  <div key={r.name} className="bz-row"><span className="bz-row__avatar"><i className="icon-email text-11"></i></span><div><b>{r.name}</b><span>{r.meta}</span></div><Status s={r.status} /></div>
                ))}
              </div>
              <div className="pr-email">
                <span className="bz-card__label">{k.preview.label}</span>
                <b>{k.preview.subject}</b>
                <p>{k.preview.text}</p>
                <div className="pr-email__foot"><span>{k.preview.audience}</span><button type="button" className="button -sm -dark-1 text-white">{k.preview.action}</button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 6. LMS: curriculum card left, copy right */
export function ProLms() {
  const l = d.lms; const k = l.card;
  const typeIcon = { Text: "icon-document", Video: "icon-play", Quiz: "icon-list", SCORM: "icon-puzzle" };
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-6 col-lg-6 order-2 order-lg-1">
            <div className="bz-card">
              <div className="bz-card__head"><div><b>{k.title}</b><span className="bz-card__sub">Build and organise digital learning</span></div><span className="bz-status -info">{k.count}</span></div>
              <div className="pr-module">{k.module}</div>
              <div className="pr-acts">
                {k.activities.map((a, i) => (
                  <div key={a.title} className="pr-act"><span className="pr-act__n">{i + 1}</span><span className="pr-act__icon"><i className={typeIcon[a.type]}></i></span><b>{a.title}</b><span className="pr-act__type">{a.type}</span></div>
                ))}
              </div>
              <div className="pr-lmsProg"><div><span className="bz-card__label">{k.progress.label}</span><b>{k.progress.learners}</b></div><div className="text-right"><span className="bz-card__label">Average</span><b>{k.progress.avg}%</b></div></div>
              <div className="bz-bar"><span style={{ width: `${k.progress.avg}%` }}></span></div>
            </div>
          </div>
          <div className="col-xl-5 col-lg-6 order-1 order-lg-2">
            <Head eyebrow={l.eyebrow} title={l.title} text={l.text} />
            <ul className="bz-checks -stack mt-25">{l.points.map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 7. Marketplace: copy left, listing card right (dark) */
export function ProMarketplace() {
  const m = d.marketplace; const k = m.card;
  return (
    <section className="layout-pt-lg layout-pb-lg bz-dark">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <Head eyebrow={m.eyebrow} title={m.title} text={m.text} onDark />
            <ul className="bz-checks -stack mt-25">{m.points.map((x) => <Check key={x} dark>{x}</Check>)}</ul>
          </div>
          <div className="col-xl-6 col-lg-6">
            <div className="bz-card">
              <div className="bz-card__head"><div><span className="bz-card__label">Course listing</span><b>{k.course}</b></div><span className="bz-status -ok">Marketplace</span></div>
              <p className="text-14 text-light-1 mt-15">{k.text}</p>
              <div className="bz-rows mt-15">
                {k.dates.map((r) => (
                  <div key={r.date} className="bz-row"><span className="bz-row__avatar"><i className="icon-calendar text-11"></i></span><div><b>{r.date}</b><span>{r.meta}</span></div><Status s={r.status} /></div>
                ))}
              </div>
              <div className="bz-card__foot"><span>{k.note}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 8. Pricing: two tiers + payout estimator */
export function ProPricing() {
  const p = d.pricing; const [price, setPrice] = useState(199);
  const fee = price * 0.03; const commission = (price - fee) * 0.3; const payout = price - fee - commission;
  const gbp = (n) => `£${n.toFixed(2)}`;
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row justify-center text-center"><div className="col-xl-7 col-lg-9"><div className="rt-section-head"><Head eyebrow={p.eyebrow} title={p.title} text={p.text} max="30ch" /></div></div></div>
        <div className="pr-pricing mt-40">
          {p.tiers.map((t, i) => (
            <div key={t.label} className={`pr-tier${i ? " -mkt" : ""}`}>
              <span className="bz-card__label">{t.label}</span>
              <b className="pr-tier__value">{t.value}</b>
              <span className="pr-tier__sub">{t.sub}</span>
              <p>{t.text}</p>
            </div>
          ))}
          <div className="pr-calc">
            <span className="bz-card__label">{p.calc.title}</span>
            <label className="rt-field mt-10"><span>Course price (£)</span><input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} /></label>
            <div className="pr-calc__rows">
              <div><span>Card transaction fee (3%)</span><b>- {gbp(fee)}</b></div>
              <div><span>Marketplace fee (30%)</span><b>- {gbp(commission)}</b></div>
              <div className="-total"><span>You receive</span><b>{gbp(payout)}</b></div>
            </div>
            <small>{p.calc.note}</small>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 9. FAQ accordion */
export function ProFaq() {
  const f = d.faq; const [open, setOpen] = useState(0);
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row justify-center text-center"><div className="col-xl-7 col-lg-9"><div className="rt-section-head"><Head eyebrow={f.eyebrow} title={f.title} text={f.text} max="26ch" /></div></div></div>
        <div className="bz-acc mt-40">
          {f.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={`bz-acc__item${isOpen ? " is-open" : ""}`}>
                <h3 className="bz-acc__h"><button type="button" className="bz-acc__btn" aria-expanded={isOpen} aria-controls={`pfaq-${i}`} id={`pfaq-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}><span>{it.q}</span><span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span></button></h3>
                <div className="bz-acc__panel" id={`pfaq-${i}`} role="region" aria-labelledby={`pfaq-btn-${i}`}><div className="bz-acc__inner"><p>{it.a}</p></div></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* 10. CTA band */
export function ProCta() {
  const c = d.cta;
  return (
    <section className="layout-pb-lg">
      <div className="container">
        <div className="bz-cta3">
          <div className="bz-cta3__text"><h2 className="bz-cta3__title">{c.title}</h2><p className="bz-cta3__lede">{c.text}</p></div>
          <div className="bz-cta3__actions">
            <Link href={c.primary.href} className="button -md -green-1 text-dark-1">{c.primary.label} <i className="icon-arrow-right text-13 ml-10"></i></Link>
            <Link href={c.secondary.href} className="button -md -outline-white text-white">{c.secondary.label}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
