import { about } from "@/data/about";
import { business } from "@/data/business";
import { bookingOptions, topBar } from "@/data/home";
import { provider } from "@/data/provider";
import { testPrepPage } from "@/data/testPrep";
import { terms } from "@/data/legal/terms";
import { CATALOGUE_HREF } from "@/lib/routes";

// The Help Centre (/help-centre): topics > articles, read through lib/help.js. The structure follows the client's current
// support hub (learners, businesses, providers); the answers are the site's own, imported from the pages that already give
// them (About, For Business, For Providers, Test Prep, the terms), so the Help Centre and those pages always agree. Article
// titles are tasks, not questions (GOV.UK). An article is { slug, title, summary, blocks } (blocks as in DocBlocks).

// an answer quoted from another page's FAQ; a renamed question fails loudly here rather than as an undefined further on
const faq = (items, q) => {
  const hit = items.find((x) => x.q === q);
  if (!hit) throw new Error(`Help Centre: the FAQ "${q}" no longer exists; update data/help.js`);
  return hit.a;
};
const fromAbout = (q) => faq(about.faq.items, q);
const fromBusiness = (q) => faq(business.faq.items, q);
const fromProvider = (q) => faq(provider.faq.items, q);
const fromTestPrep = (q) => faq(testPrepPage.faq.items, q);
const termsRefunds = (terms.sections.find((s) => s.id === "refunds-and-cancellations") || {}).blocks;
if (!termsRefunds) throw new Error("Help Centre: the terms section \"refunds-and-cancellations\" no longer exists; update data/help.js");
const tel = `[${topBar.phone}](tel:${topBar.phone.replace(/\s+/g, "")})`;
const contactLine = `If you need help, [send us a message](/contact-us) or call us on ${tel}, ${topBar.hours.replace("Mon to Fri", "Monday to Friday")}.`;

// what each booking option includes, as a table built from the home page's booking options
const optionsTable = {
  type: "table",
  caption: "What each booking option includes",
  rows: [
    ["What is included", ...bookingOptions.tiers.map((t) => t.type)],
    ...bookingOptions.features.map((f) => [f.label, ...bookingOptions.tiers.map((_, i) => (f.tiers.includes(i) ? "Included" : "Not included"))]),
  ],
};

export const helpTopics = [
  {
    slug: "booking-a-course",
    icon: "icon-search",
    title: "Booking and certificates",
    summary: "How booking works, ways to study, booking options, team bookings and certificates.",
    articles: [
      {
        slug: "how-booking-works",
        title: "How booking works",
        summary: "You book through ReadTraining and an accredited training provider runs your course.",
        blocks: [
          fromAbout("Is ReadTraining a training provider?"),
          fromAbout("Who delivers the courses?"),
          `[Search for a course](${CATALOGUE_HREF}), choose a date and book online, or call us on ${tel} and we will book it with you.`,
        ],
      },
      {
        slug: "choose-how-to-study",
        title: "Choose how to study",
        summary: "Classroom, live online or online self-paced: what each one means.",
        blocks: [
          "Many courses can be taken in more than one way. Each course page shows the ways it is available.",
          { type: "ul", items: ["**Classroom:** at a training venue, with a trainer and other learners.", "**Live online:** with a trainer at set times, joining from home or work.", "**Online self-paced:** in your own time, at your own pace."] },
          "Some qualifications need an in-person assessment, so not every course is available in every format.",
        ],
      },
      {
        slug: "booking-options",
        title: "Compare booking options",
        summary: "Basic, Plus and Pro, and what each one includes.",
        blocks: [
          `Some courses offer more than one booking option. ${bookingOptions.text}`,
          optionsTable,
          "The options and prices for each course are shown on its course page before you book.",
        ],
      },
      {
        slug: "book-for-a-team",
        title: "Book training for a team",
        summary: "Group places, in-house courses, quotes and business accounts.",
        blocks: [
          fromAbout("Can I book training for my team?"),
          "Group quotes start at 6 people. [Ask for a quote](/contact-us?topic=business#contact-form) and tell us the course, how many people and roughly when.",
          "To manage your team's places, learners and certificates in one place, see [Training for business](/for-business).",
        ],
      },
      {
        slug: "get-your-certificate",
        title: "Get your certificate",
        summary: "Your training provider arranges your certificate or result after the course.",
        blocks: [
          "Your training provider arranges your certificate, result or card application after you complete the course. The course page shows the qualification you will get.",
          "The Plus and Pro booking options include a faster result option.",
          `If your certificate has not arrived, [send us a message](/contact-us?topic=booking#contact-form) with your booking reference or call us on ${tel}.`,
        ],
      },
      {
        slug: "check-accreditation",
        title: "Check a course's accreditation",
        summary: "Which awarding and licensing bodies our courses lead to.",
        blocks: [fromAbout("Are the courses accredited?")],
      },
    ],
  },
  {
    slug: "changes-and-refunds",
    icon: "icon-wall-clock",
    title: "Changes, cancellations and refunds",
    summary: "Cancelling, changing your date, and how your payment is protected.",
    articles: [
      {
        slug: "cancel-a-booking",
        title: "Cancel a booking",
        summary: "Refunds follow the training provider's policy, shown at checkout.",
        blocks: [
          termsRefunds[0],
          "To cancel, [send us a message](/contact-us?topic=booking#contact-form) with your booking reference. We will explain your options under the provider's policy and handle any refund due through us.",
          "Read the full [refunds and cancellations terms](/terms-and-conditions#refunds-and-cancellations).",
        ],
      },
      {
        slug: "change-your-course-date",
        title: "Change your course date",
        summary: "Move to another date, depending on the provider's policy and your booking option.",
        blocks: [
          "Whether you can move to another date depends on the training provider's rescheduling policy and your booking option. The Plus and Pro booking options include flexible date rescheduling.",
          "To change your date, [send us a message](/contact-us?topic=booking#contact-form) with your booking reference and the dates that suit you.",
          "See [Compare booking options](/help-centre/booking-a-course/booking-options) for what each option includes.",
        ],
      },
      {
        slug: "tests-and-applications",
        title: "Cancel a test booking or card application",
        summary: "CITB tests, CSCS card and Personal Licence applications have their own rules.",
        blocks: [termsRefunds[1], contactLine],
      },
      {
        slug: "payment-protection",
        title: "How your payment is protected",
        summary: "We hold your payment until your result or certificate is supplied.",
        blocks: [
          bookingOptions.benefits.find((b) => b.title === "Payment protection").text,
          "The Pro booking option adds extra booking protection. See [Compare booking options](/help-centre/booking-a-course/booking-options).",
        ],
      },
    ],
  },
  {
    slug: "mock-tests",
    icon: "icon-document",
    title: "Free mock tests",
    summary: "Practising for your exam with our free mock tests.",
    articles: [
      {
        slug: "take-a-free-mock-test",
        title: "Take a free mock test",
        summary: "Every mock test is free, and your progress is saved on your device.",
        blocks: [
          `${fromTestPrep("Are the mock tests free?")} Find your test on [Test Prep](/test-prep).`,
          "Your progress and your last result are saved on the device you use, so you can pick up where you left off. Clearing your browser data removes them.",
        ],
      },
      { slug: "mock-tests-and-the-real-exam", title: "Mock tests and the real exam", summary: "How the mock tests compare with the real exam.", blocks: [fromTestPrep("Are these the real exam questions?")] },
      { slug: "time-limit-and-pass-mark", title: "Find a test's time limit and pass mark", summary: "Where to see the questions, time allowed and pass mark.", blocks: [fromTestPrep("How do I know how long a test is and what the pass mark is?")] },
      { slug: "choose-a-test", title: "Choose which test to take", summary: "Start with the test for the card, licence or qualification you need.", blocks: [fromTestPrep("Which test should I start with?")] },
      { slug: "book-after-practising", title: "Book a course after practising", summary: "Mock tests match courses you can book on ReadTraining.", blocks: [fromTestPrep("Can I book the course after I practise?")] },
    ],
  },
  {
    slug: "business-accounts",
    icon: "icon-person-3",
    title: "Business accounts",
    summary: "Buying places, managing learners, certificates and credit.",
    articles: [
      { slug: "buy-places-before-naming-learners", title: "Buy places before you name learners", summary: "Hold course places and assign them when you are ready.", blocks: [fromBusiness("Can we buy training before we know which employee will attend?")] },
      { slug: "track-learner-progress", title: "Track your learners' progress", summary: "See learners and their progress in your Business account.", blocks: [fromBusiness("What can we see after assigning training?")] },
      { slug: "certificates-and-expiry-dates", title: "See certificates and expiry dates", summary: "Know which training is due for renewal.", blocks: [fromBusiness("Can we access learner certificates and expiry dates?")] },
      { slug: "share-your-account", title: "Share your Business account with colleagues", summary: "Add team members with roles to share the admin.", blocks: [fromBusiness("Can more than one colleague manage the Business account?")] },
      { slug: "business-credit", title: "Pay with a Business credit account", summary: "Credit facilities for eligible regular customers.", blocks: [fromBusiness("How do Business credit accounts work?"), "To ask about credit, [send us a message](/contact-us?topic=business#contact-form)."] },
      { slug: "training-bought-elsewhere", title: "Training bought elsewhere", summary: "What the Business area covers.", blocks: [fromBusiness("Can we manage training bought elsewhere?")] },
    ],
  },
  {
    slug: "training-providers",
    icon: "icon-book",
    title: "Training providers",
    summary: "Listing courses, fees, payouts, invoices and refunds.",
    articles: [
      { slug: "become-a-provider", title: "Become a training provider", summary: "Who can list courses on ReadTraining.", blocks: [fromProvider("Who can become a provider?"), "See how it works on [For Providers](/for-providers)."] },
      { slug: "publish-your-courses", title: "Publish your courses", summary: "Preparing courses and dates for the marketplace, and keeping them up to date.", blocks: [fromProvider("How does marketplace publication work?"), fromProvider("What do providers need to manage after onboarding?")] },
      { slug: "fees-and-commission", title: "Fees and commission", summary: "No monthly subscription; a marketplace fee on sales.", blocks: [fromProvider("Is there a monthly provider subscription?"), fromProvider("What is the standard marketplace fee?"), fromProvider("How are transaction fees and commission calculated?")] },
      {
        slug: "when-payouts-are-made",
        title: "When payouts are made",
        summary: "Monthly, on the 28th, for the previous month's bookings.",
        blocks: [
          fromProvider("When are provider payouts made?"),
          "Before each payout we reconcile the month: we check the payments received, deduct the marketplace commission and apply any refunds, reschedules or disputed charges. If the 28th falls on a weekend or a UK bank holiday, the payout may be made on the next working day.",
        ],
      },
      { slug: "invoices", title: "Invoices for marketplace bookings", summary: "Who invoices whom for each booking.", blocks: [fromProvider("Who issues invoices for marketplace bookings?")] },
      { slug: "refunds-you-approve", title: "Refunds you approve", summary: "What happens when you approve a full refund.", blocks: [fromProvider("What happens if I approve a full refund?")] },
      { slug: "your-customers-and-policies", title: "Your customers and policies", summary: "Learners who book through us stay your customers.", blocks: [fromProvider("Are you a broker, reseller or agent?")] },
    ],
  },
  {
    slug: "account-and-data",
    icon: "icon-message",
    title: "Your data and getting in touch",
    summary: "Your personal data, cookies, accessibility and contacting us.",
    articles: [
      { slug: "your-personal-data", title: "See, correct or delete your data", summary: "Your rights over your personal information.", blocks: ["You can ask to see, correct, update or delete your personal information at any time by emailing [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk?subject=Privacy%20request).", "Read our [Privacy Policy](/privacy-policy) for how we use your information."] },
      { slug: "cookies", title: "Manage cookies", summary: "Which cookies we use and how to change your choices.", blocks: ["Essential cookies make the site work and are always on. Analytics and advertising cookies are only used with your consent.", "Our [Cookie Policy](/cookie-policy) lists every cookie, what it does and how long it lasts, and explains how to change your choices."] },
      { slug: "accessibility", title: "Accessibility and other formats", summary: "Getting help using the website or information in another format.", blocks: ["If you have difficulty using any part of the website, or need information in a different format such as large print or audio, please tell us.", "Read our [Accessibility Statement](/accessibility-statement). " + contactLine] },
      { slug: "contact-us", title: "Contact our team", summary: "Call, email or send us a message.", blocks: [`Call us on ${tel}, ${topBar.hours.replace("Mon to Fri", "Monday to Friday")}, or email [${topBar.email}](mailto:${topBar.email}). We reply within one working day.`, "You can also [send us a message](/contact-us#contact-form)."] },
    ],
  },
];

// the most asked-for answers, shown on the hub: [topic, article]
export const popularHelp = [
  ["booking-a-course", "how-booking-works"],
  ["changes-and-refunds", "cancel-a-booking"],
  ["changes-and-refunds", "change-your-course-date"],
  ["booking-a-course", "get-your-certificate"],
  ["mock-tests", "take-a-free-mock-test"],
  ["training-providers", "when-payouts-are-made"],
];

export const helpPage = {
  title: "Help Centre | ReadTraining",
  description: "Answers about booking courses, changes and refunds, certificates, mock tests, business accounts and listing courses as a training provider.",
  hero: {
    eyebrow: "Help Centre",
    title: ["How can we help?"],
    lead: "Search our help articles or choose a topic below.",
  },
  topicsTitle: "Browse by topic",
  popularTitle: "Popular articles",
  feedback: { question: "Was this article helpful?", yes: "Yes", no: "No", thanks: "Thank you for your feedback." },
  stillNeedHelp: {
    title: "Still need help?",
    text: `Our UK team is here ${topBar.hours.replace("Mon to Fri", "Monday to Friday")}.`,
    primary: { label: "Contact us", href: "/contact-us" },
    secondary: { label: `Call ${topBar.phone}`, href: `tel:${topBar.phone.replace(/\s+/g, "")}` },
  },
};
