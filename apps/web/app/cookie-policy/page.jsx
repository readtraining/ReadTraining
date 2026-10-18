import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";
import { loadSiteContent } from "@/lib/siteContentServer";

// Cookie Policy (/cookie-policy). Layout: components/doc/LegalDocPage; text: data/legal/cookies.js.
export async function generateMetadata() {
  await loadSiteContent();
  return legalMetadata("cookies");
}

export default async function CookiePolicyPage() {
  await loadSiteContent();
  return <LegalDocPage slug="cookies" />;
}
