"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import SaverBadge from "@/components/skillSaver/SaverBadge";

// Marketplace-style course card: bordered card, image, title, provider line, badge pill and a "from" price (lib/courses.js
// toCourseCard). `href` and `className` (the grid column) can be changed where the card is reused. A course with no dates
// yet says so instead of a price.
export default function HomeCourseCard({ data, href = data.href, className = "col-lg-3 col-md-6" }) {
  return (
    <div className={className}>
      <Link href={href} className="rt-ucard">
        <div className="rt-ucard__image">
          {data.imageSrc ? <Image width={500} height={300} src={data.imageSrc} alt={data.title} /> : <span className="rt-ucard__noimg" aria-hidden="true"></span>}
          {data.skillSaver && <SaverBadge className="-onImage" />}
        </div>

        <div className="rt-ucard__title">{data.title}</div>
        <div className="rt-ucard__meta">
          {[...new Set([`${data.providers} ${data.providers === 1 ? "provider" : "providers"}`, data.duration, data.method.split(" • ").length > 1 ? `${data.method.split(" • ").length} study methods` : data.method])].filter(Boolean).join(" · ")}
        </div>

        {(data.popular || data.badge) && (
          <div className="rt-ucard__pills">
            {data.popular && <span className="rt-pill -accent">Most booked</span>}
            {data.badge && !data.popular && <span className="rt-pill -accent">{data.badge}</span>}
          </div>
        )}

        <div className="rt-ucard__price">
          {data.price == null ? (
            <span className="rt-ucard__from">New dates coming soon</span>
          ) : (
            <>
              <span className="rt-ucard__from">From</span> £{data.price.toFixed(2).replace(/\.00$/, "")}
              {data.wasPrice && <s>£{data.wasPrice}</s>}
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
