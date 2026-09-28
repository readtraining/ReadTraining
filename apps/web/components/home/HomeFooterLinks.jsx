import React from "react";
import { footer } from "@/data/home";
const footerLinks = footer.columns;
import Link from "next/link";
export default function HomeFooterLinks({ allClasses, parentClass }) {
  return (
    <>
      {footerLinks.map((elm, i) => (
        <div key={i} className={parentClass || "col-lg-3 col-md-6 col-6"}>
          <div className={`${allClasses ? allClasses : ""}`}>{elm.title}</div>
          <div className="d-flex y-gap-10 flex-column ">
            {elm.links.map((itm, index) => (
              <Link key={index} href={itm.href}>
                {itm.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
