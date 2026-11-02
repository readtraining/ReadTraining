import Link from "next/link";

import { socialMediaLinks } from "../../data/socialLinks";
import React from "react";

export default function Socials({ componentsClass, textSize }) {
  return (
    <>
      {socialMediaLinks.filter((link) => link.href !== "#").map((link, index) => (
        <a
          key={index}
          className={componentsClass ? componentsClass : ""}
          href={link.href}
          aria-label={`${link.label} (opens in a new tab)`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className={`${link.iconClassName} ${textSize}`} aria-hidden="true"></i>
        </a>
      ))}
    </>
  );
}
