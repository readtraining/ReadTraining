import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";

// Accessibility Statement (/accessibility-statement). Layout: components/doc/LegalDocPage; text: data/legal/accessibility.js.
export const metadata = legalMetadata("accessibility");

export default function AccessibilityStatementPage() {
  return <LegalDocPage slug="accessibility" />;
}
