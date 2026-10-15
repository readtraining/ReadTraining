import React from "react";
import Image from "next/image";
import HelpLinks from "@/components/help/HelpLinks";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";
import { CATALOGUE_HREF } from "@/lib/routes";

// The 404 page body: what happened and the two ways on (catalogue, home) beside the illustration, then the places most
// visitors are looking for, as the help centre's row-link cards. Text first on a phone.
const places = [
  { title: "Test prep", summary: "Free practice questions and mock exams before your test.", href: "/test-prep", icon: "icon-search" },
  { title: "Licences & Cards",summary: "SIA licences, CSCS cards and personal licences explained.", href: "/licences", icon: "icon-badge" },
  { title: "Help centre", summary: "Answers about booking, payments and certificates.", href: "/help-centre", icon: "icon-document" },
  { title: "Contact us", summary: "Talk to our UK team, Monday to Friday.", href: "/contact-us", icon: "icon-message" },
];

export default function PageNotFound() {
  return (
    <section className="fb-section -white rt-404" aria-labelledby="rt-404-h">
      <div className="container">
        <div className="fb-split -reverse">
          <div>
            <Eyebrow>Error 404</Eyebrow>
            <h1 className="fb-title" id="rt-404-h">We can&rsquo;t find that page</h1>
            <p className="fb-lede">The link may be out of date, or the page may have moved. Check the address, or carry on from one of the pages below.</p>
            <div className="fb-actions">
              <CtaLink link={{ label: "Browse all courses", href: CATALOGUE_HREF }} />
              <CtaLink link={{ label: "Go to the homepage", href: "/" }} variant="outline" />
            </div>
            <HelpLinks items={places} />
          </div>
          <div className="rt-404__img">
            <Image width={630} height={480} src="/assets/img/404/1.svg" alt="" priority />
          </div>
        </div>
      </div>
    </section>
  );
}
