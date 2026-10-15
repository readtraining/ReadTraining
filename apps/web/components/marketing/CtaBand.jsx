import React from "react";
import Link from "next/link";

// The closing call to action: the dark band card of /for-business and /for-providers (.bz-cta3), used by About and the Help
// Centre. `cta` is { title, text, primary: { label, href }, secondary: { label, href } }; a tel: or mailto: link is a plain <a>.
const Action = ({ href, className, children }) => (href.startsWith("/") ? <Link href={href} className={className}>{children}</Link> : <a href={href} className={className}>{children}</a>);

export default function CtaBand({ cta: c, id = "rt-cta-h" }) {
  return (
    <section className="layout-pb-lg" aria-labelledby={id}>
      <div className="container">
        <div className="bz-cta3">
          <div className="bz-cta3__text">
            <h2 className="bz-cta3__title" id={id}>{c.title}</h2>
            <p className="bz-cta3__lede">{c.text}</p>
          </div>
          <div className="bz-cta3__actions">
            <Action href={c.primary.href} className="button -md -green-1 text-dark-1">{c.primary.label}<i className="icon-arrow-right text-13 ml-10" aria-hidden="true"></i></Action>
            <Action href={c.secondary.href} className="button -md -outline-white text-white">{c.secondary.label}</Action>
          </div>
        </div>
      </div>
    </section>
  );
}
