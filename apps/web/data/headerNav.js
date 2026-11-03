// The site header (components/header): its words and the four menus. The subjects, study methods, popular courses, towns and
// the courses you can search for near you are the live catalogue's (lib/nav.js, useNav), so every link has something behind it;
// the licence and help links are fixed pages.
import { CATALOGUE_HREF, HSE_TEST_HREF } from "@/lib/routes";

const lic = (s) => `/licences/${s}`;

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
    { id: "near", label: "Location", width: 980 },
    { id: "help", label: "Help & guides", width: 900 },
  ],

  courses: {
    title: "Browse by subject",
    topTitle: "Top courses",
    all: { label: "Browse all courses", href: CATALOGUE_HREF },
    // the subjects, methods and popular courses come from the live catalogue (useNav)
    popular: { title: "Popular courses", hint: "Choose a subject to see its courses", count: 4 },
    allOf: (label) => `All ${label} courses`,
  },

  // what each licence or card needs, in one line (the guides in data/licences.js have the detail)
  licences: {
    title: "Licences and cards",
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
    submit: "Find courses",
    locate: "Use my location",
    locating: "Finding you...",
    locateFailed: "We couldn't get your location. Type your town or postcode instead.",
    // the towns with live dates (useNav), most courses first
    citiesTitle: "Towns with courses",
    cities: 12,
    online: {
      title: "No venue near you?",
      items: [
        { label: "Live online courses", meta: "With a tutor, from home", href: "/courses/live-online" },
        { label: "Self-paced courses", meta: "Start any time", href: "/courses/self-paced" },
      ],
    },
    all: { label: "Browse all courses", href: CATALOGUE_HREF },
  },

  help: {
    title: "Help and guides",
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

// the same four menus in the phone menu (components/home/HomeMobileMenu): a section opens to its groups, a group to its links.
// `nav` is the live catalogue's (useNav).
const N = headerNav;
export const mobileMenu = (nav) => [
  {
    title: N.sections[0].label,
    links: [
      { title: N.courses.title, links: nav.subjects.map((s) => ({ label: s.label, href: s.href })) },
      { title: "Study method", links: nav.methods.map((m) => ({ label: m.name, href: m.href })) },
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
      ...(nav.towns.length ? [{ title: N.near.citiesTitle, links: nav.towns.slice(0, N.near.cities).map((t) => ({ label: t.name, href: t.href })) }] : []),
      { title: N.near.online.title, links: N.near.online.items.filter((i) => nav.methods.some((m) => i.href.endsWith(m.slug))).map((i) => ({ label: i.label, href: i.href })) },
      { label: N.near.all.label, href: N.near.all.href },
    ],
  },
  {
    title: N.sections[3].label,
    links: N.help.groups.map((g) => ({ title: g.title, links: g.items.map((i) => ({ label: i.label, href: i.href })) })),
  },
];
