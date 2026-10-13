"use client";

import React, { useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Eyebrow } from "@/components/marketing/parts";
import CscsCardArt from "./CscsCardArt";
import { RequestButton, useLicenceRequest } from "./LicenceRequest";

// "All CSCS cards" (#all-cards), on the page tint: colour filter chips (.rt-tr__filter, each with its count), then one tile per
// CSCS card, grouped by colour: the drawn card on the left; on the right the name, how long it lasts, who it is for, and two
// actions, "Details" (the site's pop-up with what you need and the test) and "Apply for me" (the request pop-up, card chosen).
export default function CscsCards({ copy: c, labels, cards, service }) {
  const [colour, setColour] = useState("all");
  const [view, setView] = useState(null);
  const { open } = useLicenceRequest();
  // grouped by colour, in the order of the chips (green, red, blue, gold, black, white)
  const order = c.colours.map((k) => k.key);
  const sorted = [...cards].sort((a, b) => order.indexOf(a.colour) - order.indexOf(b.colour));
  const shown = colour === "all" ? sorted : sorted.filter((x) => x.colour === colour);
  const viewing = view && cards.find((x) => x.key === view);
  const chips = [{ key: "all", label: c.all, count: cards.length }, ...c.colours.map((k) => ({ ...k, count: cards.filter((x) => x.colour === k.key).length }))];

  return (
    <section className="fb-section -lavender rt-lic__anchor" id="all-cards" aria-labelledby="rt-cscs-all-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-cscs-all-h">{c.title}</h2>
          <p className="fb-lede">{c.text}</p>
        </div>
        <div className="rt-lic__filters" role="group" aria-label={c.filterLabel}>
          {chips.map((k) => (
            <button key={k.key} type="button" className={`rt-tr__filter${colour === k.key ? " is-on" : ""}`} aria-pressed={colour === k.key} onClick={() => setColour(k.key)}>
              {k.key !== "all" && <span className={`rt-cscs-dot -${k.key}`} aria-hidden="true"></span>}
              {k.label} <span className="rt-lic__count">{k.count}</span>
            </button>
          ))}
        </div>

        <ul className="rt-cscs-grid">
          {shown.map((x) => (
            <li key={x.key} className="rt-cscs-tile">
              <CscsCardArt card={x} size="sm" />
              <div className="rt-cscs-tile__body">
                <h3>{x.name}</h3>
                <span className="rt-cscs-tile__valid"><i className="icon-calendar text-12" aria-hidden="true"></i>{x.validity}</span>
                <p>{x.who}</p>
                <div className="rt-cscs-tile__actions">
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setView(x.key)} aria-label={`Details: ${x.name}`}>{c.details}</button>
                  <RequestButton preset={{ type: x.name }} className="button -sm -purple-1 text-white">{service.cta}</RequestButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="rt-lic__cardnote">{c.note}</p>
      </div>

      <Sheet open={Boolean(viewing)} onClose={() => setView(null)} title={viewing ? viewing.name : ""} closeLabel="Close" className="rt-lic__sheet">
        {viewing && (
          <div className="rt-lic__cardsheet">
            <CscsCardArt card={viewing} size="md" />
            <dl className="rt-lic__carddl">
              <div><dt>{labels.who}</dt><dd>{viewing.who}</dd></div>
              <div><dt>{labels.need}</dt><dd>{viewing.need}</dd></div>
              <div><dt>{labels.test}</dt><dd>{viewing.test}</dd></div>
              <div><dt>{labels.validity}</dt><dd>{viewing.validity}</dd></div>
            </dl>
            {/* the details close first, so only one pop-up is ever open */}
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => { setView(null); open({ type: viewing.name }); }}>{`${service.cta} · ${service.price}`}</button>
          </div>
        )}
      </Sheet>
    </section>
  );
}
