import { business } from "@/data/business";
import { Chip, CtaLink, Eyebrow } from "@/components/marketing/parts";

const R = 70; const C = 2 * Math.PI * R;
const gbp = (n) => `£${n.toLocaleString("en-GB")}`;

export default function CreditPanel() {
  const c = business.credit; const k = c.card;
  const share = k.available / k.limit;
  return (
    <section className="fb-section -dark">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow dark>{c.eyebrow}</Eyebrow>
            <h2 className="fb-title -onDark">{c.title}</h2>
            <p className="fb-lede -onDark">{c.text}</p>
            <ol className="fb-numbered">
              {c.points.map((o, i) => (
                <li key={o.title}>
                  <span className="fb-numbered__n" aria-hidden="true">{i + 1}</span>
                  <div><b>{o.title}</b><span>{o.text}</span></div>
                </li>
              ))}
            </ol>
            <div className="fb-actions"><CtaLink link={c.cta} variant="mint" /></div>
          </div>

          <div className="fb-credit">
            <div className="fb-credit__head">
              <div><span className="fb-credit__label">{k.label}</span><b>{k.company}</b></div>
              <Chip>{k.status}</Chip>
            </div>
            <div className="fb-credit__body">
              <div className="fb-ring">
                <svg viewBox="0 0 180 180" width="180" height="180" aria-hidden="true">
                  <circle cx="90" cy="90" r={R} className="fb-ring__track" />
                  <circle cx="90" cy="90" r={R} className="fb-ring__value" strokeDasharray={`${C * share} ${C}`} transform="rotate(-90 90 90)" />
                </svg>
                <div className="fb-ring__label"><b>{gbp(k.available)}</b><span>available of {gbp(k.limit)}</span></div>
              </div>
              <dl className="fb-credit__rows">
                <div><dt>Used</dt><dd>{gbp(k.used)}</dd></div>
                <div><dt>Next invoice</dt><dd>{k.due.amount} · {k.due.date}</dd></div>
                {k.purchases.map((p) => <div key={p.label} className="-sm"><dt>{p.label}</dt><dd>{p.amount}</dd></div>)}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
