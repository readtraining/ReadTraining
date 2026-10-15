import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";

// Cookie Policy (/cookie-policy). Layout: components/doc/LegalDocPage; text: data/legal/cookies.js.
export const metadata = legalMetadata("cookies");

export default function CookiePolicyPage() {
  return <LegalDocPage slug="cookies" />;
}
