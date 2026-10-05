"use client";
import { useState } from "react";
import { business } from "@/data/business";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Avatar, Chip, CtaLink, Eyebrow, IconArrow, Ticks } from "@/components/marketing/parts";

export default function AssignDemo() {
  const l = business.licences; const c = l.counts;
  const [mode, setMode] = useState(l.modes[0].id);
  const assignedPct = ((c.assigned / c.purchased) * 100).toFixed(1);
  const unassignedPct = ((c.unassigned / c.purchased) * 100).toFixed(1);

  return (
    <section className="fb-section -lavender">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{l.eyebrow}</Eyebrow>
            <h2 className="fb-title">{l.title}</h2>
            <p className="fb-lede">{l.text}</p>
            <Ticks items={l.points} />
            <div className="fb-actions"><CtaLink link={l.cta} /></div>
          </div>

          <ProductFrame title={l.course}>
            <div className="fb-seg" role="group" aria-label="Choose how to use purchased places">
              {l.modes.map((m) => (
                <button key={m.id} type="button" className="fb-seg__btn" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
              ))}
            </div>

            <ul className="fb-list" aria-live="polite">
              {mode === "assign"
                ? l.learners.map((p) => (
                    <li key={p.email} className="fb-list__row">
                      <Avatar name={p.name} />
                      <div className="fb-list__main"><b>{p.name}</b><span>{p.email}</span></div>
                      <Chip>{p.status}</Chip>
                    </li>
                  ))
                : l.held.map((h) => (
                    <li key={h} className="fb-list__row">
                      <Avatar ghost />
                      <div className="fb-list__main"><b>{h}</b><span>{l.course}</span></div>
                      <Chip>On hold</Chip>
                    </li>
                  ))}
            </ul>

            <div className="fb-list__foot">
              {mode === "assign" ? (
                <>
                  <span>{l.assignedMore}</span>
                  <a href={l.viewAll.href} className="fb-textlink">{l.viewAll.label} <IconArrow /></a>
                </>
              ) : (
                <>
                  <span>{l.heldMore}</span>
                  <button type="button" className="button -sm -green-1 text-dark-1 fb-btn -sm">{l.heldAction}</button>
                </>
              )}
            </div>

            <div className="fb-stack">
              <div className="fb-stack__top"><b>{c.purchased} places purchased</b><span>{c.assigned} assigned · {c.unassigned} unassigned</span></div>
              <div className="fb-stack__bar" role="img" aria-label={`${c.assigned} of ${c.purchased} places assigned, ${c.unassigned} unassigned`}>
                <span className="-assigned" style={{ width: `${assignedPct}%` }}></span>
                <span className="-free" style={{ width: `${unassignedPct}%` }}></span>
              </div>
            </div>
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
