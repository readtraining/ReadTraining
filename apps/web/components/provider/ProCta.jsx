"use client";

import Link from "next/link";
import { provider } from "@/data/provider";
import { useProviderStep } from "./ProviderCta";

/* CTA: horizontal dark band. Someone who already has a provider account gets their own next step and a sentence to match
   (ProviderCta), not "Create your provider account"; while that isn't known yet, both keep their place unseen. */
export default function ProCta() {
  const c = provider.cta;
  const { known, step } = useProviderStep();
  const primary = step ?? c.primary;
  const wait = known ? undefined : "rt-cta-wait";
  return (
    <section className="layout-pb-lg">
      <div className="container">
        <div className="bz-cta3">
          <div className="bz-cta3__text">
            <h2 className="bz-cta3__title">{c.title}</h2>
            <p className={`bz-cta3__lede${wait ? ` ${wait}` : ""}`} aria-hidden={wait ? true : undefined}>{step ? provider.account.bandText : c.text}</p>
          </div>
          <div className="bz-cta3__actions">
            <Link href={primary.href} className={`button -md -green-1 text-dark-1${wait ? ` ${wait}` : ""}`} aria-hidden={wait ? true : undefined} tabIndex={wait ? -1 : undefined}>{primary.label} <i className="icon-arrow-right text-13 ml-10"></i></Link>
            <Link href={c.secondary.href} className="button -md -outline-white text-white">{c.secondary.label}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
