"use client";
import { useState } from "react";
import { business } from "@/data/business";
import ProductFrame from "@/components/marketing/ProductFrame";
import ProgressLanes from "@/components/marketing/ProgressLanes";
import { Eyebrow } from "@/components/marketing/parts";

export default function LearnerTable() {
  const p = business.progress;
  const [filter, setFilter] = useState("All");
  const count = (f) => (f === "All" ? p.learners.length : p.learners.filter((l) => l.status === f).length);
  const rows = filter === "All" ? p.learners : p.learners.filter((l) => l.status === filter);

  return (
    <section className="fb-section -white">
      <div className="container">
        <div className="fb-head -row">
          <div>
            <Eyebrow>{p.eyebrow}</Eyebrow>
            <h2 className="fb-title">{p.title}</h2>
            <p className="fb-lede">{p.text}</p>
          </div>
          <div className="fb-filters" role="group" aria-label="Filter learners by status">
            {p.filters.map((f) => (
              <button key={f} type="button" className="fb-filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f} <span>{count(f)}</span>
              </button>
            ))}
          </div>
        </div>

        <ProductFrame title={p.frame} className="fb-lanesFrame">
          <ProgressLanes rows={rows} stages={p.stages} />
        </ProductFrame>
      </div>
    </section>
  );
}
