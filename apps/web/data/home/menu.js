// Navbar structure follows Hurak: Courses (mega), Licences & Cards, Locations (mega), Resources.

const c = (label, href = "/template/courses/1") => ({ label, href });
const list = (label, href = "/template/courses-list-1") => ({ label, href });

export const studyMethods = [
  { label: "Classroom", text: "Face-to-face at a venue near you", icon: "icon-online-learning-4", href: "/template/courses-list-2" },
  { label: "Live online", text: "Tutor-led over video, from home", icon: "icon-online-learning-2", href: "/template/courses-list-3" },
  { label: "Online self-paced", text: "Start today, learn at your own pace", icon: "icon-time-management", href: "/template/courses-list-4" },
];

export const subjects = [
  { label: "Accounting and Finance", count: 24, courses: [c("Accountancy"), c("Bookkeeping"), c("Payroll"), c("Sage Accounting")] },
  { label: "Business", count: 38, courses: [c("Project Management"), c("Leadership & Management"), c("Customer Service"), c("Business Administration")] },
  { label: "Construction", count: 96, courses: [c("CSCS Green Card"), c("CITB SMSTS"), c("CITB SSSTS"), c("Traffic Marshal"), c("Abrasive Wheels"), c("Working at Height")] },
  { label: "First Aid", count: 84, courses: [c("Emergency First Aid at Work"), c("First Aid at Work"), c("Paediatric First Aid"), c("Mental Health First Aid"), c("First Aid at Work Requalification")] },
  { label: "Health and Care", count: 41, courses: [c("Care Certificate"), c("Safeguarding Adults"), c("Medication Awareness"), c("Moving and Handling")] },
  { label: "Health and Safety", count: 210, courses: [c("IOSH Managing Safely"), c("NEBOSH General Certificate"), c("Fire Marshal"), c("Manual Handling"), c("Asbestos Awareness")] },
  { label: "Hospitality", count: 40, courses: [c("Food Safety Level 2"), c("Food Safety Level 3"), c("Personal Licence (APLH)"), c("Allergen Awareness"), c("HACCP")] },
  { label: "Lifestyle", count: 18, courses: [c("Barbering"), c("Nail Technician"), c("Personal Training"), c("Photography")] },
  { label: "Marketing", count: 22, courses: [c("Digital Marketing"), c("Social Media Marketing"), c("SEO Fundamentals"), c("Google Ads")] },
  { label: "Personal Development", count: 30, courses: [c("Public Speaking"), c("Time Management"), c("Conflict Management"), c("Interview Skills")] },
  { label: "Security", count: 120, courses: [c("SIA Door Supervisor"), c("SIA Security Guard"), c("SIA CCTV Operator"), c("Close Protection"), c("Door Supervisor Top-Up Refresher"), c("Security Guard Top-Up Refresher")] },
  { label: "Teaching & Academics", count: 58, courses: [c("Level 3 Award in Education & Training"), c("Level 3 Assessor"), c("Level 4 IQA"), c("Train the Trainer"), c("Safeguarding Children")] },
].map((s) => ({ ...s, href: "/template/courses-list-1" }));

export const regions = [
  { label: "London", cities: ["Central London", "Canary Wharf", "Croydon", "Stratford", "Barking", "Barnet", "Bexley", "Finchley", "Ilford", "Wembley"] },
  { label: "South East", cities: ["Brighton", "Southampton", "Portsmouth", "Reading", "Oxford", "Milton Keynes", "Ashford", "Basingstoke", "Dartford"] },
  { label: "Midlands", cities: ["Birmingham", "Coventry", "Leicester", "Nottingham", "Derby", "Wolverhampton", "Northampton", "Stoke-on-Trent"] },
  { label: "North West", cities: ["Manchester", "Liverpool", "Bolton", "Blackburn", "Blackpool", "Preston", "Chorley", "Warrington"] },
  { label: "North East & Yorkshire", cities: ["Leeds", "Sheffield", "Newcastle", "Bradford", "Hull", "Doncaster", "Barnsley", "Durham", "Ashington"] },
  { label: "South West", cities: ["Bristol", "Exeter", "Plymouth", "Bournemouth", "Devon", "Gloucester", "Swindon"] },
  { label: "Scotland", cities: ["Glasgow", "Edinburgh", "Aberdeen", "Dundee", "Inverness", "Alness", "Annan"] },
  { label: "Wales & Northern Ireland", cities: ["Cardiff", "Swansea", "Newport", "Aberystwyth", "Belfast", "Derry"] },
];

export const popularByLocation = [
  c("Door Supervisor Course"),
  c("Security Guard Course"),
  c("CCTV Operator Course"),
  c("Emergency First Aid at Work"),
  c("First Aid at Work Course"),
  c("Paediatric First Aid Course"),
  c("CSCS Green Card Course"),
  c("CITB Site Safety Plus"),
  c("Fire Marshal Course"),
  c("Personal Licence Course"),
  c("Traffic Marshal Course"),
  c("Working at Height Training"),
];

export const licences = [
  { label: "SIA Licence", text: "Door Supervisor, Security Guard, CCTV & Close Protection", icon: "icon-person-3", href: "/template/courses-list-2" },
  { label: "CSCS Cards", text: "Green, Blue, Gold and Black card routes", icon: "icon-badge", href: "/template/courses-list-2" },
  { label: "Personal Licence", text: "APLH and Scottish SCPLH", icon: "icon-document", href: "/template/courses-list-2" },
  { label: "Forklift Licence", text: "Counterbalance, reach and telehandler", icon: "icon-tools", href: "/template/courses-list-2" },
  { label: "Verify a certificate", text: "Check any ReadTraining certificate", icon: "icon-check", href: "/template/help-center" },
];

export const resources = [
  { label: "Test Prep & Mock Exams", text: "Practice tests and revision for SIA & CSCS exams", icon: "icon-book", href: "/template/blog-list-2" },
  { label: "Blog & Industry Guides", text: "Training insights, regulation updates, career advice", icon: "icon-document", href: "/template/blog-list-1" },
  { label: "Help Centre & FAQs", text: "Booking, rescheduling, refunds and certificates", icon: "icon-message", href: "/template/help-center" },
  { label: "Certificate Verification", text: "Verify a learner's certificate online", icon: "icon-check", href: "/template/help-center" },
  { label: "About ReadTraining", text: "Who we are and how we work with providers", icon: "icon-person", href: "/template/about-1" },
  { label: "Contact Us", text: "Mon–Fri 9:00am – 5:30pm", icon: "icon-email", href: "/template/contact-1" },
];

// Flat structure used by the mobile menu (same shape as the template's menuList).
export const homeMenuList = [
  {
    title: "Courses",
    links: [
      { title: "Browse by subject", links: subjects.map((s) => list(s.label, s.href)) },
      { title: "Study method", links: studyMethods.map((m) => list(m.label, m.href)) },
      { href: "/template/courses-list-1", label: "View all courses" },
    ],
  },
  { title: "Licences & Cards", links: licences.map((l) => list(l.label, l.href)) },
  {
    title: "Locations",
    links: [
      ...regions.map((r) => ({ title: r.label, links: r.cities.map((city) => list(city, "/template/courses-list-3")) })),
      { href: "/template/courses-list-3", label: "View all locations" },
    ],
  },
  { title: "Resources", links: resources.map((r) => list(r.label, r.href)) },
];
