import React from "react";
import { business as d } from "@/data/business";

const Status = ({ s }) => {
  const k = /valid|complete|confirmed/i.test(s) ? "ok" : /due|progress/i.test(s) ? "warn" : "info";
  return <span className={`bz-status -${k}`}>{s}</span>;
};

// Business account dashboard (admin side). Also used as the screenshot source for the For business hero.
export default function AdminDashboard() {
  const a = d.hero.account; const h = d.hero;
  return (
    <div className="ad-dash">
      <aside className="ad-dash__side">
        <div className="ad-dash__brand"><span>{a.company[0]}</span><b>{a.company}</b></div>
        {[["icon-bar-chart-2", "Dashboard"], ["icon-person-2", "Learners"], ["icon-list", "Course places"], ["icon-badge", "Certificates"], ["icon-document", "Billing"]].map(([ic, n], i) => (
          <div key={n} className={`ad-dash__nav${i === 0 ? " is-active" : ""}`}><i className={ic}></i>{n}</div>
        ))}
      </aside>
      <div className="ad-dash__main">
        <div className="ad-dash__bar"><b>Training overview</b><span>Business account · {a.company}</span></div>
        <div className="ad-dash__kpis">
          {a.stats.map((s, i) => (
            <div key={s.label} className={`ad-dash__kpi${i === 3 ? " -alert" : ""}`}><span>{s.label}</span><b>{s.value}</b><small>{s.note}</small></div>
          ))}
        </div>
        <div className="ad-dash__grid">
          <div className="ad-dash__panel">
            <div className="ad-dash__panelHead"><b>Current activity</b><a href="#">Manage learners</a></div>
            {a.activity.map((r) => (
              <div key={r.course} className="ad-dash__row">
                <div><b>{r.course}</b><span>{r.meta}</span></div>
                <div className="ad-dash__bar2"><span style={{ width: r.status === "Confirmed" ? "83%" : "66%" }}></span></div>
                <Status s={r.status} />
                <span className="ad-dash__muted">{r.progress}</span>
              </div>
            ))}
          </div>
          <div className="ad-dash__panel">
            <div className="ad-dash__panelHead"><b>Renewals due</b><span className="bz-status -warn">2</span></div>
            {h.renewals.map((r) => (
              <div key={r.name} className="ad-dash__renew"><div><b>{r.name}</b><span>{r.course} · {r.date}</span></div><button type="button">Renew</button></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
