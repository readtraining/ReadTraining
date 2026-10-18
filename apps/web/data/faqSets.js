import { about } from "@/data/about";
import { business } from "@/data/business";
import { certificateChecker } from "@/data/certificateChecker";
import { contact } from "@/data/contact";
import { courseFaq } from "@/data/courseFaq";
import { coursePages } from "@/data/coursePages";
import { customerReviews } from "@/data/customerReviews";
import { licences, licencesHub } from "@/data/licences";
import { provider } from "@/data/provider";
import { securityJobs } from "@/data/securityJobs";
import { skillSaver } from "@/data/skillSaver";
import { skillSaverLearner } from "@/data/skillSaverLearner";
import { testPrepPage } from "@/data/testPrep";

// Every page whose FAQ an admin can edit (admin > Site content > FAQs). `key` is the page's FAQ set (the page asks for it with
// faqItems(key, builtIn) in lib/siteContent.js, so the key here and in the page must match), `defaults` its built-in questions
// and answers, `href` the page they are on. A page's FAQ belongs to that page alone: nothing here is shared between pages.
// A key saved by an admin is stored as "faq:<key>".
export const faqGroups = [
  { name: "Pages", sets: [
    { key: "about", label: "About us", href: "/about-us", defaults: () => about.faq.items },
    { key: "contact", label: "Contact us", href: "/contact-us", defaults: () => contact.faq.items },
    { key: "customer-reviews", label: "Customer reviews", href: "/customer-reviews", defaults: () => customerReviews().faq.items },
    { key: "for-business", label: "For business", href: "/for-business", defaults: () => business.faq.items },
    { key: "for-providers", label: "For providers", href: "/for-providers", defaults: () => provider.faq.items },
    { key: "certificate-checker", label: "Certificate checker", href: "/certificate-checker", defaults: () => certificateChecker.faq.items },
    { key: "security-jobs", label: "Security jobs", href: "/security-jobs", defaults: () => securityJobs.faq.items },
    { key: "skill-saver", label: "Skill Saver (learners)", href: "/skill-saver", defaults: () => skillSaverLearner.faq.items },
    { key: "provider-skill-saver", label: "Skill Saver (providers)", href: "/provider-skill-saver", defaults: () => skillSaver.faq.items },
    { key: "test-prep", label: "Test prep", href: "/test-prep", defaults: () => testPrepPage.faq.items },
    { key: "courses", label: "All courses", href: "/courses", defaults: () => courseFaq },
    { key: "licences", label: "Licences and cards", href: "/licences", defaults: () => licencesHub.faq.items },
  ] },
  { name: "Licence and card guides", sets: licences.map((l) => ({ key: `licence-${l.slug}`, label: l.short, href: `/licences/${l.slug}`, defaults: () => l.faqs })) },
  // a course page's list is also the list of every town page under it
  { name: "Course pages", sets: coursePages.map((p) => ({ key: `course-page-${p.slug}`, label: p.label, href: `/courses/${p.slug}`, defaults: () => p.faq })) },
];

export const faqSets = faqGroups.flatMap((g) => g.sets);
export const faqSet = (key) => faqSets.find((s) => s.key === key);
