// Navigation data mirrored from the client's current site (hurak.com), September 2026.
// Structure: Courses (12 subjects + popular per subject), Licences & Cards, Locations, Resources.
// Hrefs point at our template pages for now; `slug` keeps the original path for when real pages exist.

import { placesByCourse } from "./locationPlaces";
import { courseLink } from "@/data/courseSlugs";

const course = (label, slug) => ({ label, slug, href: courseLink(1) });
const cat = (label, slug) => ({ label, slug, href: "/courses" });
const img = (n) => `/assets/img/coursesCards/${n}.png`;

export const studyMethods = [
  { label: "Classroom", text: "Face-to-face at a venue near you", icon: "icon-online-learning-4", href: "/courses/classroom", slug: "/courses/classroom" },
  { label: "Live online", text: "Tutor-led over video, from home", icon: "icon-online-learning-2", href: "/courses/virtual", slug: "/courses/virtual" },
  { label: "Online self-paced", text: "Start today, learn at your own pace", icon: "icon-time-management", href: "/courses/online", slug: "/courses/online" },
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
  // the catalogue's own subject value (data/courseCatalogue.js), e.g. "teaching-and-academics"
  const href = `/courses?subject=${s.label.toLowerCase().replace(/ & /g, "-and-").replace(/\s+/g, "-")}`;
  return { ...s, href, count: s.courses.length, courses: s.courses.map((c) => ({ ...c, href })) };
});

// Licences & Cards menu, as the client's (hurak.com): the same four groups, names, order and guides. A group opens its main guide
// (Security opens the hub filtered to SIA licences).
const lic = (slug) => `/licences/${slug}`;
const licenceText = "Explore the training and qualification routes for this licence or card.";
export const licenceGroups = [
  { label: "Construction", img: img(3), href: lic("forklift-licence"), text: licenceText, routes: [{ label: "Forklift Licence", href: lic("forklift-licence") }] },
  { label: "CSCS Card", img: img(9), href: lic("cscs-cards"), text: licenceText, routes: [{ label: "CSCS Card Application", href: lic("cscs-cards") }] },
  {
    label: "Personal Licence", img: img(7), href: lic("personal-licence"), text: licenceText,
    routes: [
      { label: "APLH Personal Licence Application", href: lic("personal-licence") },
      { label: "Occasional Licence", href: lic("occasional-licence") },
      { label: "Premises Licence", href: lic("premises-licence") },
    ],
  },
  {
    label: "Security Licence", img: img(11), href: "/licences?industry=security", text: licenceText,
    routes: [
      { label: "CCTV Licence", href: lic("sia-cctv-licence") },
      { label: "SIA Close Protection Licence", href: lic("sia-close-protection-licence") },
      { label: "SIA Door Supervisor Licence", href: lic("sia-door-supervisor-licence") },
      { label: "SIA Security Guard Licence", href: lic("sia-security-guard-licence") },
    ],
  },
];

// Locations menu, as the client's (hurak.com): a list of popular courses and, for the course you point at, every town and city.
// A course opens its page; a city opens the course finder for that course at that town (?location=). Our catalogue has venues
// in a few cities only, so the finder shows what runs there (and the online courses, which run anywhere). `id` is the course's
// catalogue id and `q` the words that find it; a course our catalogue does not have yet opens the nearest course page
// (`page`), where the location filter works the same. `slug` keeps the original path for when real pages exist.
const FINDER = "/courses";
export const slugify = (text) => text.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const locationCourse = (label, slug, { id, q, page, related }) => ({
  label,
  slug,
  id,
  places: placesByCourse[label], // the towns it runs in (data/home/locationPlaces.js); a course with none shows `related` courses instead
  related,
  locationSlug: id ? slugify(label) : undefined, // "door-supervisor-course": the course's pages are /course-locations/<this>-in-<city>
  href: id ? courseLink(id) : page,
  results: id ? `${FINDER}?q=${encodeURIComponent(q)}` : page,
});
export const locationCourses = [
  locationCourse("Abrasive Wheel Course", "/course/abrasive-wheels", { page: "/courses/health-and-safety" }),
  locationCourse("CCTV Operator Course", "/courses/cctv-operator", { id: 3, q: "CCTV Operator" }),
  locationCourse("CITB HS&E Test", "/tests/citb-health-safety-and-environment-test", { page: "/courses/citb-site-safety-plus" }),
  locationCourse("CITB Site Safety Plus", "/courses/citb-site-safety-plus", {
    page: "/courses/citb-site-safety-plus",
    related: [
      { label: "CITB SMSTS Course", href: courseLink(10) },
      { label: "CITB SMSTS Refresher Course", href: "/courses/citb-site-safety-plus" },
      { label: "CITB SSSTS Course", href: courseLink(11) },
      { label: "CITB SSSTS Refresher Course", href: "/courses/citb-site-safety-plus" },
    ],
  }),
  locationCourse("CSCS Green Card Course", "/course/cscs-green-card-labourers-card-course", { id: 9, q: "CSCS Green Card" }),
  locationCourse("Door Supervisor Course", "/course/sia-door-supervisor-training", { id: 1, q: "SIA Door Supervisor Training" }),
  locationCourse("Emergency First Aid at Work Course", "/courses/emergency-first-aid-at-work", { id: 5, q: "Emergency First Aid at Work" }),
  locationCourse("Fire Marshal Course", "/course/fire-marshal-fire-warden-online", { id: 16, q: "Fire Marshal" }),
  locationCourse("First Aid at Work Course", "/courses/first-aid-at-work", { id: 6, q: "First Aid at Work (3 Days)" }),
  locationCourse("First Aid at Work Requalification Course", "/course/first-aid-at-work-requalification-course-fawr", { page: "/courses/first-aid" }),
  locationCourse("Level 1 Health and Safety in a Construction Environment", "/course/level-1-health-and-safety-in-a-construction-environment", { page: "/courses/health-and-safety" }),
  locationCourse("Mental Health First Aid Course", "/course/mental-health-first-aid", { id: 8, q: "Mental Health First Aid" }),
  locationCourse("Paediatric First Aid Course", "/course/level-3-paediatric-first-aid-training-2-days", { id: 7, q: "Paediatric First Aid" }),
  locationCourse("Personal Licence Course", "/courses/personal-licence", { id: 21, q: "Personal Licence" }),
  locationCourse("Refresher Course for Door Supervisors", "/course/sia-top-up-refresher-training-door-supervisor", { id: 46, q: "Door Supervisor Refresher" }),
  locationCourse("Refresher Course for Security Guards", "/course/sia-top-up-refresher-training-security-guard", { id: 52, q: "Security Guard Refresher" }),
  locationCourse("Safety Harness Training", "/course/safety-harness-training", { page: "/courses/health-and-safety" }),
  locationCourse("Scottish Personal Licence Refresher Training", "/course/personal-licence-refresher-course-scotland-scplh-r", { page: "/courses/personal-licence" }),
  locationCourse("Scottish Personal Licence Training", "/course/scplh-scottish-certificate-for-personal-licence-holders", { page: "/courses/personal-licence" }),
  locationCourse("Security Guard Course", "/course/sia-security-guard-training-course", { id: 2, q: "SIA Security Guard Training" }),
  locationCourse("Traffic Banksman Course", "/course/traffic-banksman-traffic-marshal-training-course", { id: 12, q: "Traffic Marshal" }),
  locationCourse("Working at Height Training", "/course/working-at-height-training", { page: "/courses/health-and-safety" }),
];

// A course in the catalogue has a page per town or city (/course-locations/door-supervisor-course-in-london, as the client's
// site); one that is not in the catalogue yet opens the nearest course page filtered to the town. The course-in-a-city page
// sends a town with no venue for the course to the course finder (locationFinderHref), so no link is a dead end.
export const locationFinderHref = (course, city) => `${course.results}${course.results.includes("?") ? "&" : "?"}location=${encodeURIComponent(city)}`;
export const locationHref = (course, city) => (course.id ? `/course-locations/${course.locationSlug}-in-${slugify(city)}` : locationFinderHref(course, city));
export const cityHref = (city) => `${FINDER}?location=${encodeURIComponent(city)}`;

export const cities = [
  "Aberdeen", "Aberystwyth", "Aldershot", "Alness", "Annan", "Ashford", "Ashington", "Barking", "Barnet", "Barnsley", "Basildon", "Basingstoke", "Bexley", "Birmingham", "Blackburn", "Blackpool", "Bolton", "Bournemouth", "Brentwood", "Brighton", "Cambridge", "Canary Wharf", "Cardiff", "Chorley", "Colchester", "Coventry", "Croydon", "Dartford", "Derby", "Devon", "Doncaster", "Dundee", "Durham", "Edinburgh", "Essex", "Exeter", "Finchley", "Glasgow", "Gravesend", "Harlow", "Harrow", "Hemel Hempstead", "Hertfordshire", "Hounslow", "Hull", "Ilford", "Inverness", "Ipswich", "Kingston", "Lancashire", "Leeds", "Leicester", "Lewisham", "Leyland", "Leytonstone", "Lincoln", "London", "Luton", "Maidstone", "Manchester", "Milton Keynes", "Newcastle", "Newcastle upon Tyne", "Norfolk", "Northampton", "Northamptonshire", "Northfleet", "Northumberland", "Norwich", "Nottingham", "Nottinghamshire", "Oxfordshire", "Peterborough", "Plymouth", "Portsmouth", "Rainham", "Reading", "Romford", "Salford", "Sheffield", "Slough", "Solihull", "Somerset", "Southampton", "Southend", "Stafford", "Staffordshire", "Stratford", "Surrey", "Swansea", "Swindon", "Trafford Park", "Uxbridge", "Wakefield", "Wales", "Walsall", "West Lothian", "West Midlands", "West Sussex", "Wigan", "Wirral", "Wolverhampton", "Worthing",
];

// The card beside the cities: a town that is not listed is found with the course finder's location box.
export const locationFeature = {
  img: img(5),
  eyebrow: "Any town or postcode",
  title: "Search by postcode",
  text: "Enter your town or postcode in the course finder to see the venues and dates nearest you.",
  link: { label: "Open the course finder", href: FINDER },
};

export const popularByLocation = locationCourses.slice(0, 12);

export const resources = {
  prepare: [
    { label: "Test Prep & Mock Exams", text: "Practice mock tests and revision tools for SIA & CSCS exams.", icon: "icon-book", href: "/test-prep", slug: "/test-prep" },
    { label: "Blog & Industry Guides", text: "Training insights, regulatory updates and career advice.", icon: "icon-document", href: "/blog", slug: "/blog" },
  ],
  prepareLink: { label: "Explore Test Prep & Revision", href: "/test-prep" },
  help: [
    { label: "Help Centre & FAQs", icon: "icon-message", href: "/help-centre" },
    { label: "Certificate Verification", icon: "icon-check", href: "/certificate-checker", slug: "/certificate-checker" },
  ],
  company: [
    { label: "About ReadTraining", icon: "icon-person", href: "/about-us" },
    { label: "Contact Us", icon: "icon-email", href: "/contact-us" },
  ],
  helpLink: { label: "Visit Help Centre", href: "/help-centre" },
  featured: {
    tag: "SIA guide",
    img: img(11),
    title: "How to renew your SIA licence",
    text: "Understand the refresher training requirements and renewal timeline before your licence expires.",
    link: { label: "Read guide", href: "/blog/how-to-renew-your-sia-licence" },
  },
  footer: [
    { label: "Test Prep", href: "/test-prep" },
    { label: "Blog & Guides", href: "/blog" },
    { label: "Verify Certificate", href: "/certificate-checker" },
    { label: "Help Centre", href: "/help-centre" },
  ],
};

export const menuFooters = {
  courses: {
    links: [
      { label: "All courses", href: "/courses" },
      { label: "Classroom", href: "/courses/classroom" },
      { label: "Live online", href: "/courses/virtual" },
      { label: "Online self-paced", href: "/courses/online" },
    ],
    action: { label: "Course Finder", icon: "icon-search", href: "/courses" },
  },
  licences: {
    links: [
      { label: "SIA Licence", href: "/licences?industry=security" },
      { label: "CSCS Cards", href: lic("cscs-cards") },
      { label: "Personal Licence", href: lic("personal-licence") },
    ],
    action: { label: "Verify a certificate", icon: "icon-check", href: "/certificate-checker" },
  },
  locations: {
    links: [
      { label: "All courses", href: FINDER },
      { label: "Classroom courses", href: "/courses/classroom" },
      { label: "Live online", href: "/courses/virtual" },
    ],
    action: { label: "Search by postcode", icon: "icon-location", href: FINDER },
  },
  resources: {
    links: resources.footer,
    action: { label: "Contact us", icon: "icon-email", href: "/contact-us" },
  },
};

// Flat structure used by the mobile menu (same shape as the template's menuList).
export const businessMenu = [
  { label: "Book for your team", text: "Group bookings, one invoice, your venue or ours.", href: "/for-business", icon: "icon-person-3" },
  { label: "List your courses", text: "Reach learners across the UK. Free to list.", href: "/for-providers", icon: "icon-list" },
];

export const homeMenuList = [
  {
    title: "Courses",
    links: [
      { title: "Browse by subject", links: subjects.map((s) => ({ label: s.label, href: s.href })) },
      { title: "Study method", links: studyMethods.map((m) => ({ label: m.label, href: m.href })) },
      { href: "/courses", label: "View all courses" },
    ],
  },
  { title: "Licences & Cards", links: licenceGroups.map((g) => ({ label: g.label, href: g.href })) },
  {
    title: "Locations",
    links: [
      { title: "Popular training", links: locationCourses.map((c) => ({ label: c.label, href: c.href })) },
      { title: "Towns and cities", links: cities.map((city) => ({ label: city, href: cityHref(city) })) },
    ],
  },
  { title: "Resources", links: [...resources.prepare, ...resources.help, ...resources.company].map((r) => ({ label: r.label, href: r.href })) },
];
