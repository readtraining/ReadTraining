// Course page links without the catalogue: every catalogue course's id and slug, so menus, home, licences, account and admin
// pages link to /course/<slug> without loading data/courseCatalogue.js (78 KB) in the browser. Keep it in step with the
// catalogue's slugs (DEMO: generated from data/courseCatalogue.js; the API will return the slug with each course).
import { coursePath } from "@/lib/routes";

const slugs = {
  1: "sia-door-supervisor-training",
  2: "sia-security-guard-training",
  3: "sia-cctv-operator-training",
  4: "close-protection-training",
  5: "emergency-first-aid-at-work",
  6: "first-aid-at-work-3-days",
  7: "paediatric-first-aid-2-days",
  8: "mental-health-first-aid-awareness",
  9: "cscs-green-card-course",
  10: "citb-smsts-course",
  11: "citb-sssts-course",
  12: "traffic-marshal-banksman-course",
  13: "iosh-managing-safely",
  14: "nebosh-national-general-certificate",
  15: "manual-handling-training",
  16: "fire-marshal-training",
  17: "care-certificate-standards",
  18: "safeguarding-adults-level-2",
  19: "medication-administration-advanced",
  20: "level-2-food-hygiene",
  21: "personal-licence-aplh",
  22: "barista-skills-masterclass",
  23: "level-3-award-in-education-and-training-aet",
  24: "level-4-internal-quality-assurance",
  25: "level-5-diploma-in-education-and-training",
  26: "project-management-fundamentals",
  27: "human-resources-practitioner-course",
  28: "leadership-and-management-level-5",
  29: "bookkeeping-level-2",
  30: "aat-level-3-accounting-technician",
  31: "acca-financial-reporting-prep",
  32: "electrical-installation-level-2",
  33: "18th-edition-wiring-regulations",
  34: "gas-safe-commercial-catering-assessment",
  35: "introduction-to-yoga-teaching",
  36: "nutrition-and-wellbeing-level-3",
  37: "digital-marketing-essentials",
  38: "social-media-strategy-workshop",
  39: "advanced-paid-media-and-analytics",
  40: "time-management-and-productivity",
  41: "conflict-resolution-skills",
  42: "executive-presence-and-public-speaking",
  43: "fibre-optic-splicing-fundamentals",
  44: "structured-cabling-installer",
  45: "network-infrastructure-design-ccna-prep",
  46: "door-supervisor-refresher",
  47: "conflict-management-for-security",
  48: "asbestos-awareness-category-a",
  49: "level-3-award-in-supervising-food-safety-in-catering-rqf-online-course",
  50: "security-awareness-briefing",
  51: "workplace-wellbeing-basics",
  52: "security-guard-refresher",
};
const known = new Set(Object.values(slugs));

export const courseLink = (id) => coursePath(slugs[id] ?? id);

// A course's page from its slug or catalogue id (what lib/courses.js courseHref did, without the catalogue).
export const courseHref = (slugOrId) => {
  const key = String(slugOrId);
  return coursePath(known.has(key) ? key : slugs[key] ?? key);
};
