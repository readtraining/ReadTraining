import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";
import { loadSiteContent } from "@/lib/siteContentServer";

// Privacy Policy (/privacy-policy). Layout: components/doc/LegalDocPage; text: data/legal/privacy.js.
export async function generateMetadata() {
  await loadSiteContent();
  return legalMetadata("privacy");
}

export default async function PrivacyPage() {
  await loadSiteContent();
  return <LegalDocPage slug="privacy" />;
}
