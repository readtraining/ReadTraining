import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";
import { loadSiteContent } from "@/lib/siteContentServer";

// Terms and Conditions (/terms-and-conditions). Layout: components/doc/LegalDocPage; text: data/legal/terms.js.
export async function generateMetadata() {
  await loadSiteContent();
  return legalMetadata("terms");
}

export default async function TermsPage() {
  await loadSiteContent();
  return <LegalDocPage slug="terms" />;
}
