import LegalDocPage, { legalMetadata } from "@/components/doc/LegalDocPage";
import { loadSiteContent } from "@/lib/siteContentServer";

// Accessibility Statement (/accessibility-statement). Layout: components/doc/LegalDocPage; text: data/legal/accessibility.js.
export async function generateMetadata() {
  await loadSiteContent();
  return legalMetadata("accessibility");
}

export default async function AccessibilityStatementPage() {
  await loadSiteContent();
  return <LegalDocPage slug="accessibility" />;
}
