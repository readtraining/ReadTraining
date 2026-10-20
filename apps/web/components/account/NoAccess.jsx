import React from "react";
import Link from "next/link";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import { account } from "@/data/account";
import RetryButton from "./RetryButton";

// Shown at a /provider or /business address to someone signed in without that identity (or when access can't be checked):
// what's wrong, and the one thing to do next (become a provider / create a business account), with the way back to their account.
export default function NoAccess({ type, unavailable = false }) {
  const c = unavailable ? account.noAccess.unavailable : account.noAccess[type];
  return (
    <div className="main-content rt-home rt-acc-page">
      <a href="#rt-na-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-na-main" tabIndex={-1}>
          <section className="rt-bk__head rt-acc__head">
            <div className="container">
              <p className="rt-acc__eyebrow">{c.eyebrow}</p>
              <h1 className="rt-bk__h1">{c.title}</h1>
            </div>
          </section>
          <div className="container rt-na">
            <section className="rt-acc__card rt-acc__state" aria-labelledby="rt-na-h">
              <h2 className="rt-acc__h2" id="rt-na-h">{c.heading}</h2>
              <p className="rt-acc__note">{c.text}</p>
              <div className="rt-na__actions">
                {c.cta && <Link href={c.cta.href} className="button -md -purple-1 text-white">{c.cta.label}</Link>}
                {unavailable && <RetryButton label={c.retry} />}
                <Link href="/account" className="fb-textlink">{account.noAccess.back}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
              </div>
            </section>
          </div>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
