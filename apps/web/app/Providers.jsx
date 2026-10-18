"use client";

import React, { useEffect } from "react";
import AOS from "aos";
import { config } from "@fortawesome/fontawesome-svg-core";
import Context from "@/context/Context";
import { setSiteContent } from "@/lib/siteContent";
import { TaxonomyProvider } from "@/lib/taxonomyContext";
import { TRPCProvider } from "@/lib/trpc/trpc-provider";

config.autoAddCss = false;

// Everything the whole site needs in the browser: the catalogue list, the site's editable content (set before any page
// renders, so lib/siteContent.js reads work everywhere), the tRPC client, the basket (Context) and the scroll animations (AOS).
// Kept out of app/layout.jsx so the layout stays a server component with site-wide metadata.
export default function Providers({ taxonomy, content, children }) {
  setSiteContent(content);
  useEffect(() => {
    AOS.init({ duration: 700, offset: 120, easing: "ease-out", once: true });
  }, []);
  return (
    <TaxonomyProvider value={taxonomy}>
      <TRPCProvider>
        <Context>{children}</Context>
      </TRPCProvider>
    </TaxonomyProvider>
  );
}
