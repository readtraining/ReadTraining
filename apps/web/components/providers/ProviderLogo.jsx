import React from "react";

// The provider's mark: its initials on a pale square, the stand-in for an uploaded logo (as Hurak shows a name tile for a provider
// without one). `large` is the size used in the provider page's details card.
export default function ProviderLogo({ initials, logoUrl = null, large = false }) {
  return <span className={`rt-plogo${large ? " -lg" : ""}${logoUrl ? " -img" : ""}`} aria-hidden="true">{logoUrl ? <img src={logoUrl} alt="" /> : initials}</span>;
}
