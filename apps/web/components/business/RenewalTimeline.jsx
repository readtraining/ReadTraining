import { business } from "@/data/business";
import { Chip, CtaLink, Eyebrow, IconDownload, Ticks } from "@/components/marketing/parts";

export default function RenewalTimeline() {
  const c = business.certificates;
  const rows = [...c.rows].sort((a, b) => a.sort.localeCompare(b.sort));
  return (
    <section className="fb-section -lavender">
      <div className="container">
        <div className="fb-split -reverse">
          <div>
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="fb-title">{c.title}</h2>
            <p className="fb-lede">{c.text}</p>
            <Ticks items={c.points} />
            <div className="fb-actions"><CtaLink link={c.cta} /></div>
          </div>

          <ol className="fb-timeline">
            {rows.map((r) => {
              const due = r.status !== "Valid";
              return (
                <li key={r.name} className={`fb-timeline__item${due ? " -due" : ""}`}>
                  <span className="fb-timeline__dot" aria-hidden="true"></span>
                  <div className="fb-timeline__body">
                    <time className="fb-timeline__date" dateTime={r.sort}>{r.expires}</time>
                    <b>{r.course}</b>
                    <span>{r.name}</span>
                  </div>
                  <Chip>{r.status}</Chip>
                  <button type="button" className="fb-iconBtn" aria-label="Download certificate"><IconDownload /></button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
