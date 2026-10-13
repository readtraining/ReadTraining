"use client";

import React, { useEffect } from "react";
import AOS from "aos";
import { config } from "@fortawesome/fontawesome-svg-core";
import Context from "@/context/Context";
import { TRPCProvider } from "@/lib/trpc/trpc-provider";

config.autoAddCss = false;

// Everything the whole site needs in the browser: the tRPC client, the basket (Context) and the scroll animations (AOS).
// Kept out of app/layout.jsx so the layout stays a server component with site-wide metadata.
export default function Providers({ children }) {
  useEffect(() => {
    AOS.init({ duration: 700, offset: 120, easing: "ease-out", once: true });
  }, []);
  return (
    <TRPCProvider>
      <Context>{children}</Context>
    </TRPCProvider>
  );
}
