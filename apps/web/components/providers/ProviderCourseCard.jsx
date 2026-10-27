import React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/courses";

// A course on a provider's page (home's course card, .rt-ucard): the image, the title, the duration, the ways it runs with this
// provider and the lowest price among its dates. The card links to the course page, where the dates are chosen.
export default function ProviderCourseCard({ course: c, as: H = "h3" }) {
  return (
    <Link href={c.href} className="rt-ucard">
      <div className="rt-ucard__image">
        {c.imageSrc ? <Image width={500} height={300} src={c.imageSrc} alt="" /> : <span className="rt-ucard__noimg" aria-hidden="true"></span>}
      </div>
      <H className="rt-ucard__title">{c.title}</H>
      <p className="rt-ucard__meta">{c.duration}</p>
      <div className="rt-ucard__pills">
        {c.modes.map((m) => <span key={m} className="rt-pill">{m}</span>)}
      </div>
      <div className="rt-ucard__price">
        {c.price == null ? (
          <span className="rt-ucard__from">New dates coming soon</span>
        ) : (
          <>
            <span className="rt-ucard__from">From</span> {formatPrice(c.price)}
            {c.wasPrice && <s><span className="rt-sr">Was </span>{formatPrice(c.wasPrice)}</s>}
          </>
        )}
      </div>
    </Link>
  );
}
