// Home page content mirrored from the client's current site (hurak.com), September 2026.
// Headline and brand are ours; categories, courses, options and lists match the existing site.

import { courseLink } from "@/data/courseSlugs";
import { CATALOGUE_HREF, QUOTE_HREF } from "@/lib/routes";

const course = (slug) => ({ slug, href: courseLink(1) });

export const topBar = {
  phone: "0333 344 1293",
  email: "hello@readtraining.co.uk",
  hours: "Mon to Fri, 9:00am to 5:30pm",
  audiences: [
    { href: "/", label: "For Individuals" },
    { href: "/for-business", label: "For Businesses" },
    { href: "/for-providers", label: "For Training Providers" },
  ],
};

export const menu = [
  { href: CATALOGUE_HREF, label: "Courses" },
  { href: "/licences", label: "Licences & Cards" },
  { href: "/template/courses-list-3", label: "Locations" },
  { href: "/template/blog-list-1", label: "Resources" },
];

// The year ReadTraining was established (the home hero and the About page read it from here)
export const founded = 2011;

export const hero = {
  eyebrow: `Established in ${founded} · Vocational training across the UK`,
  title: "Book accredited training.",
  titleLine2: "Get certified",
  titleAccent: "sooner.",
  text: "Search vocational and compliance training from trusted UK training providers,",
  text2: "explore available dates and locations, and choose the option that suits you.",
  subline: "Compare accredited providers, dates and prices in one place. No account needed to search.",
  primaryButton: { label: "Find Courses", href: CATALOGUE_HREF },
  secondaryButton: { label: "Book for your team", href: "/for-business" },
  methods: ["All methods", "Classroom", "Live online", "Online self-paced"],
  coursePlaceholder: "Search for a course",
  locationPlaceholder: "Town or postcode",
  popular: [
    { href: courseLink(1), label: "Door Supervisor", slug: "/course/sia-door-supervisor-training" },
    { href: courseLink(1), label: "Emergency First Aid", slug: "/course/emergency-first-aid-at-work-training-1-day" },
    { href: courseLink(1), label: "CSCS Green Card", slug: "/course/cscs-green-card-labourers-card-course" },
  ],
};

export const employers = ["G4S", "Transport for London", "Armani", "North East Autism Society", "Balfour Beatty", "Kier", "Mace", "Skanska", "Berkeley Group", "Coventry College"];

export const bookingOptions = {
  eyebrow: "Why book through ReadTraining",
  title: "Booking options built for learners and teams",
  text: "Choose the learning method, location and booking route that suits your schedule.",
  benefits: [
    { icon: "icon-search", title: "More choice in one place", text: "Explore suitable dates, locations and study methods without searching across multiple training websites." },
    { icon: "icon-badge", title: "Payment protection", text: "We hold your payment until the required result or certificate is supplied, with refunds handled if issues arise." },
    { icon: "icon-star", title: "Selected booking benefits", text: "Some booking options include rescheduling, faster results, bonus learning or other useful extras." },
    { icon: "icon-message", title: "Support throughout your booking", text: "Get help choosing, booking and managing your course from start to finish." },
  ],
  example: { eyebrow: "Example booking options", course: "SIA Door Supervisor Course", meta: "Classroom · London" },
  tiers: [
    { type: "Basic", price: 199, text: "Standard course booking." },
    { type: "Plus", price: 224, text: "Added flexibility for date changes.", recommended: true },
    { type: "Pro", price: 244, text: "Extra protection and selected benefits." },
  ],
  // which tiers include each feature (index into tiers)
  features: [
    { label: "Course place in accredited classroom", tiers: [0, 1, 2] },
    { label: "Standard official learning materials", tiers: [0, 1, 2] },
    { label: "Flexible date rescheduling option", tiers: [1, 2] },
    { label: "Faster result option", tiers: [1, 2] },
    { label: "Extra booking protection", tiers: [2] },
    { label: "Bonus online course & study resources", tiers: [2] },
  ],
  footnote: "Example prices and benefits. Options vary by course, date and location.",
  disclaimer: "Courses are delivered by independent training providers. ReadTraining helps you find, book and manage the option that suits you.",
  cta: { label: "Find course options", href: CATALOGUE_HREF },
};

// "What do you need training for?" course finder: four goals, each with its own routes.
export const courseFinder = {
  eyebrow: "Course finder",
  title: "What do you need training for?",
  text: "Start with your goal, or browse training by subject.",
  goals: [
    {
      label: "Get an SIA licence", text: "Find the training required for a new SIA licence.",
      panelTitle: "Which security role are you training for?", panelText: "Choose the licence route that matches the work you want to do.",
      routes: [
        { title: "Door Supervisor", text: "Work in licensed premises, events and many public-facing security roles.", ...course("/course/sia-door-supervisor-training") },
        { title: "Security Guard", text: "Work in guarding roles where licensed-premises duties are not required.", ...course("/course/sia-security-guard-training-course") },
        { title: "CCTV Operator", text: "Monitor public space surveillance systems.", ...course("/course/sia-cctv-operator-training") },
        { title: "Close Protection", text: "Train for specialist personal-protection work.", ...course("/course/close-protection") },
      ],
      allLabel: "Browse all SIA courses", allHref: CATALOGUE_HREF,
    },
    {
      label: "Renew my SIA licence", text: "Find the correct refresher training.",
      panelTitle: "Which qualification do you need to renew?", panelText: "Select your current licence type to find the relevant refresher course.",
      routes: [
        { title: "Door Supervisor Refresher", text: "2 days · Updated search procedures, terror threat awareness, vulnerability, spiking prevention and physical intervention.", ...course("/course/sia-top-up-refresher-training-door-supervisor") },
        { title: "Security Guard Refresher", text: "1 day · Updated search procedures, vulnerability awareness, supporting vulnerable people and current terror threat response.", ...course("/course/sia-top-up-refresher-training-security-guard") },
        { title: "Close Protection Refresher", text: "3 days · Incident analysis, threat management, protective cordons and ethical physical intervention techniques.", ...course("/course/sia-close-protection-top-up-course") },
      ],
      allLabel: "Browse all SIA refresher courses", allHref: CATALOGUE_HREF,
    },
    {
      label: "Get a CSCS card", text: "Find the qualification route for the card you need.",
      panelTitle: "Which CSCS card or role are you working towards?", panelText: "Choose the route that best matches the work you want to do.",
      routes: [
        { title: "Green Labourer Card", text: "For labouring roles requiring health and safety training and the relevant CITB test.", ...course("/course/cscs-green-card-labourers-card-course") },
        { title: "Skilled Worker Card", text: "Usually requires an occupation-specific qualification or Level 2 NVQ.", ...course("/courses/cscs") },
        { title: "Supervisor Card", text: "For site supervisors managing day-to-day operations on site.", ...course("/courses/cscs") },
        { title: "Manager Card", text: "For site managers leading construction projects and teams.", ...course("/courses/cscs") },
      ],
      allLabel: "Browse all construction courses", allHref: CATALOGUE_HREF,
    },
    {
      label: "Need an NVQ", text: "Search NVQs by occupation, trade or level.",
      panelTitle: "What occupation or trade is the NVQ for?", panelText: "Search by occupation, trade or qualification level to find a relevant route.",
      routes: [
        { title: "Construction Site Supervision", text: "Level 4 NVQ Diploma", ...course("/course/level-4-nvq-diploma-in-construction-site-supervision") },
        { title: "Occupational Work Supervision", text: "Level 3 NVQ Diploma", ...course("/course/level-3-nvq-diploma-in-occupational-work-supervision") },
        { title: "Plant Operations", text: "Level 2 Diploma (Construction)", ...course("/course/level-2-diploma-in-plant-operations-construction") },
        { title: "Senior Construction Management", text: "Level 7 NVQ Diploma", ...course("/course/level-7-nvq-diploma-in-construction-senior-management") },
      ],
      allLabel: "Browse all NVQs", allHref: CATALOGUE_HREF,
    },
  ],
  help: "Need personal guidance? Call 0333 344 1293",
};

// Slider tiles for the finder section (template feature cards): the four goals.
export const roles = courseFinder.goals.map((g, i) => ({
  id: i + 1,
  iconSrc: `/assets/img/featureCards/${i + 1}.svg`,
  title: g.label,
  text: g.text,
  href: g.allHref,
}));

// "Prefer to browse by subject?": the subject tiles from the client's site.
export const subjects = [
  { id: 1, title: "Security & SIA", slug: "/courses/security", href: "/courses/security", items: ["SIA Door Supervisor", "SIA Security Guard", "SIA CCTV Operator", "Close Protection", "Door Supervisor Refresher"] },
  { id: 2, title: "First Aid", slug: "/courses/first-aid", href: "/courses/first-aid", items: ["Emergency First Aid at Work", "First Aid at Work (3 Days)", "First Aid Requalification", "Paediatric First Aid", "Mental Health First Aid"] },
  { id: 3, title: "Health & Safety", slug: "/courses/health-and-safety", href: "/courses/health-and-safety", items: ["IOSH Managing Safely", "NEBOSH General Certificate", "Fire Marshal", "Manual Handling", "Asbestos Awareness"] },
  { id: 4, title: "Construction & CSCS", slug: "/courses/construction", href: "/courses?subject=construction", items: ["CSCS Green Card", "CITB SMSTS", "CITB SSSTS", "Traffic Marshal", "CITB SEATS"] },
  { id: 5, title: "Food Safety", slug: "/courses/food-hygiene", href: "/courses?q=food", items: ["Level 2 Food Hygiene", "Level 3 Food Hygiene", "APLH Personal Licence", "Scottish Personal Licence"] },
  { id: 6, title: "Teaching & Assessing", slug: "/courses/teaching-&-academics", href: "/courses?subject=teaching-and-academics", items: ["Level 3 AET (PTLLS)", "Level 4 IQA", "Lead IQA", "Conflict Management Delivery", "Assessor Training"] },
  { id: 7, title: "Health & Care", slug: "/courses/health-and-care", href: "/courses?subject=health-and-care", items: ["Care Certificate", "Medication Awareness", "Safeguarding Adults", "Moving and Handling"] },
  { id: 8, title: "Hospitality", slug: "/courses/hospitality", href: "/courses?subject=hospitality", items: ["Personal Licence (APLH)", "Barista Skills", "Allergen Awareness", "Customer Service"] },
];

const testimonials = [
  { id: "1", author: "Oliver Desuza", position: "SIA Door Supervisor Course · Kingston upon Thames", text: "I’ve wanted to work in security since my old job at a theme park. The course was informative, practical and really engaging. I especially enjoyed putting what we learned into practice, and I’m now ready to go straight into the industry.", source: "", home: false },
  { id: "2", author: "Denni Fibbs", position: "Door Supervisor Refresher Training · Canary Wharf", text: "I just completed my Door Supervisor Refresher Training today, and I couldn’t be happier with the experience. The instructor was absolutely excellent, incredibly knowledgeable, with a deep, practical understanding of the security industry. Highly recommended.", source: "", home: false },
  { id: "3", author: "Toby McDonald", position: "SIA Security Guard Course · Kingston upon Thames", text: "I wanted a career that gave me the flexibility to earn while building my own company. The training was very hands-on, in-depth and well structured, and the instructor made the whole experience enjoyable.", source: "Google", home: true },
  { id: "4", author: "Kirsty Lynch", position: "CSCS Green Card Course · Canary Wharf", text: "I’ve just completed my CSCS course and found it really interesting. The presentation was engaging, there was plenty of useful information, and I learned a lot about health and safety on construction sites.", source: "Trustpilot", home: true },
  { id: "5", author: "Arton Asllani", position: "Fire Warden & Fire Marshal Course · Birmingham", text: "Great website to use, with reasonable prices for courses that are helpful in many ways and easy to follow. They have a great support team that actually helps when needed.", source: "Google", home: true },
  { id: "6", author: "Laxley Lamley", position: "NEBOSH National General Certificate · Rainham", text: "Very good instructor who explained everything clearly and precisely, making the course easy to understand. The sessions were informative and well organised. I would definitely recommend.", source: "Trustpilot", home: true },
  { id: "7", author: "Fabricio Santos", position: "CITB SEATS Course · Nottingham", text: "Excellent training sessions, well elaborated on verbally and physically. I would recommend them to everyone who is looking for security courses.", source: "", home: false },
];

// Customer stories block: the video story, the trust numbers and the testimonials ticked for the homepage (all editable in the
// admin: lib/siteContent.js; the video file and the avatars stay here).
export const stories = {
  eyebrow: "Customer stories",
  title: "Real experiences from people who booked through ReadTraining",
  text: "Hear from learners and teams who booked training through ReadTraining.",
  video: { duration: "0:10", src: "/assets/video/story-1.mp4", poster: "/assets/video/story-1-poster.jpg" },
  avatars: [2, 3, 4, 5].map((n) => `/assets/img/avatars/small/${n}.png`),
};

// The editable content's built-in values (Part B, B2): what the site shows for a key until an admin saves one in the admin
// (API content.site). Same shapes as the API checks; lib/siteContent.js merges them.
export const contentDefaults = {
  trust: { rating: 4.9, reviews: 12450, customers: 250000, courses: 1000 },
  // "Popular courses and qualifications": tabs of up to four courses, by course number in the catalogue
  featured: {
    groups: [
      { name: "Security & SIA", courses: [1, 3, 46, 2] },
      { name: "First Aid & Health and Safety", courses: [5, 6, 16, 13] },
      { name: "Construction", courses: [9, 10, 11, 12] },
    ],
  },
  testimonials,
  video: { author: testimonials[0].author, position: testimonials[0].position, quote: "The course was informative, practical and really engaging." },
};

export const teamBooking = {
  eyebrow: "For employers",
  title: "Training for teams, arranged in one go.",
  text: "Book several employees at once, get group pricing and choose a training centre, your workplace or live online.",
  features: [
    { id: 1, title: "Book multiple employees", text: "Book several employees without repeating the booking process." },
    { id: 2, title: "Business and group pricing", text: "Access suitable pricing for eligible group, repeat or larger bookings." },
    { id: 3, title: "Flexible training locations", text: "Arrange training at your workplace, a training centre or another suitable venue for your team." },
  ],
  note: "Used by teams at",
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
    { title: "Bookings and learner details in one place", text: "New bookings, payments and learner records arrive in your provider account." },
    { title: "Be found by learners across the UK", text: "Appear in searches by course, location and study method, with no upfront cost." },
  ],
  button: "List your courses",
  note: "Free to list · Commission only",
  href: "/for-providers",
  proof: [
    { value: "46+", label: "providers on one SIA course" },
    { value: "103", label: "towns and cities covered" },
    { value: "12", label: "subject categories" },
  ],
  quote: { text: "We filled a Door Supervisor course in four days without spending a penny on ads.", author: "Sentinel Training", role: "SIA provider, London" },
};

export const help = {
  eyebrow: "Need help?",
  title: "Talk to a real person.",
  text: "Not sure which course, date or booking option is right? Our UK team helps with requirements, locations and group bookings.",
  options: [
    { label: "Call us", value: "0333 344 1293", meta: "Mon to Fri, 9:00am to 5:30pm", href: "tel:03333441293" },
    { label: "Live chat", value: "Start a conversation", meta: "Usually replies within minutes", href: "/contact-us" },
    { label: "Help centre", value: "Guides, FAQs and requirements", meta: "Guides, FAQs and requirements", href: "/help-centre" },
  ],
  button: "Visit Help Centre",
  href: "/help-centre",
};

export const footer = {
  about: "Browse and book vocational and compliance training across the UK, with classroom, live online and self-paced options available.",
  phone: "0333 344 1293",
  hours: "Mon to Fri, 9:00am to 5:30pm",
  address: "London, United Kingdom",
  email: "hello@readtraining.co.uk",
  columns: [
    {
      title: "Find a course",
      links: [
        { href: "/courses/classroom", label: "Classroom courses" },
        { href: "/courses/virtual", label: "Live online courses" },
        { href: "/courses/online", label: "Online self-paced courses" },
        { href: "/courses/citb-site-safety-plus", label: "CITB Site Safety Plus" },
        { href: "/courses/personal-licence", label: "Personal Licence" },
        { href: "/courses/first-aid", label: "First Aid" },
        { href: "/courses/health-and-safety", label: "Health & Safety" },
        { href: "/courses/security", label: "Security" },
      ],
    },
    {
      title: "Popular courses",
      links: [
        { href: courseLink(1), label: "Door Supervisor Course" },
        { href: courseLink(46), label: "Door Supervisor Refresher" },
        { href: courseLink(52), label: "Security Guard Refresher" },
        { href: courseLink(5), label: "Emergency First Aid" },
        { href: courseLink(6), label: "First Aid at Work" },
        { href: courseLink(9), label: "CSCS Green Card Course" },
        { href: courseLink(12), label: "Traffic Marshal" },
        { href: courseLink(3), label: "SIA CCTV Operator" },
        { href: CATALOGUE_HREF, label: "CSCS NVQs" },
        { href: courseLink(23), label: "AET" },
        { href: courseLink(11), label: "SSSTS" },
        { href: courseLink(10), label: "SMSTS" },
        { href: courseLink(21), label: "Personal Licence" },
        { href: CATALOGUE_HREF, label: "IQA Training" },
        { href: CATALOGUE_HREF, label: "Assessor Training" },
      ],
    },
    {
      title: "For providers",
      links: [
        { href: "/for-providers", label: "List Your Course" },
        { href: "/skill-saver", label: "Skill Saver Programme" },
        { href: "/provider-skill-saver", label: "Provider Skill Saver" },
        { href: "/certificate-checker", label: "Verify Certificate" },
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
  ],
};

// Employer logos for the trust strip (files in /public/assets/img/employers). `h` = rendered height in px.
export const employerLogos = [
  { name: "G4S", src: "/assets/img/employers/g4s.svg", h: 22 },
  { name: "Transport for London", src: "/assets/img/employers/tfl.svg", h: 20 },
  { name: "Armani", src: "/assets/img/employers/armani.svg", h: 20 },
  { name: "North East Autism Society", src: "/assets/img/employers/neas.svg", h: 20 },
  { name: "Balfour Beatty", src: "/assets/img/employers/balfour-beatty.svg", h: 20 },
  { name: "Kier", src: "/assets/img/employers/kier.svg", h: 20 },
  { name: "Mace", src: "/assets/img/employers/mace.svg", h: 20 },
  { name: "Skanska", src: "/assets/img/employers/skanska.svg", h: 20 },
  { name: "Berkeley Group", src: "/assets/img/employers/berkeley.svg", h: 20 },
  { name: "Coventry College", src: "/assets/img/employers/coventry-college.svg", h: 20 },
];
