import { provider } from "@/data/provider";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Chip, Eyebrow, IconMail, Ticks } from "@/components/marketing/parts";

export default function ProCampaigns() {
  const c = provider.campaigns; const k = c.card; const e = k.preview;
  return (
    <section className="fb-section -lavender">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="fb-title">{c.title}</h2>
            <p className="fb-lede">{c.text}</p>
            <Ticks items={c.points} />
          </div>

          <ProductFrame title={k.frame}>
            <ul className="fb-list -flush">
              {k.rows.map((r) => (
                <li key={r.name} className="fb-list__row">
                  <span className="fb-avatar" aria-hidden="true"><IconMail /></span>
                  <div className="fb-list__main"><b>{r.name}</b><span>{r.meta}</span></div>
                  <Chip>{r.status}</Chip>
                </li>
              ))}
            </ul>
            <div className="fb-email">
              <span className="fb-email__label">{e.label}</span>
              <b>{e.subject}</b>
              <p>{e.text}</p>
              <div className="fb-email__foot">
                <span>{e.audience}</span>
                <button type="button" className="button -sm -dark-1 text-white fb-btn -sm">{e.action}</button>
              </div>
            </div>
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
