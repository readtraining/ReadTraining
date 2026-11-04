"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import Socials from "@/components/common/Socials";
import FooterNewsletter from "./FooterNewsletter";
import { socialMediaLinks } from "@/data/socialLinks";
import { footer, topBar } from "@/data/home";
import { company } from "@/data/legal/company";
import WhatsAppIcon from "@/components/common/WhatsAppIcon";
import { hasReviews } from "@/lib/siteContent";
import { CATALOGUE_HREF } from "@/lib/routes";
import { useNav } from "@/lib/navContext";

// Footer built on the template's FooterEight (type-5) layout: brand + contact left, link columns right,
// accreditation strip, then the legal row.
// Customer reviews is listed only once a review is published (the page is hidden until then).
const REVIEWS_HREF = "/customer-reviews";

// the links of a column: the live catalogue's for "Find a course" (methods, then subjects with the most courses, then "All courses"
// for the rest) and "Popular courses" (the most popular live courses, by a short name); the others are fixed pages. Columns stay
// short, as on most sites: the full list of subjects is in the Explore menu and the course search.
const LINKS = 8;
const POPULAR = 6;
// a course's footer name: its title without the bracketed detail ("Personal Licence (Level 2 Award …)" → "Personal Licence"),
// keeping an acronym with its body ("CITB Site Management Safety Training Scheme (SMSTS)" → "CITB SMSTS")
const shortName = (title) => {
  const m = title.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return title;
  const [, base, inner] = m;
  const body = base.split(" ")[0];
  return /^[A-Z0-9]{2,8}$/.test(inner) && /^[A-Z]{2,6}$/.test(body) ? `${body} ${inner}` : base;
};
const linksOf = (col, nav) =>
  col.live === "find"
    ? [...[...nav.methods.map((m) => ({ label: `${m.name} courses`, href: m.href })), ...[...nav.subjects].sort((a, b) => b.count - a.count).map((s) => ({ label: s.label, href: s.href }))].slice(0, LINKS), { label: "All courses", href: CATALOGUE_HREF, more: true }]
    : col.live === "popular"
      ? nav.courses.slice(0, POPULAR).map((c) => ({ label: shortName(c.title), href: c.href, title: c.title }))
      : col.links;

export default function HomeFooter() {
  const nav = useNav();
  return (
    <footer className="footer -type-5 bg-dark-1 rt-footer">
      <div className="container">
        <div className="row y-gap-40 rt-footer__top">
          <div className="col-xl-4 col-lg-4 col-md-12">
            <div className="footer-header__logo">
              <Image width={176} height={44} src="/assets/img/general/readtraining-logo.svg" alt="ReadTraining" />
            </div>
            <p className="rt-footer__about">{footer.about}</p>

            <div className="rt-footer__contact">
              <a href={`tel:${footer.phone.replace(/\s/g, "")}`} className="rt-footer__contactItem">
                <i className="icon-person-3"></i>
                <span><b>{footer.phone}</b><small>{footer.hours}</small></span>
              </a>
              <a href={topBar.whatsapp.href} className="rt-footer__contactItem" target="_blank" rel="noopener noreferrer">
                <i><WhatsAppIcon /></i>
                <span><b>{topBar.whatsapp.number}</b><small>WhatsApp<span className="rt-sr"> (opens in a new tab)</span></small></span>
              </a>
              <a href={`mailto:${footer.email}`} className="rt-footer__contactItem">
                <i className="icon-email"></i>
                <span><b>{footer.email}</b><small>We reply within one working day</small></span>
              </a>
            </div>

            <FooterNewsletter />
          </div>

          {footer.columns.map((col) => ({ ...col, links: linksOf(col, nav) })).filter((col) => col.links.length).map((col) => (
            <div key={col.title} className="col-xl-2 col-lg-2 col-md-3 col-6">
              <div className="rt-footer__colTitle">{col.title}</div>
              <div className="rt-footer__links">
                {col.links.filter((l) => l.href !== REVIEWS_HREF || hasReviews()).slice(0, LINKS + 1).map((l) => (
                  <Link key={l.label + l.href} href={l.href} title={l.title && l.title !== l.label ? l.title : undefined}>
                    {l.label}{l.more && <i className="icon-arrow-right text-10 ml-5" aria-hidden="true"></i>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rt-footer__marks">
          <span className="rt-footer__marksLabel">Courses accredited and regulated by</span>
          <div className="rt-footer__marksList">
            {footer.accreditations.map((a) => <span key={a}>{a}</span>)}
          </div>
          {/* our social profiles (data/socialLinks.js) */}
          {socialMediaLinks.some((l) => l.href !== "#") && (
            <div className="rt-footer__social">
              <Socials componentsClass="rt-footer__socialLink" textSize="text-14" />
            </div>
          )}
        </div>

        <div className="rt-footer__legal">
          <div className="rt-footer__copy">
            © {new Date().getFullYear()} {company.name}, trading as {company.tradingName}. All rights reserved. Courses are delivered by independent, accredited training providers.
          </div>
          <div className="rt-footer__legalLinks">
            {footer.legal.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
