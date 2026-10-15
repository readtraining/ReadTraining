"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eyebrow } from "@/components/marketing/parts";
import LicenceTiles from "./LicenceTiles";

// The hub's "Find your licence or card" (#all): the centred head, the industry filter chips (.rt-tr__filter, "All" first, each
// with its count) and the licence tiles for the chosen industry. ?industry=<key> (the menu's Security group) starts on that
// industry, also when the menu is used on this page; the chips keep the choice in the address.
export function LicenceHubGridFromUrl(props) {
  const key = useSearchParams().get("industry");
  const initial = props.groups.some((g) => g.key === key) ? key : "all";
  return <LicenceHubGrid key={initial} initial={initial} {...props} />;
}

export default function LicenceHubGrid({ copy, groups, licences, tileLabel, initial = "all" }) {
  const [group, setGroup] = useState(initial);
  const choose = (key) => {
    setGroup(key);
    const url = new URL(window.location.href);
    if (key === "all") url.searchParams.delete("industry");
    else url.searchParams.set("industry", key);
    window.history.replaceState(null, "", url);
  };
  const shown = group === "all" ? licences : licences.filter((l) => l.group === group);
  const chips = [{ key: "all", label: copy.all, count: licences.length }, ...groups.map((g) => ({ ...g, count: licences.filter((l) => l.group === g.key).length }))];
  return (
    <section className="fb-section -white rt-lic__anchor" id="all" aria-labelledby="rt-lic-all-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-lic-all-h">{copy.title}</h2>
          <p className="fb-lede">{copy.text}</p>
        </div>
        <div className="rt-lic__filters" role="group" aria-label={copy.filterLabel}>
          {chips.map((c) => (
            <button key={c.key} type="button" className={`rt-tr__filter${group === c.key ? " is-on" : ""}`} aria-pressed={group === c.key} onClick={() => choose(c.key)}>
              {c.label} <span className="rt-lic__count">{c.count}</span>
            </button>
          ))}
        </div>
        <LicenceTiles items={shown} label={tileLabel} className="rt-lic__hubtiles" />
      </div>
    </section>
  );
}
