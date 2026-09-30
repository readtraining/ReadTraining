// Home page content mirrored from the client's current site (hurak.com), September 2026.
// Headline and brand are ours; categories, courses, options and lists match the existing site.

const img = (n) => `/assets/img/coursesCards/${n}.png`;
const course = (slug) => ({ slug, href: "/template/courses/1" });

export const topBar = {
  phone: "0333 344 1293",
  email: "hello@readtraining.co.uk",
  hours: "Mon–Fri: 9:00am – 5:30pm",
  audiences: [
    { href: "/", label: "For Individuals" },
    { href: "#employers", label: "For Businesses" },
    { href: "#providers", label: "For Training Providers" },
  ],
};

export const menu = [
  { href: "/template/courses-list-1", label: "Courses" },
  { href: "/template/courses-list-2", label: "Licences & Cards" },
  { href: "/template/courses-list-3", label: "Locations" },
  { href: "/template/blog-list-1", label: "Resources" },
];

export const hero = {
  eyebrow: "Established in 2011 · Vocational training across the UK",
  title: "Book accredited training.",
  titleLine2: "Get certified",
  titleAccent: "sooner.",
  text: "Search vocational and compliance training from trusted UK training providers,",
  text2: "explore available dates and locations, and choose the option that suits you.",
  subline: "Compare accredited providers, dates and prices in one place. No account needed to search.",
  primaryButton: { label: "Find Courses", href: "/template/courses-list-1" },
  secondaryButton: { label: "Book for your team", href: "#employers" },
  socialProof: { rating: "4.9 out of 5", text: "Based on 12,450+ verified reviews · 250,000+ customers" },
  methods: ["All methods", "Classroom", "Live online", "Online self-paced"],
  coursePlaceholder: "Search for a course",
  locationPlaceholder: "Town or postcode",
  popular: [
    { href: "/template/courses/1", label: "Door Supervisor", slug: "/course/sia-door-supervisor-training" },
    { href: "/template/courses/1", label: "Emergency First Aid", slug: "/course/emergency-first-aid-at-work-training-1-day" },
    { href: "/template/courses/1", label: "CSCS Green Card", slug: "/course/cscs-green-card-labourers-card-course" },
  ],
  rating: "4.9 out of 5 · Based on 12,450+ verified reviews",
  highlights: ["1,000+ courses", "UK-wide dates and locations", "Price-match guarantee", "Flexible booking options", "End-to-end support", "250,000+ customers"],
};

export const counters = [
  { id: 1, number: "1,000+", title: "Courses" },
  { id: 2, number: "250,000+", title: "Customers" },
  { id: 3, number: "12,450+", title: "Verified reviews" },
  { id: 4, number: "4.9 / 5", title: "Average rating" },
];

export const employers = ["G4S", "Transport for London", "Armani", "North East Autism Society", "Balfour Beatty", "Kier", "Mace", "Skanska", "Berkeley Group", "Coventry College"];

// "Popular courses and qualifications": three groups of four, exactly as on the client's site.
export const courseCategories = ["Security & SIA", "First Aid & Health and Safety", "Construction"];

const card = (id, category, title, method, slug, image, price, duration, providers, validity, wasPrice) => ({
  id, category, title, method, slug,
  imageSrc: image,
  price, duration, providers, validity, wasPrice,
  rating: 4.9,
  ratingCount: 1991,
  paid: true,
  popular: id === 1 || id === 5 || id === 9,
});

// Real course facts (price = lowest "all inclusive" price, duration, number of providers, certificate validity)
export const courses = [
  card(1, "Security & SIA", "SIA Door Supervisor Training", "Classroom", "/course/sia-door-supervisor-training", img(1), 198.99, "6 days", 46, "SIA licence-linked"),
  card(2, "Security & SIA", "SIA CCTV Operator Training", "Classroom", "/course/sia-cctv-operator-training", img(2), 179.99, "3 days", 25, "SIA licence-linked"),
  card(3, "Security & SIA", "SIA Door Supervisor Refresher", "Classroom", "/course/sia-top-up-refresher-training-door-supervisor", img(3), 99, "2 days", 30, "Renews SIA licence"),
  card(4, "Security & SIA", "Security Guard Training", "Classroom", "/course/sia-top-up-refresher-training-security-guard", img(4), 89.99, "1 day", 23, "Renews SIA licence"),
  card(5, "First Aid & Health and Safety", "Emergency First Aid at Work", "Classroom", "/course/emergency-first-aid-at-work-training-1-day", img(5), 63.2, "1 day", 45, "Valid 3 years"),
  card(6, "First Aid & Health and Safety", "First Aid at Work (3-Day)", "Classroom", "/course/first-aid-at-work-training-3-days", img(6), 159.99, "3 days", 21, "Valid 3 years"),
  card(7, "First Aid & Health and Safety", "Fire Marshal Training", "Classroom • Live online • Online self-paced", "/course/fire-marshal-fire-warden-online", img(7), 29.99, "2–3 hours", 12, "Valid 3 years"),
  card(8, "First Aid & Health and Safety", "Safety Harness Training", "Classroom • Online self-paced", "/course/safety-harness-training", img(8), 24.99, "2–4 hours", 3, "Valid 3 years"),
  card(9, "Construction", "CSCS Green Card Course", "Classroom • Live online • Online self-paced", "/course/cscs-green-card-labourers-card-course", img(9), 89.99, "1 day", 10, "CSCS-approved route", 109.99),
  card(10, "Construction", "CITB SMSTS Course", "Classroom • Live online", "/course/citb-site-manager-safety-training-scheme-smsts", img(10), 449.99, "5 days", 12, "Valid 5 years"),
  card(11, "Construction", "CITB SSSTS Refresher Course", "Classroom • Live online", "/course/citb-site-supervisor-safety-training-scheme-sssts-online-refresher", img(11), 192, "1 day", 12, "CITB Site Safety Plus"),
  card(12, "Construction", "Traffic Marshal Course", "Classroom • Live online • Online self-paced", "/course/traffic-banksman-traffic-marshal-training-course", img(12), 29.99, "2–3 hours", 5, "Valid 3 years"),
];

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
  cta: { label: "Find course options", href: "/template/courses-list-1" },
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
      allLabel: "Browse all SIA courses", allHref: "/template/courses-list-1",
    },
    {
      label: "Renew my SIA licence", text: "Find the correct refresher training.",
      panelTitle: "Which qualification do you need to renew?", panelText: "Select your current licence type to find the relevant refresher course.",
      routes: [
        { title: "Door Supervisor Refresher", text: "2 days · Updated search procedures, terror threat awareness, vulnerability, spiking prevention and physical intervention.", ...course("/course/sia-top-up-refresher-training-door-supervisor") },
        { title: "Security Guard Refresher", text: "1 day · Updated search procedures, vulnerability awareness, supporting vulnerable people and current terror threat response.", ...course("/course/sia-top-up-refresher-training-security-guard") },
        { title: "Close Protection Refresher", text: "3 days · Incident analysis, threat management, protective cordons and ethical physical intervention techniques.", ...course("/course/sia-close-protection-top-up-course") },
      ],
      allLabel: "Browse all SIA refresher courses", allHref: "/template/courses-list-1",
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
      allLabel: "Browse all construction courses", allHref: "/template/courses-list-1",
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
      allLabel: "Browse all NVQs", allHref: "/template/courses-list-1",
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

// "Prefer to browse by subject?" — the six subject tiles from the client's site.
export const subjects = [
  { id: 1, title: "Security & SIA", slug: "/courses/security", href: "/template/courses-list-1", items: ["SIA Door Supervisor", "SIA Security Guard", "SIA CCTV Operator", "Close Protection", "Door Supervisor Refresher"] },
  { id: 2, title: "First Aid", slug: "/courses/first-aid", href: "/template/courses-list-2", items: ["Emergency First Aid at Work", "First Aid at Work (3 Days)", "First Aid Requalification", "Paediatric First Aid", "Mental Health First Aid"] },
  { id: 3, title: "Health & Safety", slug: "/courses/health-and-safety", href: "/template/courses-list-3", items: ["IOSH Managing Safely", "NEBOSH General Certificate", "Fire Marshal", "Manual Handling", "Asbestos Awareness"] },
  { id: 4, title: "Construction & CSCS", slug: "/courses/construction", href: "/template/courses-list-4", items: ["CSCS Green Card", "CITB SMSTS", "CITB SSSTS", "Traffic Marshal", "CITB SEATS"] },
  { id: 5, title: "Food Safety", slug: "/courses/food-hygiene", href: "/template/courses-list-5", items: ["Level 2 Food Hygiene", "Level 3 Food Hygiene", "APLH Personal Licence", "Scottish Personal Licence"] },
  { id: 6, title: "Teaching & Assessing", slug: "/courses/teaching-&-academics", href: "/template/courses-list-6", items: ["Level 3 AET (PTLLS)", "Level 4 IQA", "Lead IQA", "Conflict Management Delivery", "Assessor Training"] },
  { id: 7, title: "Health & Care", slug: "/courses/health-and-care", href: "/template/courses-list-7", items: ["Care Certificate", "Medication Awareness", "Safeguarding Adults", "Moving and Handling"] },
  { id: 8, title: "Hospitality", slug: "/courses/hospitality", href: "/template/courses-list-8", items: ["Personal Licence (APLH)", "Barista Skills", "Allergen Awareness", "Customer Service"] },
];

export const testimonials = [
  { id: 1, author: "Oliver Desuza", position: "SIA Door Supervisor Course · Kingston upon Thames", text: "I’ve wanted to work in security since my old job at a theme park. The course was informative, practical and really engaging. I especially enjoyed putting what we learned into practice, and I’m now ready to go straight into the industry." },
  { id: 2, author: "Denni Fibbs", position: "Door Supervisor Refresher Training · Canary Wharf", text: "I just completed my Door Supervisor Refresher Training today, and I couldn’t be happier with the experience. The instructor was absolutely excellent, incredibly knowledgeable, with a deep, practical understanding of the security industry. Highly recommended." },
  { id: 3, author: "Toby McDonald", position: "SIA Security Guard Course · Kingston upon Thames", text: "I wanted a career that gave me the flexibility to earn while building my own company. The training was very hands-on, in-depth and well structured, and the instructor made the whole experience enjoyable." },
  { id: 4, author: "Kirsty Lynch", position: "CSCS Green Card Course · Canary Wharf", text: "I’ve just completed my CSCS course and found it really interesting. The presentation was engaging, there was plenty of useful information, and I learned a lot about health and safety on construction sites." },
  { id: 5, author: "Arton Asllani", position: "Fire Warden & Fire Marshal Course · Birmingham", text: "Great website to use, with reasonable prices for courses that are helpful in many ways and easy to follow. They have a great support team that actually helps when needed." },
  { id: 6, author: "Laxley Lamley", position: "NEBOSH National General Certificate · Rainham", text: "Very good instructor who explained everything clearly and precisely, making the course easy to understand. The sessions were informative and well organised. I would definitely recommend." },
  { id: 7, author: "Fabricio Santos", position: "CITB SEATS Course · Nottingham", text: "Excellent training sessions, well elaborated on verbally and physically. I would recommend them to everyone who is looking for security courses." },
];

export const testimonialAvatars = [1, 2, 3, 4, 5].map((n) => `/assets/img/avatars/small/${n}.png`);

// Customer stories block: featured quote + four written reviews (real Hurak reviews, template avatars).
export const stories = {
  eyebrow: "Customer stories",
  title: "Real experiences from people who booked through ReadTraining",
  text: "Hear from learners and teams who booked training through ReadTraining.",
  video: { author: testimonials[0].author, position: testimonials[0].position, quote: "The course was informative, practical and really engaging.", duration: "0:10", src: "/assets/video/story-1.mp4", poster: "/assets/video/story-1-poster.jpg" },
  stats: [
    { value: "4.9 / 5", label: "Average rating" },
    { value: "12,450+", label: "Verified reviews" },
    { value: "250,000+", label: "Customers" },
  ],
  reviews: [2, 3, 4, 5].map((i, k) => ({
    author: testimonials[i].author,
    position: testimonials[i].position,
    text: testimonials[i].text,
    source: k % 2 ? "Trustpilot" : "Google",
    avatar: `/assets/img/avatars/small/${k + 2}.png`,
  })),
};

export const teamBooking = {
  eyebrow: "For employers",
  title: "Book training for your team, without the admin.",
  text: "Book training for multiple employees, access group pricing and arrange delivery at a training centre, your workplace or another suitable venue.",
  features: [
    { id: 1, title: "Book multiple employees", text: "Book several employees without repeating the booking process." },
    { id: 2, title: "Business and group pricing", text: "Access suitable pricing for eligible group, repeat or larger bookings." },
    { id: 3, title: "Flexible training locations", text: "Arrange training at your workplace, a training centre or another suitable venue for your team." },
  ],
  note: "Used by organisations arranging workplace and compliance training.",
  button: "Create a business account",
  href: "/template/signup",
};

export const providers = {
  eyebrow: "For training providers",
  title: "Reach more learners with ReadTraining.",
  text: "List your courses, manage bookings and reach learners across the UK.",
  points: [
    { title: "Showcase your courses", text: "Present dates, locations and booking options clearly." },
    { title: "Receive bookings", text: "Keep bookings and learner details organised." },
    { title: "Grow your learner reach", text: "Connect with more learners looking for suitable training." },
  ],
  button: "Learn more for providers",
  href: "/template/instructor-become",
};

export const help = {
  eyebrow: "Need some help?",
  title: "Need help choosing the right course?",
  text: "Get help with course requirements, dates, locations, booking options or training for multiple employees.",
  options: [
    { label: "Call us", value: "0333 344 1293", href: "tel:03333441293" },
    { label: "Message us", value: "Start live chat", href: "/template/contact-1" },
    { label: "Help Centre", value: "Visit Help Centre", href: "/template/help-center" },
  ],
  button: "Visit Help Centre",
  href: "/template/help-center",
};

export const footer = {
  about: "Browse and book vocational and compliance training across the UK, with classroom, live online and self-paced options available.",
  phone: "0333 344 1293",
  hours: "Mon–Fri: 9:00am – 5:30pm",
  address: "London, United Kingdom",
  email: "hello@readtraining.co.uk",
  columns: [
    {
      title: "Find a course",
      links: [
        { href: "/template/courses-list-2", label: "Classroom courses" },
        { href: "/template/courses-list-3", label: "Live online courses" },
        { href: "/template/courses-list-4", label: "Online self-paced courses" },
        { href: "/template/courses-list-1", label: "CITB Site Safety Plus" },
        { href: "/template/courses-list-1", label: "Personal Licence" },
        { href: "/template/courses-list-1", label: "First Aid" },
        { href: "/template/courses-list-1", label: "Health & Safety" },
        { href: "/template/courses-list-1", label: "Security" },
      ],
    },
    {
      title: "Popular courses",
      links: [
        { href: "/template/courses/1", label: "Door Supervisor Course" },
        { href: "/template/courses/1", label: "Door Supervisor Refresher" },
        { href: "/template/courses/1", label: "Security Guard Refresher" },
        { href: "/template/courses/1", label: "Emergency First Aid" },
        { href: "/template/courses/1", label: "First Aid at Work" },
        { href: "/template/courses/1", label: "CSCS Green Card Course" },
        { href: "/template/courses/1", label: "Traffic Marshal" },
        { href: "/template/courses/1", label: "SIA CCTV Operator" },
        { href: "/template/courses-list-1", label: "CSCS NVQs" },
        { href: "/template/courses/1", label: "AET" },
        { href: "/template/courses/1", label: "SSSTS" },
        { href: "/template/courses/1", label: "SMSTS" },
        { href: "/template/courses/1", label: "Personal Licence" },
        { href: "/template/courses-list-1", label: "IQA Training" },
        { href: "/template/courses-list-1", label: "Assessor Training" },
      ],
    },
    {
      title: "For providers",
      links: [
        { href: "/template/instructor-become", label: "List Your Course" },
        { href: "/template/pricing", label: "Skill Saver Program" },
        { href: "/template/pricing", label: "Provider Skill Saver" },
        { href: "/template/help-center", label: "Verify Certificate" },
        { href: "/template/instructors-list-1", label: "Listed Training Providers" },
        { href: "/template/blog-list-1", label: "Security Jobs" },
      ],
    },
    {
      title: "Resources & company",
      links: [
        { href: "/template/help-center", label: "Help Centre" },
        { href: "/template/blog-list-1", label: "Blog" },
        { href: "/template/blog-list-2", label: "Test Prep" },
        { href: "/template/help-center", label: "Verify Certificate" },
        { href: "/template/about-1", label: "Customer reviews" },
        { href: "/template/about-1", label: "About ReadTraining" },
        { href: "/template/contact-1", label: "Contact us" },
      ],
    },
  ],
  legal: [
    { href: "/template/terms", label: "Terms & Conditions" },
    { href: "/template/terms", label: "Privacy Policy" },
    { href: "/template/terms", label: "Cookie Policy" },
    { href: "/template/terms", label: "Accessibility" },
  ],
};

