import React from "react";
import Link from "next/link";
import { licenceHref } from "@/lib/licences";

// Licence tiles (home's team tiles, .rt-teamtile): icon, name, regulator and one line; the whole tile is the link to the licence's
// guide (the name's link is stretched over it). Used for the hub's groups and a licence page's related licences.
export default function LicenceTiles({ items, label, className = "" }) {
  return (
    <ul className={`rt-teamtiles rt-lic__tiles ${className}`}>
      {items.map((l) => (
        <li key={l.slug} className="rt-teamtile rt-lic__tile">
          <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${l.icon} text-18`}></i></span>
          <h3 className="rt-teamtile__title"><Link href={licenceHref(l.slug)} className="rt-lic__tilelink">{l.short}</Link></h3>
          <p className="rt-lic__reg">{l.regulator.name}</p>
          <p className="rt-teamtile__text">{l.tile}</p>
          <span className="fb-textlink" aria-hidden="true">{label}<i className="icon-arrow-right text-12"></i></span>
        </li>
      ))}
    </ul>
  );
}
