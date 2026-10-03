"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { topBar } from "@/data/home";
import { businessMenu } from "@/data/home/menu";

// Slim utility strip above the navbar: contact on the left, audience links on the right.
// The link for the current page is shown as active (not a link), and "For learners" always leads home.
export default function HomeTopBar() {
  const path = usePathname() || "/";
  const audiences = [{ label: "For learners", href: "/" }, ...businessMenu.map((b) => ({ label: b.label, href: b.href }))];
  const isActive = (href) => (href === "/" ? path === "/" : path.startsWith(href.split("#")[0]));
  return (
    <div className="rt-utility">
      <div className="container rt-utility__inner">
        <div className="rt-utility__left">
          <a href={`tel:${topBar.phone.replace(/\s/g, "")}`}><i className="icon-person-3"></i>{topBar.phone}</a>
          <span className="rt-utility__sep"></span>
          <a href={`mailto:${topBar.email}`}><i className="icon-email"></i>{topBar.email}</a>
          <span className="rt-utility__hours">{topBar.hours}</span>
        </div>
        <div className="rt-utility__right">
          {audiences.map((a) =>
            isActive(a.href) ? (
              <span key={a.label} className="rt-utility__active" aria-current="page">{a.label}</span>
            ) : (
              <Link key={a.label} href={a.href}>{a.label}<i className="icon-arrow-top-right"></i></Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
