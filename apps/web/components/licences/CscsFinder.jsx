"use client";

import React, { useRef, useState } from "react";
import { Eyebrow } from "@/components/marketing/parts";
import CscsCardArt from "./CscsCardArt";
import { RequestButton } from "./LicenceRequest";

// "Which CSCS card do I need?" (#cards): a two-step guided finder in one framed panel. Left: step 1, your role on site (six
// tiles with icons); then, for roles with more than one card, step 2, your qualification (a list of choices). Right: a live
// preview, the drawn card (CscsCardArt) that takes the answer's colour and level, with who it is for, what you need, the test and
// how long it lasts, and "Apply for me" for that card (the page's pop-up, card chosen). "Change" goes back a step. On phones the
// preview sits under the questions and comes into view once a card is found.
export default function CscsFinder({ finder: f, cards, service }) {
  const [roleKey, setRoleKey] = useState(null);
  const [cardKey, setCardKey] = useState(null);
  const resultRef = useRef(null);
  const role = f.roles.find((r) => r.key === roleKey);
  const card = cardKey ? cards.find((c) => c.key === cardKey) : null;

  const reveal = () => {
    if (window.matchMedia("(max-width: 991px)").matches) requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  const chooseRole = (r) => {
    setRoleKey(r.key);
    setCardKey(r.card || null);
    if (r.card) reveal();
  };
  const chooseCard = (key) => {
    setCardKey(key);
    reveal();
  };
  const restart = () => {
    setRoleKey(null);
    setCardKey(null);
  };

  return (
    <section className="fb-section -white rt-lic__anchor" id="cards" aria-labelledby="rt-lic-cards-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-lic-cards-h">{f.title}</h2>
          <p className="fb-lede">{f.text}</p>
        </div>

        <div className="rt-cscs-finder">
          <div className="rt-cscs-finder__q">
            <ol className="rt-cscs-finder__steps" aria-label={f.progressLabel}>
              <li className={roleKey ? "is-done" : "is-current"} aria-current={roleKey ? undefined : "step"}><span>1</span>{f.step1}</li>
              <li className={role && !role.card ? (cardKey ? "is-done" : "is-current") : ""} aria-current={role && !role.card && !cardKey ? "step" : undefined}><span>2</span>{f.step2}</li>
            </ol>

            {!role ? (
              <fieldset className="rt-cscs-finder__fs">
                <legend className="rt-cscs-finder__legend">{f.roleQuestion}</legend>
                <div className="rt-cscs-roles">
                  {f.roles.map((r) => (
                    <button key={r.key} type="button" className="rt-cscs-role" onClick={() => chooseRole(r)}>
                      <span className="rt-cscs-role__icon" aria-hidden="true"><i className={`${r.icon} text-18`}></i></span>
                      <span className="rt-cscs-role__text"><b>{r.label}</b><span>{r.text}</span></span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div className="rt-cscs-finder__step2">
                <div className="rt-cscs-finder__chosen">
                  <span className="rt-cscs-role__icon" aria-hidden="true"><i className={`${role.icon} text-18`}></i></span>
                  <span><small>{f.yourRole}</small><b>{role.label}</b></span>
                  <button type="button" className="rt-cd__link" onClick={restart}>{f.change}</button>
                </div>
                {role.options ? (
                  <fieldset className="rt-cscs-finder__fs">
                    <legend className="rt-cscs-finder__legend">{role.question}</legend>
                    <div className="rt-cscs-opts">
                      {role.options.map((o) => (
                        <button key={o.label} type="button" className={`rt-cscs-opt${cardKey === o.card ? " is-on" : ""}`} aria-pressed={cardKey === o.card} onClick={() => chooseCard(o.card)}>
                          <span className="rt-cscs-opt__radio" aria-hidden="true"></span>
                          <span>{o.label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className="rt-cscs-finder__one">{f.oneCard}</p>
                )}
              </div>
            )}
          </div>

          <div className={`rt-cscs-finder__result${card ? " is-on" : ""}`} ref={resultRef} aria-live="polite">
            <CscsCardArt card={card} size="lg" />
            {card ? (
              <div className="rt-cscs-finder__card">
                <span className="rt-cscs-finder__label">{f.resultLabel}</span>
                <h3>{card.name}</h3>
                <dl className="rt-lic__carddl">
                  <div><dt>{f.labels.who}</dt><dd>{card.who}</dd></div>
                  <div><dt>{f.labels.need}</dt><dd>{card.need}</dd></div>
                  <div><dt>{f.labels.test}</dt><dd>{card.test}</dd></div>
                  <div><dt>{f.labels.validity}</dt><dd>{card.validity}</dd></div>
                </dl>
                <RequestButton preset={{ type: card.name }} className="button -md -purple-1 text-white rt-btn-block">{`${service.cta} · ${service.price}`}</RequestButton>
                <button type="button" className="rt-cd__link rt-cscs-finder__again" onClick={restart}>{f.again}</button>
              </div>
            ) : (
              <p className="rt-cscs-finder__pending">{role ? f.pendingStep2 : f.pending}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
