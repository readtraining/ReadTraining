import { provider } from "@/data/provider";
import { Chip, Eyebrow, Ticks } from "@/components/marketing/parts";

export default function ProMarketplace() {
  const m = provider.marketplace; const k = m.card;
  return (
    <section className="fb-section -dark">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow dark>{m.eyebrow}</Eyebrow>
            <h2 className="fb-title -onDark">{m.title}</h2>
            <p className="fb-lede -onDark">{m.text}</p>
            <Ticks items={m.points} dark />
          </div>

          <div className="fb-credit">
            <div className="fb-credit__head">
              <div><span className="fb-credit__label">{k.label}</span><b>{k.course}</b></div>
              <Chip>{k.status}</Chip>
            </div>
            <p className="fb-credit__text">{k.text}</p>
            <ul className="fb-darkRows">
              {k.dates.map((r) => (
                <li key={r.date}>
                  <div><b>{r.date}</b><span>{r.meta}</span></div>
                  <Chip>{r.status}</Chip>
                </li>
              ))}
            </ul>
            <p className="fb-credit__note">{k.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
