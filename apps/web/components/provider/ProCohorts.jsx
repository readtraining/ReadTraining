import { provider } from "@/data/provider";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Chip, Eyebrow, Points } from "@/components/marketing/parts";

const seatsPct = (seats) => { const [a, b] = seats.split("/").map((n) => Number(n.trim())); return b ? (a / b) * 100 : 0; };

export default function ProCohorts() {
  const c = provider.cohorts; const k = c.card;
  const total = k.booked + k.left;
  return (
    <section className="fb-section -lavender">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="fb-title">{c.title}</h2>
            <p className="fb-lede">{c.text}</p>
            <Points items={c.options} />
          </div>

          <ProductFrame title={k.frame}>
            <ul className="fb-list">
              {k.rows.map((r) => (
                <li key={r.course} className="fb-list__row">
                  <div className="fb-list__main">
                    <b>{r.course}</b><span>{r.meta}</span>
                    <span className="fb-seats">
                      <span className="fb-bar" aria-hidden="true"><span style={{ width: `${seatsPct(r.seats)}%` }}></span></span>
                      <em>{r.seats} seats</em>
                    </span>
                  </div>
                  <Chip>{r.status}</Chip>
                </li>
              ))}
            </ul>
            <div className="fb-stack">
              <div className="fb-stack__top"><b>{k.cohorts} cohorts this month</b><span>{k.booked} seats booked · {k.left} spaces left</span></div>
              <div className="fb-stack__bar" role="img" aria-label={`${k.booked} of ${total} seats booked, ${k.left} spaces left`}>
                <span className="-assigned" style={{ width: `${((k.booked / total) * 100).toFixed(1)}%` }}></span>
                <span className="-free" style={{ width: `${((k.left / total) * 100).toFixed(1)}%` }}></span>
              </div>
            </div>
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
