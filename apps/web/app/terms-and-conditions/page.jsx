import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";

// Terms and Conditions (/terms-and-conditions). Layout: components/doc/LegalDocPage; text: data/legal/terms.js.
export const metadata = legalMetadata("terms");

export default function TermsPage() {
  return <LegalDocPage slug="terms" />;
}
