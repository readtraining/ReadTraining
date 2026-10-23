// The site header (components/header): its words and the four menus. Course, licence and town links come from the menus' own
// data in data/home/menu.js, so every link points at a page that exists.
import { subjects, studyMethods, locationCourses, locationFinderHref, cityHref } from "@/data/home/menu";
import { CATALOGUE_HREF, HSE_TEST_HREF } from "@/lib/routes";
import { courseLink } from "@/data/courseSlugs";

const slug = (label) => label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const lic = (s) => `/licences/${s}`;
// the header writes "and" as "&" in subject names (as Teaching & Academics), so none of them breaks onto two lines
const short = (label) => label.replace(/ and /g, " & ");

// the outline icon (components/header/navIcons.jsx) for each subject
const SUBJECT_ICONS = {
  "accounting-and-finance": "calculator",
  business: "briefcase",
  construction: "helmet",
  "first-aid": "aid",
  "health-and-care": "heart",
  "health-and-safety": "warning",
  hospitality: "food",
  lifestyle: "sparkle",
  marketing: "megaphone",
  "personal-development": "growth",
  security: "shield",
  "teaching-and-academics": "cap",
};
// Each subject's course count and its three most-booked courses (length and study methods under each), taken from the course
// catalogue (data/courseCatalogue.js), which the header can't load itself (78 KB). Update this table when the catalogue changes.
const CATALOGUE = {
  "Accounting and Finance": { count: 3, top: [[29, "Bookkeeping Level 2", "Self-paced · Live online"], [30, "AAT Level 3 Accounting Technician", "12 weeks · Classroom · Live online"], [31, "ACCA Financial Reporting Prep", "Self-paced · Live online"]] },
  "Business": { count: 3, top: [[26, "Project Management Fundamentals", "2 days · Classroom · Live online · Self-paced"], [27, "Human Resources Practitioner Course", "4 days · Live online · Self-paced"], [28, "Leadership and Management Level 5", "8 days · Classroom · Live online"]] },
  "Construction": { count: 5, top: [[48, "Asbestos Awareness (Category A)", "2 hours · Live online · Self-paced"], [9, "CSCS Green Card Course", "1 day · Classroom · Live online · Self-paced"], [10, "CITB SMSTS Course", "5 days · Classroom"]] },
  "First Aid": { count: 4, top: [[5, "Emergency First Aid at Work", "1 day · Classroom · Live online"], [6, "First Aid at Work (3 Days)", "3 days · Classroom"], [7, "Paediatric First Aid (2 Days)", "2 days · Classroom · Live online"]] },
  "Health and Care": { count: 3, top: [[18, "Safeguarding Adults Level 2", "3 hours · Classroom · Live online · Self-paced"], [17, "Care Certificate Standards", "12 hours · Live online · Self-paced"], [19, "Medication Administration (Advanced)", "2 days · Classroom"]] },
  "Health and Safety": { count: 4, top: [[13, "IOSH Managing Safely", "4 days · Classroom · Live online · Self-paced"], [16, "Fire Marshal Training", "3 hours · Classroom · Live online · Self-paced"], [14, "NEBOSH National General Certificate", "10 days · Classroom · Live online · Self-paced"]] },
  "Hospitality": { count: 4, top: [[20, "Level 2 Food Hygiene", "3 hours · Live online · Self-paced"], [21, "Personal Licence (APLH)", "1 day · Classroom · Live online"], [49, "Level 3 Award in Supervising Food Safety in Catering (RQF) Online Course", "6 hours · Live online · Self-paced"]] },
  "Lifestyle": { count: 2, top: [[36, "Nutrition and Wellbeing Level 3", "Self-paced · Live online"], [35, "Introduction to Yoga Teaching", "3 days · Classroom · Live online"]] },
  "Marketing": { count: 3, top: [[37, "Digital Marketing Essentials", "Self-paced · Live online"], [38, "Social Media Strategy Workshop", "1 day · Classroom · Live online"], [39, "Advanced Paid Media and Analytics", "2 days · Live online"]] },
  "Personal Development": { count: 3, top: [[40, "Time Management and Productivity", "3 hours · Live online · Self-paced"], [41, "Conflict Resolution Skills", "1 day · Classroom · Live online"], [42, "Executive Presence and Public Speaking", "2 days · Classroom"]] },
  "Security": { count: 8, top: [[1, "SIA Door Supervisor Training", "6 days · Classroom"], [2, "SIA Security Guard Training", "5 days · Classroom"], [46, "Door Supervisor Refresher", "2 days · Classroom"]] },
  "Teaching & Academics": { count: 3, top: [[23, "Level 3 Award in Education and Training (AET)", "5 days · Classroom · Live online"], [24, "Level 4 Internal Quality Assurance", "Self-paced · Live online"], [25, "Level 5 Diploma in Education and Training", "Self-paced · Live online"]] },
};

const courseSubjects = subjects.map((s) => {
  const id = slug(s.label);
  const c = CATALOGUE[s.label] || { count: 0, top: [] };
  return {
    id,
    label: short(s.label),
    icon: SUBJECT_ICONS[id] || "book",
    countLine: `${c.count} ${c.count === 1 ? "course" : "courses"}`,
    top: c.top.map(([courseId, label, meta]) => ({ label, meta, href: courseLink(courseId) })),
    href: s.href,
    all: `All ${short(s.label)} courses`,
  };
});

// the courses with their own page, for "Popular courses" and the Near you course list
const withPage = locationCourses.filter((c) => c.id);
const byLabel = (label) => withPage.find((c) => c.label === label);
const POPULAR = [
  ["Door Supervisor Course", "Security"],
  ["Emergency First Aid at Work Course", "First Aid"],
  ["CSCS Green Card Course", "Construction"],
  ["Fire Marshal Course", "Health and Safety"],
];

// the cities under Near you, with where they are (to find the nearest one to "Use my location")
const CITIES = [
  ["London", 51.5074, -0.1278],
  ["Birmingham", 52.4862, -1.8904],
  ["Manchester", 53.4808, -2.2426],
  ["Leeds", 53.8008, -1.5491],
  ["Glasgow", 55.8642, -4.2518],
  ["Liverpool", 53.4084, -2.9916],
  ["Bristol", 51.4545, -2.5879],
  ["Sheffield", 53.3811, -1.4701],
  ["Newcastle", 54.9783, -1.6178],
  ["Cardiff", 51.4816, -3.1791],
  ["Edinburgh", 55.9533, -3.1883],
  ["Nottingham", 52.9548, -1.1581],
];

export const headerNav = {
  // the strip's audience links: the one for the page you are on shows as current ("For learners" is the home page)
  audiences: [
    { label: "For learners", href: "/" },
    { label: "Book for your team", href: "/for-business" },
    { label: "List your courses", href: "/for-providers" },
  ],
  menu: { close: "Close menu" },

  // the four menus; `width` is the card's width on a wide screen (it never goes past the page's 32px gutters)
  sections: [
    { id: "courses", label: "Explore courses", width: 1180 },
    { id: "licences", label: "Licences", width: 1000 },
    { id: "near", label: "Near you", width: 980 },
    { id: "help", label: "Help & guides", width: 900 },
  ],

  courses: {
    title: "Browse by subject",
    topTitle: "Top courses",
    methods: studyMethods.map((m) => ({ label: m.label === "Online self-paced" ? "Self-paced" : m.label, href: m.href })),
    all: { label: "Browse all courses", href: CATALOGUE_HREF },
    subjects: courseSubjects,
    popular: {
      title: "Popular courses",
      hint: "Choose a subject to see its courses",
      items: POPULAR.map(([label, meta]) => ({ label: byLabel(label)?.label, meta: short(meta), href: byLabel(label)?.href })).filter((c) => c.href),
    },
  },

  // what each licence or card needs, in one line (the guides in data/licences.js have the detail)
  licences: {
    groups: [
      {
        title: "Security (SIA)",
        items: [
          { label: "Door Supervisor", need: "6-day course, first aid certificate, £204 SIA fee", href: lic("sia-door-supervisor-licence") },
          { label: "Security Guard", need: "4-day course, first aid certificate, £204 SIA fee", href: lic("sia-security-guard-licence") },
          { label: "CCTV Operator", need: "3-day course and the £204 SIA fee", href: lic("sia-cctv-licence") },
          { label: "Close Protection", need: "18-day Level 3 course, Level 3 first aid, £204 fee", href: lic("sia-close-protection-licence") },
        ],
      },
      {
        title: "Construction",
        items: [
          { label: "CSCS cards", need: "The right qualification, the CITB HS&E test, £36 card fee", href: lic("cscs-cards") },
          { label: "CITB HS&E test", need: "Book the touch-screen test", href: HSE_TEST_HREF },
        ],
      },
      {
        title: "Alcohol licensing",
        items: [
          { label: "Personal Licence (APLH)", need: "APLH course, basic DBS check, £37 council fee", href: lic("personal-licence") },
          { label: "Premises Licence", need: "Council application and a premises supervisor", href: lic("premises-licence") },
          { label: "Occasional Licence", need: "Scotland, events up to 14 days, £10 fee", href: lic("occasional-licence") },
        ],
      },
      {
        title: "Other",
        items: [{ label: "Forklift", need: "No official licence: accredited operator training", href: lic("forklift-licence") }],
      },
    ],
    all: { label: "Compare all licences and cards", href: "/licences" },
  },

  near: {
    title: "Find a course near you",
    town: { label: "Town or postcode", placeholder: "e.g. Leeds or LS1 4AP" },
    course: { label: "Course", any: "Any course" },
    courses: withPage.map((c) => ({ value: slug(c.label), label: c.label })),
    submit: "Find courses",
    locate: "Use my location",
    locating: "Finding you...",
    locateFailed: "We couldn't get your location. Type your town or postcode instead.",
    citiesTitle: "Popular cities",
    cities: CITIES.map(([name, lat, lng]) => ({ name, lat, lng, href: cityHref(name) })),
    online: {
      title: "No venue near you?",
      items: [
        { label: "Live online courses", meta: "With a tutor, from home", href: "/courses/live-online" },
        { label: "Self-paced courses", meta: "Start any time", href: "/courses/self-paced" },
      ],
    },
    all: { label: "Browse all courses", href: CATALOGUE_HREF },
    // where the search goes: the chosen course's dates in that town, or every course there
    href: (town, courseValue) => {
      const c = withPage.find((x) => slug(x.label) === courseValue);
      return c ? locationFinderHref(c, town) : cityHref(town);
    },
  },

  help: {
    groups: [
      {
        title: "Prepare",
        items: [
          { label: "Test prep and mock exams", meta: "Practise for SIA and CSCS tests", icon: "book", href: "/test-prep" },
          { label: "CITB HS&E test", meta: "Book your touch-screen test", icon: "helmet", href: HSE_TEST_HREF },
          { label: "Licence guides", meta: "What each licence needs", icon: "card", href: "/licences" },
        ],
      },
      {
        title: "Guides",
        items: [
          { label: "How to renew your SIA licence", meta: "When and how to apply", icon: "document", href: "/blog/how-to-renew-your-sia-licence" },
          { label: "Door supervisor or security guard?", meta: "Which licence you need", icon: "document", href: "/blog/door-supervisor-or-security-guard" },
          { label: "All articles", meta: "Training guides and advice", icon: "book", href: "/blog" },
        ],
      },
      {
        title: "Help",
        items: [
          { label: "Help centre", meta: "Booking and course answers", icon: "help", href: "/help-centre" },
          { label: "Contact us", meta: "Phone, email or message", icon: "mail", href: "/contact-us" },
          { label: "Check a certificate", meta: "Is a certificate genuine?", icon: "check", href: "/certificate-checker" },
        ],
      },
    ],
    all: { label: "Visit the Help centre", href: "/help-centre" },
  },
};

// the same four menus in the phone menu (components/home/HomeMobileMenu): a section opens to its groups, a group to its links
const N = headerNav;
export const mobileMenuList = [
  {
    title: N.sections[0].label,
    links: [
      { title: N.courses.title, links: N.courses.subjects.map((s) => ({ label: s.label, href: s.href })) },
      { title: "Study method", links: N.courses.methods },
      { label: N.courses.all.label, href: N.courses.all.href },
    ],
  },
  {
    title: N.sections[1].label,
    links: [...N.licences.groups.map((g) => ({ title: g.title, links: g.items.map((i) => ({ label: i.label, href: i.href })) })), { label: N.licences.all.label, href: N.licences.all.href }],
  },
  {
    title: N.sections[2].label,
    links: [
      { title: N.near.citiesTitle, links: N.near.cities.map((c) => ({ label: c.name, href: c.href })) },
      { title: N.near.online.title, links: N.near.online.items.map((i) => ({ label: i.label, href: i.href })) },
      { label: N.near.all.label, href: N.near.all.href },
    ],
  },
  {
    title: N.sections[3].label,
    links: N.help.groups.map((g) => ({ title: g.title, links: g.items.map((i) => ({ label: i.label, href: i.href })) })),
  },
];
