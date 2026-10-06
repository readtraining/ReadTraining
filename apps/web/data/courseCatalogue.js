// Courses catalogue: filter model, sort options, dummy data and the pure filter/sort/URL helpers.
// Swap `catalogueCourses` for an API response later; everything else only reads this shape:
// { id, title, description, subject, methods[], level, venues[{ city, postcode }], providers,
//   popularity, addedAt (ISO date), price, wasPrice?, duration, validity, imageSrc }

export const PROJECT_NAME = "ReadTraining";
export const PAGE_SIZE = 6;

const slugify = (label) => label.toLowerCase().replace(/ & /g, "-and-").replace(/\s+/g, "-");

export const subjects = [
  "Accounting and Finance", "Building Services", "Business", "Construction", "First Aid",
  "Health and Care", "Health and Safety", "Hospitality", "Lifestyle", "Marketing",
  "Personal Development", "Security", "Teaching & Academics", "Telecommunication",
].map((label) => ({ label, value: slugify(label) }));

export const methods = [
  { label: "Classroom", value: "classroom", icon: "icon-online-learning-4" },
  { label: "Live (Online)", value: "live-online", icon: "icon-online-learning-2" },
  { label: "On Demand", value: "on-demand", icon: "icon-time-management" },
];

export const levels = [
  { label: "Beginner", value: "beginner", icon: "icon-book" },
  { label: "Intermediate", value: "intermediate", icon: "icon-bar-chart" },
  { label: "Advanced", value: "advance", icon: "icon-graduate-cap" },
];

// Single-select groups; `key` is both the state key and the URL query key.
export const filterGroups = [
  { key: "subject", label: "Subject", title: "Subjects", options: subjects },
  { key: "method", label: "Method of Study", title: "Methods of Study", options: methods },
  { key: "level", label: "Course Level", title: "Course Levels", options: levels },
];

export const sortOptions = [
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

// Only offered while a location is entered; it is the default sort in that case.
export const closestSortOption = { value: "closest", label: "Closest" };
const allSortValues = [...sortOptions.map((o) => o.value), closestSortOption.value];

// Older links (e.g. the landing page search band) use these method labels.
const methodAliases = { "live online": "live-online", "online self-paced": "on-demand" };

const ldn = { city: "London", postcode: "EC1A 1BB", lat: 51.52, lng: -0.1 };
const ldn2 = { city: "London", postcode: "E14 5AB", lat: 51.505, lng: -0.02 };
const man = { city: "Manchester", postcode: "M1 1AE", lat: 53.48, lng: -2.24 };
const bir = { city: "Birmingham", postcode: "B1 1AA", lat: 52.48, lng: -1.9 };
const lds = { city: "Leeds", postcode: "LS1 4AP", lat: 53.8, lng: -1.55 };
const gla = { city: "Glasgow", postcode: "G1 1XQ", lat: 55.86, lng: -4.25 };
const bri = { city: "Bristol", postcode: "BS1 4DJ", lat: 51.45, lng: -2.59 };
const car = { city: "Cardiff", postcode: "CF10 1AA", lat: 51.48, lng: -3.18 };
const liv = { city: "Liverpool", postcode: "L1 8JQ", lat: 53.41, lng: -2.98 };
const not = { city: "Nottingham", postcode: "NG1 5FS", lat: 52.95, lng: -1.15 };
const nwc = { city: "Newcastle", postcode: "NE1 4ST", lat: 54.97, lng: -1.61 };

const C = "classroom", L = "live-online", D = "on-demand";
const BEG = "beginner", INT = "intermediate", ADV = "advance";

const c = (id, subject, title, description, methods, level, venues, providers, rating, reviews, price, wasPrice, duration, validity) => ({
  id, title, description, subject: slugify(subject),
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), // added for testing
  rating, // added for testing (was an unused argument)
  methods, level, venues, providers, popularity: reviews, price, wasPrice, duration, validity,
  addedAt: new Date(Date.UTC(2026, 8, 30) - ((id * 17) % 48) * 86400000).toISOString().slice(0, 10),
  imageSrc: `/assets/img/coursesCards/${((id - 1) % 12) + 1}.png`,
});

export const catalogueCourses = [
  c(1, "Security", "SIA Door Supervisor Training", "Everything you need to apply for your SIA door supervisor licence, including conflict management.", [C], BEG, [ldn, man, bir, lds], 46, 4.9, 1991, 198.99, 249, "6 days", "SIA licence-linked"),
  c(2, "Security", "SIA Security Guard Training", "Entry-level licence training for security officers working in venues, retail and events.", [C], BEG, [ldn2, gla, bri], 32, 4.8, 1420, 179.99, null, "5 days", "SIA licence-linked"),
  c(3, "Security", "SIA CCTV Operator Training", "Learn to operate public-space surveillance equipment within the law.", [C, L], INT, [man, liv], 25, 4.7, 612, 169.99, 199.99, "3 days", "SIA licence-linked"),
  c(4, "Security", "Close Protection Training", "Advanced operational training for close protection officers, with scenario-based assessment.", [C], ADV, [ldn, bir], 9, 4.9, 318, 1295, 1495, "14 days", "SIA licence-linked"),
  c(5, "First Aid", "Emergency First Aid at Work", "A one-day course covering the essentials of workplace emergency first aid.", [C, L], BEG, [ldn, man, bir, lds, gla, bri, car, not], 45, 4.9, 2310, 63.2, 79, "1 day", "Valid 3 years"),
  c(6, "First Aid", "First Aid at Work (3 Days)", "Full HSE-approved first aider qualification for medium and high-risk workplaces.", [C], INT, [ldn, man, liv, nwc], 21, 4.8, 980, 159.99, null, "3 days", "Valid 3 years"),
  c(7, "First Aid", "Paediatric First Aid (2 Days)", "Ofsted-compliant paediatric first aid for nurseries, childminders and schools.", [C, L], INT, [ldn2, bir, lds], 18, 4.9, 744, 94.5, 110, "2 days", "Valid 3 years"),
  c(8, "First Aid", "Mental Health First Aid Awareness", "Spot the signs of poor mental health and start supportive conversations.", [L, D], BEG, [], 12, 4.6, 405, 39.99, 55, "4 hours", "Valid 3 years"),
  c(9, "Construction", "CSCS Green Card Course", "Health and safety awareness for labourers, leading to the CSCS Green Card.", [C, L, D], BEG, [ldn, man, bir, bri, car], 10, 4.7, 1650, 89.99, 109.99, "1 day", "CSCS-approved route"),
  c(10, "Construction", "CITB SMSTS Course", "Site Management Safety Training Scheme for managers and senior supervisors.", [C], ADV, [ldn, man, nwc, gla], 14, 4.8, 870, 449, 499, "5 days", "Valid 5 years"),
  c(11, "Construction", "CITB SSSTS Course", "Site Supervisor Safety Training Scheme for team leaders and supervisors.", [C, L], INT, [bir, lds, not], 16, 4.7, 701, 229, null, "2 days", "Valid 5 years"),
  c(12, "Construction", "Traffic Marshal (Banksman) Course", "Safely direct vehicles and pedestrians on construction sites.", [C], BEG, [ldn2, liv], 7, 4.5, 190, 79, 95, "1 day", "Valid 3 years"),
  c(13, "Health and Safety", "IOSH Managing Safely", "The leading health and safety certificate for managers and supervisors.", [C, L, D], INT, [ldn, man, bir, lds], 38, 4.8, 2105, 295, 345, "4 days", "Lifetime"),
  c(14, "Health and Safety", "NEBOSH National General Certificate", "A globally recognised qualification for those with health and safety responsibilities.", [C, L, D], ADV, [ldn, bir, gla], 22, 4.8, 1330, 695, 795, "10 days", "Lifetime"),
  c(15, "Health and Safety", "Manual Handling Training", "Reduce injury risk with practical manual handling techniques.", [L, D], BEG, [], 29, 4.6, 1260, 24.99, 35, "2 hours", "Valid 3 years"),
  c(16, "Health and Safety", "Fire Marshal Training", "Fire warden and fire marshal training that meets legal requirements.", [C, L, D], BEG, [man, ldn, bri], 12, 4.9, 1875, 29.99, 49.99, "3 hours", "Valid 3 years"),
  c(17, "Health and Care", "Care Certificate Standards", "Cover the 15 standards expected of new health and social care workers.", [L, D], BEG, [], 15, 4.7, 560, 119, 149, "12 hours", "Valid 3 years"),
  c(18, "Health and Care", "Safeguarding Adults Level 2", "Recognise and report abuse and neglect in care settings.", [C, L, D], INT, [lds, car], 19, 4.8, 842, 34.99, null, "3 hours", "Valid 3 years"),
  c(19, "Health and Care", "Medication Administration (Advanced)", "Competency-based training for safe handling and administration of medicines.", [C], ADV, [man, not], 8, 4.6, 233, 149, 175, "2 days", "Valid 1 year"),
  c(20, "Hospitality", "Level 2 Food Hygiene", "Food safety essentials for kitchens, catering and food retail.", [L, D], BEG, [], 31, 4.8, 3120, 19.99, 29.99, "3 hours", "Valid 3 years"),
  c(21, "Hospitality", "Personal Licence (APLH)", "The qualification required to authorise the sale of alcohol.", [C, L], INT, [ldn, bir, gla, bri], 24, 4.7, 1544, 99, 119, "1 day", "Lifetime"),
  c(22, "Hospitality", "Barista Skills Masterclass", "Hands-on espresso, milk texturing and latte art training.", [C], BEG, [ldn2, man], 5, 4.9, 312, 135, null, "1 day", "Certificate included"),
  c(23, "Teaching & Academics", "Level 3 Award in Education and Training (AET)", "The entry qualification for anyone who wants to teach in the UK.", [C, L], BEG, [ldn, bir, man], 17, 4.7, 925, 389, 449, "5 days", "Lifetime"),
  c(24, "Teaching & Academics", "Level 4 Internal Quality Assurance", "Quality assure assessment practice within your training organisation.", [L, D], INT, [], 11, 4.6, 418, 449, 520, "Self-paced", "Lifetime"),
  c(25, "Teaching & Academics", "Level 5 Diploma in Education and Training", "A teaching qualification for experienced practitioners moving into leadership.", [L, D], ADV, [], 6, 4.8, 207, 1250, 1450, "Self-paced", "Lifetime"),
  c(26, "Business", "Project Management Fundamentals", "Plan, deliver and close projects using proven methods.", [C, L, D], BEG, [ldn, man], 20, 4.6, 780, 295, 350, "2 days", "Certificate included"),
  c(27, "Business", "Human Resources Practitioner Course", "Recruitment, employment law and employee relations in practice.", [L, D], INT, [], 13, 4.7, 512, 349, null, "4 days", "Certificate included"),
  c(28, "Business", "Leadership and Management Level 5", "Develop strategic leadership skills for senior managers.", [C, L], ADV, [bir, lds, ldn], 10, 4.8, 340, 799, 949, "8 days", "Lifetime"),
  c(29, "Accounting and Finance", "Bookkeeping Level 2", "Learn double-entry bookkeeping and manage ledgers with confidence.", [L, D], BEG, [], 14, 4.7, 604, 249, 299, "Self-paced", "Lifetime"),
  c(30, "Accounting and Finance", "AAT Level 3 Accounting Technician", "Prepare accounts and manage budgets to professional standard.", [C, L], INT, [man, bri], 8, 4.8, 276, 849, 999, "12 weeks", "Lifetime"),
  c(31, "Accounting and Finance", "ACCA Financial Reporting Prep", "Exam-focused preparation for ACCA financial reporting.", [L, D], ADV, [], 6, 4.5, 158, 599, null, "Self-paced", "Lifetime"),
  c(32, "Building Services", "Electrical Installation Level 2", "Foundation practical training for aspiring electricians.", [C], BEG, [bir, lds, nwc], 9, 4.6, 287, 995, 1150, "10 days", "Lifetime"),
  c(33, "Building Services", "18th Edition Wiring Regulations", "Update your knowledge to the latest BS 7671 amendments.", [C, L], INT, [ldn, man, gla], 18, 4.8, 1102, 215, 249, "3 days", "Valid 5 years"),
  c(34, "Building Services", "Gas Safe Commercial Catering Assessment", "ACS assessment for commercial catering gas engineers.", [C], ADV, [bir, liv], 5, 4.7, 164, 595, null, "4 days", "Valid 5 years"),
  c(35, "Lifestyle", "Introduction to Yoga Teaching", "Foundation skills for leading safe, inclusive yoga classes.", [C, L], BEG, [bri, car], 6, 4.9, 223, 249, 299, "3 days", "Certificate included"),
  c(36, "Lifestyle", "Nutrition and Wellbeing Level 3", "Practical nutrition coaching for health and fitness professionals.", [L, D], INT, [], 8, 4.6, 345, 189, 229, "Self-paced", "Certificate included"),
  c(37, "Marketing", "Digital Marketing Essentials", "SEO, social media and email marketing for beginners.", [L, D], BEG, [], 21, 4.7, 1480, 99, 149, "Self-paced", "Certificate included"),
  c(38, "Marketing", "Social Media Strategy Workshop", "Build a content plan, grow an audience and measure results.", [C, L], INT, [ldn, man], 7, 4.5, 198, 175, null, "1 day", "Certificate included"),
  c(39, "Marketing", "Advanced Paid Media and Analytics", "Optimise paid campaigns and attribute revenue accurately.", [L], ADV, [], 4, 4.8, 121, 395, 450, "2 days", "Certificate included"),
  c(40, "Personal Development", "Time Management and Productivity", "Practical techniques to prioritise and get more done.", [L, D], BEG, [], 16, 4.5, 910, 29, 45, "3 hours", "Certificate included"),
  c(41, "Personal Development", "Conflict Resolution Skills", "De-escalate disagreements and negotiate better outcomes.", [C, L], INT, [ldn2, bir, lds], 9, 4.7, 266, 129, 159, "1 day", "Certificate included"),
  c(42, "Personal Development", "Executive Presence and Public Speaking", "Command the room and communicate with authority.", [C], ADV, [ldn, man], 4, 4.9, 134, 450, null, "2 days", "Certificate included"),
  c(43, "Telecommunication", "Fibre Optic Splicing Fundamentals", "Hands-on fusion splicing and testing for new entrants.", [C], BEG, [man, nwc, bir], 6, 4.6, 142, 395, 440, "2 days", "Certificate included"),
  c(44, "Telecommunication", "Structured Cabling Installer", "Install and certify copper and fibre cabling systems.", [C, L], INT, [lds, not], 5, 4.5, 118, 495, null, "3 days", "Valid 3 years"),
  c(45, "Telecommunication", "Network Infrastructure Design (CCNA Prep)", "Design, configure and troubleshoot enterprise networks.", [L, D], ADV, [], 7, 4.8, 305, 749, 890, "Self-paced", "Valid 3 years"),
  c(46, "Security", "Door Supervisor Refresher", "Renew your SIA door supervisor licence with a short top-up course.", [C], INT, [ldn, man, bir, lds, gla], 30, 4.8, 1240, 99, 119, "2 days", "Renews SIA licence"),
  c(47, "Security", "Conflict Management for Security", "Reduce risk and de-escalate confrontation in front-line roles.", [L, D], BEG, [], 12, 4.6, 438, 25, 39, "3 hours", "Certificate included"),
  c(48, "Construction", "Asbestos Awareness (Category A)", "Identify asbestos-containing materials and avoid exposure.", [L, D], BEG, [], 26, 4.7, 1925, 19.99, 29.99, "2 hours", "Valid 1 year"),
  // added for testing: very long title (over 70 characters)
  c(49, "Hospitality", "Level 3 Award in Supervising Food Safety in Catering (RQF) Online Course", "Supervisory food safety knowledge for catering managers and team leaders working in busy kitchens.", [L, D], INT, [], 17, 4.7, 388, 54.5, 79, "6 hours", "Valid 3 years"),
  // added for testing: no description
  c(50, "Security", "Security Awareness Briefing", "", [C], BEG, [ldn, man], 6, 4.4, 96, 45, null, "3 hours", "Certificate included"),
  // added for testing: no image
  { ...c(51, "Lifestyle", "Workplace Wellbeing Basics", "Practical habits for stress, sleep and healthy routines at work.", [L], BEG, [], 4, 4.5, 77, 295, 349, "1 day", "Certificate included"), imageSrc: "" },
];

// Sub-subjects: shown in the Subjects filter after a subject is chosen (drill-down).
const subDefs = {
  "accounting-and-finance": [["Accountancy", [30, 31]], ["Bookkeeping", [29]]],
  "building-services": [["Electrical", [32, 33]], ["Gas", [34]]],
  business: [["Project Management", [26]], ["Human Resources", [27]], ["Leadership and Management", [28]]],
  construction: [["CITB Courses", [10, 11]], ["CSCS Cards", [9]], ["Site Safety", [12, 48]]],
  "first-aid": [["Workplace First Aid", [5, 6]], ["Paediatric First Aid", [7]], ["Mental Health First Aid", [8]]],
  "health-and-care": [["Care Certificate", [17]], ["Safeguarding", [18]], ["Medication", [19]]],
  "health-and-safety": [["IOSH", [13]], ["NEBOSH", [14]], ["Manual Handling", [15]], ["Fire Safety", [16]]],
  hospitality: [["Food Hygiene", [20, 49]], ["Licensing", [21]], ["Barista and Coffee", [22]]],
  lifestyle: [["Yoga and Fitness", [35]], ["Nutrition and Wellbeing", [36, 51]]],
  marketing: [["Digital Marketing", [37, 39]], ["Social Media Marketing", [38]]],
  "personal-development": [["Productivity", [40]], ["Communication", [41, 42]]],
  security: [["SIA Licence Training", [1, 2, 3, 46]], ["Close Protection", [4]], ["Conflict Management", [47, 50]]],
  "teaching-and-academics": [["Teaching Qualifications", [23, 25]], ["Quality Assurance", [24]]],
  telecommunication: [["Fibre and Cabling", [43, 44]], ["Networking", [45]]],
};
export const subSubjects = Object.fromEntries(
  Object.entries(subDefs).map(([subject, subs]) => [subject, subs.map(([label]) => ({ label, value: slugify(label) }))]),
);
const subByCourseId = {};
Object.values(subDefs).forEach((subs) => subs.forEach(([label, ids]) => ids.forEach((id) => (subByCourseId[id] = slugify(label)))));
catalogueCourses.forEach((course) => {
  course.sub = subByCourseId[course.id] || "";
});

// Details pages: every course links to the course details page. Swap the pattern when real routes exist.
catalogueCourses.forEach((course) => {
  course.detailsHref = `/template/courses/${course.id}`;
});

const methodByValue = Object.fromEntries(methods.map((m) => [m.value, m]));
export const getMethodLabel = (value) => methodByValue[value]?.label ?? value;

// --- location matching -------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
const outward = (s) => s.trim().toLowerCase().split(/\s+/)[0];

// Courses with a physical venue match when a venue's town or postcode matches.
// Courses with no venue (online only) are available anywhere, so they always match.
export function matchesLocation(course, query) {
  const q = (query || "").trim();
  if (!q || course.venues.length === 0) return true;
  const qn = norm(q);
  const hasSpace = /\s/.test(q);
  return course.venues.some(
    (v) =>
      norm(v.city).includes(qn) ||
      norm(v.postcode).startsWith(qn) ||
      (hasSpace && outward(v.postcode) === outward(q)),
  );
}

// --- filtering / sorting -----------------------------------------------------
const subjectLabelByValue = Object.fromEntries(subjects.map((x) => [x.value, x.label]));

// Keyword matches title, subject and description, case-insensitive.
const matchesKeyword = (course, q) => {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return true;
  return [course.title, subjectLabelByValue[course.subject], course.description].some((t) => (t || "").toLowerCase().includes(needle));
};

// subject, sub, method and level are arrays of ticked values. Inside a group a course matches ANY ticked value (OR);
// between groups every group must match (AND). An empty array means "no filter" for that group.
export function filterCourses(courses, { subject = [], sub = [], method = [], level = [], location, min, max, q }) {
  return courses.filter(
    (course) =>
      matchesKeyword(course, q) &&
      (!subject.length || subject.includes(course.subject)) &&
      (!sub.length || sub.includes(course.sub)) &&
      (!method.length || course.methods.some((m) => method.includes(m))) &&
      (!level.length || level.includes(course.level)) &&
      (min === undefined || course.price >= min) &&
      (max === undefined || course.price <= max) &&
      matchesLocation(course, location),
  );
}

const sorters = {
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  popular: (a, b) => b.popularity - a.popularity,
  name: (a, b) => a.title.localeCompare(b.title, "en-GB", { sensitivity: "base" }),
};

// Distance in km (equirectangular approximation is plenty for ranking UK venues).
const distanceKm = (a, b) => {
  const x = ((b.lng - a.lng) * Math.PI / 180) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const y = (b.lat - a.lat) * Math.PI / 180;
  return Math.sqrt(x * x + y * y) * 6371;
};

// Reference point for "closest": the first venue that matches the typed town or postcode.
function locationPoint(courses, location) {
  for (const course of courses) {
    const v = course.venues.find((venue) => matchesLocation({ venues: [venue] }, location));
    if (v) return v;
  }
  return null;
}

export function sortCourses(courses, sort, location = "", all = courses) {
  if (sort === "closest") {
    const point = locationPoint(all, location);
    if (!point) return sorters.popular ? [...courses].sort(sorters.popular) : courses;
    const dist = (c) => (c.venues.length ? Math.min(...c.venues.map((v) => distanceKm(point, v))) : Infinity);
    return [...courses].sort((a, b) => dist(a) - dist(b) || b.popularity - a.popularity);
  }
  const fn = sorters[sort];
  return fn ? [...courses].sort(fn) : courses;
}

// Price slider bounds come from the data (rounded up to the next 50).
export const PRICE_BOUNDS = {
  min: 0,
  max: Math.ceil(Math.max(...catalogueCourses.map((c) => c.price)) / 50) * 50,
};
export const PRICE_STEP = 5;

// Quick price bands. A band is "selected" when min/max equal its range, so typing a range or moving the
// slider deselects it, and picking a band overwrites min/max (no extra URL param).
export const priceBands = [
  { value: "any", label: "Any price", min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max },
  { value: "under-50", label: "Under £50", min: PRICE_BOUNDS.min, max: 49.99 },
  { value: "50-200", label: "£50 to £200", min: 50, max: 200 },
  { value: "over-200", label: "Over £200", min: 200.01, max: PRICE_BOUNDS.max },
];

export const defaultSort = (location) => (location ? "closest" : "popular");

// --- URL state -----------------------------------------------------------------
const valid = (group, value) => (group.options.some((o) => o.value === value) ? value : "");

export function parseCatalogueParams(params) {
  const [subjectG, methodG, levelG] = filterGroups;
  const sort = params.get("sort");
  const page = parseInt(params.get("page") || "1", 10);
  const location = (params.get("location") || params.get("where") || "").trim().slice(0, 80);
  const num = (key, fallback) => {
    const n = parseFloat(params.get(key));
    return Number.isFinite(n) ? Math.min(Math.max(n, PRICE_BOUNDS.min), PRICE_BOUNDS.max) : fallback;
  };
  let min = num("min", PRICE_BOUNDS.min);
  let max = num("max", PRICE_BOUNDS.max);
  if (min > max) [min, max] = [max, min];

  // Checkbox groups hold several values: ?subject=first-aid,security. Unknown values are dropped, duplicates removed
  // and the rest sorted, so the same selection always makes the same URL.
  const many = (key, allowed, map = (v) => v) =>
    [...new Set((params.get(key) || "").split(",").map((v) => map(v.trim().toLowerCase())).filter((v) => allowed.has(v)))].sort();
  const subject = many("subject", new Set(subjectG.options.map((o) => o.value)));
  const allowedSubs = new Set(subject.flatMap((sv) => (subSubjects[sv] || []).map((x) => x.value)));
  return {
    subject,
    sub: many("sub", allowedSubs),
    method: many("method", new Set(methodG.options.map((o) => o.value)), (v) => methodAliases[v] || v),
    level: many("level", new Set(levelG.options.map((o) => o.value))),
    q: (params.get("q") || "").trim().slice(0, 80),
    location,
    min,
    max,
    sort: allSortValues.includes(sort) && (sort !== "closest" || location) ? sort : defaultSort(location),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Defaults are omitted so URLs stay clean.
export function buildCatalogueQuery(state) {
  const p = new URLSearchParams();
  const list = (key, values) => values && values.length && p.set(key, [...new Set(values)].sort().join(","));
  list("subject", state.subject);
  if (state.subject && state.subject.length) list("sub", state.sub);
  list("method", state.method);
  list("level", state.level);
  if (state.q) p.set("q", state.q);
  if (state.location) p.set("location", state.location);
  if (state.min > PRICE_BOUNDS.min) p.set("min", String(state.min));
  if (state.max < PRICE_BOUNDS.max) p.set("max", String(state.max));
  if (state.sort && state.sort !== defaultSort(state.location)) p.set("sort", state.sort);
  if (state.page > 1) p.set("page", String(state.page));
  return p.toString().replace(/%2C/g, ","); // keep the commas readable
}

// ======================================================================================================
// added for testing: course DETAIL fields. Generated from the catalogue fields above so every course has a complete
// detail page. Replace with real API data later; lib/courses.js is the only reader of this function.
// ======================================================================================================
const DETAIL_BASE = Date.UTC(2026, 9, 19); // first session date; fixed so server and client render the same dates
const DAY = 86400000;
const providerPool = ["Apex Training", "Northgate Learning", "BrightPath Academy", "Summit Skills", "Harbour Training Group", "ClearView Learning"];
const priceSteps = [1, 1, 1.05, 0.97, 1.1, 1.02];
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const nextWeekday = (ms) => { let t = ms; while ([0, 6].includes(new Date(t).getUTCDay())) t += DAY; return t; };

// qualification, audience, and 4 modules x 3 topics per subject
const S = (qual, aud, mods) => ({ qual, aud, mods });
const detailBySubject = {
  security: S("SIA-recognised qualification", ["People starting a career in security", "Door supervisors and security officers", "Venue and event staff"], [
    ["Roles and responsibilities", ["The private security industry", "Your legal duties and powers", "Professional conduct"]],
    ["Risk and conflict", ["Spotting and assessing risk", "Communication and de-escalation", "Dealing with aggression"]],
    ["Emergency procedures", ["Fire and evacuation", "Dealing with incidents", "Reporting and record keeping"]],
    ["Assessment and next steps", ["Knowledge assessment", "Practical assessment", "Licence application guidance"]]]),
  "first-aid": S("Regulated first aid qualification", ["Workplace first aiders", "Teachers, carers and childminders", "Anyone who wants to help in an emergency"], [
    ["Assessing an incident", ["Staying safe at the scene", "Primary survey", "Calling for help"]],
    ["Life-saving skills", ["CPR and defibrillator use", "The recovery position", "Controlling bleeding"]],
    ["Common injuries and illness", ["Choking and breathing problems", "Burns, fractures and wounds", "Heart attack and stroke"]],
    ["Assessment", ["Practical demonstration", "Knowledge check", "Certification and renewal"]]]),
  construction: S("Construction industry qualification", ["Site workers and labourers", "Supervisors and site managers", "Anyone moving into construction"], [
    ["Health and safety on site", ["Legal duties on site", "Risk assessment and method statements", "Safe systems of work"]],
    ["Hazards and controls", ["Working at height", "Manual handling and plant", "Hazardous substances"]],
    ["Site management", ["Communication and supervision", "Welfare and environment", "Accident reporting"]],
    ["Assessment", ["Knowledge assessment", "Practical tasks", "Card or certificate application"]]]),
  "health-and-safety": S("Recognised health and safety certificate", ["Managers and supervisors", "Health and safety representatives", "Anyone with safety responsibilities"], [
    ["Foundations of safety management", ["Why health and safety matters", "The legal framework", "Roles and responsibilities"]],
    ["Assessing risk", ["Hazard identification", "Risk assessment methods", "Control measures"]],
    ["Everyday workplace hazards", ["Manual handling and display screens", "Fire safety", "Slips, trips and falls"]],
    ["Assessment", ["Knowledge assessment", "Practical exercise", "Next steps and further study"]]]),
  "health-and-care": S("Health and social care qualification", ["New and existing care workers", "Support workers and assistants", "Care home and community staff"], [
    ["Duty of care", ["Understanding your role", "Person-centred care", "Dignity and respect"]],
    ["Safeguarding", ["Recognising signs of abuse", "Reporting concerns", "Whistleblowing"]],
    ["Safe practice", ["Infection prevention", "Handling information", "Health and safety in care"]],
    ["Assessment", ["Workplace evidence", "Knowledge assessment", "Certification"]]]),
  hospitality: S("Hospitality and catering qualification", ["Kitchen and front-of-house staff", "Managers and supervisors", "Anyone starting out in hospitality"], [
    ["Food and drink safety", ["Hazards and controls", "Personal hygiene", "Safe storage and temperatures"]],
    ["Legal responsibilities", ["Food law and allergens", "Licensing basics", "Record keeping"]],
    ["Customer service", ["Handling customers", "Working in a team", "Dealing with complaints"]],
    ["Assessment", ["Knowledge assessment", "Practical tasks", "Certificate"]]]),
  "teaching-and-academics": S("Teaching and training qualification", ["Aspiring and new trainers", "Assessors and verifiers", "Practitioners moving into education"], [
    ["The teaching role", ["Roles and boundaries", "Inclusive learning", "Planning sessions"]],
    ["Delivering learning", ["Teaching methods", "Using resources", "Managing groups"]],
    ["Assessment and feedback", ["Assessment methods", "Giving feedback", "Recording progress"]],
    ["Evaluation", ["Reflective practice", "Quality assurance", "Next steps"]]]),
  business: S("Business and management qualification", ["Team leaders and managers", "Business owners", "Anyone planning a management career"], [
    ["Planning and organising", ["Setting goals", "Planning work and resources", "Managing time"]],
    ["Leading people", ["Communication and feedback", "Motivating teams", "Handling difficult conversations"]],
    ["Delivering results", ["Monitoring progress", "Managing risk and change", "Reporting"]],
    ["Assessment", ["Case study", "Knowledge assessment", "Certification"]]]),
  "accounting-and-finance": S("Accounting qualification", ["Aspiring bookkeepers and accountants", "Small business owners", "Finance team members"], [
    ["Bookkeeping basics", ["Double-entry principles", "Ledgers and day books", "Bank reconciliation"]],
    ["Preparing accounts", ["Trial balance", "Adjustments and accruals", "Final accounts"]],
    ["Tax and compliance", ["VAT basics", "Payroll overview", "Record retention"]],
    ["Assessment", ["Practice tasks", "Computer-based assessment", "Certification"]]]),
  "building-services": S("Building services qualification", ["Trainee electricians and engineers", "Apprentices", "Experienced installers updating skills"], [
    ["Safe working practice", ["Regulations and standards", "Safe isolation", "Tools and test equipment"]],
    ["Installation skills", ["Cables and containment", "Circuits and protection", "Termination"]],
    ["Inspection and testing", ["Visual inspection", "Testing procedures", "Recording results"]],
    ["Assessment", ["Practical assessment", "Written exam", "Certification"]]]),
  lifestyle: S("Lifestyle and wellbeing certificate", ["Aspiring instructors and coaches", "Fitness and wellbeing professionals", "Anyone with a personal interest"], [
    ["Foundations", ["Core principles", "Anatomy and safety", "Planning sessions"]],
    ["Practice", ["Technique and delivery", "Adapting for individuals", "Communication"]],
    ["Wellbeing", ["Healthy routines", "Stress and sleep", "Motivation"]],
    ["Assessment", ["Practical assessment", "Knowledge check", "Certificate"]]]),
  marketing: S("Marketing certificate", ["Marketing assistants and executives", "Business owners", "Career changers"], [
    ["Marketing foundations", ["Customers and markets", "Brand and positioning", "Setting objectives"]],
    ["Channels", ["Search and content", "Social media", "Email marketing"]],
    ["Measuring results", ["Key metrics", "Reporting and dashboards", "Improving campaigns"]],
    ["Assessment", ["Practical project", "Knowledge check", "Certificate"]]]),
  "personal-development": S("Professional development certificate", ["Professionals at any career stage", "Team leaders", "Anyone building confidence at work"], [
    ["Self-awareness", ["Strengths and goals", "Habits and mindset", "Planning your development"]],
    ["Core skills", ["Communication", "Prioritising and focus", "Handling pressure"]],
    ["Working with others", ["Listening and feedback", "Influence and negotiation", "Resolving conflict"]],
    ["Putting it into practice", ["Action plan", "Review and reflection", "Next steps"]]]),
  telecommunication: S("Telecommunications qualification", ["New entrants to telecoms", "Installers and technicians", "Network support staff"], [
    ["Fundamentals", ["Cable and connector types", "Standards and safety", "Tools and test equipment"]],
    ["Installation", ["Planning and routing", "Termination and splicing", "Labelling and documentation"]],
    ["Testing", ["Test methods", "Fault finding", "Certifying results"]],
    ["Assessment", ["Practical assessment", "Knowledge check", "Certification"]]]),
};

const hoursOf = (duration) => {
  const n = parseFloat(duration);
  if (/day/i.test(duration)) return n * 6;
  if (/week/i.test(duration)) return n * 4;
  if (/hour/i.test(duration)) return n;
  return 8; // self-paced
};
const fmtMinutes = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${Math.floor(m / 60) > 1 ? "s" : ""}${m % 60 ? ` ${m % 60} min` : ""}`);

const reviewPool = [
  ["Priya S.", "Clear and well organised", "The trainer explained everything clearly and the pace was right. I felt confident by the end of the course."],
  ["James T.", "Worth every penny", "Booking was simple and the course covered exactly what I needed for work. I would book with this provider again."],
  ["Amira K.", "Practical and useful", "Plenty of practical examples, and the materials were easy to follow afterwards. My certificate arrived within a few days."],
  ["Daniel R.", "Good, but a long day", "Very informative and the trainer knew the subject well. The day was long, so bring lunch and a notepad."],
  ["Hannah W.", "Great value", "Friendly group, relevant content and good support from the provider. Exactly what my employer asked for."],
  ["Marcus L.", "Would recommend", "Well run from start to finish. I passed first time and the follow-up information was helpful."],
  ["Sofia M.", "Excellent trainer", "Engaging, patient and happy to answer questions. The assessment was fair and well explained."],
  ["Oliver B.", "Straightforward booking", "Easy to find a date near me and the venue was comfortable. The course content was up to date."],
];
const reviewDates = ["2026-09-12", "2026-08-27", "2026-08-03", "2026-07-19", "2026-06-30", "2026-06-11", "2026-05-22", "2026-05-04"];

// ---- added for testing: Hurak-style detail content ------------------------------------------------------------
// Course 1 carries the real copy from the live Hurak course page; every other course gets generic content built in
// buildCourseDetail. Anything missing here (or empty) is simply not shown on the page.
const courseOverrides = {
  1: {
    summary: "Complete the SIA Door Supervisor Course and qualify for your SIA Door Supervisor Licence, opening doors to security roles in hospitality, retail, and corporate sectors.",
    providerCount: 47,
    reviewCount: 1301,
    learnerCount: 103284,
    features: ["Unlimited exam resits", "Same day results", "Quicker certification", "Cheapest in the industry", "Approved SIA courses"],
    description: [
      "If you're planning a career as a security guard or door supervisor in the UK, you'll need to complete this six-day SIA Door Supervisor course before applying for your SIA security licence.",
      "The Security Industry Authority (SIA) is a government body regulating the private security industry in the UK, requiring individuals to complete SIA security courses before applying for their SIA security badge.",
      "With this course, you'll gain the essential skills and knowledge for handling various security duties, such as monitoring entry and exits, dealing with conflicts, and ensuring customer safety.",
      "During the six-day course, you'll cover important legal guidelines, communication strategies, physical intervention and hands-on techniques for real-life situations, ensuring you're fully prepared to pass your exams and apply for your SIA Door Supervisor Licence.",
    ],
    workAreas: {
      title: "Where can I work as an SIA Door Supervisor?",
      intro: "With an SIA Door Supervisor licence, you can work in various sectors, including:",
      items: [
        ["Hospitality", "Nightclubs, bars, pubs, restaurants, and hotels where alcohol is served."],
        ["Retail", "Shopping centres, stores, and supermarkets for loss prevention and crowd control."],
        ["Corporate", "Office buildings, events, and private functions for access control and security management."],
        ["Events and entertainment", "Concerts, festivals, exhibitions, and sports events for crowd control and safety."],
        ["Leisure and recreation", "Cinemas, theatres, casinos, and sports venues."],
        ["Healthcare", "Hospitals and healthcare facilities requiring security services."],
        ["Residential", "Apartment complexes or gated communities for access control."],
        ["Transportation", "Airports, train stations, and other transit hubs."],
      ],
      note: "Earn up to £3,500 monthly with the freedom to work when you want!",
    },
    requirements: {
      title: "Entry requirements for the Door Supervisor Course",
      paragraphs: [
        "To be eligible for the Door Supervisor course, you must be 18 years or older, have adequate English skills in reading, writing, speaking, and listening, and hold basic first aid certification, such as an Emergency First Aid at Work certificate with at least 12 months' validity.",
        "Don't have a first aid course? No worries! We offer discounted packages that include the first aid course and much more when you book with us.",
      ],
    },
    exams: {
      title: "How many exams will I sit during the Door Supervisor training?",
      intro: [
        "Throughout the six-day course, you'll be assessed by your teacher on practical skills such as searching and physical intervention. You will also complete four multiple-choice exams, each varying in question number and passing requirements.",
        "The table below provides details on the duration, questions, and pass marks for each exam.",
      ],
      rows: [
        { unit: "Principles of working in the private security industry", passMark: "51/72 (70%)", duration: "110 minutes" },
        { unit: "Principles of working as a door supervisor in the private security industry", passMark: "35/50 (70%)", duration: "75 minutes" },
        { unit: "Application of conflict management in the private security industry", passMark: "14/20 (70%)", duration: "30 minutes" },
        { unit: "Application of physical intervention skills in the private security industry", passMark: "24/30 (80%)", duration: "45 minutes" },
      ],
      outro: [
        "Stressed about passing the exams? Don't be! They're straightforward, and we offer several free resources like mock exams and a study guide to help you succeed.",
        "Enjoy peace of mind when you book with us, thanks to our 96% first-time pass rate and unlimited free resits included in our packages.",
      ],
    },
    comparison: {
      title: "Which is better: the Door Supervisor Course or the Security Guard Course?",
      paragraphs: [
        "Many people ask us which is the better option: the Door Supervisor Course or the Security Guard Course? With a Door Supervisor licence, you can work in licensed venues like clubs and bars, as well as non-licensed settings like offices or retail. However, a Security Guard licence limits you to non-licensed premises, which is why most employers prefer those with a Door Supervisor licence.",
        "The Door Supervisor licence functions as a 2-in-1 qualification, allowing you to work as both a Door Supervisor and Security Guard. As a result, the Door Supervisor licence provides more flexibility and potential for broader job prospects.",
      ],
    },
    apply: {
      title: "How to apply for an SIA Door Supervisor licence?",
      intro: "Getting your SIA Door Supervisor Licence is a straightforward process. Simply follow these steps:",
      steps: [
        "Complete and pass the six-day door supervisor course",
        "Complete the licence application on the SIA's website",
        "Verify your identity at the post office and pay the £204 licence fee",
        "The SIA will run a background check on your criminal record and right to work",
        "You will receive your SIA licence within 25 working days by post",
      ],
      notes: [
        "For detailed information on applying for an SIA licence, read our guide: An Essential Guide to SIA Licences: From Eligibility to Approval.",
        "Use our SIA Criminal Record Checker to see your eligibility for an SIA licence.",
      ],
    },
    learningOutcomes: [
      "Legal aspects of the private security industry",
      "Health and safety for private security operatives",
      "Fire safety awareness and emergency procedures",
      "Communication skills and customer care",
      "Door supervisor responsibilities, including searching and arrest",
      "Conflict management and resolution techniques",
      "Introduction to physical intervention skills and relevant legislation",
    ],
    modules: [
      { title: "Unit 1: Working within the Private Security Industry", topics: ["The main characteristics of the Private Security Industry", "Legislation as it applies to the individual in carrying out a licensable activity", "The importance of safe working practices to comply with legal requirements", "Fire procedures in the workplace", "Emergencies and the importance of emergency procedures", "The importance of communication skills and customer care"] },
      { title: "Unit 2: Working as a Door Supervisor within the Private Security Industry", topics: ["The role and objectives of a door supervisor", "Civil and criminal law", "Searching", "Powers of arrest", "Drug misuse issues and procedures", "Incident recording and crime scene preservation", "Licensing law and social responsibility", "Emergency procedures", "How to keep vulnerable people safe"] },
      { title: "Unit 3: Conflict Management within the Private Security Industry", topics: ["The principles of conflict management", "How to recognise, assess and reduce risk in conflict situations", "How to communicate in emotive situations to de-escalate conflict", "How to develop and use problem-solving strategies for resolving conflict", "Good practice to follow after conflict situations"] },
      { title: "Unit 4: Physical Intervention Skills within the Private Security Industry", topics: ["Physical interventions and the implications of their use", "How to reduce the risk of harm when physical intervention skills are used", "Use non-aggressive physical skills to protect yourself and others", "Use non-pain related standing, holding and escorting techniques", "Good practice to follow after physical interventions"] },
    ],
    faqs: [
      { question: "How long is the Door Supervisor course?", answer: "The course lasts six days and includes some required distance learning at home. The course duration is set by the SIA and cannot be shortened." },
      { question: "Can I complete the Door Supervisor course from home?", answer: "No, the Door Supervisor course can't be completed entirely online. It requires six days of in-person training, along with some distance learning that can be done from home, ensuring you acquire vital practical experience." },
      { question: "Is the Door Supervisor course better than the Security Guard course?", answer: "A Door Supervisor licence allows work in both licensed and non-licensed environments, whereas a Security Guard is restricted to non-licensed premises. This makes the Door Supervisor licence more beneficial, as it also qualifies you for security guard roles." },
      { question: "How much money do Door Supervisors make?", answer: "Door Supervisors typically earn between £12 to £16 per hour, depending on location, experience, and the type of venue, with the possibility of earning more during busy periods or at high-profile events." },
      { question: "Do I need to complete first aid training before taking my Door Supervisor course?", answer: "Yes, the SIA has made it mandatory for anyone wanting to take the Door Supervisor course to first complete an emergency first aid course, or a higher level. This must be done in a classroom, not online. If you already have a first aid certificate, it must be valid for at least 12 months from the start of your Door Supervisor course. If you don't have one, you can book and complete it with us as part of your Door Supervisor package." },
      { question: "How much does the Door Supervisor course cost?", answer: "The Door Supervisor course typically costs between £200 and £270, depending on the location. If you don't have a valid first aid certificate with at least 12 months left, expect to pay an extra £50-£100." },
      { question: "Is the Door Supervisor course difficult?", answer: "The course is relatively easy to pass, with assessments consisting of four multiple-choice exams and practicals. If you pay attention, use our mock exams, and study materials, you should succeed. We have a 96% first-time pass rate, and on the rare occasion that you do fail, you can always resit the exams." },
      { question: "Can I work as a Door Supervisor without the SIA Door Supervisor Licence?", answer: "No, it's a legal requirement to hold a valid SIA Door Supervisor Licence to work as a Door Supervisor in the UK." },
      { question: "Who should consider taking the Door Supervisor course?", answer: "The Door Supervisor course is ideal for anyone looking to work in security roles at licensed premises such as bars, clubs, and events and non-licensed premises such as retail and corporate offices. It is also perfect for those who want flexibility in choosing their working hours and days, whether they prefer weekends, evenings, or weekdays." },
      { question: "When can I expect my exam results?", answer: "Typically, results are available within 7 working days, though this may vary based on the location of your training course." },
      { question: "How do I pay for the course?", answer: "You can book the course online through our website or by calling us at 0333 344 1293." },
      { question: "How can I apply for the SIA Door Supervisor licence?", answer: "After receiving your exam results from us, you can apply for the SIA licence on their website. You don't need your certificate to apply, as the SIA will already have your results. Since 1 April 2026, the licence application fee is £204." },
      { question: "Does the course fee cover the SIA licence fee?", answer: "No, the SIA licence fee is not included in your course fee. Make sure to budget for it separately, as you will need to pay £204 for the SIA licence directly to the SIA at the Post Office during the last stage of your application." },
    ],
    reviews: [
      { name: "James Rennie", org: "GL", date: "2026-09-06", rating: 5 },
      { name: "Richard Andrew Brown", org: "AST", date: "2026-09-01", rating: 5, body: "It does the job of getting you an ELS Certificate, but it's done on the cheap in premises that consist of a couple of small rooms above a hairdressers, which get extremely hot. I believe the provider to be a fly by night company as they've since changed their venue to another temporary address." },
      { name: "Fahad Rehman", org: "FAAS", date: "2026-06-19", rating: 5 },
      { name: "Marcus Nabi", org: "GL", date: "2026-05-14", rating: 5 },
      { name: "Syed Hamid Rifat", org: "Integra", date: "2026-05-05", rating: 5 },
      { name: "Fazlul Hoque", org: "EDU", date: "2026-04-16", rating: 5 },
    ],
  },
};

export function buildCourseDetail(course) {
  const info = detailBySubject[course.subject] || detailBySubject.business;
  const hours = hoursOf(course.duration);
  const perModule = Math.max(20, Math.round((hours * 60) / info.mods.length / 5) * 5);
  const modules = info.mods.map(([title, topics]) => ({ title, duration: fmtMinutes(perModule), topics }));
  const verbs = ["Understand", "Apply", "Recognise", "Follow", "Explain", "Use", "Complete", "Prepare for"];
  const outcomes = modules.flatMap((m) => m.topics).slice(0, 8).map((t, i) => `${verbs[i]} ${/^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1)}`);

  const levelWord = { beginner: "beginner", intermediate: "intermediate", advance: "advanced" }[course.level];
  const entry = {
    beginner: ["No previous experience needed", "Basic reading and writing in English"],
    intermediate: ["Some experience in the subject area, or a related introductory qualification", "Good reading and writing in English"],
    advance: ["Relevant work experience or a prior qualification", "Good reading and writing in English", "Photo ID on the first day"],
  }[course.level];

  // sessions: classroom (one per venue), live online (dates); on demand is shown as online
  const sessions = [];
  let n = 0;
  const makeSession = (mode, offsetDays, venue) => {
    n += 1;
    const price = Math.round(course.price * priceSteps[n % priceSteps.length] * 100) / 100;
    const wasPrice = course.wasPrice ? Math.round(price * (course.wasPrice / course.price) * 100) / 100 : null;
    sessions.push({
      id: `${mode === "classroom" ? "c" : "o"}${n}`,
      mode,
      date: iso(nextWeekday(DETAIL_BASE + offsetDays * DAY)),
      time: mode === "classroom" ? "09:30 to 17:00" : course.methods.includes("live-online") ? "10:00 to 16:00" : "Start any time",
      location: venue ? `${venue.city}, ${venue.postcode}` : "Live online",
      city: venue ? venue.city : "",
      venue: venue ? venue.city : "",
      address: venue ? `${venue.city} Training Centre` : "",
      postcode: venue ? venue.postcode : "",
      endDate: iso(nextWeekday(DETAIL_BASE + offsetDays * DAY) + (Math.max(1, Math.round(parseFloat(course.duration) || 1)) > 1 && /day/i.test(course.duration) ? (Math.round(parseFloat(course.duration)) - 1) * DAY : 0)),
      provider: providerPool[(course.id + n) % providerPool.length],
      price,
      wasPrice,
    });
  };
  if (course.methods.includes("classroom")) {
    course.venues.slice(0, 8).forEach((v, i) => {
      makeSession("classroom", i * 3 + (course.id % 4), v);
      if (i < 4) makeSession("classroom", 21 + i * 4 + (course.id % 5), v);
    });
  }
  if (course.methods.includes("live-online") || course.methods.includes("on-demand")) {
    for (let i = 0; i < 5; i++) makeSession("online", i * 7 + (course.id % 6), null);
  }
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));

  // rating breakdown that always totals 100
  const p5 = Math.round((course.rating - 3.4) * 50);
  const p4 = Math.round((100 - p5) * 0.6);
  const p3 = Math.round((100 - p5 - p4) * 0.5);
  const p2 = Math.round((100 - p5 - p4 - p3) * 0.5);
  const ratingBreakdown = { 5: p5, 4: p4, 3: p3, 2: p2, 1: 100 - p5 - p4 - p3 - p2 };

  const reviews = reviewDates.map((date, i) => {
    const [name, title, body] = reviewPool[(course.id + i) % reviewPool.length];
    return { name, date, rating: i === 3 || i === 5 ? 4 : 5, title, body, helpfulCount: ((course.id * 3 + i * 7) % 18) + 1 };
  });

  const delivery = course.methods.map((m) => (m === "classroom" ? "classroom" : m === "live-online" ? "live online" : "on demand")).join(", ");
  const faqs = [
    { question: "How long does this course take?", answer: `The course takes ${course.duration.toLowerCase()}. Exact start and finish times are shown against each date.` },
    { question: "What certificate will I receive?", answer: `You receive a ${info.qual.toLowerCase()} on completion. Certificate validity: ${course.validity.toLowerCase()}.` },
    { question: "How is this course delivered?", answer: `This course is available as ${delivery}. Choose your preferred option when you book.` },
    { question: "Can I change or cancel my booking?", answer: "You can move your booking to another date free of charge up to 7 days before the course starts. Cancellations follow the provider's refund policy." },
    { question: "Can I book for my team?", answer: "Yes. Use the group quote link in the booking panel and we will arrange dates, venues and pricing for your team." },
  ];

  const paragraphs = [
    course.description || `${course.title} gives you the knowledge and practical skills to work confidently and meet industry requirements.`,
    `This ${levelWord}-level course is delivered as ${delivery} by approved training providers across the UK. You will work through ${modules.length} modules, complete an assessment and receive your certificate on successful completion.`,
    `Choose a date and location that suits you. ${course.providers} providers run this course, so there is usually a session close to you.`,
    "Course materials, assessment fees and your certificate are included in the price. Joining instructions are emailed as soon as your booking is confirmed.",
  ];

  // ---- selling content (added for testing) ----
  const years = (/(\d+)\s*year/i.exec(course.validity) || [])[1];
  const validityYears = years ? Number(years) : null;
  const examSubjects = ["security", "first-aid", "construction", "health-and-safety"];
  const features = course.id % 7 === 0 ? [] : (examSubjects.includes(course.subject)
    ? ["Unlimited exam resits", "Same day results", "Quicker certification", "Approved courses"]
    : ["Certificate on completion", "Approved providers only"]).concat(course.methods.includes("on-demand") ? ["Study at your own pace"] : []).slice(0, 5);
  const assessment = course.id % 11 === 0 ? undefined : {
    format: course.subject === "first-aid" ? "Practical assessment" : course.subject === "security" ? "Multiple-choice exam and practical" : "Multiple-choice exam",
    questions: course.id % 5 === 0 ? undefined : 20 + (course.id % 4) * 10,
    passMark: course.id % 5 === 0 ? undefined : "70%",
    duration: hours <= 3 ? "45 minutes" : "1 hour",
    openBook: course.level === "advance" ? "Open book" : "Closed book",
    resits: "One free resit within 28 days",
  };
  const certificate = {
    name: `${course.title} certificate`,
    validityYears,
    validityText: validityYears ? `${validityYears} years` : /lifetime/i.test(course.validity) ? "Lifetime" : undefined,
    renewal: validityYears ? "Retake the course or its refresher before the certificate expires." : undefined,
  };
  const funding = course.subject === "construction" ? { text: "This course may be eligible for a CITB grant.", href: "/template/help-center" } : undefined;
  const extras = examSubjects.includes(course.subject)
    ? [{ title: "Free test prep book", note: "450+ practice questions and answers", price: 0, url: "/template/shop" }, { title: "Free mock tests", note: "15+ mock tests, over 1000 questions", price: 0, url: "/template/shop" }].slice(0, course.id % 3 === 0 ? 1 : 2)
    : [];
  const inHouse = (course.methods.includes("classroom") || course.methods.includes("live-online")) && course.id % 6 !== 0;
  // Only facts the site really supports are true: Klarna instalments are offered on the live site; there is no Trustpilot data, so that stays empty.
  const trust = { noBookingFee: true, approvedProviders: true, invoice: course.subject !== "lifestyle", instalments: true, trustpilot: null };

  const workItems = {
    security: [["Hospitality", "Bars, clubs, pubs and hotels."], ["Retail", "Shopping centres and stores."], ["Events", "Concerts, festivals and exhibitions."], ["Corporate", "Offices and private functions."]],
    "first-aid": [["Workplaces", "Offices, factories and shops."], ["Education", "Schools, nurseries and colleges."], ["Sport and leisure", "Gyms, clubs and activity centres."], ["Community", "Voluntary groups and events."]],
    construction: [["Building sites", "Labouring and site support roles."], ["Civil engineering", "Roads, rail and utilities projects."], ["Maintenance", "Property and facilities teams."], ["Contracting", "Sub-contractor and self-employed work."]],
    "health-and-safety": [["Industry", "Manufacturing and logistics."], ["Public sector", "Councils, schools and the NHS."], ["Offices", "Safety representative and coordinator roles."], ["Consultancy", "Advisory and auditing work."]],
    "health-and-care": [["Care homes", "Residential and nursing care."], ["Community care", "Domiciliary and supported living."], ["Hospitals", "Support worker roles."], ["Charities", "Voluntary and third sector care."]],
    hospitality: [["Restaurants and cafes", "Kitchen and front-of-house roles."], ["Hotels", "Catering and food service teams."], ["Pubs and bars", "Licensed premises management."], ["Events", "Catering and venue staff."]],
  }[course.subject];
  const workAreas = workItems ? { title: "Where can I work with this qualification?", intro: "This qualification is recognised across a range of sectors, including:", items: workItems } : undefined;
  const requirements = { title: `Entry requirements for the ${course.title}`, paragraphs: [], list: entry };
  const examRows = assessment && assessment.passMark ? modules.slice(0, -1).map((m) => ({ unit: m.title, passMark: assessment.passMark, duration: `${assessment.duration === "1 hour" ? 30 : 20} minutes` })) : [];
  const exams = examRows.length ? {
    title: "How will I be assessed?",
    intro: [`You will be assessed through a ${assessment.format.toLowerCase()}. The table below shows the pass mark and time allowed for each assessment.`],
    rows: examRows,
    outro: [assessment.resits],
  } : undefined;
  const popularMode = course.methods.includes("classroom") ? "classroom" : "online";
  const reviewsWithOrg = reviews.map((r, i) => ({ ...r, org: providerPool[(course.id + i) % providerPool.length].split(" ").map((w) => w[0]).join("").slice(0, 4) }));

  const relatedSlugs = catalogueCourses
    .filter((x) => x.id !== course.id)
    .sort((a, b) => (b.subject === course.subject) - (a.subject === course.subject) || b.popularity - a.popularity)
    .slice(0, 3)
    .map((x) => x.slug);

  return {
    ...course,
    summary: course.description || `Practical ${levelWord}-level training from approved UK providers.`,
    badge: course.popularity >= 1900 ? "Best seller" : course.addedAt >= "2026-09-23" ? "New" : "",
    learnerCount: course.popularity * 6 + 140,
    reviewCount: course.popularity,
    updatedAt: `2026-09-${String(((course.id * 5) % 20) + 5).padStart(2, "0")}`,
    deliveryModes: [...new Set(course.methods.map((m) => (m === "classroom" ? "classroom" : "online")))],
    certificateValidity: course.validity,
    qualification: info.qual,
    providerCount: course.providers,
    description: paragraphs,
    audience: info.aud,
    entryRequirements: entry,
    learningOutcomes: outcomes,
    modules,
    sessions,
    ratingBreakdown,
    reviews: reviewsWithOrg,
    faqs,
    relatedSlugs,
    features, assessment, certificate, funding, extras, inHouse, trust,
    workAreas, requirements, exams, popularMode,
    ...(courseOverrides[course.id] || {}),
  };
}
