// The home page's fixed wording. Courses, subjects, methods and towns come from the live catalogue (catalogue.nav); the trust
// numbers, featured courses and FAQs can be changed in Admin › Site content (contentDefaults is their built-in wording).

import { courseSearch } from "@/data/courseTopics";
import { CATALOGUE_HREF, QUOTE_HREF } from "@/lib/routes";

// a route that searches the courses for some words (`q`: one or more ways the course is named, the first that a live course
// has is searched for); the finder shows it only while a live course matches one of them. `slug` keeps the client's original
// path.
const course = (words, slug) => ({ slug, q: [].concat(words) });

// How to reach the team, used across the site. The phone is the landline on the client's Google listing (so the site and the
// listing match); the mobile is for WhatsApp only. Hours as on the Google listing.
export const topBar = {
  phone: "020 3488 5052",
  phoneHref: "tel:+442034885052",
  email: "info@readtraining.co.uk",
  hours: "Mon to Sat, 8:00am to 6:00pm",
  hoursLong: "Monday to Saturday, 8:00am to 6:00pm",
  // our WhatsApp number (the client's mobile; WhatsApp only), opened through wa.me
  whatsapp: { number: "07405 098062", href: "https://wa.me/447405098062" },
};

export const hero = {
  eyebrow: "Vocational training across the UK",
  title: "Book accredited training.",
  titleLine2: "Get certified",
  titleAccent: "sooner.",
  text: "Search vocational and compliance training from trusted UK training providers,",
  text2: "explore available dates and locations, and choose the option that suits you.",
  subline: "Compare accredited providers, dates and prices in one place. No account needed to search.",
  primaryButton: { label: "Find Courses", href: CATALOGUE_HREF },
  secondaryButton: { label: "Book for your team", href: "/for-business" },
  coursePlaceholder: "Search for a course",
  locationPlaceholder: "Town or postcode",
  popular: [
    { href: courseSearch("Door Supervisor"), label: "Door Supervisor", slug: "/course/sia-door-supervisor-training" },
    { href: courseSearch("Emergency First Aid"), label: "Emergency First Aid", slug: "/course/emergency-first-aid-at-work-training-1-day" },
    { href: courseSearch("CSCS Green Card"), label: "CSCS Green Card", slug: "/course/cscs-green-card-labourers-card-course" },
  ],
};

export const bookingOptions = {
  eyebrow: "Why book through ReadTraining",
  title: "Booking options built for learners and teams",
  text: "Choose the learning method, location and booking route that suits your schedule.",
  benefits: [
    { icon: "icon-search", title: "More choice in one place", text: "Explore suitable dates, locations and study methods without searching across multiple training websites." },
    // payment protection comes with online payment (Milestone 4): said as what will happen
    { icon: "icon-badge", title: "Payment protection", text: "When online booking opens, we’ll hold your payment until the required result or certificate is supplied, and handle refunds if issues arise." },
    { icon: "icon-star", title: "Packages on selected courses", text: "Some courses come in packages, such as the course with the first aid it needs, for less than booking each one separately." },
    { icon: "icon-message", title: "Support throughout your booking", text: "Get help choosing, booking and managing your course from start to finish." },
  ],
  // the client's own SIA Door Supervisor packages and starting prices (docs/door-supervisor-course (1).html; the course page's
  // packages are data/courseGuides.js `packages`)
  example: { eyebrow: "Example packages", course: "SIA Door Supervisor Course", meta: "Classroom" },
  tiers: [
    { type: "Course only", price: 249.99, text: "You already hold a valid first aid (EFAW) certificate." },
    { type: "Course + first aid", price: 319.99, text: "Everything a new starter needs to qualify.", recommended: true },
    { type: "Career bundle", price: 479.99, text: "Stand out to employers from day one." },
  ],
  // which tiers include each feature (index into tiers)
  features: [
    { label: "6-day SIA Door Supervisor course", tiers: [0, 1, 2] },
    { label: "Exams, registration and certificate", tiers: [0, 1, 2] },
    { label: "Free mock exams and study guide", tiers: [0, 1, 2] },
    { label: "1-day Emergency First Aid at Work (EFAW)", tiers: [1, 2] },
    { label: "Priority licence application support", tiers: [1, 2] },
    { label: "SIA CCTV Operator course", tiers: [2] },
    { label: "CV review and access to our security job board", tiers: [2] },
  ],
  footnote: "Starting prices including VAT; they vary by location and date. The SIA licence fee is paid separately, to the SIA.",
  disclaimer: "Courses are delivered by independent training providers. ReadTraining helps you find, book and manage the option that suits you.",
  cta: { label: "Find course options", href: CATALOGUE_HREF },
};

// "What do you need training for?" course finder: four goals (each with its own icon), each with its own routes.
export const courseFinder = {
  eyebrow: "Course finder",
  title: "What do you need training for?",
  text: "Start with your goal, or browse training by subject.",
  goals: [
    {
      label: "Get an SIA licence", text: "Find the training required for a new SIA licence.", icon: "icon-badge",
      panelTitle: "Which security role are you training for?", panelText: "Choose the licence route that matches the work you want to do.",
      routes: [
        { title: "Door Supervisor", text: "Work in licensed premises, events and many public-facing security roles.", ...course("Door Supervisor", "/course/sia-door-supervisor-training") },
        { title: "Security Guard", text: "Work in guarding roles where licensed-premises duties are not required.", ...course("Security Guard", "/course/sia-security-guard-training-course") },
        { title: "CCTV Operator", text: "Monitor public space surveillance systems.", ...course("CCTV Operator", "/course/sia-cctv-operator-training") },
        { title: "Close Protection", text: "Train for specialist personal-protection work.", ...course("Close Protection", "/course/close-protection") },
      ],
      allLabel: "Browse all SIA courses", allHref: "/courses/security",
    },
    {
      label: "Renew my SIA licence", text: "Find the correct refresher training.", icon: "icon-time-management",
      panelTitle: "Which qualification do you need to renew?", panelText: "Select your current licence type to find the relevant refresher course.",
      // providers name renewal training "Refresher" or "Top-Up" (the catalogue's SIA top-up topics); a course's length is on its
      // own page, as providers' differ
      routes: [
        { title: "Door Supervisor", text: "Updated search procedures, terror threat awareness, vulnerability, spiking prevention and physical intervention.", ...course(["Door Supervisor Refresher", "Door Supervisor Top-Up"], "/course/sia-top-up-refresher-training-door-supervisor") },
        { title: "Security Guard", text: "Updated search procedures, vulnerability awareness, supporting vulnerable people and current terror threat response.", ...course(["Security Guard Refresher", "Security Officer Refresher", "Security Guard Top-Up", "Security Officer Top-Up"], "/course/sia-top-up-refresher-training-security-guard") },
        { title: "Close Protection", text: "Incident analysis, threat management, protective cordons and ethical physical intervention techniques.", ...course(["Close Protection Refresher", "Close Protection Top-Up"], "/course/sia-close-protection-top-up-course") },
      ],
      allLabel: "Browse all SIA courses", allHref: "/courses/security",
    },
    {
      label: "Get a CSCS card", text: "Find the qualification route for the card you need.", icon: "icon-document",
      panelTitle: "Which CSCS card or role are you working towards?", panelText: "Choose the route that best matches the work you want to do.",
      // only the cards a course on the site leads to (the other cards need an NVQ or a degree, not a course booked here)
      routes: [
        { title: "Green Labourer Card", text: "For labouring roles requiring health and safety training and the relevant CITB test.", ...course("CSCS Green Card", "/course/cscs-green-card-labourers-card-course") },
      ],
      allLabel: "Browse all construction courses", allHref: "/courses/construction",
    },
    {
      label: "Need an NVQ", text: "Search NVQs by occupation, trade or level.", icon: "icon-graduate-cap",
      panelTitle: "What occupation or trade is the NVQ for?", panelText: "Search by occupation, trade or qualification level to find a relevant route.",
      routes: [
        { title: "Construction Site Supervision", text: "Level 4 NVQ Diploma", ...course("Construction Site Supervision", "/course/level-4-nvq-diploma-in-construction-site-supervision") },
        { title: "Occupational Work Supervision", text: "Level 3 NVQ Diploma", ...course("Occupational Work Supervision", "/course/level-3-nvq-diploma-in-occupational-work-supervision") },
        { title: "Plant Operations", text: "Level 2 Diploma (Construction)", ...course("Plant Operations", "/course/level-2-diploma-in-plant-operations-construction") },
        { title: "Senior Construction Management", text: "Level 7 NVQ Diploma", ...course("Senior Construction Management", "/course/level-7-nvq-diploma-in-construction-senior-management") },
      ],
      allLabel: "Browse all NVQs", allHref: CATALOGUE_HREF,
    },
  ],
  help: `Need personal guidance? Call ${topBar.phone}`,
};

// Customer stories block: the reviews ticked for the home page (admin › Customer reviews, lib/siteReviews.js). There are no
// built-in reviews and no video story (the old ones were copied from another site): with none published the block is left
// out. Each reviewer shows their initials, never a stock photo.
export const stories = {
  eyebrow: "Customer stories",
  title: "Real experiences from people who trained with us",
  text: "A selection of our reviews, in our learners' own words.",
};

// The editable content's built-in values (Part B, B2): what the site shows for a key until an admin saves one in the admin
// (API content.site). Same shapes as the API checks; lib/siteContent.js merges them.
export const contentDefaults = {
  // only numbers we can prove (UK law bans unverifiable review claims). The rating and number of reviews count every one of our
  // reviews: Read Training's Google listing, checked 2 November 2026 (4.9 from 1,160). `source` is shown beside the rating as
  // text and `sourceUrl` is kept as a record, not shown; the client can clear them in admin › Site content › Trust numbers.
  // Update the numbers there as they change. Customers and courses have no proven figure yet, so the site leaves them out.
  trust: { rating: 4.9, reviews: 1160, customers: null, courses: null, source: "Google", sourceUrl: "https://www.google.com/maps?cid=8524470252183802666" },
  // the search-engine words (admin > Platform settings): the homepage's, and the description pages without their own use
  seo: {
    homeTitle: "ReadTraining | Accredited training courses across the UK",
    homeDescription: "Search vocational and compliance training from trusted UK training providers, explore dates and locations, and book with confidence.",
    siteDescription: "Find and book accredited training courses from trusted UK providers: compare dates, locations and prices in one place.",
  },
  // "Popular courses and qualifications": tabs of up to four courses. Until an admin picks the courses (by course number), each
  // tab shows its subjects' most popular live courses (`picks`, data/courseTopics.js); a tab with no live course is left out.
  featured: {
    groups: [
      { name: "Security & SIA", picks: ["security"] },
      { name: "First Aid & Health and Safety", picks: ["first-aid", "health-and-safety"] },
      { name: "Construction", picks: ["construction"] },
    ],
  },
};

export const teamBooking = {
  eyebrow: "For employers",
  title: "Training for teams, arranged in one go.",
  text: "Book several employees at once, ask us for a group quote by phone or email, and choose a training centre, your workplace or live online.",
  features: [
    { id: 1, title: "Book multiple employees", text: "Book several employees without repeating the booking process." },
    { id: 2, title: "Group quotes", text: "Call or email us about a group, repeat or larger booking and we will put a quote together." },
    { id: 3, title: "Flexible training locations", text: "Arrange training at your workplace, a training centre or another suitable venue for your team." },
  ],
  button: "Book for your team",
  href: "/for-business",
  secondary: "Request a quote",
  next: [
    { title: "We check availability", text: "Dates, venues and providers near you." },
    { title: "You get one quote", text: "Group pricing, clearly itemised." },
    { title: "Book in one go", text: "One invoice, certificates to each learner." },
  ],
  secondaryHref: QUOTE_HREF,
  // Illustrative team booking shown in the card (example figures).
  summary: {
    course: "Emergency First Aid at Work · 1 day",
    status: "Ready to confirm",
    learners: 8,
    date: "Mon 19 Oct 2026",
    venue: "Your workplace · Manchester",
    method: "Classroom",
    hint: "One booking, one invoice, certificates sent to each learner.",
    total: 720,
    saving: 80,
  },
};

export const providers = {
  eyebrow: "For training providers",
  title: "List your courses. Take bookings. Grow.",
  text: "Put your dates, venues and prices in front of learners across the UK and manage every booking from one place.",
  points: [
    { title: "List every date, venue and price", text: "Create course pages with live availability, study methods and booking options." },
    { title: "Bookings and learner details in one place", text: "When online booking opens, new bookings and learner details will arrive in your provider account." },
    { title: "Be found by learners across the UK", text: "Appear in searches by course, location and study method, with no upfront cost." },
  ],
  button: "List your courses",
  note: "Free to list · Commission only",
  href: "/for-providers",
  // a training provider's own words (Proshield Training, sent by the client with permission to use it)
  quote: { text: "We saw a steady stream of enquiries and bookings, and we’ve filled a good number of places on our courses through their site.", author: "Proshield Training", role: "Training provider" },
};

export const help = {
  eyebrow: "Need help?",
  title: "Talk to a real person.",
  text: "Not sure which course, date or booking option is right? Our UK team helps with requirements, locations and group bookings.",
  options: [
    { label: "Call us", value: topBar.phone, meta: topBar.hours, href: topBar.phoneHref },
    { label: "WhatsApp", value: "Message us", meta: topBar.hours, href: topBar.whatsapp.href },
    { label: "Help centre", value: "Guides, FAQs and requirements", meta: "Guides, FAQs and requirements", href: "/help-centre" },
  ],
  button: "Visit Help Centre",
  href: "/help-centre",
};

export const footer = {
  about: "Browse and book vocational and compliance training across the UK, with classroom, live online and self-paced options available.",
  phone: topBar.phone,
  hours: topBar.hours,
  address: "London, United Kingdom",
  email: "info@readtraining.co.uk",
  columns: [
    // the first two columns are the live catalogue's (components/home/HomeFooter, useNav): the study methods and subjects that
    // have courses, and the most popular courses, so no link leads to an empty search
    { title: "Find a course", live: "find" },
    { title: "Popular courses", live: "popular" },
    {
      title: "For providers",
      links: [
        { href: "/for-providers", label: "List Your Course" },
        { href: "/skill-saver", label: "Skill Saver Programme" },
        { href: "/provider-skill-saver", label: "Provider Skill Saver" },
        { href: "/providers", label: "Listed Training Providers" },
        { href: "/security-jobs", label: "Security Jobs" },
      ],
    },
    {
      title: "Resources & company",
      links: [
        { href: "/help-centre", label: "Help Centre" },
        { href: "/blog", label: "Blog" },
        { href: "/test-prep", label: "Test Prep" },
        { href: "/certificate-checker", label: "Verify Certificate" },
        { href: "/customer-reviews", label: "Customer reviews" },
        { href: "/about-us", label: "About ReadTraining" },
        { href: "/contact-us", label: "Contact us" },
      ],
    },
  ],
  accreditations: ["SIA", "CITB", "CSCS", "Highfield", "Qualsafe", "Ofqual-regulated"],
  legal: [
    { href: "/terms-and-conditions", label: "Terms & Conditions" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/cookie-policy", label: "Cookie Policy" },
    { href: "/accessibility-statement", label: "Accessibility" },
    { href: "/provider-terms", label: "Provider Terms" },
  ],
};
