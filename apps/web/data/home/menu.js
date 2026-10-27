// Course data for the site header (data/headerNav.js) and the header search: the 12 subjects with their courses, the study
// methods, and the popular courses with the towns they run in. `slug` keeps the client's
// original path for when real pages exist.

import { placesByCourse } from "./locationPlaces";
import { courseSearch } from "@/data/courseTopics";
import { CATALOGUE_HREF, HSE_TEST_HREF, TEST_CENTRES_HREF, testCentreHref } from "@/lib/routes";
import { testCentres } from "@/data/testCentres";

const course = (label, slug) => ({ label, slug, href: CATALOGUE_HREF });
const cat = (label, slug) => ({ label, slug, href: CATALOGUE_HREF });
const img = (n) => `/assets/img/coursesCards/${n}.png`;

export const studyMethods = [
  { label: "Classroom", text: "Face-to-face at a venue near you", icon: "icon-online-learning-4", href: "/courses/classroom", slug: "/courses/classroom" },
  { label: "Live online", text: "Tutor-led over video, from home", icon: "icon-online-learning-2", href: "/courses/live-online", slug: "/courses/virtual" },
  { label: "Online self-paced", text: "Start today, learn at your own pace", icon: "icon-time-management", href: "/courses/self-paced", slug: "/courses/online" },
];

export const subjects = [
  { label: "Accounting and Finance", slug: "/courses/accounting-and-finance", img: img(1), courses: [cat("Accountancy", "/courses/accountancy"), cat("Bookkeeping", "/courses/bookkeeping")] },
  { label: "Business", slug: "/courses/business", img: img(2), courses: [cat("Communication", "/courses/communication"), cat("Human Resources", "/courses/human-resources"), cat("Project Management", "/courses/project-management"), cat("Sales", "/courses/sales")] },
  {
    label: "Construction", slug: "/courses/construction", img: img(3),
    courses: [
      course("CITB SEATS Course (Site Environmental Awareness Training Scheme)", "/course/citb-seats-course-site-environmental-awareness-training-scheme"),
      course("CITB SMSTS Course", "/course/citb-site-manager-safety-training-scheme-smsts"),
      course("CITB SMSTS Refresher Course", "/course/citb-site-management-safety-training-scheme-online-refresher"),
      course("CITB SSSTS Course", "/course/citb-site-supervisor-safety-training-sssts-online"),
      course("CITB SSSTS Refresher Course", "/course/citb-site-supervisor-safety-training-scheme-sssts-online-refresher"),
      course("CSCS Green Card Course", "/course/cscs-green-card-labourers-card-course"),
      course("Traffic Marshal (Banksman) Course", "/course/traffic-banksman-traffic-marshal-training-course"),
    ],
  },
  {
    label: "First Aid", slug: "/courses/first-aid", img: img(4),
    courses: [
      course("Emergency First Aid at Work Course", "/course/emergency-first-aid-at-work-training-1-day"),
      course("First Aid at Work Course - 3 Days", "/course/first-aid-at-work-training-3-days"),
      course("First Aid at Work Requalification Course (FAWR)", "/course/first-aid-at-work-requalification-course-fawr"),
      course("First Response Emergency Care (FREC 3) Course", "/course/first-response-emergency-care-frec3-course"),
      course("Immediate Life Support (ILS) Training", "/course/ils-immediate-life-support-training"),
      course("Level 3 Paediatric First Aid Training (2 Days)", "/course/level-3-paediatric-first-aid-training-2-days"),
      course("Mental Health First Aid (MHFA) Training Course", "/course/mental-health-first-aid"),
    ],
  },
  { label: "Health and Care", slug: "/courses/health-and-care", img: img(5), courses: [cat("Care", "/courses/care")] },
  {
    label: "Health and Safety", slug: "/courses/health-and-safety", img: img(6),
    courses: [
      course("Asbestos Awareness Training (Category A)", "/course/asbestos-awareness-category-a-course"),
      course("CITB Health and Safety Awareness Course", "/course/citb-health-and-safety-awareness-course"),
      course("Fire Warden & Fire Marshal Courses", "/course/fire-marshal-fire-warden-online"),
      course("IOSH Managing Safely Course and Certificate", "/course/iosh-managing-safely-course"),
      course("IOSH Working Safely Course", "/course/iosh-working-safely"),
      course("Ladder and Stepladder User and Inspection Combined Course", "/course/ladders-stepladders-user-inspection-course"),
      course("Level 3 Health and Safety Training for Managers", "/course/level-3-health-and-safety-training-for-managers"),
      course("Manual Handling Training Course", "/course/manual-handling-training"),
      course("NEBOSH Certificate in Fire Safety", "/course/nebosh-fire-safety-certificate"),
      course("NEBOSH Health and Safety Management For Construction", "/course/nebosh-construction-certificate"),
      course("NEBOSH International Technical Certificate in Oil and Gas Operational Safety", "/course/nebosh-oil-gas-certificate"),
      course("NEBOSH Level 6 International Diploma for Occupational Health and Safety Management Professionals", "/course/nebosh-international-diploma-occupational-health-safety"),
      course("NEBOSH Level 6 National Diploma for Occupational Health and Safety Management Professionals", "/course/nebosh-national-diploma"),
      course("NEBOSH National General Certificate", "/course/nebosh-national-general-certificate"),
    ],
  },
  {
    label: "Hospitality", slug: "/courses/hospitality", img: img(7),
    courses: [
      course("APLH Personal Licence Training Course", "/course/aplh-personal-licence-training-course"),
      course("Level 2 Food Hygiene and Safety", "/course/level-2-food-hygiene-and-safety-at-work"),
      course("Level 3 Food Hygiene and Safety for Supervisors", "/course/level-3-food-hygiene-and-safety-for-supervisors"),
    ],
  },
  { label: "Lifestyle", slug: "/courses/lifestyle", img: img(8), courses: [cat("Beauty", "/courses/beauty")] },
  { label: "Marketing", slug: "/courses/marketing", img: img(9), courses: [cat("Digital Marketing", "/courses/digital-marketing"), cat("Search Engine Optimisation", "/courses/search-engine-optimisation"), cat("Social Media Marketing", "/courses/social-media-marketing")] },
  { label: "Personal Development", slug: "/courses/personal-development", img: img(10), courses: [cat("Career Development", "/courses/career-development"), cat("Leadership", "/courses/leadership")] },
  {
    label: "Security", slug: "/courses/security", img: img(11),
    courses: [
      course("Basic Handcuff Training Course", "/course/handcuff-training"),
      course("Level 2 Spectator Safety", "/course/level-2-spectator-safety-course"),
      course("Physical Intervention Refresher/Crossover Training", "/course/physical-intervention-refresher-crossover-training"),
      course("SIA CCTV Operator Training Course", "/course/sia-cctv-operator-training"),
      course("SIA Close Protection Refresher Course (Top-Up Training for Renewal)", "/course/sia-close-protection-top-up-course"),
      course("SIA Close Protection Training Course", "/course/close-protection"),
      course("SIA Door Supervisor Course", "/course/sia-door-supervisor-training"),
      course("SIA Refresher Course for Door Supervisors (Top-Up Training)", "/course/sia-top-up-refresher-training-door-supervisor"),
      course("SIA Security Guard Course", "/course/sia-security-guard-training-course"),
      course("SIA Top-Up Refresher Training for Security Guards", "/course/sia-top-up-refresher-training-security-guard"),
    ],
  },
  {
    label: "Teaching & Academics", slug: "/courses/teaching-&-academics", img: img(12),
    courses: [
      course("Level 3 Award in Education and Training (AET or PTLLS)", "/course/level-3-award-in-education-and-training-ptlls"),
      course("Level 3 Award in the Delivery of Conflict Management Training", "/course/level-3-award-in-delivery-of-conflict-management"),
      course("Level 4 Award in the Internal Quality Assurance of Assessment Processes and Practice (IQA Award Unit 1 & 2)", "/course/level-4-iqa-qualification-taqa"),
      course("Level 4 Certificate in Leading the Internal Quality Assurance of Assessment Processes and Practice (Lead IQA Course)", "/course/level-4-award-leading-iqa-qualification"),
    ],
  },
].map((s) => {
  // the catalogue's own subject value (its slug), e.g. "teaching-and-academics"
  const href = `/courses?subject=${s.label.toLowerCase().replace(/ & /g, "-and-").replace(/\s+/g, "-")}`;
  return { ...s, href, count: s.courses.length, courses: s.courses.map((c) => ({ ...c, href })) };
});

// Locations menu, as the client's (hurak.com): a list of popular courses and, for the course you point at, every town and city.
// A course opens the course finder searched for it (`q`, the words that find it); a city opens the finder for that course at
// that town (?location=), which shows what runs there (and the online courses, which run anywhere). A course without `q` opens
// the nearest course page (`page`), where the location filter works the same. `slug` keeps the original path.
const FINDER = "/courses";
const slugify = (text) => text.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const testCentreCity = (city) => {
  const c = testCentres.find((x) => x.town.toLowerCase() === city.toLowerCase() || x.slug === slugify(city));
  return c ? testCentreHref(c.slug) : `${TEST_CENTRES_HREF}?q=${encodeURIComponent(city)}`;
};
const locationCourse = (label, slug, { q, page, related, cityHref }) => ({
  label,
  slug,
  q,
  places: placesByCourse[label], // the towns it runs in (data/home/locationPlaces.js); a course with none shows `related` courses instead
  related,
  cityHref,
  href: q ? courseSearch(q) : page,
  results: q ? courseSearch(q) : page,
});
export const locationCourses = [
  locationCourse("Abrasive Wheel Course", "/course/abrasive-wheels", { page: "/courses/health-and-safety" }),
  locationCourse("CCTV Operator Course", "/courses/cctv-operator", { q: "CCTV Operator" }),
  // a town with a test centre opens its page; any other town opens the directory searched for it (nearest centres first)
  locationCourse("CITB HS&E Test", HSE_TEST_HREF, { page: HSE_TEST_HREF, cityHref: testCentreCity }),
  locationCourse("CITB Site Safety Plus", "/courses/citb-site-safety-plus", {
    page: "/courses/citb-site-safety-plus",
    related: [
      { label: "CITB SMSTS Course", href: courseSearch("SMSTS") },
      { label: "CITB SMSTS Refresher Course", href: "/courses/citb-site-safety-plus" },
      { label: "CITB SSSTS Course", href: courseSearch("SSSTS") },
      { label: "CITB SSSTS Refresher Course", href: "/courses/citb-site-safety-plus" },
    ],
  }),
  locationCourse("CSCS Green Card Course", "/course/cscs-green-card-labourers-card-course", { q: "CSCS Green Card" }),
  locationCourse("Door Supervisor Course", "/course/sia-door-supervisor-training", { q: "SIA Door Supervisor Training" }),
  locationCourse("Emergency First Aid at Work Course", "/courses/emergency-first-aid-at-work", { q: "Emergency First Aid at Work" }),
  locationCourse("Fire Marshal Course", "/course/fire-marshal-fire-warden-online", { q: "Fire Marshal" }),
  locationCourse("First Aid at Work Course", "/courses/first-aid-at-work", { q: "First Aid at Work (3 Days)" }),
  locationCourse("First Aid at Work Requalification Course", "/course/first-aid-at-work-requalification-course-fawr", { page: "/courses/first-aid" }),
  locationCourse("Level 1 Health and Safety in a Construction Environment", "/course/level-1-health-and-safety-in-a-construction-environment", { page: "/courses/health-and-safety" }),
  locationCourse("Mental Health First Aid Course", "/course/mental-health-first-aid", { q: "Mental Health First Aid" }),
  locationCourse("Paediatric First Aid Course", "/course/level-3-paediatric-first-aid-training-2-days", { q: "Paediatric First Aid" }),
  locationCourse("Personal Licence Course", "/courses/personal-licence", { q: "Personal Licence" }),
  locationCourse("Refresher Course for Door Supervisors", "/course/sia-top-up-refresher-training-door-supervisor", { q: "Door Supervisor Refresher" }),
  locationCourse("Refresher Course for Security Guards", "/course/sia-top-up-refresher-training-security-guard", { q: "Security Guard Refresher" }),
  locationCourse("Safety Harness Training", "/course/safety-harness-training", { page: "/courses/health-and-safety" }),
  locationCourse("Scottish Personal Licence Refresher Training", "/course/personal-licence-refresher-course-scotland-scplh-r", { page: "/courses/personal-licence" }),
  locationCourse("Scottish Personal Licence Training", "/course/scplh-scottish-certificate-for-personal-licence-holders", { page: "/courses/personal-licence" }),
  locationCourse("Security Guard Course", "/course/sia-security-guard-training-course", { q: "SIA Security Guard Training" }),
  locationCourse("Traffic Banksman Course", "/course/traffic-banksman-traffic-marshal-training-course", { q: "Traffic Marshal" }),
  locationCourse("Working at Height Training", "/course/working-at-height-training", { page: "/courses/health-and-safety" }),
];

// A course in a town: the course finder for that course, filtered to the town.
export const locationFinderHref = (course, city) => `${course.results}${course.results.includes("?") ? "&" : "?"}location=${encodeURIComponent(city)}`;
export const cityHref = (city) => `${FINDER}?location=${encodeURIComponent(city)}`;

export const popularByLocation = locationCourses.slice(0, 12);
