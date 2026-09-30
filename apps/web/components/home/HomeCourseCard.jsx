"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

// Marketplace-style course card: bordered card, image, title, provider line,
// badge + rating pills and a "from" price.
export default function HomeCourseCard({ data }) {
  return (
    <div className="col-lg-3 col-md-6">
      <Link href={`/template/courses/${data.id}`} className="rt-ucard">
        <div className="rt-ucard__image">
          <Image width={500} height={300} src={data.imageSrc} alt={data.title} />
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
