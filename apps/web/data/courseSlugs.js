// Course page links for the light data files (menus, home, licences, Security Jobs), so they need not load the whole catalogue.
// The slugs are the catalogue's own (data/courseCatalogue.js); keep them in step if a course title changes.
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
  16: "fire-marshal-training",
  21: "personal-licence-aplh",
  23: "level-3-award-in-education-and-training-aet",
  46: "door-supervisor-refresher",
  52: "security-guard-refresher",
};

export const courseLink = (id) => coursePath(slugs[id] ?? id);
