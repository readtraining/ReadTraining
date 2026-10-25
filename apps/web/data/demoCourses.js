import { courseSearch } from "@/data/courseTopics";

// Made-up courses for the DEMO records only: the learner's and business account's bookings, certificates and results, and the
// admin's demo pages (sessions, certificates, reports, reviews). They are not on the public site: a link from a demo record opens
// the course search for the course's name. They go when those records come from real bookings (Milestone 4).
// `days`: its length; `price`: a place, in pounds; `city`: where its classroom dates are ("" online only).
export const demoCourses = [
  { id: 1, title: "SIA Door Supervisor Training", category: "Security", methods: ["classroom"], city: "London", days: 6, price: 198.99, validity: "SIA licence-linked" },
  { id: 2, title: "SIA Security Guard Training", category: "Security", methods: ["classroom"], city: "London", days: 5, price: 179.99, validity: "SIA licence-linked" },
  { id: 3, title: "SIA CCTV Operator Training", category: "Security", methods: ["classroom","live-online"], city: "Manchester", days: 3, price: 169.99, validity: "SIA licence-linked" },
  { id: 4, title: "Close Protection Training", category: "Security", methods: ["classroom"], city: "London", days: 14, price: 1295, validity: "SIA licence-linked" },
  { id: 5, title: "Emergency First Aid at Work", category: "First Aid", methods: ["classroom","live-online"], city: "London", days: 1, price: 63.2, validity: "Valid 3 years" },
  { id: 6, title: "First Aid at Work (3 Days)", category: "First Aid", methods: ["classroom"], city: "London", days: 3, price: 159.99, validity: "Valid 3 years" },
  { id: 7, title: "Paediatric First Aid (2 Days)", category: "First Aid", methods: ["classroom","live-online"], city: "London", days: 2, price: 94.5, validity: "Valid 3 years" },
  { id: 9, title: "CSCS Green Card Course", category: "Construction", methods: ["classroom","live-online","self-paced"], city: "London", days: 1, price: 89.99, validity: "CSCS-approved route" },
  { id: 10, title: "CITB SMSTS Course", category: "Construction", methods: ["classroom"], city: "London", days: 5, price: 449, validity: "Valid 5 years" },
  { id: 11, title: "CITB SSSTS Course", category: "Construction", methods: ["classroom","live-online"], city: "Birmingham", days: 2, price: 229, validity: "Valid 5 years" },
  { id: 12, title: "Traffic Marshal (Banksman) Course", category: "Construction", methods: ["classroom"], city: "London", days: 1, price: 79, validity: "Valid 3 years" },
  { id: 13, title: "IOSH Managing Safely", category: "Health and Safety", methods: ["classroom","live-online","self-paced"], city: "London", days: 4, price: 295, validity: "Lifetime" },
  { id: 14, title: "NEBOSH National General Certificate", category: "Health and Safety", methods: ["classroom","live-online","self-paced"], city: "London", days: 10, price: 695, validity: "Lifetime" },
  { id: 15, title: "Manual Handling Training", category: "Health and Safety", methods: ["live-online","self-paced"], city: "", days: 1, price: 24.99, validity: "Valid 3 years" },
  { id: 16, title: "Fire Marshal Training", category: "Health and Safety", methods: ["classroom","live-online","self-paced"], city: "Manchester", days: 1, price: 29.99, validity: "Valid 3 years" },
  { id: 20, title: "Level 2 Food Hygiene", category: "Hospitality", methods: ["live-online","self-paced"], city: "", days: 1, price: 19.99, validity: "Valid 3 years" },
  { id: 21, title: "Personal Licence (APLH)", category: "Hospitality", methods: ["classroom","live-online"], city: "London", days: 1, price: 99, validity: "Lifetime" },
  { id: 23, title: "Level 3 Award in Education and Training (AET)", category: "Teaching & Academics", methods: ["classroom","live-online"], city: "London", days: 5, price: 389, validity: "Lifetime" },
  { id: 26, title: "Project Management Fundamentals", category: "Business", methods: ["classroom","live-online","self-paced"], city: "London", days: 2, price: 295, validity: "Certificate included" },
  { id: 46, title: "Door Supervisor Refresher", category: "Security", methods: ["classroom"], city: "London", days: 2, price: 99, validity: "Renews SIA licence" },
];

const byId = new Map(demoCourses.map((c) => [c.id, c]));
export const demoCourse = (id) => byId.get(Number(id)) || null;
// the picture the demo records show (the template's sample course cards)
export const demoCourseImage = (id) => `/assets/img/coursesCards/${((Number(id) - 1) % 12) + 1}.png`;
// where a demo record's course link goes: the course search for its name
export const demoCourseHref = (id) => courseSearch(demoCourse(id)?.title || "");
