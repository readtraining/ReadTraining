import React from "react";
import Image from "next/image";
import ProviderLogo from "./ProviderLogo";
import NameList from "./NameList";
import { IconCheck } from "@/components/marketing/parts";

// "About {provider}": the about text and the approved badge on the left; on the right the provider's mark and a details list
// (where it is based, how it delivers, what it teaches, the cities it runs venues in), all worked out from its courses, in the
// framed card (.fb-frame, as About's story) under a cover photo.
export default function ProviderAbout({ provider: p, copy }) {
  const rows = [
    p.city && { label: "Based in", value: [p.city] },
    p.modes.length > 0 && { label: "Delivery", value: p.modes },
    p.subjects.length > 0 && { label: "Subjects", value: p.subjects },
    p.cities.length > 0 && { label: "Venue cities", value: p.cities },
  ].filter(Boolean);
  return (
    <section className="fb-section -white" aria-labelledby="rt-prov-about-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{copy.eyebrow}</div>
            <h2 className="fb-title" id="rt-prov-about-h">{copy.title}</h2>
            <p className="fb-lede">{p.about}</p>
            <p className="rt-pabout__badge"><span className="fb-chip -ok"><IconCheck />{copy.badge}</span></p>
          </div>
          <div className="fb-frame">
            {p.imageSrc && <div className="rt-pabout__cover"><Image width={640} height={300} src={p.imageSrc} alt="" /></div>}
            <div className="fb-frame__body rt-pabout__card">
              <div className="rt-pabout__head">
                <ProviderLogo initials={p.initials} logoUrl={p.logoUrl} large />
                <div>
                  <span className="bz-card__label">{copy.detailsLabel}</span>
                  <b className="rt-pabout__name">{p.name}</b>
                </div>
              </div>
              <dl className="rt-pabout__rows">
                {rows.map((r) => (
                  <div key={r.label}><dt>{r.label}</dt><dd><NameList items={r.value} /></dd></div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
