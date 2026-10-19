import "@/public/assets/sass/styles.scss";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "react-calendar/dist/Calendar.css";
import "aos/dist/aos.css";
import Providers from "./Providers";
import { SITE_URL } from "@/lib/seo";
import { browserContent, seoSettings } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// The root layout: a server component, so every page gets the site-wide metadata below (a page's own pageMetadata() adds its
// title, description and canonical). Browser-only parts (basket, tRPC, animations) are in Providers. The catalogue list
// (categories, methods, levels) and the site's editable content are loaded here once and handed to every page through
// Providers.
// Pages built ahead of time (on Vercel the site is built before its API is running) show the built-in wording for the catalogue
// list and the site's editable content; this has every page rebuild itself at least every 5 minutes, so they catch up with what
// admins have saved even when nothing has marked them out of date.
export const revalidate = 300;

// the default title and description (admin > Platform settings), for any page without its own
export async function generateMetadata() {
  await loadSiteContent();
  const seo = seoSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: seo.homeTitle,
    description: seo.siteDescription,
    applicationName: "ReadTraining",
    openGraph: { type: "website", siteName: "ReadTraining", locale: "en_GB" },
    twitter: { card: "summary" },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#140342",
};

export default async function RootLayout({ children }) {
  const [taxonomy, content] = await Promise.all([loadTaxonomy(), loadSiteContent()]);
  return (
    <html lang="en-GB" data-scroll-behavior="smooth">
      <body>
        <Providers taxonomy={taxonomy} content={browserContent(content)}>{children}</Providers>
      </body>
    </html>
  );
}
