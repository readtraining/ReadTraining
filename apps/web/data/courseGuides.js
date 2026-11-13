import { TOPICS } from "@/data/courseTopics";

// Extra sections for a course page, beyond the fields a course has in the editor (summary, description, outcomes, units, exams,
// entry requirements, audience, FAQs): a comparison, the course week, what's included, packages, business training, getting the
// licence, costs and careers. A guide belongs to a catalogue topic (data/courseTopics.js), so the shared page and every provider
// course on that topic show it (components/courseDetail/CourseGuide.jsx), in the course page's own parts. The packages (the
// client's, from docs/door-supervisor-course (1).html) show on the page (PackagePicker) and are chosen when a date is booked
// ("Choose your package", lib/catalogueData.js guidePackages): a package is the date's price plus `add` (pounds, per delegate).
// With the lowest date at £249.99 the bundles start at the client's published prices (£319.99 and £479.99). `firstAid`: the
// package includes first aid, so the basket doesn't ask about it again.
export const courseGuides = [
  {
    pick: TOPICS.doorSupervisor,
    compare: {
      title: "Door supervisor or security guard licence?",
      intro: "A door supervisor licence is effectively 2-in-1, which is why most employers prefer it.",
      columns: ["You can work in", "Door supervisor", "Security guard"],
      rows: [
        ["Bars, pubs and nightclubs", true, false],
        ["Licensed events and festivals", true, false],
        ["Retail and shopping centres", true, true],
        ["Offices and corporate sites", true, true],
        ["Warehouses and construction", true, true],
        ["Course length", "6 days", "4 days"],
      ],
    },
    unitsIntro: "The course is split into four units set by the SIA. Every learner covers the same core syllabus, whichever provider you choose.",
    week: {
      title: "A typical course week",
      items: [
        { day: "Days 1 and 2", text: "Working in the security industry and the door supervisor role" },
        { day: "Day 3", text: "Conflict management theory and role-play" },
        { day: "Days 4 and 5", text: "Physical intervention skills, with practical training" },
        { day: "Day 6", text: "Revision, practical assessments and exams" },
      ],
      note: "Exact times vary by provider and are shown on each date.",
    },
    included: {
      title: "What's included",
      items: ["All 6 days of expert-led classroom training", "Course workbook and learning materials", "All exam and registration fees", "Nationally recognised certificate", "Free online mock exams and revision guide", "Licence application guidance"],
    },
    exams: {
      columns: ["Unit", "Questions", "Time", "Pass mark"],
      // by the exam unit's name, as the provider names it (case and punctuation aside); a course with an exam row not listed
      // here shows its table without this column
      questions: {
        "Principles of working in the private security industry": "72",
        "Principles of working as a door supervisor": "50",
        "Application of conflict management": "20",
        "Application of physical intervention skills": "30",
        "Practical assessments: searching, conflict management and physical intervention": "—",
      },
      intro: ["You sit four multiple-choice exams on the final day, plus practical assessments in searching and physical intervention observed by your trainer. Many centres give results the same day."],
    },
    packages: {
      title: "Packages",
      intro: "Bundle what you need and save. Prices are starting prices and vary by location and date.",
      items: [
        { key: "course", name: "Course only", text: "You already hold a valid EFAW certificate.", points: ["6-day SIA Door Supervisor course", "Exams, registration and certificate", "Free mock exams and study guide"], add: 0 },
        { key: "first-aid", name: "Course + first aid", badge: "Most popular", text: "Everything a new starter needs, in one booking.", points: ["Everything in Course only", "1-day Emergency First Aid at Work (EFAW)", "Priority licence application support"], add: 70, firstAid: true },
        { key: "career", name: "Career bundle", text: "Stand out to employers from day one.", points: ["Door Supervisor + EFAW", "SIA CCTV Operator course", "CV review and access to our security job board"], add: 230, firstAid: true },
      ],
      note: "All prices include VAT. The SIA licence fee is paid separately, directly to the SIA.",
    },
    business: {
      title: "Door Supervisor training for your team",
      intro: "Whether you're a security contractor, venue operator or retailer, we'll get your staff qualified quickly and cost-effectively. From one new starter to a full event workforce, we source the right SIA-approved provider, handle the admin and keep your compliance on track.",
      benefits: [
        { icon: "icon-save-money", title: "Volume discounts", text: "Lower per-learner prices the more you book." },
        { icon: "icon-location", title: "On-site delivery", text: "Private courses at your premises for 6+ learners, on dates that suit your rota." },
        { icon: "icon-badge", title: "One dashboard", text: "Book, track attendance, results and certificates in one place." },
        { icon: "icon-calendar", title: "Refresher reminders", text: "Never miss a renewal: we flag expiring licences early." },
        { icon: "icon-person-3", title: "Dedicated manager", text: "A single point of contact for every booking, with progress reporting." },
        { icon: "icon-friend", title: "Recruit licensed staff", text: "Find new licensed staff from our learner network." },
      ],
      tiers: [
        { learners: "3 to 5 learners", saving: "save 5%" },
        { learners: "6 to 10 learners", saving: "save 10%" },
        { learners: "11+ learners", saving: "get bespoke pricing" },
      ],
      account: "Approved business accounts pay by invoice on 30-day terms.",
      signIn: "Already have a business account?",
      quote: { title: "Training a team?", text: "We reply the same working day.", cta: "Get a team quote" },
    },
    licence: {
      title: "From booking to badge in 5 steps",
      steps: [
        { title: "Book and prepare", text: "Choose your date, get your first aid sorted and use your free mock exams." },
        { title: "Pass the course", text: "Complete 6 days of training and pass your exams and practical assessments." },
        { title: "Apply to the SIA", text: "Create an account and apply online on GOV.UK once your results are uploaded." },
        { title: "ID and checks", text: "Pay the licence fee and confirm your identity. The SIA checks your criminal record and right to work." },
        { title: "Start working", text: "Your licence typically arrives by post within around 25 working days. It's valid for 3 years." },
      ],
    },
    costs: {
      title: "What does it cost to get licensed?",
      intro: "A typical new starter budget. Booking a bundle can reduce your total.",
      firstAid: { label: "Emergency First Aid at Work (if needed)", from: 70 },
      licenceFee: { label: "SIA licence fee (paid to the SIA)", amount: 204 },
      note: "Licence fee correct as of April 2026. Always check the current fee on GOV.UK.",
    },
    careers: {
      title: "Career and earning potential",
      text: "Typical hourly rates for licensed door supervisors range from around £13 to £18+, depending on location, venue and shift pattern. Event, night and specialist work often pays more.",
      areas: [
        "Hospitality and nightlife: clubs, bars, pubs, hotels and restaurants",
        "Events and festivals: concerts, stadiums, exhibitions and sport",
        "Retail: stores, supermarkets and shopping centres",
        "Corporate: offices, reception and access control",
        "Healthcare: hospitals and care settings",
        "Transport hubs: airports, rail and bus stations",
        "Leisure: casinos, cinemas, theatres and venues",
        "Industrial and sites: warehouses, logistics and construction",
      ],
      roles: "Typical roles include door supervisor, event security, retail security, loss prevention and corporate security officer, with security supervisor as the next step.",
      cta: "Browse security jobs",
      href: "/security-jobs",
    },
  },
];
