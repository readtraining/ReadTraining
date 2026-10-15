import React from "react";
import Link from "next/link";

const LINKS = [
  { label: "Terms and Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Help centre", href: "/help-centre" },
];

// The checkout's slim footer: no menu or promotions (nothing to pull people away while they pay), only the legal pages and help,
// so the page never ends in blank white.
export default function CheckoutFooter() {
  return (
    <footer className="rt-ck__footer">
      <div className="container rt-ck__footrow">
        <p>© {new Date().getFullYear()} ReadTraining</p>
        <ul>
          {LINKS.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
        </ul>
      </div>
    </footer>
  );
}
