import "@/public/assets/sass/styles.scss";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "react-calendar/dist/Calendar.css";
import "aos/dist/aos.css";
import Providers from "./Providers";
import { SITE_URL } from "@/lib/seo";

// The root layout: a server component, so every page gets the site-wide metadata below (a page's own pageMetadata() adds its
// title, description and canonical). Browser-only parts (basket, tRPC, animations) are in Providers.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ReadTraining | Accredited training courses across the UK",
  description: "Find and book accredited training courses from trusted UK providers: compare dates, locations and prices in one place.",
  applicationName: "ReadTraining",
  openGraph: { type: "website", siteName: "ReadTraining", locale: "en_GB" },
  twitter: { card: "summary" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#140342",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
