import React from "react";
import { Check } from "./Icon";
import { formatPrice } from "@/lib/format";

// Packages, on a provider's own course page only (one provider, so one set of prices): the packages of the price plan on its next
// date (sessions come soonest first), so packages of different plans are never mixed in one row; each card's price is that package's
// lowest on the dates using the same plan, "From". Learning options' cards (.rt-lc): badge, name, tagline, its included features
// (the other courses a package includes aren't listed again: its name says them). A shared course page lists several providers'
// dates, so it has no such section: each date says how many packages it has, and its Book now shows them (PackageChooser.jsx).
// Only to look at: a package is chosen when a date is booked.
export function packagesOf(sessions) {
  const key = (s) => `${s.courseId}:${s.packages.map((p) => p.key).join("|")}`;
  const first = sessions.find((s) => s.packages?.length);
  if (!first) return [];
  const id = key(first);
  let list = first.packages;
  for (const s of sessions) if (s !== first && s.packages?.length && key(s) === id) list = list.map((p, i) => (s.packages[i].price < p.price ? { ...p, price: s.packages[i].price } : p));
  return list.map((p) => ({ ...p, id: `${id}:${p.key}` }));
}

export default function PackagesSection({ course }) {
  if (course.kind === "shared") return null;
  const list = packagesOf(course.sessions);
  if (!list.length) return null;
  return (
    <section className="rt-cd__sec rt-lo" id="packages" aria-labelledby="rt-cd-pkg-h">
      <h2 id="rt-cd-pkg-h">Packages</h2>
      <p className="rt-cd__lead">Choose your package when you book a date. Prices vary by date.</p>
      <ul className={`rt-lc -n${Math.min(4, list.length)} rt-cg__pkgs`}>
        {list.map((p) => (
          <li key={p.id} className="rt-lc__card rt-cg__pkg">
            <span className="rt-lc__top">{p.popular && <span className="rt-pill -accent">Most popular</span>}</span>
            <div>
              <h3 className="rt-lc__name">{p.name}</h3>
              {p.tagline && <p className="rt-cg__pkg-text">{p.tagline}</p>}
            </div>
            <div>
              <ul className="rt-lc__list">
                {(p.features || []).filter((f) => f.included).map((f) => <li key={f.title}><Check /> <span>{f.title}{f.value && <>: <strong>{f.value}</strong></>}</span></li>)}
              </ul>
            </div>
            <span className="rt-lc__price">
              <span>From</span> <strong>{formatPrice(p.price)}</strong>
              {p.wasPrice > p.price && <s className="rt-cg__pkg-was">{formatPrice(p.wasPrice)}</s>}
            </span>
          </li>
        ))}
      </ul>
      <p className="rt-cd__lead rt-cg__note">All prices include VAT.</p>
    </section>
  );
}
