import React from "react";
import { provider as d } from "@/data/provider";

// Provider workspace dashboard (admin side). Screenshot source for the For providers hero.
export default function ProviderDashboard() {
  const w = d.hero.workspace;
  return (
    <div className="ad-dash">
      <aside className="ad-dash__side">
        <div className="ad-dash__brand"><span>{w.company[0]}</span><b>{w.company}</b></div>
        {[["icon-bar-chart-2", "Overview"], ["icon-list", "Courses"], ["icon-calendar", "Cohorts"], ["icon-person-2", "Learners"], ["icon-online-learning", "Learning"], ["icon-global-search", "Marketplace"]].map(([ic, n], i) => (
          <div key={n} className={`ad-dash__nav${i === 0 ? " is-active" : ""}`}><i className={ic}></i>{n}</div>
        ))}
      </aside>
      <div className="ad-dash__main">
        <div className="ad-dash__bar"><b>Provider workspace</b><span>Overview · {w.company}</span></div>
        <div className="ad-dash__kpis">
          {w.stats.map((s) => (
            <div key={s.label} className="ad-dash__kpi"><span>{s.label}</span><b>{s.value}</b><small>{s.note}</small></div>
          ))}
        </div>
        <div className="ad-dash__grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="ad-dash__panel">
            <div className="ad-dash__panelHead"><b>Current delivery</b><a href="#">Manage training</a></div>
            {w.activity.map((r) => (
              <div key={r.course} className="ad-dash__row" style={{ gridTemplateColumns: "1.6fr 1fr auto" }}>
                <div><b>{r.course}</b><span>{r.meta}</span></div>
                <div className="ad-dash__bar2"><span style={{ width: r.status.startsWith("14") ? "88%" : r.status.startsWith("9") ? "75%" : "60%" }}></span></div>
                <span className="ad-dash__muted">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
