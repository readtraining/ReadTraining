import React from "react";
import Image from "next/image";
import Link from "next/link";
import ProviderLogo from "./ProviderLogo";
import NameList from "./NameList";

// A provider in the directory (home's course card, .rt-ucard): a cover photo with the provider's mark overlapping its lower
// edge, the name, where it is based and how many courses it runs, the subjects it teaches and a "View provider" link. The
// whole card is the link, to the provider's page. `as` is the name's heading level where the card sits.
export default function ProviderCard({ provider: p, as: H = "h2" }) {
  return (
    <Link href={p.href} className="rt-ucard rt-pcard">
      <div className="rt-ucard__image rt-pcard__cover">
        {p.imageSrc ? <Image width={500} height={300} src={p.imageSrc} alt="" /> : <span className="rt-pcard__band" aria-hidden="true"></span>}
      </div>
      <div className="rt-pcard__body">
        <ProviderLogo initials={p.initials} logoUrl={p.logoUrl} />
        <H className="rt-ucard__title rt-pcard__name">{p.name}</H>
        <p className="rt-ucard__meta rt-pcard__meta">
          {[p.city, `${p.courseCount} ${p.courseCount === 1 ? "course" : "courses"}`].filter(Boolean).join(" · ")}
        </p>
        {p.subjects.length > 0 ? <p className="rt-pcard__subjects"><NameList items={p.subjects.slice(0, 3)} /></p> : p.headline ? <p className="rt-pcard__subjects">{p.headline}</p> : null}
        <span className="fb-textlink rt-pcard__link">View provider<i className="icon-arrow-right text-12" aria-hidden="true"></i></span>
      </div>
    </Link>
  );
}
