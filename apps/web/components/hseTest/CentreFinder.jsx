"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { hseTest } from "@/data/hseTest";
import { BookTestButton } from "./TestBooking";
import { allCentres, centreName, locate, matchText, nearestTo, PROVIDER } from "@/lib/testCentreSearch";
import { TEST_CENTRES_HREF, testCentreHref } from "@/lib/routes";
import { EmptyState } from "@/components/states/States";

const d = hseTest.directory;

// One centre as a card: town, centre name and provider, address, distance when searched, then "View centre" and "Book a test here".
export function CentreCard({ c, as: H = "h3" }) {
  return (
    <li className="rt-tc__card">
      <div className="rt-tc__top">
        <H className="rt-tc__town"><Link href={testCentreHref(c.slug)}>{c.town}</Link></H>
        {c.miles !== undefined && <span className="rt-tc__miles">{d.km.replace("{d}", c.miles < 1 ? "<1" : Math.round(c.miles))}</span>}
      </div>
      <p className="rt-tc__name">{centreName(c)} · {PROVIDER}</p>
      <address className="rt-tc__addr">{c.address.join(", ")}<br />{c.postcode}</address>
      <div className="rt-tc__actions">
        <BookTestButton centre={c.slug} className="button -sm -purple-1 text-white">{d.book}<span className="rt-sr"> in {c.town}</span></BookTestButton>
        <Link href={testCentreHref(c.slug)} className="button -sm -outline-purple-1 text-purple-1">{d.view}<span className="rt-sr">: {c.town}</span></Link>
      </div>
    </li>
  );
}

// The postcode / town search and the centre list. Searching finds the place with postcodes.io and sorts the centres by distance;
// if the lookup fails it falls back to centres whose town or postcode matches the words. `limit` shows only the first few (the test
// page), with a link to the full directory; without it every centre shows (the directory).
export default function CentreFinder({ limit, headingLevel = "h3" }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState({ list: allCentres(), label: "", fallback: false });
  const [busy, setBusy] = useState(false);

  const run = async (query) => {
    if (!query) return setState({ list: allCentres(), label: "", fallback: false });
    setBusy(true);
    const point = await locate(query);
    setBusy(false);
    if (point) setState({ list: nearestTo(point), label: point.label || query, fallback: false });
    else setState({ list: matchText(query), label: "", fallback: true });
  };
  const search = (e) => {
    e.preventDefault();
    run(q.trim());
  };
  // a town from the Locations menu arrives as ?q=Bradford: search for it straight away
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) {
      setQ(initial);
      run(initial.trim());
    }
  }, []);

  const shown = limit ? state.list.slice(0, limit) : state.list;
  return (
    <div className="rt-tc">
      <form className="rt-tc__search" onSubmit={search} noValidate role="search">
        <label htmlFor="rt-tc-q" className="rt-tc__label">{d.searchLabel}</label>
        <div className="rt-tc__row">
          <input id="rt-tc-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.searchPlaceholder} autoComplete="postal-code" />
          <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy}>
            <i className="icon-search text-14 mr-10" aria-hidden="true"></i>{busy ? "Searching…" : d.search}
          </button>
        </div>
      </form>

      <p className="rt-tc__status" role="status" aria-live="polite">
        {state.fallback ? d.lookupFailed : state.label ? d.near.replace("{q}", state.label) : d.count.replace("{n}", state.list.length)}
      </p>

      {shown.length ? (
        <ul className="rt-tc__grid">
          {shown.map((c) => <CentreCard key={c.slug} c={c} as={headingLevel} />)}
        </ul>
      ) : (
        <EmptyState inCard title={d.none.title} text={d.none.text} />
      )}

      {limit && (
        <div className="rt-lic__more">
          <Link href={TEST_CENTRES_HREF} className="button -md -outline-purple-1 text-purple-1">{hseTest.centres.all}</Link>
        </div>
      )}
    </div>
  );
}
