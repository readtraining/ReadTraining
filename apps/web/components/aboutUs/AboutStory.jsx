import React from "react";

// "Our story" (as /for-business's split sections: .fb-split): the story on the left; on the right the booking promises in the
// framed card (.fb-frame) as the ticked points list (.fb-points).
export default function AboutStory({ story }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-about-story-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{story.eyebrow}</div>
            <h2 className="fb-title" id="rt-about-story-h">{story.title}</h2>
            {story.paragraphs.map((p) => <p key={p} className="fb-lede">{p}</p>)}
          </div>
          <div className="fb-frame">
            <div className="fb-frame__body rt-about__promises">
              <h3 className="bz-card__label">{story.promisesLabel}</h3>
              <ul className="fb-points">
                {story.promises.map((p) => (
                  <li key={p.title}>
                    <span className="fb-ticks__icon" aria-hidden="true"><i className="icon-check text-10"></i></span>
                    <div>
                      <b>{p.title}</b>
                      <span>{p.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
