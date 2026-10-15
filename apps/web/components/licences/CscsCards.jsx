"use client";

import React, { useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Eyebrow } from "@/components/marketing/parts";
import CscsCardArt from "./CscsCardArt";
import { RequestButton, useLicenceRequest } from "./LicenceRequest";

// "All CSCS cards" (#all-cards), on the page tint: colour filter tiles (the test-prep category tiles, .rt-tpcat, each with its
// count), then one flat grid of the 13 cards, grouped by colour (4 a row from 1200px, 3 from 992px, 2 from 576px, 1 on phones;
// a short last row starts on the left). Each tile is an <article>: the drawn card on a tint of its colour, the name (a button that opens
// Details, stretched over the whole tile), the validity pill, "Not renewable" / "Re-apply when it ends", who it is for, then a
// footer with the CSCS fee, "Details" and "Apply" (the request pop-up with the card chosen; it sits above the stretched name, so
// it never opens Details). The Labourer card carries a "Most popular" badge.
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
        <div className="rt-tpcats rt-cscs-cats" role="group" aria-label={c.filterLabel}>
          {chips.map((k) => (
            <button key={k.key} type="button" className={`rt-tpcat${colour === k.key ? " is-active" : ""}`} aria-pressed={colour === k.key} onClick={() => setColour(k.key)}>
              <span className="rt-benefit__icon" aria-hidden="true">
                {k.key === "all" ? <i className="icon-badge text-16"></i> : <span className={`rt-cscs-dot -${k.key}`}></span>}
              </span>
              <span className="rt-tpcat__text">
                <span className="rt-tpcat__name">{k.label}</span>
                <span className="rt-tpcat__count">{`${k.count} ${k.count === 1 ? "card" : "cards"}`}</span>
              </span>
            </button>
          ))}
        </div>

        <ul className="rt-cscs-grid">
          {shown.map((x) => (
            <li key={x.key} className="rt-cscs-grid__item">
              <article className="rt-cscs-tile">
                {x.popular && <span className="rt-pill rt-acc__status -confirmed rt-cscs-tile__badge">{c.popular}</span>}
                <div className={`rt-cscs-tile__art -${x.colour}`}>
                  <CscsCardArt card={x} size="sm" />
                </div>
                <div className="rt-cscs-tile__body">
                  <h3 className="rt-cscs-tile__title">
                    <button type="button" aria-haspopup="dialog" onClick={() => setView(x.key)}>{x.name}</button>
                  </h3>
                  <div className="rt-cscs-tile__pills">
                    <span className="rt-pill"><i className="icon-calendar text-12" aria-hidden="true"></i>{x.term}</span>
                    {x.renewable === false && <span className="rt-pill rt-acc__status -requested">{c.notRenewable}</span>}
                    {x.reapply && <span className="rt-pill rt-acc__status -requested">{c.reapply}</span>}
                  </div>
                  <p className="rt-cscs-tile__desc">{x.who}</p>
                  <div className="rt-cscs-tile__foot">
                    <b className={`rt-cscs-tile__price${x.price === "Free" ? " -free" : ""}`}>{x.price}</b>
                    <button type="button" className="button -sm rt-cscs-tile__details" aria-haspopup="dialog" onClick={() => setView(x.key)}>{c.details}<span className="rt-sr">: {x.name}</span></button>
                    <RequestButton preset={{ type: x.name }} className="button -sm -purple-1 text-white rt-cscs-tile__apply">{c.apply}<span className="rt-sr"> for the {x.name}</span></RequestButton>
                  </div>
                </div>
              </article>
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
