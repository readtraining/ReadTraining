import { bookingOptions, footer, founded } from "@/data/home";
import { trustFigures } from "@/lib/siteContent";
import { CATALOGUE_HREF } from "@/lib/routes";

// About ReadTraining (/about-us). The section headings follow the client's current About page (hurak.com/about-us: "Get to
// know…", "Who we are", "What we do", "Why we do it", the mission statement). The copy written for this page lives here; numbers, accreditations, booking promises and
// contact details are imported from data/home and the trust numbers from lib/siteContent.js, so the About and home pages always
// say the same thing.

const accreditations = footer.accreditations;
// "SIA, CITB, CSCS, Highfield and Qualsafe" (the bodies; "Ofqual-regulated" describes qualifications, not a body)
const bodies = accreditations.filter((a) => !/regulated/i.test(a));
const bodyList = `${bodies.slice(0, -1).join(", ")} and ${bodies[bodies.length - 1]}`;

export const about = {
  title: "About us | ReadTraining",
  description: "ReadTraining is a UK marketplace for accredited training: compare courses, dates and prices from approved providers and book in one place.",
  hero: {
    eyebrow: "About ReadTraining",
    title: ["Get to know ReadTraining"],
    lead: "We bring accredited UK training providers together in one marketplace, so learners and employers can compare courses, dates and prices and book with confidence.",
    primary: { label: "Find courses", href: CATALOGUE_HREF },
    secondary: { label: "Contact us", href: "/contact-us" },
  },
  story: {
    eyebrow: "Our story",
    title: "Who we are",
    paragraphs: [
      "Finding the right course used to mean searching provider by provider, comparing dates, venues and prices across dozens of websites. We built ReadTraining to put it all in one place.",
      "Accredited training providers list their courses with us, so you can compare them side by side and book in a few minutes. The provider delivers the course; we make it simple to find the right one and support you from booking to certificate.",
    ],
    promisesLabel: "What we do",
    promises: bookingOptions.benefits,
  },
  // StepsSection's shape (as /for-business): eyebrow, title, text and four steps with an icon each
  steps: {
    eyebrow: "How it works",
    title: "From search to certificate",
    text: "Every booking follows the same simple path, whichever provider runs your course.",
    steps: [
      { title: "Search", text: "Look up a course by name, subject or location, classroom or online.", icon: "icon-search" },
      { title: "Compare", text: "See dates, venues, prices and reviews from different providers side by side.", icon: "icon-list" },
      { title: "Book", text: "Choose your date and booking option and pay securely in a few minutes.", icon: "icon-basket" },
      { title: "Get certified", text: "Attend your course with the provider and receive your qualification.", icon: "icon-badge" },
    ],
  },
  audiences: {
    eyebrow: "Who we help",
    title: "Why we do it",
    text: "One marketplace for the people who need training, the teams that buy it and the providers who deliver it.",
    items: [
      { icon: "icon-person", title: "Learners", text: "Find an accredited course near you or online, compare your options and book in minutes.", link: { label: "Find a course", href: CATALOGUE_HREF } },
      { icon: "icon-person-3", title: "Businesses", text: "Book and manage training for your whole team from one account, with group quotes and credit options.", link: { label: "Training for business", href: "/for-business" } },
      { icon: "icon-book", title: "Training providers", text: "List your courses, take bookings and reach learners across the UK, with no upfront cost.", link: { label: "List your courses", href: "/for-providers" } },
    ],
  },
  mission: {
    eyebrow: "Our mission statement",
    text: "To make accredited training easy to find, compare and book, for every learner and employer in the UK.",
    marksLabel: "Courses lead to qualifications, licences and cards from",
    accreditations,
  },
  faq: {
    eyebrow: "FAQs",
    title: "Questions about ReadTraining",
    items: [
      { q: "Is ReadTraining a training provider?", a: "No. ReadTraining is a marketplace. Accredited training providers list their courses with us, and you book through ReadTraining. The provider delivers the course and arranges your certificate." },
      { q: "Who delivers the courses?", a: "Independent training providers, in classrooms across the UK, live online or as online self-paced courses. Each course page shows the provider, the venue and what is included." },
      { q: "Are the courses accredited?", a: `Courses lead to recognised qualifications, licences and cards from awarding and licensing bodies such as ${bodyList}. Each course page shows the qualification you will get.` },
      { q: "How are training providers checked?", a: "Providers are approved before they can publish courses on ReadTraining, and each course must follow the rules for its qualification. Reviews from learners on every course help you choose." },
      { q: "Can I book training for my team?", a: "Yes. You can book places for several learners at once, ask for a group quote, or open a business account to manage your team's training in one place." },
    ],
  },
  cta: {
    title: "Ready to find your course?",
    text: "Compare accredited courses, dates and prices from providers across the UK.",
    primary: { label: "Find courses", href: CATALOGUE_HREF },
    secondary: { label: "Talk to our team", href: "/contact-us" },
  },
};

// the key facts strip on the hero's lower edge (SubjectFacts): the trust numbers (the site's editable content; call after
// loadSiteContent())
export const aboutFacts = () => {
  const t = trustFigures();
  return [
    { icon: "icon-wall-clock", value: `Est. ${founded}`, label: "Training people across the UK" },
    { icon: "icon-person-3", value: t.customers, label: "Customers" },
    { icon: "icon-book", value: t.courses, label: "Courses to compare" },
    { icon: "icon-star", value: t.ratingSlash, label: `From ${t.reviews} verified reviews` },
  ];
};
