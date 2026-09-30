import React from "react";
import Link from "next/link";

// Shared inline text link with optional leading icon and trailing arrow.
// Used for "Not sure which course you need?", "Show all … courses", etc.
export default function HomeTextLink({ href, icon, children, className = "" }) {
  return (
    <Link href={href} className={`rt-textlink ${className}`}>
      {icon && <i className={`${icon} text-13`}></i>}
      <span>{children}</span>
      <i className="icon-arrow-right text-11 rt-textlink__arrow"></i>
    </Link>
  );
}
