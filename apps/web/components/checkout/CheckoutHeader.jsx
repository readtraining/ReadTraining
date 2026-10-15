import React from "react";
import Image from "next/image";
import Link from "next/link";
import { checkout as copy } from "@/data/checkout";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

// The checkout's header: the site header's dark band and logo, "Secure checkout" and the help number, and no menu, so nothing pulls
// people away while they pay (as the client's site and the large booking sites do).
export default function CheckoutHeader() {
  const tel = copy.help.phone.replace(/\s+/g, "");
  return (
    <header className="rt-ck__header">
      <div className="container rt-ck__headrow">
        <Link href="/" className="rt-ck__logo">
          <Image width={176} height={44} src="/assets/img/general/readtraining-logo.svg" alt="ReadTraining home" priority />
        </Link>
        <div className="rt-ck__headside">
          <span className="rt-ck__secure"><LockIcon />{copy.secure}</span>
          <a href={`tel:${tel}`} className="rt-ck__help">{copy.help.label} <strong>{copy.help.phone}</strong></a>
        </div>
      </div>
    </header>
  );
}
