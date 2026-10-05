import { provider } from "@/data/provider";
import ProductFrame from "@/components/marketing/ProductFrame";
import ProgressLanes from "@/components/marketing/ProgressLanes";
import { Eyebrow, Ticks } from "@/components/marketing/parts";

export default function ProLearners() {
  const l = provider.learners; const k = l.card;
  return (
    <section className="fb-section -white">
      <div className="container">
        <div className="fb-split -reverse -wideFrame">
          <div>
            <Eyebrow>{l.eyebrow}</Eyebrow>
            <h2 className="fb-title">{l.title}</h2>
            <p className="fb-lede">{l.text}</p>
            <Ticks items={l.points} />
          </div>

          <ProductFrame title={k.frame} className="fb-lanesFrame -compact">
            <ProgressLanes rows={k.rows} stages={k.stages} />
            <div className="fb-frameFoot">
              <div><b>{k.followUp.title}</b><span>{k.followUp.text}</span></div>
              <button type="button" className="button -sm -purple-1 text-white fb-btn -sm">{k.followUp.action}</button>
            </div>
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
