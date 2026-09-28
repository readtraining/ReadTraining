// Navigation data mirrored from the client's current site (hurak.com), September 2026.
// Structure: Courses (12 subjects + popular per subject), Licences & Cards, Locations, Resources.
// Hrefs point at our template pages for now; `slug` keeps the original path for when real pages exist.

const course = (label, slug) => ({ label, slug, href: "/template/courses/1" });
const cat = (label, slug) => ({ label, slug, href: "/template/courses-list-1" });
const img = (n) => `/assets/img/coursesCards/${n}.png`;

export const studyMethods = [
  { label: "Classroom", text: "Face-to-face at a venue near you", icon: "icon-online-learning-4", href: "/template/courses-list-2", slug: "/courses/classroom" },
  { label: "Live online", text: "Tutor-led over video, from home", icon: "icon-online-learning-2", href: "/template/courses-list-3", slug: "/courses/virtual" },
  { label: "Online self-paced", text: "Start today, learn at your own pace", icon: "icon-time-management", href: "/template/courses-list-4", slug: "/courses/online" },
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
].map((s) => ({ ...s, href: "/template/courses-list-1", count: s.courses.length }));

export const licenceGroups = [
  { label: "Construction", img: img(3), text: "Explore the training and qualification routes for this licence or card.", routes: [course("Forklift Licence", "/licences/forklift-licence")] },
  { label: "CSCS Card", img: img(9), text: "Explore the training and qualification routes for this licence or card.", routes: [course("CSCS Card Application", "/licences/cscs-card-application"), course("CSCS Green Card Course", "/course/cscs-green-card-labourers-card-course")] },
  { label: "Personal Licence", img: img(7), text: "Explore the training and qualification routes for this licence or card.", routes: [course("APLH Personal Licence Application", "/licences/aplh-personal-licence-application"), course("APLH Personal Licence Training Course", "/course/aplh-personal-licence-training-course")] },
  { label: "Security Licence", img: img(11), text: "Explore the training and qualification routes for this licence or card.", routes: [course("SIA Licence", "/licences/close-protection-licence"), course("SIA Door Supervisor Course", "/course/sia-door-supervisor-training"), course("SIA Security Guard Course", "/course/sia-security-guard-training-course"), course("SIA CCTV Operator Training Course", "/course/sia-cctv-operator-training")] },
].map((g) => ({ ...g, href: "/template/courses-list-2" }));

// Locations menu: courses that run at venues, and every town/city listed on the client's site.
export const locationCourses = [
  course("Abrasive Wheel Course", "/course/abrasive-wheels"),
  course("CCTV Operator Course", "/courses/cctv-operator"),
  course("CITB HS&E Test", "/tests/citb-health-safety-and-environment-test"),
  course("CITB Site Safety Plus", "/courses/citb-site-safety-plus"),
  course("CSCS Green Card Course", "/course/cscs-green-card-labourers-card-course"),
  course("Door Supervisor Course", "/course/sia-door-supervisor-training"),
  course("Emergency First Aid at Work Course", "/courses/emergency-first-aid-at-work"),
  course("Fire Marshal Course", "/course/fire-marshal-fire-warden-online"),
  course("First Aid at Work Course", "/courses/first-aid-at-work"),
  course("First Aid at Work Requalification Course", "/course/first-aid-at-work-requalification-course-fawr"),
  course("Level 1 Health and Safety in a Construction Environment", "/course/level-1-health-and-safety-in-a-construction-environment"),
  course("Mental Health First Aid Course", "/course/mental-health-first-aid"),
  course("Paediatric First Aid Course", "/course/level-3-paediatric-first-aid-training-2-days"),
  course("Personal Licence Course", "/courses/personal-licence"),
  course("Refresher Course for Door Supervisors", "/course/sia-top-up-refresher-training-door-supervisor"),
  course("Refresher Course for Security Guards", "/course/sia-top-up-refresher-training-security-guard"),
  course("Safety Harness Training", "/course/safety-harness-training"),
  course("Scottish Personal Licence Refresher Training", "/course/personal-licence-refresher-course-scotland-scplh-r"),
  course("Scottish Personal Licence Training", "/course/scplh-scottish-certificate-for-personal-licence-holders"),
  course("Security Guard Course", "/course/sia-security-guard-training-course"),
  course("Traffic Banksman Course", "/course/traffic-banksman-traffic-marshal-training-course"),
  course("Working at Height Training", "/course/working-at-height-training"),
];

export const cities = [
  "Aberdeen", "Aberystwyth", "Aldershot", "Alness", "Annan", "Ashford", "Ashington", "Barking", "Barnet", "Barnsley", "Basildon", "Basingstoke", "Bexley", "Birmingham", "Blackburn", "Blackpool", "Bolton", "Bournemouth", "Brentwood", "Brighton", "Cambridge", "Canary Wharf", "Cardiff", "Chorley", "Colchester", "Coventry", "Croydon", "Dartford", "Derby", "Devon", "Doncaster", "Dundee", "Durham", "Edinburgh", "Essex", "Exeter", "Finchley", "Glasgow", "Gravesend", "Harlow", "Harrow", "Hemel Hempstead", "Hertfordshire", "Hounslow", "Hull", "Ilford", "Inverness", "Ipswich", "Kingston", "Lancashire", "Leeds", "Leicester", "Lewisham", "Leyland", "Leytonstone", "Lincoln", "London", "Luton", "Maidstone", "Manchester", "Milton Keynes", "Newcastle", "Newcastle upon Tyne", "Norfolk", "Northampton", "Northamptonshire", "Northfleet", "Northumberland", "Norwich", "Nottingham", "Nottinghamshire", "Oxfordshire", "Peterborough", "Plymouth", "Portsmouth", "Rainham", "Reading", "Romford", "Salford", "Sheffield", "Slough", "Solihull", "Somerset", "Southampton", "Southend", "Stafford", "Staffordshire", "Stratford", "Surrey", "Swansea", "Swindon", "Trafford Park", "Uxbridge", "Wakefield", "Wales", "Walsall", "West Lothian", "West Midlands", "West Sussex", "Wigan", "Wirral", "Wolverhampton", "Worthing",
];

// Cities grouped for the Locations dropdown's browse list (client's site lists them flat).
const group = (label, list, image) => ({ label, img: image, cities: list, href: "/template/courses-list-3" });
export const regions = [
  group("London", ["London", "Canary Wharf", "Croydon", "Stratford", "Barking", "Barnet", "Bexley", "Finchley", "Harrow", "Hounslow", "Ilford", "Kingston", "Lewisham", "Leytonstone", "Rainham", "Romford", "Uxbridge"], img(1)),
  group("South East", ["Brighton", "Southampton", "Portsmouth", "Reading", "Milton Keynes", "Ashford", "Basingstoke", "Dartford", "Gravesend", "Maidstone", "Northfleet", "Slough", "Surrey", "West Sussex", "Worthing", "Aldershot", "Luton", "Hemel Hempstead", "Hertfordshire", "Harlow", "Oxfordshire"], img(2)),
  group("East of England", ["Cambridge", "Colchester", "Basildon", "Brentwood", "Southend", "Essex", "Ipswich", "Norwich", "Norfolk", "Peterborough"], img(3)),
  group("Midlands", ["Birmingham", "Coventry", "Leicester", "Nottingham", "Nottinghamshire", "Derby", "Wolverhampton", "Walsall", "Solihull", "West Midlands", "Northampton", "Northamptonshire", "Stafford", "Staffordshire", "Lincoln"], img(4)),
  group("North West", ["Manchester", "Salford", "Trafford Park", "Bolton", "Blackburn", "Blackpool", "Chorley", "Leyland", "Lancashire", "Wigan", "Wirral"], img(5)),
  group("North East & Yorkshire", ["Leeds", "Sheffield", "Wakefield", "Hull", "Doncaster", "Barnsley", "Newcastle", "Newcastle upon Tyne", "Durham", "Ashington", "Northumberland"], img(6)),
  group("South West", ["Bournemouth", "Exeter", "Plymouth", "Devon", "Somerset", "Swindon"], img(7)),
  group("Scotland", ["Glasgow", "Edinburgh", "Aberdeen", "Dundee", "Inverness", "Alness", "Annan", "West Lothian"], img(8)),
  group("Wales", ["Cardiff", "Swansea", "Aberystwyth", "Wales"], img(9)),
];

export const popularByLocation = locationCourses.slice(0, 12);

export const resources = {
  prepare: [
    { label: "Test Prep & Mock Exams", text: "Practice mock tests and revision tools for SIA & CSCS exams.", icon: "icon-book", href: "/template/blog-list-2", slug: "/test-prep" },
    { label: "Blog & Industry Guides", text: "Training insights, regulatory updates and career advice.", icon: "icon-document", href: "/template/blog-list-1", slug: "/blog" },
  ],
  prepareLink: { label: "Explore Test Prep & Revision", href: "/template/blog-list-2" },
  help: [
    { label: "Help Centre & FAQs", icon: "icon-message", href: "/template/help-center" },
    { label: "Certificate Verification", icon: "icon-check", href: "/template/help-center", slug: "/certificate-checker" },
  ],
  company: [
    { label: "About ReadTraining", icon: "icon-person", href: "/template/about-1", slug: "/about-us" },
    { label: "Contact Us", icon: "icon-email", href: "/template/contact-1", slug: "/contact-us" },
  ],
  helpLink: { label: "Visit Help Centre", href: "/template/help-center" },
  featured: {
    tag: "SIA guide",
    img: img(11),
    title: "How to renew your SIA licence",
    text: "Understand the refresher training requirements and renewal timeline before your licence expires.",
    link: { label: "Read guide", href: "/template/blogs/1" },
  },
  footer: [
    { label: "Test Prep", href: "/template/blog-list-2" },
    { label: "Blog & Guides", href: "/template/blog-list-1" },
    { label: "Verify Certificate", href: "/template/help-center" },
    { label: "Help Centre", href: "/template/help-center" },
  ],
};

export const menuFooters = {
  courses: {
    links: [
      { label: "All courses", href: "/template/courses-list-1" },
      { label: "Classroom", href: "/template/courses-list-2" },
      { label: "Live online", href: "/template/courses-list-3" },
      { label: "Online self-paced", href: "/template/courses-list-4" },
    ],
    action: { label: "Course Finder", icon: "icon-search", href: "/template/courses-list-1" },
  },
  licences: {
    links: [
      { label: "SIA Licence", href: "/template/courses-list-2" },
      { label: "CSCS Cards", href: "/template/courses-list-2" },
      { label: "Personal Licence", href: "/template/courses-list-2" },
      { label: "Forklift Licence", href: "/template/courses-list-2" },
    ],
    action: { label: "Verify a certificate", icon: "icon-check", href: "/template/help-center" },
  },
  locations: {
    links: [
      { label: "All locations", href: "/template/courses-list-3" },
      { label: "Classroom courses", href: "/template/courses-list-2" },
      { label: "Live online", href: "/template/courses-list-3" },
    ],
    action: { label: "Search by postcode", icon: "icon-location", href: "/template/courses-list-3" },
  },
  resources: {
    links: resources.footer,
    action: { label: "Contact us", icon: "icon-email", href: "/template/contact-1" },
  },
};

// Flat structure used by the mobile menu (same shape as the template's menuList).
export const homeMenuList = [
  {
    title: "Courses",
    links: [
      { title: "Browse by subject", links: subjects.map((s) => ({ label: s.label, href: s.href })) },
      { title: "Study method", links: studyMethods.map((m) => ({ label: m.label, href: m.href })) },
      { href: "/template/courses-list-1", label: "View all courses" },
    ],
  },
  { title: "Licences & Cards", links: licenceGroups.map((g) => ({ label: g.label, href: g.href })) },
  {
    title: "Locations",
    links: [
      { title: "Courses by location", links: locationCourses.map((c) => ({ label: c.label, href: c.href })) },
      ...regions.map((r) => ({ title: r.label, links: r.cities.map((city) => ({ label: city, href: "/template/courses-list-3" })) })),
    ],
  },
  { title: "Resources", links: [...resources.prepare, ...resources.help, ...resources.company].map((r) => ({ label: r.label, href: r.href })) },
];
