"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import Socials from "@/components/common/Socials";
import { footer, topBar } from "@/data/home";

// Footer built on the template's FooterEight (type-5) layout: brand + contact left, link columns right,
// accreditation strip, then the legal row.
export default function HomeFooter() {
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
              <a href={`mailto:${footer.email}`} className="rt-footer__contactItem">
                <i className="icon-email"></i>
                <span><b>{footer.email}</b><small>We reply within one working day</small></span>
              </a>
            </div>

            <form className="rt-footer__news" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-email" className="rt-footer__newsLabel">Course alerts and offers</label>
              <div className="rt-footer__newsRow">
                <input id="footer-email" type="email" placeholder="Your email" required />
                <button type="submit" aria-label="Subscribe"><i className="icon-arrow-right text-14"></i></button>
              </div>
            </form>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title} className="col-xl-2 col-lg-2 col-md-3 col-6">
              <div className="rt-footer__colTitle">{col.title}</div>
              <div className="rt-footer__links">
                {col.links.slice(0, 8).map((l) => (
                  <Link key={l.label + l.href} href={l.href}>{l.label}</Link>
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
          <div className="rt-footer__social">
            <Socials componentsClass="rt-footer__socialLink" textSize="text-14" />
          </div>
        </div>

        <div className="rt-footer__legal">
          <div className="rt-footer__copy">
            © {new Date().getFullYear()} ReadTraining. All rights reserved. Courses are delivered by independent, accredited training providers.
          </div>
          <div className="rt-footer__legalLinks">
            {footer.legal.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
