// "For business" page content. Same functionality as the client's current site, our own copy and UI.
const signup = { label: "Create a Business account", href: "/template/signup" };
const demo = { label: "Book a demo", href: "/template/contact-1" };

export const business = {
  hero: {
    eyebrow: "For teams and business buyers",
    title: "Train your whole team. Track every certificate.",
    text: "Open a Business account, buy course places for your team, hand them out now or hold them for later, and keep learners, progress, certificates and renewals together in one place.",
    primary: signup,
    secondary: demo,
    points: ["No contract", "Invoice billing", "Group pricing", "Assign places later"],
    image: { src: "/assets/img/business/dashboard.png", alt: "Business account dashboard" },
    floats: [
      { title: "2 renewals", text: "Due this month", icon: "icon-wall-clock", circle: "bg-light-3", iconColor: "text-dark-1", titleColor: "text-dark-1" },
      { title: "Certificate issued", text: "Jane S. · Food Hygiene L2", icon: "icon-check", circle: "bg-dark-1", iconColor: "text-green-1", titleColor: "text-purple-1" },
    ],
    // account and renewals are read by the /admin dashboard preview
    renewals: [
      { name: "Daniel Khan", course: "Door Supervisor Refresher", date: "03 Oct 2026" },
      { name: "Priya Shah", course: "First Aid at Work", date: "21 Oct 2026" },
    ],
    account: {
      company: "Harbour Facilities Ltd",
      stats: [
        { label: "Learners", value: "18", note: "14 active this month" },
        { label: "Unassigned", value: "5", note: "Ready to assign" },
        { label: "Certificates", value: "21", note: "In the account" },
        { label: "Renewals", value: "2", note: "2 due soon" },
      ],
      activity: [
        { course: "Emergency First Aid at Work", meta: "12 employees · Classroom", status: "Confirmed", progress: "10 of 12 ready" },
        { course: "Door Supervisor Refresher", meta: "6 employees · London", status: "In progress", progress: "4 of 6 complete" },
      ],
    },
  },
  workflow: {
    eyebrow: "How it works",
    title: "Four steps. One account.",
    text: "Buy course places, assign them to learners when you are ready, track progress and renew before anything expires.",
    steps: [
      { title: "Buy places", text: "Purchase course places for your team and keep every booking in one account.", icon: "icon-basket" },
      { title: "Assign or hold", text: "Name the learner straight away, or hold the place until you know who needs it.", icon: "icon-person-2" },
      { title: "Manage learners", text: "Progress, details and admin for every learner sit together in one view.", icon: "icon-list" },
      { title: "Renew on time", text: "Certificate expiry dates are flagged early so nothing lapses unnoticed.", icon: "icon-badge" },
    ],
  },
  licences: {
    eyebrow: "Licence flexibility",
    title: "Buy now. Assign when ready.",
    text: "Purchase training while the dates and price are right, then allocate each place immediately or hold it in your account until you know who needs it.",
    points: ["Lock in dates and price today", "Reassign a place whenever plans change", "Share admin with colleagues"],
    cta: signup,
    course: "Emergency First Aid at Work",
    modes: [
      { id: "assign", label: "Assign now" },
      { id: "hold", label: "Hold for later" },
    ],
    learners: [
      { name: "Hannah Cooper", email: "h.cooper@harbourfacilities.co.uk", status: "Assigned" },
      { name: "Daniel Khan", email: "d.khan@harbourfacilities.co.uk", status: "Assigned" },
      { name: "Priya Shah", email: "p.shah@harbourfacilities.co.uk", status: "Assigned" },
    ],
    assignedMore: "+4 more learners assigned",
    viewAll: { label: "View all", href: "#" },
    held: ["Unassigned place 1", "Unassigned place 2", "Unassigned place 3"],
    heldMore: "+2 more places on hold",
    heldAction: "Assign learner",
    counts: { purchased: 12, assigned: 7, unassigned: 5 },
  },
  progress: {
    eyebrow: "Learner monitoring",
    title: "See every learner at a glance.",
    text: "Learner records and training activity sit together, so you can see who is booked, who is part-way through and who has finished.",
    filters: ["All", "Booked", "In progress", "Complete"],
    frame: "Learner progress · Harbour Facilities Ltd",
    stages: ["Booked", "In progress", "Complete"],
    learners: [
      { name: "Tom Reilly", course: "Fire Marshal Training", status: "Booked", pct: 0 },
      { name: "Grace Osei", course: "Health & Safety Awareness", status: "Booked", pct: 0 },
      { name: "Marcus Reid", course: "Door Supervisor Refresher", status: "In progress", pct: 72 },
      { name: "Aisha Patel", course: "Fire Marshal Training", status: "In progress", pct: 35 },
      { name: "Sophie Williams", course: "Health & Safety Awareness", status: "Complete", pct: 100 },
    ],
  },
  certificates: {
    eyebrow: "Certificates and renewals",
    title: "Certificates and renewals, sorted.",
    text: "Download learner certificates when they are issued, and see issue and expiry dates so renewals never catch you out.",
    points: ["One-click certificate downloads", "Expiry dates on every record"],
    cta: signup,
    rows: [
      { name: "Hannah Cooper", course: "Emergency First Aid at Work", expires: "18 Sep 2029", sort: "2029-09-18", status: "Valid" },
      { name: "Daniel Khan", course: "Door Supervisor Refresher", expires: "03 Oct 2026", sort: "2026-10-03", status: "Renewal due" },
      { name: "Sophie Williams", course: "Fire Marshal Training", expires: "12 Dec 2027", sort: "2027-12-12", status: "Valid" },
    ],
  },
  credit: {
    eyebrow: "For eligible regular Business customers",
    title: "Buy on account. Settle later.",
    text: "Eligible regular customers can keep buying course places against an agreed credit facility and settle the balance on their account terms.",
    points: [
      { title: "Set for your account", text: "A limit agreed for your business, not a fixed cap." },
      { title: "For regular buyers", text: "Based on your history and training spend with us." },
      { title: "Purchase, then settle", text: "Buy within the limit. Pay on your agreed terms." },
    ],
    cta: { label: "Ask about credit", href: "/template/contact-1" },
    card: {
      label: "Business credit",
      company: "Harbour Facilities Ltd",
      status: "Active facility",
      limit: 5000, used: 1840, available: 3160,
      due: { amount: "£1,840.00", date: "30 Sep 2026", status: "Awaiting payment" },
      purchases: [
        { label: "Emergency First Aid · 12 places", amount: "£1,120" },
        { label: "Fire Marshal · 6 places", amount: "£420" },
        { label: "H&S Awareness · 4 places", amount: "£300" },
      ],
    },
  },
  faq: {
    eyebrow: "Questions businesses ask",
    title: "Questions businesses ask.",
    text: "The things most teams want to know about places, learners, certificates and credit before they create an account.",
    items: [
      { q: "Can we buy training before we know which employee will attend?", a: "Yes. A Business account can hold purchased course places as unassigned licences. Assign a place when you're ready rather than naming the learner at the point of purchase." },
      { q: "What can we see after assigning training?", a: "Your Business account brings learners and purchased courses together. For courses with trackable learning activity, you can review each learner's progress from the Business area." },
      { q: "Can we access learner certificates and expiry dates?", a: "Where certificate data is available for the course, the Business area shows certificates with their issue and expiry dates, so you can see which training is approaching renewal." },
      { q: "Can more than one colleague manage the Business account?", a: "Yes. Business accounts support team members with roles, so administration can be shared with the right colleagues." },
      { q: "How do Business credit accounts work?", a: "Credit facilities are available to eligible regular Business customers. The amount is agreed individually and can depend on the length and value of the relationship. Eligible customers purchase within the facility and settle invoices under their account terms." },
      { q: "Can we manage training bought elsewhere?", a: "The Business area is designed around training purchased through ReadTraining. It keeps those places, learners, progress, certificates and purchases connected in one workflow." },
    ],
  },
  cta: {
    title: "Ready to train your whole team?",
    text: "Create a Business account in minutes and keep places, learners, certificates and purchases connected from day one.",
    primary: signup,
    secondary: demo,
  },
};
