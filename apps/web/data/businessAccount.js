import { CATALOGUE_HREF } from "@/lib/routes";
// The Business account (/business): dashboard, learners, team training assignments, bookings, and billing and invoices. Built on
// what Hurak's Business account offers (its "For Businesses" page: a training overview with learners, unassigned places,
// certificates and renewals due; places per course you assign now or hold; learner progress; certificates and expiry; billing on a
// business credit account) and on what our /for-business page promises, with the same demo company and people as its screens.
// The demo data is dummy until accounts exist (see lib/businessAccount.js); dates are days from today so the demo stays current.

export const businessAccount = {
  title: "Business account",
  nav: [
    { key: "dashboard", label: "Dashboard", href: "/business", icon: "icon-bar-chart-2" },
    { key: "learners", label: "Learners", href: "/business/learners", icon: "icon-person-3" },
    { key: "assignments", label: "Assign places", href: "/business/assignments", icon: "icon-list" },
    { key: "bookings", label: "Bookings", href: "/business/bookings", icon: "icon-calendar" },
    { key: "billing", label: "Billing and invoices", href: "/business/billing", icon: "icon-badge" },
    { key: "team", label: "Team", href: "/business/team", icon: "icon-friend" },
  ],

  // Create a business account (/business/create), as the client's "Create a Business Account": the company, your role and a
  // phone number, added to this same login
  create: {
    eyebrow: "Business account",
    title: "Create a business account",
    lead: "Buy training for your team, assign places now or keep them for later, and keep learners and certificates together.",
    formTitle: "Your business details",
    formLead: "You use the same login for your learner and business accounts, and can switch between them at any time.",
    company: "Company name",
    companyHint: "The name on your invoices and team training.",
    jobTitle: "Your role",
    jobTitleHint: "For example Operations Manager.",
    phone: "Phone number",
    phoneHint: "Used for business account support and training enquiries.",
    terms: { before: "By creating a business account, you agree to our", terms: "Terms and conditions", and: "and", privacy: "Privacy policy" },
    submit: "Create business account",
    sending: "Creating…",
    loading: "Loading…",
  },

  dashboard: {
    lead: "Your team's training, places, certificates and billing in one place.",
    // the page head's buttons (the main actions, at the top where people look first)
    actions: [
      { label: "Book training for your team", href: CATALOGUE_HREF, primary: true },
      { label: "Add a learner", href: "/business/learners?add=1" },
    ],
    // each number links to its section, with a short line saying what it means
    stats: {
      learners: { label: "Learners", hint: (active, invited) => (invited ? `${active} active, ${invited} invited` : `${active} active`) },
      unassigned: { label: "Places to assign", hint: (n) => (n ? "Ready to give to learners" : "Every place has a learner") },
      certificates: { label: "Valid certificates", hint: "Ready to download" },
      renewals: { label: "Need renewing", hint: (expired, soon) => [expired && `${expired} expired`, soon && `${soon} due in 90 days`].filter(Boolean).join(", ") || "Nothing due in 90 days" },
    },
    // the courses to come, each with its places and Assign (Hurak's unassigned licences and courses, as one list)
    upcoming: { title: "Upcoming training", all: "View all bookings", assign: "Assign places", manage: "Manage places", none: "No upcoming training. Book a course and its places show here." },
    renewals: { title: "Need renewing", cta: "Book renewal", none: "No certificates expire in the next 90 days." },
    // as Hurak's dashboard: the latest results, and the latest certificates (issue and expiry dates, with Download)
    results: { title: "Recent results", rebook: "Rebook", none: "No results yet. They show here once your learners finish a course." },
    certificates: { title: "Recent certificates", columns: ["Learner", "Course", "Issue date", "Expiry date"], all: "View learners", download: "Download", none: "No valid certificates yet. They show here once your learners pass a course." },
    billing: { title: "Business credit", cta: "View billing", pay: "Pay balance" },
  },

  // Team (/business/team): colleagues who can manage the account, as on Hurak's Business account ("Add member": name, email,
  // role; Hurak has one role, Member). Learners are the people being trained; team members run the account.
  team: {
    title: "Team",
    lead: "Colleagues who can manage this Business account: book training, assign places and see invoices.",
    add: "Add member",
    columns: ["Team member", "Role", "Status", "Actions"],
    roles: { owner: "Account owner", member: "Member" },
    status: { active: "Active", invited: "Invitation sent" },
    ownerNote: "That's you. To change billing details or close the account, contact us.",
    roleHint: "Members can book training, assign places and see invoices.",
    resend: "Resend invitation",
    remove: "Remove",
    removeTitle: "Remove {name}?",
    removeText: "They will no longer be able to manage this Business account. Their own training and certificates are not affected.",
    removeConfirm: "Remove from team",
    form: { title: "Add a team member", first: "First name", last: "Last name", email: "Work email", role: "Role", submit: "Send invitation", note: "We email them an invitation to join your Business account." },
  },

  learners: {
    title: "Learners",
    lead: "Everyone on your account, their training and their certificates.",
    add: "Add learner",
    search: "Search by name or email",
    filters: { all: "All", renewal: "Renewal due", unbooked: "No training booked", invited: "Invited" },
    // a learner who has not accepted yet is marked Invited beside the name (everyone else is active, so no status column)
    columns: ["Learner", "Job title", "Training", "Certificates"],
    more: (n) => `+${n} more booked`,
    empty: "No learners match. Try another name or filter.",
    form: { title: "Add a learner", name: "Full name", email: "Email address", job: "Job title (optional)", submit: "Add learner", note: "We email them an invitation to join your Business account." },
    detail: { training: "Training", certificates: "Certificates", none: "No training booked yet.", noCerts: "No certificates yet.", assign: "Assign to a course" },
    // the certificate as a PDF: the browser's print window, where "Save as PDF" is the destination
    download: "Download certificate",
    status: { active: "Active", invited: "Invited" },
  },

  assignments: {
    title: "Assign places",
    lead: "Give each place you bought to a learner now, or keep it until you know who needs it.",
    filters: { all: "All courses", open: "With places to assign" },
    // as Hurak's Courses page: the course type, a title search, Clear filter and how many courses match
    type: "Course type",
    allTypes: "All course types",
    search: "Course title",
    clear: "Clear filter",
    found: (n) => `${n} ${n === 1 ? "course" : "courses"} found`,
    noMatch: "No courses match. Try another title or course type.",
    assigned: "Assigned",
    unassign: "Remove",
    showAll: (n) => `Show all ${n} learners`,
    fewer: "Show fewer",
    // the places still free: one row, and a list to tick several learners at once
    freeTitle: (n) => `${n} ${n === 1 ? "place" : "places"} to assign`,
    freeText: "Give them to learners now, or keep them until you know who needs them.",
    assignMany: "Assign learners",
    pickTitle: (course) => `Assign learners to ${course}`,
    pickText: (n) => `Tick up to ${n} ${n === 1 ? "learner" : "learners"}. Each gets a place on this course.`,
    choose: "Learners without a place on this course",
    picked: (n, max) => `${n} of ${max} chosen`,
    assignN: (n) => (n ? `Assign ${n} ${n === 1 ? "learner" : "learners"}` : "Assign learners"),
    none: "Every learner on your account already has a place on this course.",
    empty: { title: "No upcoming places", text: "Places you buy for your team show here until the course starts.", cta: { label: "Book training for your team", href: CATALOGUE_HREF } },
    addLearner: "Add a learner",
  },

  bookings: {
    title: "Bookings",
    lead: "Every course your team booked, with its places and invoice.",
    tabs: { upcoming: "Upcoming", past: "Past", cancelled: "Cancelled" },
    manage: "Manage places",
    empty: { upcoming: "No upcoming training booked.", past: "No past training yet.", cancelled: "No cancelled bookings." },
  },

  billing: {
    title: "Billing and invoices",
    lead: "Your credit account, what is due and every invoice.",
    credit: { title: "Business credit", limit: "Credit limit", used: "Used", available: "Available", due: "Outstanding", next: (amount, date) => `${amount} due ${date}`, terms: "Payment terms" },
    pay: "Pay balance",
    payTitle: "Pay your balance",
    payText: "Pay {amount} now by card. Your available credit goes back up straight away.",
    payConfirm: "Pay {amount}",
    paid: "Thank you. {amount} has been paid and your invoices are marked as paid.",
    // Download opens the invoice and the browser's print window, where "Save as PDF" downloads it
    invoices: { title: "Invoices", columns: ["Invoice", "Date", "Booking", "Amount", "Status"], view: "View", download: "Download", print: "Print invoice" },
    status: { paid: "Paid", due: "Due", overdue: "Overdue", refunded: "Refunded" },
    details: { title: "Billing details", change: "To change these details, contact us.", cta: { label: "Contact us", href: "/contact-us?topic=business#contact-form" } },
  },

  // ---- demo data (until accounts exist) ----
  company: { account: "BA-20418", email: "accounts@example.co.uk", address: "Unit 4, Quayside Park, Bristol BS1 6XN", vat: "GB 284 1937 22", terms: "30 days", limit: 5000 },
  // team members besides the signed-in account owner (DEMO)
  teamMembers: [
    { id: "t1", first: "Priya", last: "Shah", email: "p.shah@example.co.uk", role: "member", status: "active" },
    { id: "t2", first: "James", last: "Holt", email: "j.holt@example.co.uk", role: "member", status: "invited" },
  ],
  people: [
    { id: "l1", name: "Hannah Cooper", email: "h.cooper@example.co.uk", job: "Facilities supervisor", status: "active" },
    { id: "l2", name: "Daniel Khan", email: "d.khan@example.co.uk", job: "Security officer", status: "active" },
    { id: "l3", name: "Priya Shah", email: "p.shah@example.co.uk", job: "Office manager", status: "active" },
    { id: "l4", name: "Tom Reilly", email: "t.reilly@example.co.uk", job: "Maintenance engineer", status: "active" },
    { id: "l5", name: "Grace Osei", email: "g.osei@example.co.uk", job: "Receptionist", status: "active" },
    { id: "l6", name: "Marcus Reid", email: "m.reid@example.co.uk", job: "Security officer", status: "active" },
    { id: "l7", name: "Aisha Patel", email: "a.patel@example.co.uk", job: "Cleaning team lead", status: "active" },
    { id: "l8", name: "Sophie Williams", email: "s.williams@example.co.uk", job: "Health and safety officer", status: "active" },
    { id: "l9", name: "Ben Hughes", email: "b.hughes@example.co.uk", job: "Site operative", status: "active" },
    { id: "l10", name: "Ella Morgan", email: "e.morgan@example.co.uk", job: "Site operative", status: "invited" },
  ],
  // places bought per course and date: who has one; `startIn`/`bookedDaysAgo` are days from today; `bookedBy` is "owner" (the
  // signed-in account owner) or a team member's id
  purchases: [
    { id: "p1", reference: "RT-2026-120455", courseId: 5, mode: "classroom", startIn: 18, days: 1, time: "09:00 to 16:30", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Pinnacle Compliance Training", unit: 93.33, places: 12, assigned: ["l1", "l6", "l9", "l3", "l5"], bookedDaysAgo: 14, bookedBy: "owner", po: "PO-4471", invoice: "INV-2026-0412" },
    { id: "p2", reference: "RT-2026-118020", courseId: 16, mode: "classroom", startIn: 41, days: 1, time: "09:30 to 16:30", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Northstar Training", unit: 70, places: 6, assigned: ["l4", "l2", "l3"], bookedDaysAgo: 20, bookedBy: "t1", po: "PO-4463", invoice: "INV-2026-0398" },
    { id: "p3", reference: "RT-2026-121730", courseId: 1, mode: "classroom", startIn: 26, days: 6, time: "09:30 to 17:00", venue: "London Training Centre", city: "London", postcode: "EC1A 1BB", provider: "ClearView Learning", unit: 198.99, places: 2, assigned: ["l2"], bookedDaysAgo: 6, bookedBy: "owner", po: "", invoice: "INV-2026-0421" },
    { id: "p4", reference: "RT-2026-087311", courseId: 15, mode: "online", startIn: -95, days: 1, time: "10:00 to 13:00", venue: "", city: "", postcode: "", provider: "Beacon Training Services", unit: 37.5, places: 8, assigned: ["l1", "l3", "l4", "l5", "l7", "l8", "l9", "l2"], bookedDaysAgo: 130, bookedBy: "owner", po: "PO-4302", invoice: "INV-2026-0233" },
    { id: "p6", reference: "RT-2026-116540", courseId: 5, mode: "classroom", startIn: -21, days: 1, time: "09:00 to 16:30", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Pinnacle Compliance Training", unit: 93.33, places: 2, assigned: ["l7", "l9"], bookedDaysAgo: 40, bookedBy: "owner", po: "PO-4459", invoice: "INV-2026-0376" },
    { id: "p5", reference: "RT-2026-079904", courseId: 13, mode: "classroom", startIn: -40, days: 4, time: "09:00 to 17:00", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Pinnacle Compliance Training", unit: 295, places: 1, assigned: ["l8"], bookedDaysAgo: 150, bookedBy: "t1", po: "PO-4288", invoice: "INV-2026-0207", cancelled: { daysAgo: 120, refund: 295 } },
  ],
  // `issuedDaysAgo` and `expiresInDays` are days from today
  certificates: [
    { learnerId: "l1", courseId: 5, number: "RT-2023-118204", issuedDaysAgo: 1070, expiresInDays: 25, provider: "Pinnacle Compliance Training" },
    { learnerId: "l2", courseId: 1, number: "RT-2023-094117", issuedDaysAgo: 1031, expiresInDays: 64, provider: "ClearView Learning" },
    { learnerId: "l8", courseId: 16, number: "RT-2024-033510", issuedDaysAgo: 675, expiresInDays: 420, provider: "Northstar Training" },
    { learnerId: "l3", courseId: 15, number: "RT-2026-087311-3", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l4", courseId: 15, number: "RT-2026-087311-4", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l1", courseId: 15, number: "RT-2026-087311-1", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l2", courseId: 15, number: "RT-2026-087311-8", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l7", courseId: 15, number: "RT-2026-087311-5", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l8", courseId: 15, number: "RT-2026-087311-6", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l9", courseId: 15, number: "RT-2026-087311-7", issuedDaysAgo: 93, expiresInDays: 1000, provider: "Beacon Training Services" },
    { learnerId: "l6", courseId: 5, number: "RT-2023-071552", issuedDaysAgo: 1107, expiresInDays: -12, provider: "Pinnacle Compliance Training" },
    { learnerId: "l7", courseId: 5, number: "RT-2026-116540-1", issuedDaysAgo: 21, expiresInDays: 1074, provider: "Pinnacle Compliance Training" },
  ],
  // the learners' latest course results (p6 finished 21 days ago, the online course in p4 95 days ago, Sophie's Fire Marshal course
  // before that); `daysAgo` from today. A pass has its certificate above.
  results: [
    { learnerId: "l7", courseId: 5, daysAgo: 21, outcome: "passed", score: 79 },
    { learnerId: "l9", courseId: 5, daysAgo: 21, outcome: "failed", score: 54 },
    { learnerId: "l3", courseId: 15, daysAgo: 95, outcome: "passed", score: 92 },
    { learnerId: "l4", courseId: 15, daysAgo: 95, outcome: "passed", score: 85 },
    { learnerId: "l5", courseId: 15, daysAgo: 95, outcome: "failed", score: 58 },
    { learnerId: "l1", courseId: 15, daysAgo: 95, outcome: "passed", score: 88 },
    { learnerId: "l2", courseId: 15, daysAgo: 95, outcome: "passed", score: 90 },
    { learnerId: "l7", courseId: 15, daysAgo: 95, outcome: "passed", score: 81 },
    { learnerId: "l8", courseId: 15, daysAgo: 95, outcome: "passed", score: 77 },
    { learnerId: "l9", courseId: 15, daysAgo: 95, outcome: "passed", score: 74 },
    { learnerId: "l8", courseId: 16, daysAgo: 675, outcome: "passed", score: 81 },
  ],
  // `daysAgo` issued, `dueIn` days from today (negative = past due); paid ones have `paid: true`
  invoices: [
    { number: "INV-2026-0421", reference: "RT-2026-121730", daysAgo: 6, dueIn: 24, amount: 397.98 },
    { number: "INV-2026-0412", reference: "RT-2026-120455", daysAgo: 14, dueIn: 16, amount: 1119.96 },
    { number: "INV-2026-0398", reference: "RT-2026-118020", daysAgo: 20, dueIn: 10, amount: 420 },
    { number: "INV-2026-0376", reference: "RT-2026-116540", daysAgo: 40, dueIn: -10, amount: 186.66, paid: true },
    { number: "INV-2026-0233", reference: "RT-2026-087311", daysAgo: 130, dueIn: -100, amount: 300, paid: true },
    { number: "INV-2026-0207", reference: "RT-2026-079904", daysAgo: 150, dueIn: -120, amount: 295, paid: true },
  ],
};
