import React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/courses";

// "Students also bought": three compact cards (image, title, from price), like the Hurak course page.
export default function RelatedCourses({ courses }) {
  if (!courses.length) return null;
  return (
    <section className="rt-cd__sec" id="related" aria-labelledby="rt-cd-related-h">
      <h2 id="rt-cd-related-h">Students also bought</h2>
      <ul className="rt-cd__rel">
        {courses.map((c) => (
          <li key={c.id}>
            <Link href={c.detailsHref} className="rt-cd__rel-card">
              <span className="rt-cd__rel-img">
                {c.imageSrc ? <Image src={c.imageSrc} alt="" width={440} height={276} /> : null}
              </span>
              <span className="rt-cd__rel-title">{c.title}</span>
              <span className="rt-cd__rel-price">From <strong>{formatPrice(c.price)}</strong> All inc</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
