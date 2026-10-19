import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";
import { loadSiteContent } from "@/lib/siteContentServer";

// Provider Terms (/provider-terms): what training providers agree to when they add a provider account. Layout:
// components/doc/LegalDocPage; text: data/legal/providerTerms.js.
export async function generateMetadata() {
  await loadSiteContent();
  return legalMetadata("providerTerms");
}

export default async function ProviderTermsPage() {
  await loadSiteContent();
  return <LegalDocPage slug="providerTerms" />;
}
