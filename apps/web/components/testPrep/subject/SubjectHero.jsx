import React from "react";
import Crumbs from "@/components/courseDetail/Crumbs";

// Test prep hero. `crumbs` is [{ label, href? }]; the last one is the current page. Both modes are the theme's flat dark band
// with the course page's breadcrumb style (bold, ">", light text). `label` (the subject's category, e.g. "Security") is the
// site's on-dark eyebrow pill above the title, naming the field as the home page's section labels do.
// Without `top` (the test, result and coming-soon pages): compact, breadcrumb + title, so the questions start near the top.
export default function SubjectHero({ crumbs, title, lead, label = "", top = false, visual = null, children = null }) {
  // `top` (the subject page): a full-width dark band with the breadcrumb, the category label, the title, the intro and the
  // page's two actions (children), left aligned on a readable column. The key facts strip overlaps its lower edge. `visual`
  // (optional, e.g. the CSCS cards) sits beside the text from 992px, under it below.
  if (top) {
    return (
      <section className="rt-tps__top" aria-labelledby="rt-tps-title">
        {/* the home hero artwork, as on the hub's hero (.rt-cat__hero-bg) */}
        <div className="rt-cat__hero-bg" aria-hidden="true" style={{ backgroundImage: "url(/assets/img/home-1/hero/bg.png)" }}></div>
        <div className="container">
          <div className={visual ? "rt-tps__top-grid" : undefined}>
            <div className="rt-tps__top-in">
              <Crumbs crumbs={crumbs} className="rt-tps__flat-crumbs" />
              {label && <div className="rt-eyebrow rt-eyebrow--pill -onDark"><span className="rt-eyebrow__dot"></span>{label}</div>}
              <h1 className="rt-tps__top-title" id="rt-tps-title">{title}</h1>
              {lead && <p className="rt-tps__top-lead">{lead}</p>}
              {children}
            </div>
            {visual && <div className="rt-tps__top-visual">{visual}</div>}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="rt-tps__flat" aria-labelledby="rt-tps-title">
      <div className="container">
        <Crumbs crumbs={crumbs} className="rt-tps__flat-crumbs" />
        <h1 className="rt-tps__flat-title" id="rt-tps-title">{title}</h1>
      </div>
    </section>
  );
}
