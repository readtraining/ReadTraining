import React from "react";
import Link from "next/link";
import Image from "next/image";
import Stars from "./Stars";
import { levels } from "@/data/courseCatalogue";
import { formatPrice } from "@/lib/courses";

// "Students also bought": list rows with thumbnail, title, rating, details and price (all existing course data).
export default function RelatedCourses({ courses }) {
  if (!courses.length) return null;
  return (
    <section className="rt-cd__sec" id="related" aria-labelledby="rt-cd-related-h">
      <h2 id="rt-cd-related-h">Students also bought</h2>
      <ul className="rt-cd__rel">
        {courses.map((c) => {
          const level = levels.find((l) => l.value === c.level)?.label;
          return (
            <li key={c.id}>
              <Link href={c.detailsHref} className="rt-cd__rel-card">
                <span className="rt-cd__rel-img">
                  {c.imageSrc ? <Image src={c.imageSrc} alt="" width={440} height={276} style={{ width: "100%", height: "100%" }} /> : null}
                </span>
                <span className="rt-cd__rel-main">
                  <span className="rt-cd__rel-title">{c.title}</span>
                  <span className="rt-cd__rel-rating"><strong>{c.rating.toFixed(1)}</strong> <Stars rating={c.rating} size={13} /></span>
                  <span className="rt-cd__rel-meta">{[c.duration, level].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="rt-cd__rel-price">From <strong>{formatPrice(c.price)}</strong> All inc</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
