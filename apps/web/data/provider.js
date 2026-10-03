// "For training providers" page content. Same functionality as the client's current site, our own copy and UI.
export const provider = {
  hero: {
    eyebrow: "For training providers",
    trust: "105+ approved providers already listed",
    title: "Run your training business. Grow with ReadTraining.",
    text: "Manage courses, cohorts, learners and digital learning in one provider workspace, then list eligible dates on the marketplace when you want more learner demand.",
    primary: { label: "Become a provider", href: "/template/signup" },
    secondary: { label: "Book a call", href: "/template/contact-1" },
    points: ["No monthly subscription", "Commission on marketplace sales only", "Approval in days", "SCORM-ready LMS"],
    workspace: {
      company: "Northstar Training",
      stats: [
        { label: "Courses", value: "12", note: "9 active" },
        { label: "Upcoming cohorts", value: "8", note: "Next 30 days" },
        { label: "Learners", value: "146", note: "Across active training" },
        { label: "Marketplace dates", value: "24", note: "Published" },
      ],
      activity: [
        { course: "Emergency First Aid at Work", meta: "Manchester · 24 Sep", status: "14 / 16 learners" },
        { course: "Door Supervisor Refresher", meta: "Live online · 27 Sep", status: "9 / 12 learners" },
        { course: "Health & Safety Awareness", meta: "Self-paced online", status: "38 active learners" },
      ],
    },
  },
  workflow: {
    eyebrow: "One connected provider workflow",
    title: "From course setup to delivery and marketplace.",
    text: "Set up the training you deliver, organise dates and learners, build the learning experience, and add marketplace distribution where it makes sense for your business.",
    steps: [
      { title: "Create your courses", text: "Keep course information, delivery options and provider settings together in one workspace." },
      { title: "Plan cohorts and dates", text: "Schedule classroom, virtual or online delivery with learner capacity tied to each cohort." },
      { title: "Manage learners and learning", text: "Keep learner activity together and deliver digital curriculum including SCORM content." },
      { title: "List on the marketplace", text: "Publish eligible training when you want an extra learner-acquisition channel." },
    ],
  },
  cohorts: {
    eyebrow: "Cohorts and scheduling",
    title: "Plan dates without losing sight of capacity.",
    text: "Create scheduled delivery for your courses, keep dates and learning modes together, and see the learner capacity attached to each cohort.",
    options: [
      { title: "Multiple delivery modes", text: "Organise classroom, virtual and online delivery around the course and cohort." },
      { title: "Capacity stays visible", text: "Learner numbers sit on the delivery date instead of being tracked separately." },
    ],
    card: {
      month: "This month", stats: [{ label: "Cohorts", value: 8 }, { label: "Seats booked", value: 36 }, { label: "Spaces left", value: 8 }],
      rows: [
        { course: "Door Supervisor Refresher", meta: "London · 25 to 26 Sep · Classroom", seats: "11 / 12", status: "Published" },
        { course: "Emergency First Aid at Work", meta: "Birmingham · 28 Sep · Classroom", seats: "0 / 12", status: "Draft" },
        { course: "Manual Handling", meta: "01 Oct · Live online", seats: "17 / 20", status: "Published" },
      ],
    },
  },
  learners: {
    eyebrow: "Learners and follow-up",
    title: "Records, activity and follow-up in one workflow.",
    text: "Manage learners you bring yourself, review their training context and use follow-up actions without jumping between disconnected records.",
    points: ["Learner identity and training activity together", "Email follow-up actions from the learner record"],
    card: {
      total: "146 learners",
      rows: [
        { name: "Sophie Williams", course: "Door Supervisor Refresher", status: "In progress", pct: 74 },
        { name: "Daniel Khan", course: "Emergency First Aid at Work", status: "Booked", note: "25 Sep" },
        { name: "Fatima Patel", course: "Health & Safety Awareness", status: "Complete", pct: 100 },
      ],
      followUp: { title: "Learner follow-up", text: "Request missing learner information without leaving the record.", action: "Send request" },
    },
  },
  campaigns: {
    eyebrow: "Marketing campaigns",
    title: "Reach the right learners again.",
    text: "Build targeted email campaigns around learner history instead of treating every learner as the same audience.",
    points: ["Contact learners whose training is approaching expiry", "Create plan-upgrade and related-training campaigns"],
    card: {
      rows: [
        { name: "Training renewal", meta: "42 learners · qualifications expiring soon", status: "Ready" },
        { name: "Plan upgrade", meta: "18 learners · eligible upgrade audience", status: "Draft" },
        { name: "Related training", meta: "31 learners · completed First Aid training", status: "Scheduled" },
      ],
      preview: { label: "Renewal email", subject: "Your training is due to expire soon", text: "Send the right course back to learners who are approaching renewal.", audience: "42 learners", action: "Send campaign" },
    },
  },
  lms: {
    eyebrow: "Learning management",
    title: "Build the learning behind each course.",
    text: "Structure the curriculum and combine activity types for digital learning, including SCORM-compatible content.",
    points: ["Text, video, quizzes, assignments, downloads and SCORM", "Learning content tied to the course and learner journey"],
    card: {
      title: "Course curriculum", count: "4 activities",
      module: "Module 1 · Core learning",
      activities: [
        { title: "Welcome and course guide", type: "Text" },
        { title: "Workplace safety", type: "Video" },
        { title: "Knowledge check", type: "Quiz" },
        { title: "Compliance module", type: "SCORM" },
      ],
      progress: { label: "Learner progress", learners: "38 active learners", avg: 67 },
    },
  },
  marketplace: {
    eyebrow: "ReadTraining marketplace",
    title: "Add eligible dates when you want extra reach.",
    text: "Keep running your training in your workspace, then use the marketplace channel for eligible courses and dates where additional learner demand is useful.",
    points: ["Prepare availability for the marketplace from the provider workflow", "Publication is approval-gated for eligible training"],
    card: {
      course: "Door Supervisor Refresher",
      text: "Add eligible dates to your marketplace listing while keeping delivery in the provider workspace.",
      dates: [
        { date: "25 Sep · London", meta: "Classroom · £189", status: "Published" },
        { date: "01 Oct · Birmingham", meta: "Classroom · £179", status: "Published" },
        { date: "05 Oct · Live online", meta: "Virtual · £149", status: "Draft" },
      ],
      note: "Marketplace publication is subject to approval and eligibility.",
    },
  },
  pricing: {
    eyebrow: "Commercial clarity",
    title: "No monthly subscription. Fees only on marketplace sales.",
    text: "The operating tools and the marketplace have different commercial models, so the economics are explicit before you join.",
    tiers: [
      { label: "Provider tools", value: "£0", sub: "No monthly subscription", text: "Use the provider capabilities available today without a paid monthly plan." },
      { label: "Marketplace", value: "30%", sub: "Standard marketplace fee", text: "Rates may vary by course, category and agreed terms. Transaction charges also apply." },
    ],
    calc: { title: "Estimate your payout", note: "Illustrative. 30% marketplace fee plus 3% card transaction charge." },
  },
  faq: {
    eyebrow: "Questions providers ask",
    title: "Questions providers ask.",
    text: "How the provider workspace, learning tools and marketplace fit together before you get started.",
    items: [
      { q: "Who can become a provider?", a: "ReadTraining is built for professional training providers and training businesses. Sole traders operating a training business can also create a provider account." },
      { q: "What can I manage in the provider workspace?", a: "Courses, classes and cohorts, your own learners, learning content and marketplace listings. Some deeper modules can vary by workflow or account." },
      { q: "Can I manage and follow up with learners I bring myself?", a: "Yes. Provider tools include learner records and follow-up actions, including learner-information request emails, alongside training and learning activity." },
      { q: "Can I deliver online learning?", a: "The provider LMS supports text, video, quizzes, assignments, downloads, certificates and SCORM-compatible content." },
      { q: "How does marketplace publication work?", a: "You prepare eligible training and dates for the marketplace from your workspace. Publication is subject to approval and the rules that apply to the course or category." },
      { q: "Is there a monthly provider subscription?", a: "No. The provider tools available today need no paid monthly plan. Marketplace sales use separate marketplace fees." },
      { q: "What is the standard marketplace fee?", a: "The standard marketplace fee is 30%. Rates may vary by course, category and agreed commercial terms. Transaction charges also apply." },
      { q: "How are transaction fees and commission calculated?", a: "Card payments carry a 3% transaction fee and buy-now-pay-later payments 6%. The transaction fee comes off the gross order first, then commission is calculated on the remaining amount." },
      { q: "When are provider payouts made?", a: "Payouts are made on the 28th of each month for bookings completed in the previous month. Bookings completed in February are paid on 28 March." },
      { q: "Are you a broker, reseller or agent?", a: "No. ReadTraining operates as a marketplace. You list the same courses, prices and offers as on your own website, and anyone who books through us remains your customer under your refund and rescheduling policies." },
      { q: "Who issues invoices for marketplace bookings?", a: "For each booking we invoice you for our commission. You are responsible for invoicing the customer for the full course amount." },
      { q: "What happens if I approve a full refund?", a: "We process the approved refund to the customer in full. Payment transaction fees are non-refundable, so those fees are deducted from the provider." },
      { q: "What do providers need to manage after onboarding?", a: "Review bookings when order notifications arrive, disable fully booked or cancelled dates, and keep upcoming course dates up to date." },
    ],
  },
  cta: {
    title: "Put your training operation and marketplace reach in one place.",
    text: "Create your provider account to start setting up the courses, cohorts and learners you manage.",
    primary: { label: "Become a provider", href: "/template/signup" },
    secondary: { label: "Book a call", href: "/template/contact-1" },
  },
};
