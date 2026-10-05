import { Avatar, IconCheck } from "./parts";

const stageClass = (status) => (/complete/i.test(status) ? "-complete" : /progress/i.test(status) ? "-progress" : "-booked");

/* One track per learner (Booked → In progress → Complete); the marker sits at the learner's percentage.
   A row without pct is treated as not started and shows its note (e.g. a start date) instead. */
export default function ProgressLanes({ rows, stages }) {
  return (
    <>
      <div className="fb-lane -axis" aria-hidden="true">
        <span></span>
        <div className="fb-axis">{stages.map((s) => <span key={s}>{s}</span>)}</div>
        <span></span>
      </div>
      <ul className="fb-lanes" aria-live="polite">
        {rows.map((l) => {
          const pct = l.pct ?? 0;
          return (
            <li key={l.name} className={`fb-lane ${stageClass(l.status)}`}>
              <div className="fb-lane__who">
                <Avatar name={l.name} />
                <div><b>{l.name}</b><span>{l.course}</span></div>
              </div>
              <div className="fb-track" role="img" aria-label={`${l.name}: ${l.status}, ${l.pct === undefined && l.note ? `starts ${l.note}` : `${pct}% complete`}`}>
                <span className="fb-track__tick" style={{ left: "0%" }}></span>
                <span className="fb-track__tick" style={{ left: "50%" }}></span>
                <span className="fb-track__tick" style={{ left: "100%" }}></span>
                <span className="fb-track__fill" style={{ width: `${pct}%` }}></span>
                <span className="fb-track__marker" style={{ left: `${pct}%` }}>{pct === 100 && <IconCheck />}</span>
              </div>
              <div className="fb-lane__pct"><b>{l.pct === undefined && l.note ? l.note : `${pct}%`}</b><span>{l.status}</span></div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
