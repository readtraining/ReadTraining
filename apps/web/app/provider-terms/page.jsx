import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";

// Provider Terms (/provider-terms): what training providers agree to when they add a provider account. Layout:
// components/doc/LegalDocPage; text: data/legal/providerTerms.js.
export const metadata = legalMetadata("providerTerms");

export default function ProviderTermsPage() {
  return <LegalDocPage slug="providerTerms" />;
}
