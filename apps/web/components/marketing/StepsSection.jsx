import { Fragment } from "react";
import Image from "next/image";
import { Eyebrow } from "./parts";

/* Four-step row (template StepsOne icons + badges, .bz-stepsRow layout) shared by /for-business and /for-providers.
   The text block is wider than the step column so each description sits on two lines. */
export default function StepsSection({ workflow: w, tone = "white" }) {
  return (
    <section className={`fb-section -${tone}`}>
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{w.eyebrow}</Eyebrow>
          <h2 className="fb-title">{w.title}</h2>
          <p className="fb-lede">{w.text}</p>
        </div>
        <ol className="bz-stepsRow fb-steps">
          {w.steps.map((s, i) => (
            <Fragment key={s.title}>
              <li className="bz-stepsRow__item">
                <div className="d-flex flex-column items-center text-center">
                  <div className={`relative size-120 d-flex justify-center items-center rounded-full ${tone === "white" ? "bg-light-4" : "bg-white"}`}>
                    <i className={`${s.icon} text-40 text-purple-1`} aria-hidden="true"></i>
                    <div className="side-badge">
                      <div className="size-35 d-flex justify-center items-center rounded-full bg-dark-1">
                        <span className="text-14 fw-500 text-white">0{i + 1}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="fb-stepper__title">{s.title}</h3>
                  <p className="fb-stepper__text">{s.text}</p>
                </div>
              </li>
              {i < w.steps.length - 1 && (
                <li className="bz-stepsRow__line xl:d-none" aria-hidden="true">
                  <Image width={142} height={21} src={`/assets/img/misc/lines/${(i % 2) + 1}.svg`} alt="" />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
}
