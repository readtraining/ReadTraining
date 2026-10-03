// "For business" page content. Same functionality as the client's current site, our own copy and UI.
export const business = {
  hero: {
    eyebrow: "For teams and business buyers",
    trust: "Rated 4.9 by 12,450+ learners and teams",
    title: "Train your whole team. Track every certificate.",
    text: "Open a Business account, buy course places for your team, hand them out now or hold them for later, and keep learners, progress, certificates and renewals together in one place.",
    primary: { label: "Create a Business account", href: "/template/signup" },
    secondary: { label: "Book a demo", href: "/template/contact-1" },
    points: ["No contract", "Invoice billing", "Group pricing", "Assign places later"],
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
      { title: "Buy places", text: "Purchase course places for your team and keep every booking in one account." },
      { title: "Assign or hold", text: "Name the learner straight away, or hold the place until you know who needs it." },
      { title: "Manage learners", text: "Progress, details and admin for every learner sit together in one view." },
      { title: "Renew on time", text: "Certificate expiry dates are flagged early so nothing lapses unnoticed." },
    ],
  },
  licences: {
    eyebrow: "Licence flexibility",
    title: "Buy now. Assign when ready.",
    text: "Purchase training while the dates and price are right, then allocate each place immediately or hold it in your account until you know who needs it.",
    options: [
      { title: "Assign immediately", text: "When you already know the learner, allocate the purchased place to them straight away." },
      { title: "Keep it unassigned", text: "Not decided yet? Hold the place in your Business account and assign it whenever you are ready." },
    ],
    example: {
      course: "Emergency First Aid at Work",
      available: "5 available",
      counts: [{ label: "Purchased", value: 12 }, { label: "Assigned", value: 7 }, { label: "Unassigned", value: 5 }],
      learners: [
        { name: "Hannah Cooper", email: "h.cooper@harbourfacilities.co.uk", status: "Assigned" },
        { name: "Daniel Khan", email: "d.khan@harbourfacilities.co.uk", status: "Assigned" },
        { name: "Priya Shah", email: "p.shah@harbourfacilities.co.uk", status: "Assigned" },
      ],
      unassigned: { title: "Unassigned place", text: "Keep it available until you know the learner", action: "Assign learner" },
    },
  },
  progress: {
    eyebrow: "Learner monitoring",
    title: "See every learner at a glance.",
    text: "Learner records and training activity sit together, so you can see who is booked, who is part-way through and who has finished.",
    points: [
      "Live progress per learner",
      "Records tied to each booking",
      "Share admin with colleagues",
    ],
    card: {
      title: "Learner progress",
      sub: "18 learners across active training",
      link: "View all learners",
      learners: [
        { name: "Sophie Williams", course: "Health & Safety Awareness", pct: 100, status: "Completed" },
        { name: "Marcus Reid", course: "Door Supervisor Refresher", pct: 72, status: "In progress" },
        { name: "Aisha Patel", course: "Fire Marshal Training", pct: 35, status: "Learning" },
      ],
    },
  },
  certificates: {
    eyebrow: "Certificates and renewals",
    title: "Certificates and renewals, sorted.",
    text: "Download learner certificates when they are issued, and see issue and expiry dates so renewals never catch you out.",
    points: [
      "One-click certificate downloads",
      "Expiry dates on every record",
    ],
    card: {
      title: "Certificate records for your team",
      due: "2 due soon",
      rows: [
        { name: "Hannah Cooper", course: "Emergency First Aid at Work", expires: "18 Sep 2029", status: "Valid" },
        { name: "Daniel Khan", course: "Door Supervisor Refresher", expires: "03 Oct 2026", status: "Renewal due" },
        { name: "Sophie Williams", course: "Fire Marshal Training", expires: "12 Dec 2027", status: "Valid" },
      ],
    },
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
    card: {
      company: "Harbour Facilities Ltd",
      status: "Active facility",
      limit: 5000, used: 1840, available: 3160,
      due: { amount: "£1,840.00", date: "30 Sep 2026", status: "Awaiting payment" },
      purchases: [
        { label: "Emergency First Aid · 12 places", amount: "£1,120" },
        { label: "Fire Marshal · 6 places", amount: "£420" },
        { label: "H&S Awareness · 4 places", amount: "£300" },
      ],
      note: "3 purchases made on account",
      link: "View invoices",
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
    title: "Ready to train your team?",
    text: "Create a Business account in minutes and keep places, learners, certificates and purchases connected from day one.",
    primary: { label: "Create a Business account", href: "/template/signup" },
    secondary: { label: "Browse training", href: "/template/courses-list-1" },
    note: "Want to look first? Browse courses.",
  },
};
