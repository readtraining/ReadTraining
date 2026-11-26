import React from "react";
import Link from "next/link";
import { Check } from "./Icon";
import { formatPrice } from "@/lib/format";
import { includedOf } from "@/lib/packages";

// Packages, on a provider's own course page only (one provider, so one set of prices): the packages of its price plans on the
// course's dates, in the learning options' cards (.rt-lc): badge, name, tagline, the other courses each includes (and first aid,
// linked to their pages), its included features, and its lowest price, "From". A plan on several dates is shown once. A shared course page lists several providers' dates, so it has no such section:
// each date says how many packages it has, and its Book now shows them (PackageChooser.jsx). Only to look at: a package is chosen
// when a date is booked.
export function packagesOf(sessions) {
  const plans = new Map();
  for (const s of sessions) {
    const list = s.packages || [];
    if (!list.length) continue;
    const id = `${s.courseId}:${list.map((p) => p.key).join("|")}`;
    const had = plans.get(id);
    plans.set(id, had ? had.map((p, i) => (list[i].price < p.price ? { ...p, price: list[i].price } : p)) : list);
  }
  return [...plans.entries()].flatMap(([id, list]) => list.map((p) => ({ ...p, id: `${id}:${p.key}` })));
}

const Name = ({ a }) => (a.course?.href ? <Link href={a.course.href} className="rt-cg__inline">{a.name}</Link> : <>{a.name}</>);

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
                {includedOf(p).map((a) => <li key={a.id}><Check /> <span><Name a={a} /></span></li>)}
                {(p.features || []).filter((f) => f.included).map((f) => <li key={f.title}><Check /> <span>{f.title}</span></li>)}
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
