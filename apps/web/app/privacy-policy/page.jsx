import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";

// Privacy Policy (/privacy-policy). Layout: components/doc/LegalDocPage; text: data/legal/privacy.js.
export const metadata = legalMetadata("privacy");

export default function PrivacyPage() {
  return <LegalDocPage slug="privacy" />;
}
