
// The provider workspace (/provider/*): the words on every page, the choice lists, and the demo records a new browser starts
// with. DEMO: seedProvider() stands in for the provider API; lib/providerWorkspace.js keeps the records and every change in this
// browser, so the screens stay the same when the API arrives.

export const PROVIDER_HOME = "/provider";
const DAY = 86400000;

export const pw = {
  title: "Provider workspace",
  tag: "Provider",
  backToSite: { label: "View site", href: "/" },
  help: { label: "Help centre", href: "/help-centre" },
  // the provider account's status, at the top of every workspace page (real: set by the ReadTraining team in the admin)
  accountStatus: {
    pending: { title: "Your provider account is waiting for review", text: "Our team checks every new provider, usually within 2 working days. You can set up your courses while you wait; they can be booked once you're approved." },
    changes_requested: { title: "We need a few changes before we can approve you", text: "Here is what our team asked for:", reply: "Anything to tell our team? (optional)", send: "I've made the changes: send for review", sent: "Sent for review. We'll email you when we've decided.", onlyManagers: "The account owner or an admin can send it back for review." },
    suspended: { title: "Your provider account is suspended", text: "You can still look around, but you can't change anything and your courses can't be booked. The reason:" },
  },

  // the sidebar: our dashboard, then Hurak's sections in its order. Courses and Cohorts open to show their pages (the group heading
  // is a button, not a link); Orders and Performance are plain links because their pages already offer Create order and the
  // Overview / Reviews / Leads tabs. Settings and team are in the account menu
  nav: [
    { key: "dashboard", label: "Dashboard", icon: "icon-bar-chart", href: "/provider" },
    { key: "courses", label: "Courses", icon: "icon-book", items: [
      { label: "All courses", href: "/provider/courses" },
      { label: "Pricing plans", href: "/provider/packages" },
    ] },
    { key: "cohorts", label: "Cohorts", icon: "icon-online-learning-4", items: [
      { label: "Cohort list", href: "/provider/cohorts" },
      { label: "Calendar", href: "/provider/calendar" },
      { label: "Self-paced", href: "/provider/cohorts?mode=self-paced" },
    ] },
    { key: "learners", label: "Learners", icon: "icon-person-2", href: "/provider/learners" },
    { key: "orders", label: "Orders", icon: "icon-basket", href: "/provider/orders" },
    { key: "performance", label: "Performance", icon: "icon-bar-chart-2", href: "/provider/performance", badge: "reviews" },
    { key: "help", label: "Help", icon: "icon-message", href: "/provider/help" },
    // the provider's own account: how it is set up, and the page learners see
    { key: "settings", label: "Settings", href: "/provider/settings", navIcon: "gear" },
    { key: "profile", label: "Public profile", href: "/provider/profile", navIcon: "profile" },
  ],
  // the account menu under the avatar (Hurak's): settings, requests (refunds), public profile, team; then Switch account (the
  // identities on this login, added by ProviderShell from the API) and log out
  accountMenu: [
    { label: "Account settings", href: "/account/settings" },
    { label: "Requests", href: "/provider/requests" },
    { label: "Public profile", href: "/provider/profile" },
    { label: "Team", href: "/provider/team" },
  ],

  pages: {
    dashboard: { title: "Dashboard", lead: "What needs you today, how sales are going and what is coming up." },
    performance: { title: "Performance", lead: "Revenue, enrolments and enquiries over time, and what learners say about your courses." },
    courses: { title: "Courses", lead: "Every course you run. New courses and changes are checked by our team before they go live." },
    packages: { title: "Pricing plans", lead: "Saver, Flexi and Premium options you create once and use on any tiered course." },
    newCourse: { title: "New course", lead: "Five quick questions. You fill in the rest of the course in the editor." },
    course: { title: "Edit course" },
    cohorts: { title: "Cohorts", lead: "Each run of a course: its dates, venue, tutor and places. Open one to take the register and record results." },
    cohort: { title: "Cohort" },
    calendar: { title: "Calendar", lead: "All your sessions by month, week or day, in each cohort's colour." },
    learners: { title: "Learners", lead: "Everyone booked on your courses, with their bookings, results and certificates." },
    learner: { title: "Learner" },
    orders: { title: "Orders", lead: "Bookings from ReadTraining, your website and the orders you add yourself." },
    newOrder: { title: "Create order", lead: "Book a customer onto a course yourself: by phone, for a company or for free." },
    order: { title: "Order details" },
    notifications: { title: "Notifications", lead: "Updates on your courses, orders and reviews." },
    settings: { title: "Provider settings", lead: "Your provider information, logo, terms, VAT, emails, FAQs, questions and integrations." },
    profile: { title: "Public profile", lead: "What learners see about you on ReadTraining." },
    requests: { title: "Refunds", lead: "Get all your learners' refund requests in one place." },
    team: { title: "Manage team members", lead: "People who can use this workspace, and what each of them can do." },
    help: { title: "Help", lead: "Videos, guides and a person to talk to when you need one." },
  },

  // How each delivery method is explained in the course wizard (Hurak's wording). `key` is the method's slug in the catalogue
  // list; its name, and the categories, sub-categories, topics and levels, come from that list (lib/taxonomy.js), the same
  // one the public filters read, so a provider's course always lands in the right filters.
  formats: [
    { key: "classroom", label: "On set dates", icon: "icon-online-learning-4", text: "For workshops, classes and courses at a venue, on dates you choose.", more: "Add one or more dates to each run (a cohort) at one of your venues. Learners book a run, and you take the register and record results on the day." },
    { key: "live-online", label: "Live online", icon: "icon-online-learning-2", text: "For live, tutor-led training by video, one to one or in groups.", more: "Run sessions by video on dates you choose. Learners get the joining link in their joining instructions before each session." },
    { key: "self-paced", label: "Self-paced", icon: "icon-time-management", text: "For recorded lessons and self-paced e-learning.", more: "Build the course from lessons (text, video, quizzes and downloads). Learners start straight after booking and work at their own pace." },
  ],
  courseStatuses: { draft: "Draft", pending: "Waiting for approval", approved: "Approved", changes: "Changes requested" },

  // Hurak's performance models: learners book and pay on ReadTraining (revenue share), or send an enquiry (pay per lead)
  models: {
    bookings: { label: "Bookings", short: "Revenue share", text: "Learners book and pay directly on ReadTraining.", points: ["Bookings go straight to your inbox", "Free training management system", "Add learners you booked elsewhere for free"] },
    enquiries: { label: "Enquiries", short: "Pay per lead", text: "Learners send an enquiry and you get their contact details.", points: ["Leads go straight to your inbox", "Free training management system", "Suits higher value courses and providers with a sales team"] },
  },
  courseTypes: {
    compliance: { label: "Compliance", text: "Required by law, regulation or an employer's policy. For example First Aid at Work, Food Hygiene or Door Supervisor." },
    other: { label: "Non compliance", text: "Learned by choice. For example personal development, photography or sales." },
  },
  enrolment: { public: "Public", private: "Private" },
  // the colour a cohort shows in on the calendar (Hurak's cohort colour picker)
  cohortColours: [
    { key: "purple", label: "Purple" },
    { key: "blue", label: "Blue" },
    { key: "green", label: "Green" },
    { key: "orange", label: "Orange" },
    { key: "red", label: "Red" },
  ],
  cohortStatuses: { upcoming: "Upcoming", progress: "In progress", completed: "Completed", partial: "Partly certificated", certificated: "Certificated", cancelled: "Cancelled" },
  orderStatuses: { paid: "Paid", incomplete: "Incomplete", cancelled: "Cancelled", refunded: "Refunded", partial: "Partially refunded", dispute: "In dispute", lost: "Disputed" },
  channels: { marketplace: "ReadTraining", website: "Website", manual: "Manual" },
  // how an order was paid, as the orders list and order page show it
  paymentMethods: { card: "Card", link: "Payment link", offline: "Offline payment", free: "Free enrolment" },
  // a learner's place on a cohort (Hurak's student status): booked, moved here from another date, or cancelled
  studentStatuses: { enrolled: "Enrolled", rescheduled: "Rescheduled", cancelled: "Cancelled" },
  // the email templates a provider can send a learner from a cohort ("Select email template"), or write a new one; `body` is
  // paragraphs (joined with a blank line); {name} {course} {date} {where} {order} are filled in for each learner
  emailTemplates: [
    { key: "joining", label: "Joining instructions", subject: "Joining instructions for {course}", body: ["Hello {name},", "Your {course} course starts on {date} at {where}. Please arrive 15 minutes early with photo ID.", "See you there."] },
    { key: "confirmation", label: "Order confirmation", subject: "Your booking for {course} is confirmed", body: ["Hello {name},", "This confirms your place on {course}, {date}, at {where}. Your order number is {order}."] },
    { key: "reminder", label: "Course reminder", subject: "Reminder: {course} starts soon", body: ["Hello {name},", "A reminder that {course} starts on {date} at {where}."] },
    { key: "certificate", label: "Certificate ready", subject: "Your {course} certificate", body: ["Hello {name},", "Well done on completing {course}. Your certificate is ready."] },
  ],
  payments: {
    card: { label: "Payment via card", hint: "Take the card details on the phone." },
    link: { label: "Payment via link", hint: "The customer pays by email. Places are held for 48 hours." },
    offline: { label: "Offline payment", hint: "Bank transfer, invoice or cash. Mark the order paid when the money arrives." },
    free: { label: "Enroll for free", hint: "No payment. For staff, resits or goodwill." },
  },
  // Hurak's course activity types, in its order
  lessonTypes: {
    text: { label: "Text", icon: "icon-document" },
    download: { label: "Download / Resource", icon: "icon-cloud" },
    assignment: { label: "Assignment", icon: "icon-edit" },
    quiz: { label: "Quiz", icon: "icon-check" },
    video: { label: "Video", icon: "icon-play-button" },
    certificate: { label: "Certificate", icon: "icon-badge" },
    scorm: { label: "Scorm", icon: "icon-play" },
  },
  perkTypes: { included: "Included", excluded: "Not included", course: "Course included", noCourse: "Course not included" },
  tiers: [
    { key: "saver", label: "Saver" },
    { key: "flexi", label: "Flexi", badge: "Most popular" },
    { key: "premium", label: "Premium" },
  ],
  clrFields: [
    { key: "name", label: "Full name" },
    { key: "dob", label: "Date of birth" },
    { key: "gender", label: "Gender" },
    { key: "result", label: "Course result" },
    { key: "dispatch", label: "Certificate dispatch date" },
  ],
  roles: [
    { key: "admin", label: "Admin", can: "Everything except removing the account owner" },
    { key: "tutor", label: "Tutor", can: "Their cohorts: students, learning records and results" },
    { key: "editor", label: "Course editor", can: "Courses, course activities and FAQs" },
    { key: "support", label: "Customer support", can: "Learners, orders and refund requests" },
    { key: "sales", label: "Sales executive", can: "Orders, new orders and leads" },
    { key: "accounts", label: "Accounts analyst", can: "Orders, earnings and VAT" },
    { key: "marketing", label: "Marketing executive", can: "Course pages, SEO and reviews" },
    { key: "assistant", label: "Account assistant", can: "View everything, change nothing" },
  ],

  settingsTabs: [
    { key: "info", label: "Provider information" },
    { key: "logo", label: "Company logo" },
    { key: "terms", label: "Terms" },
    { key: "vat", label: "VAT" },
    { key: "affiliate", label: "Affiliate" },
    { key: "emails", label: "Emails" },
    { key: "faqs", label: "FAQs" },
    { key: "qa", label: "Q&A" },
    { key: "integrations", label: "Integrations" },
  ],


  // Hurak's Performance date ranges
  ranges: [
    { key: "7", label: "Last 7 days", days: 7 },
    { key: "30", label: "Last 30 days", days: 30 },
    { key: "12m", label: "Last 12 months", days: 365 },
    { key: "all", label: "All time" },
  ],
  fee: { commission: 30, card: 3 },
};

// ---- demo records ----------------------------------------------------------------------------------------------------------

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// DEMO: one provider with a few months of trading, relative to the first time this browser opens the workspace.
export function seedProvider(now = Date.now()) {
  const d = (n) => iso(now + n * DAY);
  const at = (n, h = 10) => now + n * DAY + (h - 12) * 3600000;

  const learners = [
    ["Aisha", "Rahman", "aisha.rahman@example.co.uk", "07700 900112", "Brightcare Homes"],
    ["Tom", "Whitfield", "tom.whitfield@example.co.uk", "07700 900245", ""],
    ["Priya", "Nair", "priya.nair@example.co.uk", "07700 900318", "Northline Facilities"],
    ["Callum", "Reid", "callum.reid@example.co.uk", "07700 900427", ""],
    ["Grace", "Okafor", "grace.okafor@example.co.uk", "07700 900533", "Brightcare Homes"],
    ["Daniel", "Hughes", "daniel.hughes@example.co.uk", "07700 900641", "NightSafe Venues"],
    ["Sophie", "Turner", "sophie.turner@example.co.uk", "07700 900756", ""],
    ["Marek", "Nowak", "marek.nowak@example.co.uk", "07700 900869", "NightSafe Venues"],
    ["Hannah", "Lewis", "hannah.lewis@example.co.uk", "07700 900974", ""],
    ["Kwame", "Mensah", "kwame.mensah@example.co.uk", "07700 900183", "Northline Facilities"],
    ["Ellie", "Brooks", "ellie.brooks@example.co.uk", "07700 900292", ""],
    ["Ravi", "Patel", "ravi.patel@example.co.uk", "07700 900361", "Brightcare Homes"],
  ].map(([first, last, email, phone, company], i) => ({ id: `L${101 + i}`, first, last, email, phone, company, town: ["Leeds", "Bradford", "Wakefield", "Huddersfield", "Halifax"][i % 5], added: at(-120 + i * 7) }));

  const venues = [
    { id: "V1", name: "Northfield Training Centre", street: "14 Wellington Street", city: "Leeds", postcode: "LS1 4DL", active: true },
    { id: "V2", name: "The Exchange Rooms", street: "2 Albion Place", city: "Bradford", postcode: "BD1 1RU", active: true },
    { id: "V3", name: "Riverside Business Hub", street: "Unit 5, Calder Wharf", city: "Wakefield", postcode: "WF1 5PF", active: false },
  ];

  const faqs = [
    { id: "F1", q: "What should I bring on the day?", a: "Photo ID, a pen and comfortable clothes. Lunch is not provided, but there are cafes close by." },
    { id: "F2", q: "Is the certificate accepted by employers?", a: "Yes. Our first aid courses are regulated qualifications that meet the HSE's guidance for workplace first aiders." },
    { id: "F3", q: "Can I change my date?", a: "Yes, up to 5 working days before the course for free. After that a fee may apply." },
    { id: "F4", q: "Is there parking at the venue?", a: "There is a pay and display car park on Wellington Street, 2 minutes' walk away." },
  ];

  const perk = (heading, items) => ({ heading, description: "", items });
  const packages = [
    {
      id: "P1", name: "First aid bundles", active: true, created: at(-90),
      features: [perk("Course essentials", [{ type: "included", text: "Regulated certificate, valid 3 years" }, { type: "included", text: "Course book" }])],
      tiers: {
        saver: { price: 210, discount: 0, perks: [perk("Changes", [{ type: "excluded", text: "Free date change" }])] },
        flexi: { price: 235, discount: 15, perks: [perk("Changes", [{ type: "included", text: "One free date change" }])] },
        premium: { price: 265, discount: 30, perks: [perk("Changes and resits", [{ type: "included", text: "Free date changes" }, { type: "included", text: "One free resit" }]), perk("Extra course", [{ type: "course", courseId: "C5", text: "Manual Handling (online)" }])] },
      },
    },
    {
      id: "P2", name: "SIA licence packages", active: true, created: at(-70),
      features: [perk("Course essentials", [{ type: "included", text: "Level 2 award, exams included" }, { type: "included", text: "Emergency First Aid at Work" }])],
      tiers: {
        saver: { price: 265, discount: 0, perks: [perk("Licence application", [{ type: "excluded", text: "We apply for your licence" }])] },
        flexi: { price: 299, discount: 20, perks: [perk("Licence application", [{ type: "included", text: "We check and send your SIA application" }])] },
        premium: { price: 349, discount: 40, perks: [perk("Licence and jobs", [{ type: "included", text: "We check and send your SIA application" }, { type: "included", text: "Introductions through Security Jobs" }])] },
      },
    },
  ];

  const settings = (extra = {}) => ({
    modes: [],
    clr: { enabled: false, fields: ["name", "result"], custom: [] },
    reschedule: { enabled: true, paid: false, fee: 0 },
    resit: { exam: false, allowed: false, paid: false, title: "", price: 0 },
    confirmation: "Thank you for booking. Your joining instructions arrive 5 days before the course with the venue details and what to bring.",
    seo: { title: "", description: "", keywords: [] },
    marketplace: true,
    ...extra,
  });
  const courses = [
    {
      id: "C1", title: "Emergency First Aid at Work", subtitle: "One-day regulated qualification for workplace first aiders in low-risk settings.",
      details: "Learn to deal with an emergency at work until help arrives: CPR, choking, bleeding, burns and shock. Practical assessment on the day.",
      format: "classroom", level: "beginner", category: "first-aid", features: ["1 day", "Certificate valid 3 years", "Ofqual regulated"],
      objectives: ["Give CPR to an adult and use a defibrillator", "Help someone who is choking", "Control bleeding and treat shock", "Manage an unresponsive casualty"],
      topics: [{ title: "Your role as a first aider", text: "What you must do, record and report." }, { title: "Life-saving skills", text: "CPR, AED, recovery position and choking." }],
      faqs: ["F1", "F2", "F3"], venues: ["V1", "V2"], media: [{ type: "image", src: "/assets/img/coursesCards/1.png", alt: "" }],
      status: "approved", enrolment: "public", pricing: { type: "flat", price: 95 }, curriculum: [],
      settings: settings({ clr: { enabled: true, fields: ["name", "dob", "result", "dispatch"], custom: [] }, resit: { exam: true, allowed: true, paid: true, title: "Practical reassessment", price: 25 }, seo: { title: "Emergency First Aid at Work course in Leeds", description: "One-day EFAW course in Leeds and Bradford.", keywords: ["efaw", "first aid leeds"] } }),
      updated: at(-12), rating: 4.8,
    },
    {
      id: "C2", title: "First Aid at Work", subtitle: "Three-day qualification for first aiders in higher-risk workplaces.",
      details: "Everything in the one-day course plus fractures, head and spinal injuries, poisoning, asthma, diabetes and more.",
      format: "classroom", level: "intermediate", category: "first-aid", features: ["3 days", "Certificate valid 3 years"],
      objectives: ["Assess an incident and call for help", "Give CPR and use a defibrillator", "Treat fractures and suspected spinal injuries", "Recognise major illnesses and give first aid"],
      topics: [], faqs: ["F1", "F2"], venues: ["V1"], media: [{ type: "image", src: "/assets/img/coursesCards/2.png", alt: "" }],
      status: "approved", enrolment: "public", pricing: { type: "tiered", packageId: "P1" }, curriculum: [],
      settings: settings({ clr: { enabled: true, fields: ["name", "dob", "result"], custom: [] } }), updated: at(-30), rating: 4.7,
    },
    {
      id: "C3", title: "SIA Door Supervisor", subtitle: "Six-day course for the Level 2 Award for Door Supervisors in the Private Security Industry.",
      details: "The licence-linked qualification you need to apply for an SIA door supervisor licence, with physical intervention skills.",
      format: "classroom", level: "beginner", category: "security", features: ["6 days", "Exams included", "Licence-linked"],
      objectives: ["Explain the law that applies to door supervisors", "Manage conflict and stay safe", "Use physical intervention safely", "Deal with emergencies and incidents"],
      topics: [], faqs: ["F1", "F3", "F4"], venues: ["V2"], media: [{ type: "image", src: "/assets/img/coursesCards/3.png", alt: "" }],
      status: "approved", enrolment: "public", pricing: { type: "tiered", packageId: "P2" }, curriculum: [],
      settings: settings({ resit: { exam: true, allowed: true, paid: true, title: "Exam resit (one unit)", price: 45 } }), updated: at(-21), rating: 4.6,
    },
    {
      id: "C4", title: "Fire Marshal", subtitle: "Half-day live online course for fire marshals and wardens.",
      details: "Fire safety law, how fires start and spread, evacuation and using extinguishers, taught live by video.",
      format: "live-online", level: "beginner", category: "health-and-safety", features: ["Half day", "Live by video"],
      objectives: ["Explain fire safety law at work", "Carry out fire marshal checks", "Lead an evacuation", "Choose the right extinguisher"],
      topics: [], faqs: ["F2"], venues: [], media: [], status: "approved", enrolment: "public", pricing: { type: "flat", price: 65 }, curriculum: [],
      settings: settings(), updated: at(-40), rating: 4.5,
    },
    {
      id: "C5", title: "Manual Handling", subtitle: "On-demand course on lifting and carrying safely, with a short assessment.",
      details: "Learn the law, how injuries happen and the TILE assessment, then show what you know in a 10-question quiz.",
      format: "self-paced", level: "beginner", category: "health-and-safety", features: ["About 90 minutes", "Certificate on passing"],
      objectives: ["Explain the Manual Handling Operations Regulations", "Use TILE to assess a task", "Lift and carry with a safe technique", "Know when to ask for help or equipment"],
      topics: [], faqs: [], venues: [], media: [], status: "approved", enrolment: "public", pricing: { type: "flat", price: 25 },
      curriculum: [
        { id: "S1", title: "Why manual handling matters", lessons: [
          { id: "LS1", type: "video", title: "How back injuries happen", minutes: 6 },
          { id: "LS2", type: "text", title: "The law in plain words", minutes: 8 },
        ] },
        { id: "S2", title: "Assessing and lifting", lessons: [
          { id: "LS3", type: "text", title: "The TILE assessment", minutes: 10 },
          { id: "LS4", type: "video", title: "A safe lift, step by step", minutes: 7 },
          { id: "LS5", type: "download", title: "TILE checklist (PDF)", minutes: 2 },
        ] },
        { id: "S3", title: "Assessment", lessons: [{ id: "LS6", type: "quiz", title: "Final quiz: 10 questions", minutes: 15, pass: 80 }] },
      ],
      settings: settings(), updated: at(-50), rating: 4.4,
    },
    {
      id: "C6", title: "Working at Height", subtitle: "One-day course on planning and doing work at height safely.",
      details: "The Work at Height Regulations, risk assessment, ladders, towers and fall protection.",
      format: "classroom", level: "beginner", category: "construction", features: ["1 day"],
      objectives: ["Explain the Work at Height Regulations", "Plan work at height", "Choose and inspect equipment", "Use ladders and towers safely"],
      topics: [], faqs: ["F1"], venues: ["V1"], media: [], status: "pending", enrolment: "public", pricing: { type: "flat", price: 120 }, curriculum: [],
      settings: settings(), updated: at(-2), rating: 0,
    },
    {
      id: "C7", title: "COSHH Awareness", subtitle: "", details: "", format: "self-paced", level: "beginner", category: "health-and-safety", features: [],
      objectives: [], topics: [], faqs: [], venues: [], media: [], status: "draft", enrolment: "private", pricing: { type: "flat", price: 0 }, curriculum: [],
      settings: settings(), updated: at(-1), rating: 0,
    },
  ];

  // what Hurak's new-course wizard asks: sub-category and topic (slugs from the catalogue list), compliance or not, performance
  // model, Skill Saver
  const setup = {
    C1: ["workplace-first-aid", "emergency-first-aid-at-work", "compliance", true],
    C2: ["workplace-first-aid", "first-aid-at-work", "compliance", true],
    C3: ["sia-licence-training", "door-supervisor", "compliance", true],
    C4: ["fire-safety", "fire-marshal", "compliance", false],
    C5: ["manual-handling", "", "compliance", false],
    C6: ["plant-and-access", "working-at-height", "compliance", false],
    C7: ["hazardous-substances", "coshh", "compliance", false],
  };
  courses.forEach((c) => {
    const [subcategory, topic, type, skillSaver] = setup[c.id];
    Object.assign(c, { subcategory, topic, type, sharedLanding: type === "compliance", model: "bookings", skillSaver });
    c.settings.assignmentEmail = "";
  });

  const team = [
    { id: "T1", name: "Joanne Fielding", email: "joanne@northfieldsafety.co.uk", role: "admin", status: "active", owner: true },
    { id: "T2", name: "Mark Ellison", email: "mark@northfieldsafety.co.uk", role: "tutor", status: "active" },
    { id: "T3", name: "Samira Haddad", email: "samira@northfieldsafety.co.uk", role: "tutor", status: "active" },
    { id: "T4", name: "", email: "bookings@northfieldsafety.co.uk", role: "support", status: "pending" },
  ];

  const s = (n, from = "09:30", to = "16:30") => ({ date: d(n), end: d(n), from, to });
  const cohorts = [
    { id: "K1", courseId: "C1", sessions: [s(-34)], venueId: "V1", tutorId: "T2", price: 95, max: 12, details: "", cancelled: false },
    { id: "K2", courseId: "C3", sessions: [-15, -14, -13, -12, -11, -10].map((n) => s(n, "09:00", "17:00")), venueId: "V2", tutorId: "T3", price: 299, packageId: "P2", max: 14, details: "Bring two forms of ID for the exams.", cancelled: false },
    { id: "K3", courseId: "C1", sessions: [s(-3)], venueId: "V2", tutorId: "T2", price: 95, max: 12, details: "", cancelled: false },
    { id: "K4", courseId: "C4", sessions: [s(0, "09:00", "12:30")], venueId: "", tutorId: "T3", price: 65, max: 20, details: "The joining link is in your joining instructions.", cancelled: false },
    { id: "K5", courseId: "C1", sessions: [s(6)], venueId: "V1", tutorId: "T2", price: 95, max: 12, details: "", cancelled: false },
    { id: "K6", courseId: "C2", sessions: [s(9), s(10), s(11)], venueId: "V1", tutorId: "T2", price: 235, packageId: "P1", max: 12, details: "", cancelled: false },
    { id: "K7", courseId: "C3", sessions: [20, 21, 22, 23, 24, 25].map((n) => s(n, "09:00", "17:00")), venueId: "V2", tutorId: "T3", price: 299, packageId: "P2", max: 14, details: "Bring two forms of ID for the exams.", cancelled: false },
    { id: "K8", courseId: "C4", sessions: [s(13, "13:30", "17:00")], venueId: "", tutorId: "T3", price: 65, max: 20, details: "", cancelled: true },
    { id: "K9", courseId: "C1", sessions: [s(27)], venueId: "V2", tutorId: "", price: 95, max: 12, details: "", cancelled: false },
  ];
  const palette = ["purple", "blue", "green", "orange", "red"];
  cohorts.forEach((k, i) => (k.colour = palette[i % palette.length]));

  // orders: [ref, days ago, channel, status, payment, customer index, [courseId, cohortId, plan, price, learner indexes], refunded]
  const rows = [
    ["NF-24811", -40, "marketplace", "paid", "card", 0, ["C1", "K1", "", 95, [0, 4, 11]], 0],
    ["NF-24816", -38, "website", "paid", "card", 1, ["C1", "K1", "", 95, [1]], 0],
    ["NF-24830", -30, "marketplace", "paid", "card", 5, ["C3", "K2", "flexi", 299, [5, 7]], 0],
    ["NF-24835", -28, "manual", "paid", "offline", 2, ["C3", "K2", "saver", 265, [2, 9]], 0],
    ["NF-24842", -26, "marketplace", "refunded", "card", 3, ["C3", "K2", "premium", 349, [3]], 349],
    ["NF-24851", -20, "marketplace", "paid", "card", 6, ["C1", "K3", "", 95, [6]], 0],
    ["NF-24857", -17, "website", "paid", "card", 8, ["C1", "K3", "", 95, [8, 10]], 0],
    ["NF-24863", -14, "marketplace", "paid", "card", 10, ["C4", "K4", "", 65, [10]], 0],
    ["NF-24870", -11, "marketplace", "partial", "card", 0, ["C2", "K6", "flexi", 235, [0, 4, 11]], 235],
    ["NF-24874", -9, "manual", "incomplete", "link", 9, ["C2", "K6", "saver", 210, [9]], 0],
    ["NF-24879", -7, "marketplace", "paid", "card", 7, ["C3", "K7", "flexi", 299, [7]], 0],
    ["NF-24883", -6, "marketplace", "dispute", "card", 3, ["C1", "K5", "", 95, [3]], 0],
    ["NF-24888", -4, "website", "paid", "card", 1, ["C5", "", "", 25, [1, 6]], 0],
    ["NF-24892", -3, "marketplace", "paid", "card", 2, ["C1", "K5", "", 95, [2]], 0],
    ["NF-24895", -2, "marketplace", "cancelled", "card", 8, ["C4", "K8", "", 65, [8]], 0],
    ["NF-24899", -1, "marketplace", "paid", "card", 5, ["C3", "K7", "premium", 349, [5]], 0],
  ];
  const orders = rows.map(([ref, ago, channel, status, payment, cust, [courseId, cohortId, plan, price, ls], refunded]) => {
    const c = learners[cust];
    return {
      ref, at: at(ago, 11), channel, status, payment,
      customer: { first: c.first, last: c.last, email: c.email, phone: c.phone, company: c.company, address: "", city: "Leeds", postcode: "" },
      lines: [{ courseId, cohortId, plan, price, qty: ls.length, learnerIds: ls.map((i) => learners[i].id) }],
      total: price * ls.length, refunded, notes: [],
    };
  });

  // a booking for each learner on each order line; past cohorts have results
  const enrolments = [];
  orders.forEach((o) => {
    if (o.status === "cancelled" || o.status === "refunded") return;
    o.lines.forEach((l) => l.learnerIds.forEach((learnerId, i) => {
      if (o.status === "partial" && i === 2) return;
      enrolments.push({ id: `E${enrolments.length + 1}`, orderRef: o.ref, cohortId: l.cohortId, courseId: l.courseId, learnerId, attended: null, result: null, certificate: null, progress: l.cohortId ? null : 40 * (i + 1), clr: {} });
    }));
  });
  const done = (cohortId, certify) => enrolments.filter((e) => e.cohortId === cohortId).forEach((e, i) => {
    e.attended = true;
    e.result = i === 1 && cohortId === "K2" ? "fail" : "pass";
    if (certify && e.result === "pass") e.certificate = { no: `NF-${cohortId}-${100 + i}`, issued: at(cohortId === "K1" ? -32 : -8) };
  });
  done("K1", true);
  done("K2", true);
  done("K3", false);

  const reviews = [
    { id: "R1", courseId: "C1", name: "Aisha R.", rating: 5, text: "Mark made it really practical. I feel confident I could help someone now.", at: at(-31), reply: "Thank you Aisha, we'll pass this on to Mark." },
    { id: "R2", courseId: "C1", name: "Tom W.", rating: 4, text: "Good course. The room was a bit cold in the morning.", at: at(-30), reply: "" },
    { id: "R3", courseId: "C3", name: "Daniel H.", rating: 5, text: "Samira was brilliant, passed all my exams first time.", at: at(-8), reply: "" },
    { id: "R4", courseId: "C3", name: "Priya N.", rating: 3, text: "Content was good but the days were long and the breaks short.", at: at(-7), reply: "" },
    { id: "R5", courseId: "C4", name: "Ellie B.", rating: 5, text: "", at: at(-1), reply: "" },
  ];

  const leads = [
    { id: "Q1", at: at(-12), name: "Harbour Logistics", email: "hr@harbourlogistics.example", courseId: "C2", text: "We need 8 staff trained on site in November. Can you quote?", status: "new" },
    { id: "Q2", at: at(-9), name: "Lena Fischer", email: "lena.fischer@example.co.uk", courseId: "C1", text: "Do you run Saturday courses?", status: "replied" },
    { id: "Q3", at: at(-5), name: "Westgate School", email: "office@westgate.example", courseId: "C4", text: "Could the fire marshal course run for 15 staff on an inset day?", status: "new" },
    { id: "Q4", at: at(-2), name: "Omar Haddad", email: "omar.haddad@example.co.uk", courseId: "C3", text: "Is the exam fee included in the price?", status: "new" },
  ];

  const refunds = [
    { id: "RR1", orderRef: "NF-24842", learnerId: "L104", at: at(-24), amount: 349, reason: "Can't attend: started a new job that week.", status: "approved", note: "Full refund, more than 10 days before.", decided: at(-23) },
    { id: "RR2", orderRef: "NF-24870", learnerId: "L112", at: at(-10), amount: 235, reason: "Staff member has left the company.", status: "approved", note: "One of three places refunded.", decided: at(-9) },
    { id: "RR3", orderRef: "NF-24892", learnerId: "L103", at: at(-1, 15), amount: 95, reason: "My manager booked me on the wrong date. Can I have a refund or a different date?", status: "open", note: "" },
  ];
  // each request keeps the learner's booking reference, which stays after the refund frees the place
  refunds.forEach((r, i) => {
    const e = enrolments.find((x) => x.orderRef === r.orderRef && x.learnerId === r.learnerId);
    r.bookingRef = e ? e.id.replace(/^E/, "B-") : `B-${90 + i}`;
  });

  const qa = [
    { id: "QA1", courseId: "C3", question: "Do I need a first aid certificate before I start?", answer: "No. Emergency First Aid at Work is part of this course.", from: "provider", at: at(-60) },
    { id: "QA2", courseId: "C1", question: "Is the course suitable if I have a bad knee?", answer: "", from: "learner", name: "Sophie T.", at: at(-2) },
  ];

  const notifications = [
    { id: "N1", at: at(-1, 15), text: "Priya Nair submitted a refund request for Emergency First Aid at Work", href: "/provider/orders/NF-24892", read: false },
    { id: "N2", at: at(-1, 9), text: "Ellie B. left a 5 star review on Fire Marshal", href: "/provider/performance?tab=reviews", read: false },
    { id: "N3", at: at(-2), text: "Working at Height was sent for review", href: "/provider/courses/C6", read: true },
    { id: "N4", at: at(-6), text: "Order NF-24883 is in dispute. Send your evidence within 7 days.", href: "/provider/orders/NF-24883", read: false },
    { id: "N5", at: at(-9), text: "New order NF-24879 from Marek Nowak for SIA Door Supervisor", href: "/provider/orders/NF-24879", read: true },
  ];
  // older ones, as Hurak's list keeps them: a note for each website or ReadTraining order and each review
  const titleOf = (id) => courses.find((c) => c.id === id)?.title || "a course";
  notifications.push(
    ...orders.filter((o) => o.channel !== "manual" && o.at < at(-10)).map((o, i) => ({ id: `N${20 + i}`, at: o.at, text: `New order ${o.ref} from ${o.customer.first} ${o.customer.last} for ${titleOf(o.lines[0].courseId)}`, href: `/provider/orders/${o.ref}`, read: true })),
    ...reviews.filter((r) => r.at < at(-10)).map((r, i) => ({ id: `N${60 + i}`, at: r.at + 3600000, text: `You got a ${r.rating} star review on ${titleOf(r.courseId)} by ${r.name}`, href: "/provider/performance?tab=reviews", read: true })),
  );

  return {
    version: 3,
    seededAt: now,
    org: {
      name: "Northfield Safety Training", slug: "northfield-safety-training", city: "Leeds",
      headline: "First aid, fire and security training across West Yorkshire",
      bio: "Family-run training centre in Leeds since 2009. Small groups, practical courses and tutors who still work in the field.",
      facebook: "", linkedin: "https://www.linkedin.com/company/northfield-safety-training", youtube: "",
      policy: "Cancel more than 10 working days before the course for a full refund. Between 5 and 10 working days, we refund 50%. Within 5 working days we can move you to another date for a £20 fee.",
      terms: "Bookings are confirmed when paid. Learners must bring photo ID. Certificates are issued once every assessment is passed. We may move a course to another date or venue if numbers are too low, and offer a full refund if the new date does not suit.",
      vat: { registered: true, number: "GB 284 7193 62" },
      emails: { refund: "accounts@northfieldsafety.co.uk", dispute: "accounts@northfieldsafety.co.uk", order: "bookings@northfieldsafety.co.uk" },
    },
    me: { id: "T1", name: "Joanne Fielding", email: "joanne@northfieldsafety.co.uk", role: "Account owner" },
    courses, cohorts, venues, faqs, packages, team, learners, orders, enrolments, reviews, leads, refunds, qa, notifications,
  };
}
