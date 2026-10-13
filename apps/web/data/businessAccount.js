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
  ],
  switchTo: { label: "Switch to my personal account", href: "/account" },

  dashboard: {
    lead: "Your team's training, places, certificates and billing in one place.",
    stats: { learners: "Learners", unassigned: "Places to assign", certificates: "Valid certificates", renewals: "Renewals due in 90 days" },
    assign: { title: "Places to assign", text: "Places you bought and have not given to anyone yet.", cta: "Assign", none: "Every place you bought has a learner." },
    renewals: { title: "Renewals due", cta: "Book renewal", none: "No certificates expire in the next 90 days." },
    upcoming: { title: "Upcoming training", all: "View all bookings" },
    billing: { title: "Business credit", cta: "View billing" },
    actions: {
      title: "Quick actions",
      items: [
        { label: "Book training for your team", href: "/courses", primary: true },
        { label: "Add a learner", href: "/business/learners?add=1" },
        { label: "Get a group quote", href: "/quote" },
      ],
    },
  },

  learners: {
    title: "Learners",
    lead: "Everyone on your account, their training and their certificates.",
    add: "Add learner",
    search: "Search by name or email",
    filters: { all: "All", renewal: "Renewal due", unbooked: "No training booked", invited: "Invited" },
    columns: ["Learner", "Job title", "Training", "Certificates", "Status"],
    empty: "No learners match. Try another name or filter.",
    form: { title: "Add a learner", name: "Full name", email: "Email address", job: "Job title (optional)", submit: "Add learner", note: "We email them an invitation to join your Business account." },
    detail: { training: "Training", certificates: "Certificates", none: "No training booked yet.", noCerts: "No certificates yet.", assign: "Assign to a course" },
    status: { active: "Active", invited: "Invited" },
  },

  assignments: {
    title: "Assign places",
    lead: "Give each place you bought to a learner now, or keep it until you know who needs it.",
    filters: { all: "All courses", open: "With places to assign" },
    assigned: "Assigned",
    unassigned: "Unassigned place",
    choose: "Choose a learner",
    assign: "Assign",
    unassign: "Remove",
    none: "Every learner on your account already has a place on this course.",
    empty: { title: "No upcoming places", text: "Places you buy for your team show here until the course starts.", cta: { label: "Book training for your team", href: "/courses" } },
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
    credit: { title: "Business credit", limit: "Credit limit", used: "Used", available: "Available", due: "Amount due", terms: "Payment terms" },
    pay: "Pay balance",
    payTitle: "Pay your balance",
    payText: "Pay {amount} now by card. Your available credit goes back up straight away.",
    payConfirm: "Pay {amount}",
    paid: "Thank you. {amount} has been paid and your invoices are marked as paid.",
    invoices: { title: "Invoices", columns: ["Invoice", "Date", "Booking", "Amount", "Status"], view: "View", print: "Print invoice" },
    status: { paid: "Paid", due: "Due", overdue: "Overdue" },
    details: { title: "Billing details", change: "To change these details, contact us.", cta: { label: "Contact us", href: "/contact-us?topic=business#contact-form" } },
  },

  // ---- demo data (until accounts exist) ----
  company: { name: "Harbour Facilities Ltd", account: "BA-20418", email: "accounts@harbourfacilities.co.uk", address: "Unit 4, Quayside Park, Bristol BS1 6XN", vat: "GB 284 1937 22", terms: "30 days", limit: 5000 },
  people: [
    { id: "l1", name: "Hannah Cooper", email: "h.cooper@harbourfacilities.co.uk", job: "Facilities supervisor", status: "active" },
    { id: "l2", name: "Daniel Khan", email: "d.khan@harbourfacilities.co.uk", job: "Security officer", status: "active" },
    { id: "l3", name: "Priya Shah", email: "p.shah@harbourfacilities.co.uk", job: "Office manager", status: "active" },
    { id: "l4", name: "Tom Reilly", email: "t.reilly@harbourfacilities.co.uk", job: "Maintenance engineer", status: "active" },
    { id: "l5", name: "Grace Osei", email: "g.osei@harbourfacilities.co.uk", job: "Receptionist", status: "active" },
    { id: "l6", name: "Marcus Reid", email: "m.reid@harbourfacilities.co.uk", job: "Security officer", status: "active" },
    { id: "l7", name: "Aisha Patel", email: "a.patel@harbourfacilities.co.uk", job: "Cleaning team lead", status: "active" },
    { id: "l8", name: "Sophie Williams", email: "s.williams@harbourfacilities.co.uk", job: "Health and safety officer", status: "active" },
    { id: "l9", name: "Ben Hughes", email: "b.hughes@harbourfacilities.co.uk", job: "Site operative", status: "active" },
    { id: "l10", name: "Ella Morgan", email: "e.morgan@harbourfacilities.co.uk", job: "Site operative", status: "invited" },
  ],
  // places bought per course and date: who has one; `startIn`/`bookedDaysAgo` are days from today
  purchases: [
    { id: "p1", reference: "RT-2026-120455", courseId: 5, mode: "classroom", startIn: 18, days: 1, time: "09:00 to 16:30", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Pinnacle Compliance Training", unit: 93.33, places: 12, assigned: ["l1", "l2", "l3", "l4", "l5", "l6", "l7"], bookedDaysAgo: 14, bookedBy: "Sam Carter", po: "PO-4471", invoice: "INV-2026-0412" },
    { id: "p2", reference: "RT-2026-118020", courseId: 16, mode: "classroom", startIn: 41, days: 1, time: "09:30 to 16:30", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Northstar Training", unit: 70, places: 6, assigned: ["l4", "l8", "l9"], bookedDaysAgo: 20, bookedBy: "Hannah Cooper", po: "PO-4463", invoice: "INV-2026-0398" },
    { id: "p3", reference: "RT-2026-121730", courseId: 1, mode: "classroom", startIn: 26, days: 6, time: "09:30 to 17:00", venue: "London Training Centre", city: "London", postcode: "EC1A 1BB", provider: "ClearView Learning", unit: 198.99, places: 2, assigned: ["l6"], bookedDaysAgo: 6, bookedBy: "Sam Carter", po: "", invoice: "INV-2026-0421" },
    { id: "p4", reference: "RT-2026-087311", courseId: 15, mode: "online", startIn: -95, days: 1, time: "10:00 to 13:00", venue: "", city: "", postcode: "", provider: "Beacon Training Services", unit: 37.5, places: 8, assigned: ["l1", "l3", "l4", "l5", "l7", "l8", "l9", "l2"], bookedDaysAgo: 130, bookedBy: "Sam Carter", po: "PO-4302", invoice: "INV-2026-0233" },
    { id: "p5", reference: "RT-2026-079904", courseId: 13, mode: "classroom", startIn: -40, days: 4, time: "09:00 to 17:00", venue: "Bristol Training Centre", city: "Bristol", postcode: "BS1 4DJ", provider: "Pinnacle Compliance Training", unit: 295, places: 1, assigned: ["l8"], bookedDaysAgo: 150, bookedBy: "Hannah Cooper", po: "PO-4288", invoice: "INV-2026-0207", cancelled: { daysAgo: 120, refund: 295 } },
  ],
  certificates: [
    { learnerId: "l1", courseId: 5, number: "RT-2023-118204", expiresInDays: 25 },
    { learnerId: "l2", courseId: 1, number: "RT-2023-094117", expiresInDays: 64 },
    { learnerId: "l8", courseId: 16, number: "RT-2025-033510", expiresInDays: 420 },
    { learnerId: "l3", courseId: 15, number: "RT-2026-087311-3", expiresInDays: 1000 },
    { learnerId: "l4", courseId: 15, number: "RT-2026-087311-4", expiresInDays: 1000 },
    { learnerId: "l6", courseId: 5, number: "RT-2023-071552", expiresInDays: -12 },
  ],
  // `daysAgo` issued, `dueIn` days from today (negative = past due); paid ones have `paid: true`
  invoices: [
    { number: "INV-2026-0421", reference: "RT-2026-121730", daysAgo: 6, dueIn: 24, amount: 397.98 },
    { number: "INV-2026-0412", reference: "RT-2026-120455", daysAgo: 14, dueIn: 16, amount: 1119.96 },
    { number: "INV-2026-0398", reference: "RT-2026-118020", daysAgo: 20, dueIn: 10, amount: 420 },
    { number: "INV-2026-0233", reference: "RT-2026-087311", daysAgo: 130, dueIn: -100, amount: 300, paid: true },
    { number: "INV-2026-0207", reference: "RT-2026-079904", daysAgo: 150, dueIn: -120, amount: 295, paid: true },
  ],
};
