"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { isSkillSaverCourse } from "@/lib/skillSaver";
import { courseLink } from "@/data/courseSlugs";

// Marketplace-style course card: bordered card, image, title, provider line,
// badge + rating pills and a "from" price. `href` and `className` (the grid column) can be changed where the card is reused.
export default function HomeCourseCard({ data, href = data.href ?? courseLink(data.id), className = "col-lg-3 col-md-6" }) {
  return (
    <div className={className}>
      <Link href={href} className="rt-ucard">
        <div className="rt-ucard__image">
          <Image width={500} height={300} src={data.imageSrc} alt={data.title} />
          {isSkillSaverCourse(data.id) && <SaverBadge className="-onImage" />}
        </div>

        <div className="rt-ucard__title">{data.title}</div>
        <div className="rt-ucard__meta">
          {data.providers} providers · {data.duration} · {data.method.split(" • ").length > 1 ? `${data.method.split(" • ").length} study methods` : data.method}
        </div>

        <div className="rt-ucard__pills">
          {data.popular && <span className="rt-pill -accent">Most booked</span>}
          <span className="rt-pill">
            <i className="icon-star text-9 text-yellow-1 mr-5"></i>
            {data.rating}
          </span>
          <span className="rt-pill">{data.ratingCount.toLocaleString()} ratings</span>
        </div>

        <div className="rt-ucard__price">
          <span className="rt-ucard__from">From</span> £{data.price.toFixed(2).replace(/\.00$/, "")}
          {data.wasPrice && <s>£{data.wasPrice}</s>}
        </div>
      </Link>
    </div>
  );
}
