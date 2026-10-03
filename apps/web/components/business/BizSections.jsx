"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { business as d } from "@/data/business";

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
  const k = /valid|complete|confirmed/i.test(s) ? "ok" : /due|progress/i.test(s) ? "warn" : "info";
  return <span className={`bz-status -${k}`}>{s}</span>;
};

/* 1. Hero (template home-4 masthead: copy left, visual right with floating cards) */
export function BizHero() {
  const h = d.hero;
  useEffect(() => {
    let gsap;
    import("gsap").then((m) => {
      gsap = m.gsap || m.default;
      const container = document.querySelector(".bz-masthead");
      if (!container) return;
      const targets = container.querySelectorAll(".js-mouse-move");
      const onMove = (e) => {
        const relX = e.pageX - container.offsetLeft; const relY = e.pageY - container.offsetTop;
        targets.forEach((el) => {
          const mv = Number(el.getAttribute("data-move"));
          gsap.to(el, { x: ((relX - container.offsetWidth / 2) / container.offsetWidth) * mv, y: ((relY - container.offsetHeight / 2) / container.offsetHeight) * mv, duration: 0.2 });
        });
      };
      document.addEventListener("mousemove", onMove);
      container.__off = () => document.removeEventListener("mousemove", onMove);
    });
    return () => document.querySelector(".bz-masthead")?.__off?.();
  }, []);

  return (
    <section className="masthead -type-3 bg-light-6 bz-masthead">
      <div className="container">
        <div className="row y-gap-30 items-center justify-center">
          <div className="col-xl-6 col-lg-11 relative z-5">
            <div className="masthead__content">
              <span className="bz-hero2__trust"><i className="icon-star"></i>{h.trust}</span>
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
                <div className="masthead-image__shape xl:d-none">
                  <Image width={800} height={800} src="/assets/img/home-4/masthead/shape.svg" alt="" />
                </div>
                <Image width={1180} height={440} data-move="20" className="js-mouse-move bz-dashImg" src="/assets/img/business/dashboard.png" alt="Business account dashboard" priority />
              </div>

              <div className="masthead-image__el1">
                <div data-move="40" className="lg:d-none img-el px-20 py-15 d-flex items-center bg-white rounded-8 shadow-4 js-mouse-move">
                  <div className="size-50 d-flex justify-center items-center bg-red-2 rounded-full"><i className="icon-wall-clock text-18 text-orange-1"></i></div>
                  <div className="ml-15"><div className="text-orange-1 text-15 fw-500 lh-1">2 renewals</div><div className="mt-3 text-13">Due this month</div></div>
                </div>
              </div>

              <div className="masthead-image__el2">
                <div data-move="40" className="shadow-4 img-el px-20 py-15 d-flex items-center bg-white rounded-8 js-mouse-move">
                  <div className="img-el__side"><div className="size-50 d-flex justify-center items-center bg-dark-1 rounded-full"><i className="icon-check text-14 text-green-1"></i></div></div>
                  <div className="ml-15"><div className="text-purple-1 text-15 fw-500 lh-1">Certificate issued</div><div className="mt-3 text-13">Jane S. · Food Hygiene L2</div></div>
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
export function BizWorkflow() {
  const w = d.workflow;
  const icons = ["icon-basket", "icon-person-2", "icon-list", "icon-badge"];
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-20 justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head"><Head eyebrow={w.eyebrow} title={w.title} text={w.text} max="28ch" /></div>
          </div>
        </div>

        <div className="bz-stepsRow pt-60 lg:pt-40">
          {w.steps.map((st, i) => (
            <React.Fragment key={st.title}>
              <div className="bz-stepsRow__item">
                <div className="d-flex flex-column items-center text-center">
                  <div className="relative size-120 d-flex justify-center items-center rounded-full bg-light-4">
                    <i className={`${icons[i]} text-40 text-purple-1`}></i>
                    <div className="side-badge">
                      <div className="size-35 d-flex justify-center items-center rounded-full bg-dark-1">
                        <span className="text-14 fw-500 text-white">0{i + 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-17 fw-500 text-dark-1 mt-30">{st.title}</div>
                  <div className="text-14 text-light-1 mt-8" style={{ lineHeight: 1.55 }}>{st.text}</div>
                </div>
              </div>
              {i < 3 && (
                <div className="bz-stepsRow__line xl:d-none">
                  <Image width={142} height={21} src={`/assets/img/misc/lines/${(i % 2) + 1}.svg`} alt="" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 3. Licences: two paths */
export function BizLicences() {
  const l = d.licences; const e = l.example;
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9"><div className="rt-section-head"><Head eyebrow={l.eyebrow} title={l.title} text={l.text} max="30ch" /></div></div>
        </div>
        <div className="bz-paths mt-40">
          {l.options.map((o, i) => (
            <div key={o.title} className={`bz-path${i ? " -hold" : ""}`}>
              <div className="bz-path__icon"><i className={`${i ? "icon-wall-clock" : "icon-check"} text-16`}></i></div>
              <div className="bz-path__title">{o.title}</div>
              <div className="bz-path__text">{o.text}</div>
              <div className="bz-path__demo">
                {i === 0 ? (
                  <>
                    {e.learners.map((p) => <div key={p.email} className="bz-path__row"><span className="bz-row__avatar">{p.name.split(" ").map((x) => x[0]).join("")}</span><div><b>{p.name}</b><span>{p.email}</span></div><span className="bz-status -ok">{p.status}</span></div>)}
                    <div className="bz-path__more -light"><span>+4 more learners assigned</span><a href="#" className="bz-link">View all <i className="icon-arrow-right text-11 ml-5"></i></a></div>
                  </>
                ) : (
                  <>
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="bz-path__slot"><span className="bz-row__avatar -ghost">+</span><div><b>Unassigned place {n}</b><span>{e.course}</span></div><span className="bz-status -info">On hold</span></div>
                    ))}
                    <div className="bz-path__more"><span>+2 more places on hold</span><button type="button" className="button -sm -green-1 text-dark-1">{e.unassigned.action}</button></div>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="bz-paths__stats">
            {e.counts.map((c, i) => (
              <div key={c.label} className="bz-paths__stat">
                <span className="bz-paths__statIcon"><i className={["icon-basket", "icon-check", "icon-wall-clock"][i]}></i></span>
                <div><b>{c.value}</b><span>{c.label}</span></div>
                <div className="bz-paths__bar"><span style={{ width: `${Math.round((c.value / e.counts[0].value) * 100)}%` }}></span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 4. Progress: three-column board */
export function BizProgress() {
  const p = d.progress; const cols = [
    { title: "Booked", items: [{ n: "Tom Reilly", c: "Fire Marshal Training" }, { n: "Grace Osei", c: "Health & Safety Awareness" }] },
    { title: "In progress", items: p.card.learners.filter((l) => l.pct < 100).map((l) => ({ n: l.name, c: l.course, pct: l.pct })) },
    { title: "Complete", items: p.card.learners.filter((l) => l.pct === 100).map((l) => ({ n: l.name, c: l.course })) },
  ];
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-7"><Head eyebrow={p.eyebrow} title={p.title} text={p.text} max="26ch" /></div>
          <div className="col-lg-4"><ul className="bz-checks -stack">{p.points.map((x) => <Check key={x}>{x}</Check>)}</ul></div>
        </div>
        <div className="bz-board mt-40">
          {cols.map((col) => (
            <div key={col.title} className="bz-board__col">
              <div className="bz-board__head"><b>{col.title}</b><span>{col.items.length}</span></div>
              {col.items.map((it) => (
                <div key={it.n} className="bz-board__card">
                  <span className="bz-row__avatar">{it.n.split(" ").map((x) => x[0]).join("")}</span>
                  <div><b>{it.n}</b><span>{it.c}</span>{it.pct !== undefined && <div className="bz-bar"><span style={{ width: `${it.pct}%` }}></span></div>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 5. Certificates: compact record list */
export function BizCertificates() {
  const c = d.certificates; const t = c.card;
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-7"><Head eyebrow={c.eyebrow} title={c.title} text={c.text} max="34ch" /></div>
          <div className="col-lg-4"><ul className="bz-checks -stack">{c.points.map((x) => <Check key={x}>{x}</Check>)}</ul></div>
        </div>
        <div className="bz-certs2 mt-40">
          {t.rows.map((r) => {
            const due = r.status !== "Valid";
            return (
              <div key={r.name} className={`bz-cert2${due ? " -due" : ""}`}>
                <div className="bz-cert2__top">
                  <span className="bz-cert2__icon"><i className="icon-badge"></i></span>
                  <Status s={r.status} />
                </div>
                <div className="bz-cert2__course">{r.course}</div>
                <div className="bz-cert2__name">{r.name}</div>
                <div className="bz-cert2__foot">
                  <span>Expires <b>{r.expires}</b></span>
                  <button type="button" className="bz-cert2__dl" aria-label="Download certificate"><i className="icon-document"></i></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* 6. Credit: copy left, meter card right */
export function BizCredit() {
  const c = d.credit; const k = c.card; const pct = Math.round((k.used / k.limit) * 100);
  return (
    <section className="layout-pt-lg layout-pb-lg bz-dark">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <Head eyebrow={c.eyebrow} title={c.title} text={c.text} onDark max="18ch" />
            <div className="bz-options mt-30">
              {c.points.map((o, i) => (
                <div key={o.title} className="bz-option -dark">
                  <span className="bz-option__icon">{i + 1}</span>
                  <div><div className="bz-option__title">{o.title}</div><div className="bz-option__text">{o.text}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-xl-6 col-lg-6">
            <div className="bz-meterCard">
              <div className="bz-meterCard__head"><div><span className="bz-card__label">Business credit</span><b>{k.company}</b></div><span className="bz-status -ok">{k.status}</span></div>
              <div className="bz-meterCard__body">
                <div className="bz-meter__ring" style={{ "--pct": 100 - pct }}><div><b>£{k.available.toLocaleString()}</b><span>available of £{k.limit.toLocaleString()}</span></div></div>
                <div className="bz-meterCard__rows">
                  <div className="bz-meterCard__row"><span>Used</span><b>£{k.used.toLocaleString()}</b></div>
                  <div className="bz-meterCard__row"><span>Next invoice</span><b>{k.due.amount} · {k.due.date}</b></div>
                  {k.purchases.map((p) => <div key={p.label} className="bz-meterCard__row -sm"><span>{p.label}</span><b>{p.amount}</b></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 7. FAQ: single-column accordion (divider style, plus/minus, animated height) */
export function BizFaq() {
  const f = d.faq; const [open, setOpen] = useState(0);
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9"><div className="rt-section-head"><Head eyebrow={f.eyebrow} title={f.title} text={f.text} max="26ch" /></div></div>
        </div>
        <div className="bz-acc mt-40">
          {f.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={`bz-acc__item${isOpen ? " is-open" : ""}`}>
                <h3 className="bz-acc__h">
                  <button type="button" className="bz-acc__btn" aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{it.q}</span>
                    <span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span>
                  </button>
                </h3>
                <div className="bz-acc__panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`}>
                  <div className="bz-acc__inner"><p>{it.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* 8. CTA: horizontal dark band */
export function BizCta() {
  const c = d.cta;
  return (
    <section className="layout-pb-lg">
      <div className="container">
        <div className="bz-cta3">
          <div className="bz-cta3__text">
            <h2 className="bz-cta3__title">{c.title}</h2>
            <p className="bz-cta3__lede">{c.text}</p>
          </div>
          <div className="bz-cta3__actions">
            <Link href={c.primary.href} className="button -md -green-1 text-dark-1">{c.primary.label} <i className="icon-arrow-right text-13 ml-10"></i></Link>
            <Link href={c.secondary.href} className="button -md -outline-white text-white">{c.secondary.label}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
