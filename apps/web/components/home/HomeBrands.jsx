import React from "react";
import Image from "next/image";
import { employerLogos } from "@/data/home";

// Trust strip (warp.dev pattern): tiny muted label, logos at 60% greyscale that wake on hover
// with a small chip, soft edge mask, 38s loop, pauses on hover.
export default function HomeBrands() {
  const Copy = ({ hidden }) => (
    <div className="rt-logos__copy" aria-hidden={hidden || undefined}>
      {employerLogos.map((l) => (
        <span key={l.name} className="rt-logos__item" title={l.name}>
          <Image src={l.src} alt={hidden ? "" : l.name} width={160} height={40} className="rt-logos__img" style={{ height: l.h || 20 }} loading="eager" unoptimized />
          
        </span>
      ))}
    </div>
  );
  return (
    <section className="rt-logos">
      <div className="container">
        <div className="rt-logos__head">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>Trusted by employers</div>
          <h2 className="rt-logos__title">Teams across the UK book their training here</h2>
          <p className="rt-logos__text">From a single learner to whole workforces, employers use ReadTraining to keep staff qualified, compliant and ready for work.</p>
        </div>
        <div className="rt-logos__marquee">
          <div className="rt-logos__track">
            <Copy />
            <Copy hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
