import React from "react";

// "Enter the certificate details": what the check shows, as the benefit rows (.rt-benefit), and the privacy rule, beside the
// checker card (`children`) in /for-business's split layout, as the contact page's channels sit beside its form. Once the split
// stacks (below 992px) the card comes straight after the heading, before the points, so the checker is not pushed down the page.
export default function CheckerIntro({ intro: x, children }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-cert-intro-h">
      <div className="container">
        <div className="fb-split rt-contact__split">
          <div className="rt-cert__lead">
            <div>
              <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{x.eyebrow}</div>
              <h2 className="fb-title" id="rt-cert-intro-h">{x.title}</h2>
              <p className="fb-lede">{x.text}</p>
            </div>
            <div className="rt-cert__info">
              <ul className="rt-benefits rt-contact__channels">
                {x.points.map((p) => (
                  <li key={p.title} className="rt-benefit">
                    <span className="rt-benefit__icon" aria-hidden="true"><i className={`${p.icon} text-16`}></i></span>
                    <div>
                      <h3 className="rt-benefit__title">{p.title}</h3>
                      <p className="rt-benefit__text">{p.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="rt-cert__privacy">{x.privacy}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
