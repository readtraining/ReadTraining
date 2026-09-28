// All ReadTraining home-page content in one place (structure follows Hurak).

export const topBar = {
  phone: "0333 000 0000",
  email: "hello@readtraining.co.uk",
  audiences: [
    { href: "/", label: "For Individuals" },
    { href: "#employers", label: "For Businesses" },
    { href: "#providers", label: "For Training Providers" },
  ],
};

export const menu = [
  { href: "/template/courses-list-1", label: "Courses" },
  { href: "/template/courses-list-2", label: "Licences & Cards" },
  { href: "/template/courses-list-3", label: "Locations" },
  { href: "/template/blog-list-1", label: "Resources" },
];

export const hero = {
  eyebrow: "Accredited training across the UK",
  title: "Book accredited training.",
  titleLine2: "Get certified",
  titleAccent: "sooner.",
  text: "Compare accredited vocational and compliance courses from trusted UK training providers.",
  text2: "Choose classroom, live online or self-paced study, pick a date near you and book in minutes, with full payment protection.",
  primaryButton: { label: "Find Courses", href: "/template/courses-list-1" },
  secondaryButton: { label: "Book for your team", href: "#employers" },
  socialProof: { rating: "4.9 out of 5", text: "Trusted by 250,000+ learners · 12,450 verified reviews" },
  methods: ["All methods", "Classroom", "Live online", "Online self-paced"],
  coursePlaceholder: "Search for a course",
  locationPlaceholder: "Town or postcode",
  popular: [
    { href: "/template/courses/1", label: "Door Supervisor" },
    { href: "/template/courses-single-2/3", label: "Emergency First Aid" },
    { href: "/template/courses-single-6/3", label: "CSCS Green Card" },
    { href: "/template/courses-single-3/3", label: "SMSTS" },
  ],
  rating: "4.9 out of 5 · Based on 12,450+ verified reviews",
  highlights: [
    "Over 250,000 learners trained",
    "More than 1,000 accredited courses",
    "UK-wide dates and locations",
    "Flexible booking options",
    "End-to-end support",
    "250,000+ customers",
  ],
};

export const counters = [
  { id: 1, number: "1,000+", title: "Accredited courses" },
  { id: 2, number: "250,000+", title: "Learners trained" },
  { id: 3, number: "12,450+", title: "Verified reviews" },
  { id: 4, number: "400+", title: "Training providers" },
];

export const courseCategories = [
  "All courses",
  "Security & SIA",
  "First Aid & Health",
  "Construction & CSCS",
];

const card = (id, cat, title, providers, days, method, price, was, img) => ({
  id,
  category: cat,
  title,
  imageSrc: `/assets/img/coursesCards/${img}.png`,
  rating: 4.9,
  ratingCount: providers * 27,
  providers,
  days,
  method,
  originalPrice: was,
  discountedPrice: price,
  paid: true,
  popular: price < 100,
});

export const courses = [
  card(1, "Security & SIA", "SIA Door Supervisor Course", 45, "6 days", "Classroom", 199, 279, 1),
  card(2, "Security & SIA", "SIA CCTV Operator Training", 25, "3 days", "Classroom", 179, 209, 2),
  card(3, "Security & SIA", "SIA Security Guard Training", 30, "4 days", "Classroom", 149, 189, 3),
  card(4, "Security & SIA", "SIA Door Supervisor Top-Up Refresher", 30, "2 days", "Classroom", 99, 129, 4),
  card(5, "First Aid & Health", "Emergency First Aid at Work", 44, "1 day", "Classroom", 63, 89, 5),
  card(6, "First Aid & Health", "First Aid at Work (3 days)", 21, "3 days", "Classroom", 159, 219, 6),
  card(7, "First Aid & Health", "Paediatric First Aid", 18, "2 days", "Classroom", 119, 149, 7),
  card(8, "First Aid & Health", "Mental Health First Aid", 12, "2 days", "Live online", 189, 229, 8),
  card(9, "Construction & CSCS", "CITB SMSTS Course", 12, "5 days", "Multiple study options", 449, 519, 9),
  card(10, "Construction & CSCS", "CITB SSSTS Course", 14, "2 days", "Multiple study options", 229, 279, 10),
  card(11, "Construction & CSCS", "CSCS Green Card Course", 20, "1 day", "Online self-paced", 129, 159, 11),
  card(12, "Construction & CSCS", "Traffic Marshal Course", 16, "1 day", "Classroom", 89, 109, 12),
];

export const bookingOptions = {
  title: "Booking options built for learners and teams",
  text: "Choose the learning method, location and booking option that suits your schedule. Same course, same certificate.",
  example: "Example: SIA Door Supervisor Course, Manchester, Mon 6 Oct",
  toggleLeft: "Individual",
  toggleRight: "Team of 5+",
  toggleNote: "Save 10%",
  tiers: [
    {
      type: "Basic",
      price: 199,
      period: "per learner, all inclusive",
      text: "Standard booking with payment protection.",
      features: ["Course place confirmed", "Payment held until certificate", "Email support"],
    },
    {
      type: "Plus",
      price: 224,
      period: "per learner, all inclusive",
      text: "Most popular. Flexibility if plans change.",
      features: ["Everything in Basic", "Reschedule once, free", "Priority support", "Exam resit cover"],
    },
    {
      type: "Pro",
      price: 244,
      period: "per learner, all inclusive",
      text: "Total flexibility for busy schedules.",
      features: ["Everything in Plus", "Unlimited reschedules", "Full refund up to 48h before", "Named account manager"],
    },
  ],
};

export const roles = [
  { id: 1, iconSrc: "/assets/img/featureCards/1.svg", title: "Door Supervisor", text: "Pubs, clubs & events", href: "/template/courses/1" },
  { id: 2, iconSrc: "/assets/img/featureCards/2.svg", title: "Security Guard", text: "Sites, retail & offices", href: "/template/courses/1" },
  { id: 3, iconSrc: "/assets/img/featureCards/3.svg", title: "CCTV Operator", text: "Control rooms", href: "/template/courses/1" },
  { id: 4, iconSrc: "/assets/img/featureCards/4.svg", title: "Close Protection", text: "Personal security", href: "/template/courses/1" },
  { id: 5, iconSrc: "/assets/img/featureCards/5.svg", title: "First Aider", text: "Any workplace", href: "/template/courses-single-2/3" },
  { id: 6, iconSrc: "/assets/img/featureCards/6.svg", title: "Site Manager", text: "SMSTS & SSSTS", href: "/template/courses-single-3/3" },
  { id: 7, iconSrc: "/assets/img/featureCards/1.svg", title: "Site Labourer", text: "CSCS Green Card", href: "/template/courses-single-6/3" },
  { id: 8, iconSrc: "/assets/img/featureCards/2.svg", title: "Food Handler", text: "Food Safety Level 2", href: "/template/courses-single-4/3" },
];

export const subjects = [
  { id: 1, title: "Security & SIA", href: "/template/courses-list-1", items: ["Door Supervisor", "Security Guard", "CCTV Operator", "Close Protection", "SIA Top-Up Refresher"] },
  { id: 2, title: "First Aid", href: "/template/courses-list-2", items: ["Emergency First Aid at Work", "First Aid at Work", "Paediatric First Aid", "Mental Health First Aid", "AED & CPR"] },
  { id: 3, title: "Health & Safety", href: "/template/courses-list-3", items: ["IOSH Managing Safely", "NEBOSH General Certificate", "Fire Marshal", "Manual Handling", "Working at Height"] },
  { id: 4, title: "Construction & CSCS", href: "/template/courses-list-4", items: ["CSCS Green Card", "SMSTS", "SSSTS", "Traffic Marshal", "CITB Health & Safety Test"] },
  { id: 5, title: "Food Safety", href: "/template/courses-list-5", items: ["Food Safety Level 2", "Food Safety Level 3", "HACCP", "Allergen Awareness", "Personal Licence"] },
  { id: 6, title: "Teaching & Assessing", href: "/template/courses-list-6", items: ["Level 3 AET", "Level 3 Assessor", "Level 4 IQA", "Train the Trainer", "Safeguarding"] },
];

export const testimonials = [
  { id: 1, author: "Oliver Okonjo", position: "Door Supervisor, Leeds", text: "I've wanted to work in security since my old job at a theme park. The course was informative, practical and really engaging. I especially enjoyed getting what we learned into practice and I'm now ready to go straight into the industry." },
  { id: 2, author: "Priya Shah", position: "Office Manager, Bristol", text: "I booked six of our team on Emergency First Aid in one go. One reschedule, no fuss, and certificates were emailed the same day. Great website to use, with reasonable prices for courses that are helpful in many ways." },
  { id: 3, author: "Tom Reilly", position: "Site Manager, Glasgow", text: "Comparing SMSTS dates from a dozen providers in one place saved me hours. The price-match was real too. Excellent training sessions, well delivered and easy to understand." },
  { id: 4, author: "Emma Walsh", position: "Care Assistant, Cardiff", text: "Successfully got my First Aid at Work certificate with ReadTraining. The modules were clearly explained, the tutor was very helpful and politely answered every question I asked." },
  { id: 5, author: "Marcus Bell", position: "Security Guard, Birmingham", text: "Very quick and easy to book. The instructor was informative and well organised. I would definitely recommend ReadTraining to anyone looking to get their SIA licence." },
];

export const testimonialAvatars = [1, 2, 3, 4, 5].map((n) => `/assets/img/avatars/small/${n}.png`);

export const teamBooking = {
  title: "Book training for your team, without the admin",
  text: "Book training for multiple employees, access group pricing and manage your workforce's certificates from one account.",
  features: [
    { id: 1, title: "Book multiple employees in one go" },
    { id: 2, title: "Business and group pricing" },
    { id: 3, title: "Flexible training locations, on-site or nearby" },
    { id: 4, title: "Track certificates and renewal dates" },
  ],
  button: "Create a business account",
  href: "/template/signup",
};

export const providers = {
  title: "Reach more learners with ReadTraining",
  text: "List your courses, manage bookings and reach learners across the UK. Showcase your courses, receive bookings and grow your learner reach, with payouts once learners are certified.",
  button: "List your courses",
  href: "/template/instructor-become",
};

export const help = {
  title: "Need help choosing the right course?",
  text: "Get help with course requirements, dates, locations, booking options or training for multiple employees. Call 0333 000 0000 or start a live chat.",
  button: "Visit Help Centre",
  href: "/template/help-center",
};

export const footer = {
  about: "Browse and book vocational and compliance training across the UK, with classroom, live online and self-paced options available.",
  phone: "0333 000 0000",
  hours: "Mon–Fri: 9:00am – 5:30pm",
  email: "hello@readtraining.co.uk",
  columns: [
    {
      title: "Find a course",
      links: [
        { href: "/template/courses-list-1", label: "Classroom courses" },
        { href: "/template/courses-list-2", label: "Live online courses" },
        { href: "/template/courses-list-3", label: "Online self-paced courses" },
        { href: "/template/courses-list-4", label: "CITB Site Safety Plus" },
        { href: "/template/courses-list-5", label: "Personal Licence" },
        { href: "/template/courses-list-6", label: "First Aid" },
        { href: "/template/courses-list-7", label: "Health & Safety" },
        { href: "/template/courses-list-8", label: "Security" },
      ],
    },
    {
      title: "Popular courses",
      links: [
        { href: "/template/courses/1", label: "Door Supervisor Course" },
        { href: "/template/courses/1", label: "Door Supervisor Refresher" },
        { href: "/template/courses/1", label: "Security Guard Refresher" },
        { href: "/template/courses-single-2/3", label: "Emergency First Aid" },
        { href: "/template/courses-single-2/3", label: "First Aid at Work" },
        { href: "/template/courses-single-6/3", label: "CSCS Green Card Course" },
        { href: "/template/courses-single-3/3", label: "SMSTS" },
        { href: "/template/courses-single-3/3", label: "SSSTS" },
      ],
    },
    {
      title: "For providers",
      links: [
        { href: "/template/instructor-become", label: "List Your Course" },
        { href: "/template/dashboard", label: "Skill Saver Program" },
        { href: "/template/dashboard", label: "Provider Dashboard" },
        { href: "/template/help-center", label: "Verify Certificate" },
        { href: "/template/instructors-list-1", label: "Listed Training Providers" },
        { href: "/template/blog-list-1", label: "Security Jobs" },
      ],
    },
    {
      title: "Resources & company",
      links: [
        { href: "/template/help-center", label: "Help Centre" },
        { href: "/template/blog-list-1", label: "Blog" },
        { href: "/template/blog-list-2", label: "Test Prep" },
        { href: "/template/help-center", label: "Verify Certificate" },
        { href: "/template/blog-list-3", label: "Customer reviews" },
        { href: "/template/about-1", label: "About ReadTraining" },
        { href: "/template/contact-1", label: "Contact us" },
      ],
    },
  ],
  legal: [
    { href: "/template/terms", label: "Terms & Conditions" },
    { href: "/template/terms", label: "Privacy Policy" },
    { href: "/template/terms", label: "Cookie Policy" },
    { href: "/template/terms", label: "Accessibility" },
  ],
};
