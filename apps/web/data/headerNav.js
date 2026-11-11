// The site header (components/header): its words and the four menus. The subjects, study methods, popular courses, towns and
// the courses you can search for near you are the live catalogue's (lib/nav.js, useNav), so every link has something behind it;
// the licence and help links are fixed pages.
import { CATALOGUE_HREF, HSE_TEST_HREF } from "@/lib/routes";
import { TEAM } from "@/lib/teamTraining";
import { shortCourseName } from "@/lib/nav";

const lic = (s) => `/licences/${s}`;

export const headerNav = {
  // the strip's audience links: the one for the page you are on shows as current ("For learners" is the home page)
  audiences: [
    { label: "For learners", href: "/" },
    { label: "Book for your team", href: "/for-business" },
    { label: "List your courses", href: "/for-providers" },
  ],
  menu: { close: "Close menu" },

  // the four menus, each opening a card of three 224px columns (components/header/NavCard)
  sections: [
    { id: "courses", label: "Explore courses" },
    { id: "licences", label: "Licences" },
    { id: "near", label: "Location" },
    { id: "help", label: "Help & guides" },
  ],

  // the subjects, methods and popular courses come from the live catalogue (useNav)
  courses: {
    // up to `perColumn` subjects in one column, more in two; more than `max`: the ones with the most courses, then "All N subjects"
    subjects: { title: "Subjects", icon: "book", perColumn: 7, max: 14, all: (n) => `All ${n} subjects` },
    // the ways of study in use, each with a short line (by the method's slug; one without a line shows its name only)
    methods: {
      title: "How you study",
      icon: "cap",
      meta: { classroom: "At a venue near you", "live-online": "With a tutor, from home", "self-paced": "Start any time" },
      // after the catalogue's methods: training for a team at their workplace (a quote, on the For Business page)
      inhouse: { label: "In-house", meta: TEAM.short, href: "/for-business" },
    },
    // the catalogue's order: most providers first, then most upcoming dates; before launch it must count bookings or the
    // client's own booking records (QA fix list, item 21), or it can't be called "popular"
    popular: { title: "Popular courses", icon: "growth", count: 4 },
    all: { label: "Browse all courses", href: CATALOGUE_HREF },
  },

  // each licence or card: what it needs on the first line, its fee (or a second fact) on the second (the guides in
  // data/licences.js have the detail). Security first and Other last; the third column holds Construction with Other under it.
  licences: {
    groups: [
      {
        title: "Security (SIA)",
        icon: "shield",
        items: [
          { label: "Door Supervisor", need: ["6 days · First aid certificate", "£204 SIA fee"], href: lic("sia-door-supervisor-licence") },
          { label: "Security Guard", need: ["4 days · First aid certificate", "£204 SIA fee"], href: lic("sia-security-guard-licence") },
          { label: "CCTV Operator", need: ["3 days", "£204 SIA fee"], href: lic("sia-cctv-licence") },
          { label: "Close Protection", need: ["18 days · Level 3 first aid", "£204 SIA fee"], href: lic("sia-close-protection-licence") },
        ],
      },
      {
        title: "Alcohol licensing",
        icon: "glass",
        items: [
          { label: "Personal Licence (APLH)", need: ["APLH course · Basic DBS check", "£37 council fee"], href: lic("personal-licence") },
          { label: "Premises Licence", need: ["Council application", "Premises supervisor"], href: lic("premises-licence") },
          { label: "Occasional Licence", need: ["Scotland · Up to 14 days", "£10 fee"], href: lic("occasional-licence") },
        ],
      },
      {
        title: "Construction",
        icon: "helmet",
        items: [
          { label: "CSCS cards", need: ["Qualification · CITB HS&E test", "£36 card fee"], href: lic("cscs-cards") },
          { label: "CITB HS&E test", need: ["Book the touch-screen test"], href: HSE_TEST_HREF },
        ],
      },
      {
        title: "Other",
        icon: "tag",
        items: [{ label: "Forklift", need: ["No official licence", "Accredited operator training"], href: lic("forklift-licence") }],
      },
    ],
    all: { label: "Compare all licences and cards", href: "/licences" },
  },

  near: {
    find: { title: "Find a course near you", icon: "pin" },
    town: { label: "Town or postcode", placeholder: "e.g. Leeds or LS1 4AP" },
    course: { label: "Course", any: "Any course" },
    submit: "Find courses",
    locate: "Use my location",
    locating: "Finding you...",
    locateFailed: "We couldn't get your location. Type your town or postcode instead.",
    // the towns with live dates (useNav), most courses first
    citiesTitle: "Towns with courses",
    citiesIcon: "town",
    cities: 8,
    online: {
      title: "No venue near you?",
      icon: "screen",
      items: [
        { label: "Live online courses", meta: "With a tutor, from home", href: "/courses/live-online" },
        { label: "Self-paced courses", meta: "Start any time", href: "/courses/self-paced" },
      ],
    },
    all: { label: "Search all courses near you", href: CATALOGUE_HREF },
  },

  help: {
    groups: [
      {
        title: "Prepare",
        icon: "check",
        items: [
          { label: "Test prep and mock exams", meta: "Practise for SIA and CSCS tests", href: "/test-prep" },
          { label: "CITB HS&E test", meta: "Book your touch-screen test", href: HSE_TEST_HREF },
          { label: "Licence guides", meta: "What each licence needs", href: "/licences" },
        ],
      },
      {
        title: "Guides",
        icon: "document",
        items: [
          { label: "Renew your SIA licence", meta: "When and how to apply", href: "/blog/how-to-renew-your-sia-licence" },
          { label: "Which SIA licence?", meta: "Door supervisor or guard", href: "/blog/door-supervisor-or-security-guard" },
          { label: "All articles", meta: "Training guides and advice", href: "/blog" },
        ],
      },
      {
        title: "Help",
        icon: "help",
        items: [
          { label: "Help centre", meta: "Booking and course answers", href: "/help-centre" },
          { label: "Contact us", meta: "Phone, email or message", href: "/contact-us" },
          { label: "Check a certificate", meta: "Is a certificate genuine?", href: "/certificate-checker" },
        ],
      },
    ],
    all: { label: "Visit the Help centre", href: "/help-centre" },
  },
};

// the same four menus in the phone menu (components/home/HomeMobileMenu): a section opens to its groups, a group to its links,
// and each section ends with its "all …" link (`more`), as a desktop card's footer. `nav` is the live catalogue's (useNav).
const N = headerNav;
export const mobileMenu = (nav) => [
  {
    title: N.sections[0].label,
    links: [
      { title: N.courses.subjects.title, links: nav.subjects.map((s) => ({ label: s.label, href: s.href })) },
      ...(nav.courses.length ? [{ title: N.courses.popular.title, links: nav.courses.slice(0, N.courses.popular.count).map((c) => ({ label: shortCourseName(c.title), href: c.href })) }] : []),
      { title: N.courses.methods.title, links: [...nav.methods.map((m) => ({ label: m.name, href: m.href })), { label: N.courses.methods.inhouse.label, href: N.courses.methods.inhouse.href }] },
      { label: N.courses.all.label, href: N.courses.all.href, more: true },
    ],
  },
  {
    title: N.sections[1].label,
    links: [...N.licences.groups.map((g) => ({ title: g.title, links: g.items.map((i) => ({ label: i.label, href: i.href })) })), { label: N.licences.all.label, href: N.licences.all.href, more: true }],
  },
  {
    title: N.sections[2].label,
    links: [
      ...(nav.towns.length ? [{ title: N.near.citiesTitle, links: nav.towns.slice(0, N.near.cities).map((t) => ({ label: t.name, href: t.href })) }] : []),
      // "No venue near you?": the online ways of study in use; left out when there are none
      ...[{ title: N.near.online.title, links: N.near.online.items.filter((i) => nav.methods.some((m) => i.href.endsWith(m.slug))).map((i) => ({ label: i.label, href: i.href })) }].filter((g) => g.links.length),
      { label: N.near.all.label, href: N.near.all.href, more: true },
    ],
  },
  {
    title: N.sections[3].label,
    links: [...N.help.groups.map((g) => ({ title: g.title, links: g.items.map((i) => ({ label: i.label, href: i.href })) })), { label: N.help.all.label, href: N.help.all.href, more: true }],
  },
];
