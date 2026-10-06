"use client";

import React, { useState } from "react";
import { filterGroups, subSubjects } from "@/data/courseCatalogue";
import FilterGroup from "./FilterGroup";
import PriceRange from "./PriceRange";
import { CheckRow } from "./RadioRow";

const SUBJECTS_COLLAPSED = 5;

// Filter groups. Delivery method, Subject and Course level are CHECKBOXES: tick as many as you like, nothing ticked
// means "any". Inside a group a course matches any ticked value (OR); between groups every group must match (AND).
// Price stays a single choice (radios, "Any price" first, plus a custom range).
// Subject: 5 options + "Show N more"; every ticked subject lists its sub-subjects (also checkboxes) right under it.
// counts[key][value] is the live number of courses each option would return with all OTHER groups applied.
export default function CatalogueFilters({ state, counts, onToggle, onPriceChange }) {
  const [showAll, setShowAll] = useState(false);
  const [subjectGroup, methodGroup, levelGroup] = filterGroups;

  // If a ticked subject sits in the hidden part of the list, keep the list expanded.
  const tickedHidden = state.subject.some((v) => subjectGroup.options.findIndex((o) => o.value === v) >= SUBJECTS_COLLAPSED);
  const expanded = showAll || tickedHidden;
  const subjectOptions = expanded ? subjectGroup.options : subjectGroup.options.slice(0, SUBJECTS_COLLAPSED);
  const hiddenCount = subjectGroup.options.length - SUBJECTS_COLLAPSED;

  return (
    <div className="rt-fp__groups">
      <FilterGroup id="rt-fp-method" title="Delivery method">
        <div className="rt-fp__options">
          {methodGroup.options.map((opt) => (
            <CheckRow key={opt.value} name="method" opt={opt} checked={state.method.includes(opt.value)} count={counts?.method?.[opt.value]} onChange={() => onToggle("method", opt.value)} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup id="rt-fp-subject" title="Subject">
        <div className="rt-fp__options">
          {subjectOptions.map((opt) => {
            const subs = state.subject.includes(opt.value) ? subSubjects[opt.value] || [] : [];
            return (
              <React.Fragment key={opt.value}>
                <CheckRow name="subject" opt={opt} checked={state.subject.includes(opt.value)} count={counts?.subject?.[opt.value]} onChange={() => onToggle("subject", opt.value)} />
                {subs.length > 0 && (
                  <div className="rt-fp__nested" role="group" aria-label={`${opt.label} sub-subjects`}>
                    {subs.map((sub) => (
                      <CheckRow key={sub.value} name="sub" opt={sub} checked={state.sub.includes(sub.value)} count={counts?.sub?.[sub.value]} onChange={() => onToggle("sub", sub.value)} />
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <button type="button" className="rt-fp__more" onClick={() => setShowAll((v) => !v)} aria-expanded={expanded} disabled={tickedHidden}>
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      </FilterGroup>

      <FilterGroup id="rt-fp-level" title="Course level">
        <div className="rt-fp__options">
          {levelGroup.options.map((opt) => (
            <CheckRow key={opt.value} name="level" opt={opt} checked={state.level.includes(opt.value)} count={counts?.level?.[opt.value]} onChange={() => onToggle("level", opt.value)} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup id="rt-fp-price" title="Price">
        <PriceRange min={state.min} max={state.max} onChange={onPriceChange} />
      </FilterGroup>
    </div>
  );
}
