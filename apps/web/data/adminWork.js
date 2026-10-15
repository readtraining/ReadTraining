// Admin Phase 2 (the admin plan's modules 9 to 11): Requests and fulfilment, Security Jobs and Business accounts. Copy and the
// demo records; lib/adminWork.js turns them into the pages' data with the team's saved changes. Workflows are the plan's:
// - "Apply for me": request > documents checked > secure payment link > paid > submitted to CSCS or the council > done.
// - Security Jobs: application > checked > call > a role is offered and the candidate says yes for THAT role > only then shared
//   with the employer > interview > start. Nothing is shared without a recorded yes per role.
// - Business accounts: credit facility (default £5,000 on 30 days, as the business account page), invoices, aged debt. As on Hurak,
//   businesses never apply for credit: our team offers it to eligible regular customers (the `eligibility` rule below).
// Prices to confirm with the client (CSCS £60, Personal Licence £140, HS&E test £41.99), as the site.

export const adminWork = {
  requests: {
    title: "Requests and fulfilment",
    lead: "Everything visitors ask us for: \"apply for me\", training and group quotes, test bookings and contact messages.",
    search: "Search by reference, name or email",
    tabs: { open: "Open", mine: "Assigned to me", done: "Done", all: "All" },
    kinds: { licence: "Apply for me", training: "Training request", quote: "Group quote", inhouse: "In-house quote", test: "HS&E test booking", contact: "Contact message" },
    // the steps of each kind of request, in order; "cancelled" can end any of them
    steps: {
      licence: ["new", "documents", "payment", "paid", "submitted", "done"],
      training: ["new", "quoted", "accepted", "done"],
      quote: ["new", "quoted", "accepted", "done"],
      inhouse: ["new", "quoted", "accepted", "done"],
      test: ["new", "payment", "booked", "done"],
      contact: ["new", "replied", "done"],
    },
    statuses: { new: "New", documents: "Checking documents", payment: "Payment link sent", paid: "Paid", submitted: "Submitted", quoted: "Quote sent", accepted: "Accepted", booked: "Test booked", replied: "Replied", done: "Done", cancelled: "Cancelled" },
    // the button that moves a request on, by its current step
    next: { new: { licence: "Start the document check", test: "Send the payment link", contact: "Mark as replied", default: "Send a quote" }, documents: "Documents OK: send the payment link", payment: "Mark as paid", paid: "Mark as submitted", submitted: "Mark as done", quoted: "Mark the quote accepted", accepted: "Mark as done", booked: "Mark the test as taken", replied: "Close the message" },
    columns: { ref: "Reference", who: "From", kind: "Request", status: "Status", due: "Reply by" },
    unassigned: "Unassigned",
    detail: {
      back: "All requests",
      details: "What they asked for",
      contact: "Contact details",
      docs: "Documents",
      docsNote: "Tick each document once it is checked. The payment link can only be sent when all are checked.",
      steps: "Progress",
      assign: "Assigned to",
      assignSave: "Assign",
      cancel: "Cancel the request",
      cancelReason: "Reason for cancelling",
      cancelRule: "Paid \"apply for me\" requests can be cancelled for a full refund until they are submitted (the 14-day cancellation right). After submission the official fee is not refundable.",
      quoteAmount: "Quote total (£)",
      notes: "Team notes",
    },
    sla: 1, // working days to first reply
  },
  jobs: {
    title: "Security Jobs",
    lead: "Candidates from the Security Jobs page, the employers we work with and their open roles.",
    tabs: { candidates: "Candidates", roles: "Open roles", employers: "Employers" },
    search: "Search by reference, name or postcode",
    statuses: { new: "New", screening: "Call booked", shortlisted: "Shortlisted", introduced: "Introduced", interview: "Interview", started: "Started", unsuitable: "Not suitable", withdrawn: "Withdrawn" },
    introStatuses: { asked: "Consent asked", consent: "Candidate said yes", introduced: "Introduced", interview: "Interview", offer: "Offer made", started: "Started", declined: "Declined" },
    columns: { ref: "Reference", candidate: "Candidate", licence: "SIA licence", area: "Area", status: "Status", applied: "Applied" },
    roleColumns: { title: "Role", employer: "Employer", area: "Area", shifts: "Shifts", pay: "Pay", openings: "Openings" },
    employerColumns: { name: "Employer", sector: "Sector", area: "Area", roles: "Open roles", placed: "Placed" },
    consentRule: "We never share a candidate's details without their yes for that role. Record the yes before introducing.",
    detail: {
      back: "All candidates",
      licence: "SIA licence",
      eligibility: "Eligibility",
      availability: "Availability",
      intros: "Roles and introductions",
      offer: "Offer a role",
      offerPick: "Role",
      offerSave: "Ask for consent",
      consentHow: "How they said yes",
      consentWays: ["In writing (email)", "In writing (text)", "On a recorded call"],
      consentSave: "Record their yes",
      introduce: "Introduce to employer",
      introBlocked: "Introduction locked until they say yes",
      notes: "Team notes",
    },
  },
  businesses: {
    title: "Business accounts",
    lead: "Companies that book training for their teams: places, credit, invoices and money owed.",
    search: "Search by company or contact",
    tabs: { all: "All", credit: "Eligible for credit", overdue: "Overdue", suspended: "Credit on hold" },
    credit: { none: "No credit", approved: "Credit active", suspended: "Credit on hold" },
    invoiceStatuses: { paid: "Paid", due: "Due", overdue: "Overdue" },
    columns: { name: "Company", places: "Places used", credit: "Credit", owed: "Owed", overdue: "Overdue" },
    aged: { current: "Not due yet", d30: "1 to 30 days late", d60: "31 to 60 days late", d61: "Over 60 days late" },
    detail: {
      back: "All business accounts",
      account: "Account",
      places: "Places",
      placesNote: "Places bought for the team and how many are assigned to a learner.",
      credit: "Credit facility",
      limit: "Credit limit (£)",
      terms: "Payment terms",
      approve: "Offer credit",
      eligibility: "Eligible for credit?",
      eligibleYes: "Meets every check. Offer credit with a limit; the company sees it on its Billing page.",
      eligibleNo: "Not eligible yet. Credit is offered once a company meets every check.",
      offerNote: "We offer credit; companies don't apply. They can ask through Contact us, and their history decides.",
      change: "Change the limit",
      suspend: "Put credit on hold",
      resume: "Lift the hold",
      invoices: "Invoices",
      remind: "Send a reminder",
      markPaid: "Mark as paid",
      aged: "Money owed by age",
      notes: "Team notes",
    },
    defaultLimit: 5000,
    termsDays: 30,
    // DEMO rule, for the client to confirm: who our team may offer credit to (a regular customer, as on Hurak)
    eligibility: { months: 6, courses: 3, spend: 1000 },
  },
};

// ---- demo records (times are relative to now so the queues always look current) --------------------------------------------
export const requestSeeds = [
  { ref: "LA-482113", kind: "licence", title: "CSCS card application (Green Labourer)", name: "Tomasz Nowak", email: "tomasz.nowak@example.co.uk", phone: "07700 900311", hoursAgo: 3, status: "new", price: 60, details: [["Card", "Labourer card (green)"], ["Application", "New card"], ["Notes", "Passed the HS&E test last week"]], docs: ["HS&E test pass (last 2 years)", "Level 1 Award certificate", "Photo ID"] },
  { ref: "LA-477290", kind: "licence", title: "Personal Licence application", name: "Grace Owusu", email: "grace.owusu@example.co.uk", phone: "07700 900445", hoursAgo: 30, status: "documents", assignee: "Sara Ahmed", price: 140, details: [["Licence", "Personal Licence"], ["Council", "Leeds City Council"], ["Application", "New licence"]], docs: ["APLH certificate", "Basic DBS check (last month)", "Right to work proof", "Two passport photos"], checked: [0, 2] },
  { ref: "LA-469854", kind: "licence", title: "CSCS card application (Blue Skilled)", name: "Kofi Mensah", email: "kofi.mensah@example.co.uk", phone: "07700 900982", hoursAgo: 75, status: "paid", assignee: "Daniel Okafor", price: 60, details: [["Card", "Skilled Worker card (blue)"], ["Application", "Renewal"]], docs: ["HS&E test pass (last 2 years)", "NVQ Level 2 certificate", "Photo ID"], checked: [0, 1, 2] },
  { ref: "TR-551203", kind: "training", title: "Forklift training (counterbalance)", name: "Paul Hendry", email: "paul@hendrylogistics.example", phone: "0113 496 0123", company: "Hendry Logistics", hoursAgo: 20, status: "new", details: [["Truck", "Counterbalance"], ["Experience", "Novice"], ["People", "4"], ["Postcode", "LS10 1AB"]] },
  { ref: "QT-310877", kind: "quote", title: "Group quote: Emergency First Aid at Work", name: "Helen Price", email: "helen.price@brightcare.example", phone: "0161 496 0456", company: "BrightCare Homes", hoursAgo: 50, status: "quoted", assignee: "Sara Ahmed", amount: 1080, details: [["Course", "Emergency First Aid at Work"], ["People", "12"], ["Where", "Our site in Salford"]] },
  { ref: "QT-309142", kind: "inhouse", title: "In-house quote: SIA Door Supervisor", name: "Marcus Bell", email: "marcus@nightsafe.example", phone: "020 7946 0789", company: "NightSafe Venues", hoursAgo: 6, status: "new", details: [["Course", "SIA Door Supervisor Training"], ["People", "8"], ["Dates", "Any week in November"]] },
  { ref: "HS-604551", kind: "test", title: "CITB HS&E test booking (Operatives)", name: "Ryan Clarke", email: "ryan.clarke@example.co.uk", phone: "07700 900127", hoursAgo: 12, status: "new", price: 41.99, details: [["Test", "Operatives"], ["Centre", "Leeds Test Centre"], ["When", "In the next 2 weeks"]] },
  { ref: "HS-598730", kind: "test", title: "CITB HS&E test booking (Managers and Professionals)", name: "Aisha Rahman", email: "aisha.rahman@example.co.uk", phone: "07700 900664", hoursAgo: 52, status: "payment", assignee: "Daniel Okafor", price: 41.99, details: [["Test", "Managers and Professionals"], ["Centre", "Manchester Test Centre"], ["When", "As soon as possible"]] },
  { ref: "RT-771204", kind: "contact", title: "Contact: change of course date", name: "Leah Morgan", email: "leah.morgan@example.co.uk", phone: "", hoursAgo: 28, status: "new", details: [["Topic", "Change a booking"], ["Booking", "RT-118402"], ["Message", "Can I move my first aid course to next month? Something came up at work."]] },
  { ref: "RT-768911", kind: "contact", title: "Contact: invoice copy", name: "Dev Patel", email: "dev@patelbuild.example", phone: "", company: "Patel Build", hoursAgo: 96, status: "done", assignee: "Sara Ahmed", details: [["Topic", "Invoices and payments"], ["Message", "Please send a copy of last month's invoice."]] },
];

export const employers = [
  { id: "em-1", name: "Sentinel Venue Security", sector: "Bars and events", city: "London", contact: "Ola Adeyemi" },
  { id: "em-2", name: "Northgate Retail Guarding", sector: "Retail", city: "Manchester", contact: "Ian Firth" },
  { id: "em-3", name: "Citywatch Control Rooms", sector: "CCTV monitoring", city: "Birmingham", contact: "Priya Nair" },
  { id: "em-4", name: "Harbour Site Services", sector: "Construction sites", city: "Leeds", contact: "Mark Doherty" },
];

export const roles = [
  { id: "ro-1", employer: "em-1", title: "Door Supervisor (weekend nights)", city: "London", shifts: "Fri and Sat nights", pay: "£15.50 an hour", openings: 4, licence: "Door Supervisor" },
  { id: "ro-2", employer: "em-2", title: "Retail Security Officer", city: "Manchester", shifts: "Days, 5 out of 7", pay: "£13.20 an hour", openings: 6, licence: "Security Guard" },
  { id: "ro-3", employer: "em-3", title: "CCTV Operator (nights)", city: "Birmingham", shifts: "4 on, 4 off nights", pay: "£14.10 an hour", openings: 2, licence: "CCTV" },
  { id: "ro-4", employer: "em-4", title: "Site Security Officer", city: "Leeds", shifts: "Nights and weekends", pay: "£13.80 an hour", openings: 3, licence: "Security Guard" },
  { id: "ro-5", employer: "em-1", title: "Event Steward Supervisor", city: "London", shifts: "Events, flexible", pay: "£16.00 an hour", openings: 2, licence: "Door Supervisor" },
];

export const candidateSeeds = [
  { ref: "SJ-730415", name: "Jamal Hussain", email: "jamal.h@example.co.uk", phone: "07700 900215", postcode: "E14 2BB", city: "London", licence: { type: "Door Supervisor", last4: "4821", expiry: "2028-03" }, shifts: ["Nights", "Weekends"], travel: "Up to 10 miles", start: "Straight away", eligibility: { licence: "yes", work: "yes", history: "yes" }, daysAgo: 1, status: "new" },
  { ref: "SJ-728806", name: "Emma Walsh", email: "emma.walsh@example.co.uk", phone: "07700 900338", postcode: "M14 5RT", city: "Manchester", licence: { type: "Security Guard", last4: "1179", expiry: "2027-11" }, shifts: ["Days", "Weekends"], travel: "Up to 20 miles", start: "In 2 weeks", eligibility: { licence: "yes", work: "yes", history: "yes" }, daysAgo: 4, status: "shortlisted", intros: [{ role: "ro-2", status: "asked", daysAgo: 1 }] },
  { ref: "SJ-726120", name: "Abdi Warsame", email: "abdi.w@example.co.uk", phone: "07700 900457", postcode: "B12 9QL", city: "Birmingham", licence: { type: "CCTV", last4: "6630", expiry: "2027-06" }, shifts: ["Nights"], travel: "Up to 10 miles", start: "Straight away", eligibility: { licence: "yes", work: "yes", history: "partly" }, daysAgo: 7, status: "introduced", intros: [{ role: "ro-3", status: "introduced", daysAgo: 3, consent: { daysAgo: 4, how: "In writing (email)" } }] },
  { ref: "SJ-721344", name: "Chloe Bennett", email: "chloe.b@example.co.uk", phone: "07700 900583", postcode: "LS11 6XD", city: "Leeds", licence: { type: "Security Guard", last4: "3092", expiry: "2026-12" }, shifts: ["Nights", "Weekends"], travel: "Up to 30 miles", start: "Straight away", eligibility: { licence: "yes", work: "yes", history: "yes" }, daysAgo: 12, status: "started", intros: [{ role: "ro-4", status: "started", daysAgo: 9, consent: { daysAgo: 11, how: "On a recorded call" } }] },
  { ref: "SJ-719807", name: "Viktor Petrov", email: "viktor.p@example.co.uk", phone: "07700 900612", postcode: "SE1 7PB", city: "London", licence: { type: "Door Supervisor", last4: "5507", expiry: "2027-02" }, shifts: ["Evenings"], travel: "Up to 5 miles", start: "In a month", eligibility: { licence: "yes", work: "yes", history: "yes" }, daysAgo: 15, status: "screening" },
];

export const businessSeeds = [
  { slug: "northline-facilities", name: "Northline Facilities Ltd", contact: "Rachel Green", email: "rachel.green@northline.example", city: "Manchester", sector: "Facilities management", sinceDays: 410, courses12: 14, spend12: 6820, credit: "approved", limit: 5000, places: { bought: 46, assigned: 39 }, invoices: [["INV-20431", 75, 1840, "paid", "PO-7781"], ["INV-20512", 34, 2210, "overdue", "PO-7802"], ["INV-20577", 12, 960, "due", "PO-7815"]] },
  { slug: "brightcare-homes", name: "BrightCare Homes", contact: "Helen Price", email: "helen.price@brightcare.example", city: "Salford", sector: "Care", sinceDays: 220, courses12: 6, spend12: 2950, credit: "none", limit: 0, places: { bought: 18, assigned: 18 }, invoices: [] },
  { slug: "nightsafe-venues", name: "NightSafe Venues", contact: "Marcus Bell", email: "marcus@nightsafe.example", city: "London", sector: "Bars and events", sinceDays: 150, courses12: 9, spend12: 5340, credit: "approved", limit: 8000, places: { bought: 32, assigned: 30 }, invoices: [["INV-20388", 98, 3120, "overdue", "PO-1192"], ["INV-20466", 66, 2480, "overdue", "PO-1204"], ["INV-20560", 18, 1490, "due", "PO-1219"]] },
  { slug: "patel-build", name: "Patel Build Ltd", contact: "Dev Patel", email: "dev@patelbuild.example", city: "Leicester", sector: "Construction", sinceDays: 95, courses12: 5, spend12: 2310, credit: "suspended", limit: 3000, places: { bought: 22, assigned: 17 }, invoices: [["INV-20301", 128, 2640, "overdue", "PO-330"], ["INV-20450", 70, 880, "paid", "PO-341"]] },
  { slug: "kingsway-dental", name: "Kingsway Dental Group", contact: "Amira Shah", email: "amira.shah@kingswaydental.example", city: "Birmingham", sector: "Healthcare", sinceDays: 520, courses12: 4, spend12: 1620, credit: "none", limit: 0, places: { bought: 15, assigned: 15 }, invoices: [] },
  { slug: "hendry-logistics", name: "Hendry Logistics", contact: "Paul Hendry", email: "paul@hendrylogistics.example", city: "Leeds", sector: "Warehousing", sinceDays: 30, courses12: 1, spend12: 380, credit: "none", limit: 0, places: { bought: 4, assigned: 2 }, invoices: [] },
];
