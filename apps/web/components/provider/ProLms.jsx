import { provider } from "@/data/provider";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Eyebrow, Ticks } from "@/components/marketing/parts";

export default function ProLms() {
  const l = provider.lms; const k = l.card; const p = k.progress;
  return (
    <section className="fb-section -white">
      <div className="container">
        <div className="fb-split -reverse">
          <div>
            <Eyebrow>{l.eyebrow}</Eyebrow>
            <h2 className="fb-title">{l.title}</h2>
            <p className="fb-lede">{l.text}</p>
            <Ticks items={l.points} />
          </div>

          <ProductFrame title={k.frame}>
            <div className="fb-module">{k.module}</div>
            <ol className="fb-acts">
              {k.activities.map((a, i) => (
                <li key={a.title} className="fb-acts__row">
                  <span className="fb-acts__n" aria-hidden="true">{i + 1}</span>
                  <b>{a.title}</b>
                  <span className="fb-chip -muted">{a.type}</span>
                </li>
              ))}
            </ol>
            <div className="fb-stack">
              <div className="fb-stack__top"><b>{p.label}</b><span>{p.learners} · {p.avg}% average</span></div>
              <div className="fb-bar -lg" role="img" aria-label={`Average learner progress ${p.avg}%`}><span style={{ width: `${p.avg}%` }}></span></div>
            </div>
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
