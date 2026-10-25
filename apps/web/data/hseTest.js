// The CITB Health, Safety and Environment (HS&E) test, often called "the CSCS test": the test page
// (/tests/citb-health-safety-and-environment-test), the test centre directory (/cscs-test-centres) and a centre's page
// (/tests-locations/cscs-citb-tests-<town>). The client's current pages (hurak.com, same URLs) gave the functions only: the test
// explained and booked through us with a revision book, a directory of centres, and a page per centre. Layout and wording are
// ours. Facts are the ones our CSCS card guide uses (data/licences.js, checked against CITB and CSCS on 12 October 2026):
// 50 questions in 45 minutes, 90% to pass, £23.50 to CITB, and a pass must be from the last 2 years to apply for a card.
// DEMO until confirmed by the client: our booking price and what it includes, and the centre list (taken from the client's
// directory, which lists Pearson VUE centres; check against CITB's own finder before launch).

import { TOPICS } from "@/data/courseTopics";

export const HSE_PRICE = 41.99; // our price: the test booked for you plus the revision book
export const CITB_FEE = 23.5; // booking it yourself with CITB

export const hseTest = {
  title: "CITB HS&E test: book your CSCS test | ReadTraining",
  description: "Book the CITB Health, Safety and Environment test you need for most CSCS cards. 50 questions in 45 minutes at a test centre near you, with a revision book included.",
  hero: {
    label: "Construction",
    title: "Book your CITB HS&E test",
    lead: "The Health, Safety and Environment test, often called the CSCS test, is the one you need for most CSCS cards. We book it at a test centre near you and send you the revision book.",
    book: "Book your test",
    find: "Find a test centre",
  },
  facts: [
    { icon: "icon-document", value: "50", label: "Multiple-choice questions" },
    { icon: "icon-wall-clock", value: "45 min", label: "To answer them" },
    { icon: "icon-badge", value: "90%", label: "To pass (45 of 50)" },
    { icon: "icon-location", value: "UK-wide", label: "Test centres" },
  ],
  booking: {
    eyebrow: "Book with us",
    title: "We book it. You revise.",
    text: "Tell us the test you need and where you'd like to sit it. We find a date at that centre, book it for you and post the revision book.",
    includes: ["Your test booked at the centre you choose", "The official revision book with 400+ questions and answers", "Free mock tests on ReadTraining", "Help choosing the right test for your card"],
    priceLabel: "Booked for you",
    priceNote: "Includes the CITB test fee",
    selfNote: "You can also book it yourself with CITB for £23.50, without the revision book.",
    cta: "Book your test",
  },
  types: {
    eyebrow: "Which test do I need?",
    title: "Three tests. Your card decides.",
    text: "All three have 50 questions, take 45 minutes and need 90% to pass. The one you take depends on the CSCS card you're applying for.",
    unlocks: "For these cards",
    items: [
      { key: "operatives", name: "Operatives test", who: "For most site workers: labourers, skilled trades and trainees.", match: "Operatives" },
      { key: "specialist", name: "Specialist test", who: "For specialist work, such as supervising, demolition, highway works, plumbing or gas, and work at height.", match: "Specialist" },
      { key: "managers", name: "Managers and Professionals test", who: "For site and project managers, and people with a construction degree or professional membership.", match: "Managers and Professionals" },
    ],
    guide: { label: "Find the CSCS card you need", href: "/licences/cscs-cards" },
  },
  sections: [
    {
      id: "about",
      heading: "About the HS&E test",
      blocks: [
        { text: "The CITB Health, Safety and Environment test checks that you know how to work safely on a construction site. Passing it is part of applying for most CSCS cards, the cards most sites ask to see before you can work." },
        { text: "You take it on a computer at a test centre. The questions are multiple choice, and you get your result before you leave." },
      ],
    },
    {
      id: "structure",
      heading: "Test structure",
      blocks: [
        { text: "Every test has 50 questions to answer in 45 minutes. You need 45 correct answers (90%) to pass. The questions cover five areas:" },
        { type: "table", rows: [["Area", "What it covers"], ["Legal and management", "Your responsibilities and your employer's, and reporting accidents"], ["Health and welfare", "First aid, manual handling, noise, dust and hazardous substances"], ["General safety", "Personal protective equipment, fire, electrical safety and site vehicles"], ["High-risk activities", "Working at height, excavations and confined spaces"], ["Environment", "Waste, pollution and protecting wildlife on site"]] },
      ],
    },
    {
      id: "bring",
      heading: "What to bring on the day",
      blocks: [
        { type: "ul", items: ["Photo ID with your full name and signature, such as a passport or a UK photocard driving licence", "Your booking confirmation", "Glasses, if you need them for reading a screen"] },
        { type: "note", text: "Arrive early. If you are late, you may not be able to sit the test and you may have to pay again." },
      ],
    },
    {
      id: "results",
      heading: "Results and retakes",
      blocks: [
        { text: "You get your result at the test centre. When you apply for a CSCS card, your pass must be from the last 2 years." },
        { text: "If you don't pass, you can book the test again. You pay the test fee each time, so use the revision book and the mock tests before you go." },
      ],
    },
    {
      id: "prepare",
      heading: "How to prepare",
      blocks: [
        { type: "ol", items: ["Read the revision book. It has the questions the test draws on, with the answers.", "Take the free mock tests on ReadTraining until you score 90% or more.", "Check the test type you need for your card before you book."] },
      ],
    },
    {
      id: "card",
      heading: "After the test: your CSCS card",
      blocks: [
        { text: "With your test pass and the qualification for your card, you apply to CSCS. The card fee is £36. Our CSCS card guide shows which card you need and what each one asks for, and we can apply for you." },
      ],
    },
  ],
  centres: {
    eyebrow: "Test centres",
    title: "Find a test centre near you",
    text: "Enter your postcode or town to see the nearest centres.",
    all: "See all test centres",
  },
  courses: {
    title: "Training for your CSCS card",
    text: "Most cards need a qualification as well as the test. The green card course is the usual first step.",
    all: { label: "All construction courses", href: "/courses?subject=construction" },
    picks: [TOPICS.cscsGreen, TOPICS.smsts, TOPICS.sssts],
  },
  faqs: [
    { q: "Do I need the HS&E test for every CSCS card?", a: "For most of them. The Apprentice card is one of the few that doesn't need it. Our CSCS card guide lists what each card needs." },
    { q: "Which test should I take?", a: "It depends on your card: the Operatives test for most site workers, a Specialist test for specialist work, and the Managers and Professionals test for managers and professionally qualified people. If you're not sure, choose 'Not sure' when you book and we'll check with you." },
    { q: "How long is my pass valid for?", a: "When you apply for a CSCS card, your test pass must be from the last 2 years." },
    { q: "Can I retake the test if I don't pass?", a: "Yes. You can book it again and you pay the test fee each time." },
    { q: "Is CITB the same as CSCS?", a: "No. CITB, the Construction Industry Training Board, runs the HS&E test. CSCS, the Construction Skills Certification Scheme, issues the cards." },
    { q: "What does booking with ReadTraining include?", a: "We book the test at the centre you choose and post you the revision book with 400+ questions and answers. The CITB test fee is included in our price." },
  ],
  request: {
    title: "Book your CITB HS&E test",
    note: "Tell us what you need and we'll find a date at your chosen centre. You pay by secure link once the date is agreed.",
    type: "Test type",
    types: ["Operatives", "Specialist (tell us which below)", "Managers and Professionals", "Not sure"],
    centre: "Test centre",
    centreAny: "Not sure yet, suggest one near me",
    when: "When would you like to sit it?",
    whens: ["As soon as possible", "In the next 2 weeks", "In the next month", "On a specific date (tell us below)"],
    notes: "Anything we should know (optional)",
    submit: "Send booking request",
    sending: "Sending…",
    failed: "We couldn't send your request. Check your connection and try again.",
    doneTitle: "Booking request sent",
    doneText: "Thanks. Your reference is {ref}. We'll email {email} within one working day with test dates at your chosen centre and a secure link to pay {price}.",
    close: "Close",
    privacy: { text: "We use your details to book your test.", label: "Privacy policy", href: "/privacy-policy" },
  },
  directory: {
    title: "CSCS test centres | ReadTraining",
    description: "Find a CITB Health, Safety and Environment (CSCS) test centre near you, across England, Scotland, Wales and Northern Ireland, and book your test.",
    heroTitle: "CSCS test centres",
    lead: "Find a test centre near you for the CITB Health, Safety and Environment test, the test you need for most CSCS cards.",
    searchLabel: "Postcode or town",
    searchPlaceholder: "e.g. LS1 or Leeds",
    search: "Find centres",
    near: "Nearest to {q}",
    none: { title: "No test centres match", text: "Check the spelling, or search with the first part of your postcode, like LS1." },
    lookupFailed: "We couldn't look up that postcode, so these centres match the text instead.",
    count: "{n} test centres",
    book: "Book a test here",
    view: "View centre",
    km: "{d} miles away",
  },
  centre: {
    lead: "Book your CITB Health, Safety and Environment test at the {name}, and find out what to expect on the day.",
    addressTitle: "Centre address",
    run: "Run by {provider}",
    map: "Open in Google Maps",
    mapNote: "The centre's entrance and any parking details are in your booking confirmation.",
    dayTitle: "On the day",
    nearby: "Other centres nearby",
    whereQ: "Where is the CSCS test centre in {town}?",
    whereA: "The {name} is at {address}, {postcode}. It is run by {provider}.",
  },
};

// The centres live in data/testCentres.js (small, so the header menu can link to them).
export { testCentres } from "./testCentres";
