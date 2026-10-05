import Link from "next/link";
import { business } from "@/data/business";

/* CTA: horizontal dark band (same pattern as the /for-providers "Book a call" band) */
export default function FinalCta() {
  const c = business.cta;
  return (
    <section className="layout-pb-lg">
      <div className="container">
        <div className="bz-cta3">
          <div className="bz-cta3__text">
            <h2 className="bz-cta3__title">{c.title}</h2>
            <p className="bz-cta3__lede">{c.text}</p>
          </div>
          <div className="bz-cta3__actions">
            <Link href={c.primary.href} className="button -md -green-1 text-dark-1">{c.primary.label} <i className="icon-arrow-right text-13 ml-10"></i></Link>
            <Link href={c.secondary.href} className="button -md -outline-white text-white">{c.secondary.label}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
