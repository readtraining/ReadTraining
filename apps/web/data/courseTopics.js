// The courses a marketing or help page shows are picked by where they sit in the catalogue list (admin › Catalogue settings),
// never by fixed course numbers: "category/sub-category/topic" (sub-category and topic can be left off). The page shows the live
// courses filed there, most popular first (lib/catalogueData.js pickCourses), and nothing when there are none yet.
export const TOPICS = {
  doorSupervisor: "security/sia-licence-training/door-supervisor",
  securityOfficer: "security/sia-licence-training/security-officer",
  cctv: "security/sia-licence-training/cctv-operator",
  closeProtection: "security/sia-licence-training/close-protection",
  doorTopUp: "security/sia-top-up/door-supervisor-top-up",
  securityTopUp: "security/sia-top-up/security-officer-top-up",
  conflict: "security/conflict-management",
  efaw: "first-aid/workplace-first-aid/emergency-first-aid-at-work",
  faw: "first-aid/workplace-first-aid/first-aid-at-work",
  paediatric: "first-aid/paediatric-first-aid",
  mentalHealth: "first-aid/mental-health-first-aid",
  cscsGreen: "construction/cscs-cards/labourer",
  smsts: "construction/site-safety/citb-smsts",
  sssts: "construction/site-safety/citb-sssts",
  trafficMarshal: "construction/site-safety/traffic-marshal",
  asbestos: "construction/site-safety/asbestos-awareness",
  ioshManagingSafely: "health-and-safety/iosh-and-nebosh/iosh-managing-safely",
  nebosh: "health-and-safety/iosh-and-nebosh/nebosh-general-certificate",
  manualHandling: "health-and-safety/manual-handling",
  fireMarshal: "health-and-safety/fire-safety/fire-marshal",
  foodHygiene2: "hospitality/food-safety/level-2-food-hygiene",
  foodHygiene3: "hospitality/food-safety/level-3-food-hygiene",
  personalLicence: "hospitality/licensing/aplh",
  aet: "teaching-and-academics/teaching-qualifications/level-3-award-in-education-and-training",
};

// A link that searches the courses for some words, for a button or menu link about a kind of course ("Door Supervisor").
export const courseSearch = (words) => `/courses?q=${encodeURIComponent(words)}`;
