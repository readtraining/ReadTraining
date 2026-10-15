import { AUTH_ROUTES, CATALOGUE_HREF } from "@/lib/routes";
import { SKILL_SAVER_LEVELS } from "@/lib/skillSaver";

// Skill Saver Programme for learners (/skill-saver, the footer's For providers > Skill Saver Programme). Functions from the
// client's current page (hurak.com/skill-saver): three levels (sign in; 3 completed courses in 1 year; 5 in 2 years), the
// discount applied automatically on courses with the Skill Saver badge, levels kept for life, cancelled courses not counting.
// The layout and wording are ours; the levels' numbers come from lib/skillSaver.js (shared with /provider-skill-saver).
// Not copied: the client's hero line "free lifetime access to Level 3 rewards", which contradicts its own level rules.

const [L1, L2, L3] = SKILL_SAVER_LEVELS;
const SIGN_UP = { label: "Create a free account", href: AUTH_ROUTES.signUp };
const YOUR_LEVEL = { label: "See your level", href: "#rt-sv-progress" }; // signed-in visitors already have an account
export const SKILL_SAVER_PATH = "/skill-saver";

export const skillSaverLearner = {
  title: "Skill Saver Programme | ReadTraining",
  description: `Skill Saver is ReadTraining's free loyalty programme. Sign in for up to ${L1.discount}% off, then complete courses to reach ${L2.discount}% and ${L3.discount}% off. Levels are kept for life.`,
  hero: {
    eyebrow: "Skill Saver Programme",
    title: "Learn more. Pay less.",
    text: "Skill Saver is our free loyalty programme for learners. Sign in to start at Level 1, complete courses to move up, and your discount comes off automatically when you book a Skill Saver course.",
    primary: SIGN_UP,
    secondary: { label: "See the levels", href: "#rt-sv-levels" },
    signedIn: [{ label: "Find a course", href: CATALOGUE_HREF }, YOUR_LEVEL], // the hero's buttons for someone signed in
    points: ["Free to join", "Levels kept for life", "No codes to enter"],
    float: { title: "Discount applied", text: `Level 2 · ${L2.discount}% off` },
    example: { frame: "Example learner · Skill Saver", name: "Sam", level: 2, have: 4 },
  },
  steps: {
    eyebrow: "How it works",
    title: "Savings made simple.",
    text: "There are no codes to remember. Your level does the work every time you book.",
    steps: [
      { title: "Sign in", text: "Create a free account or log in. You are at Level 1 straight away.", icon: "icon-person-2" },
      { title: "Look for the badge", text: "Courses with the Skill Saver badge include your level discount.", icon: "icon-star" },
      { title: "Book as normal", text: "Your discount is taken off automatically when you book.", icon: "icon-basket" },
      { title: "Complete and level up", text: "Every course you complete counts towards your next level.", icon: "icon-check" },
    ],
  },
  levels: {
    eyebrow: "The levels",
    title: "Three levels. Yours for life.",
    text: "Every course you complete moves you closer to the next level. Once you reach a level, you keep it.",
    cta: { label: "Find a course", href: CATALOGUE_HREF },
  },
  progress: {
    eyebrow: "Your level",
    title: "See where you stand.",
    text: "Your level, your discount and how many courses until the next one, all in one place.",
    rules: [
      "Only completed courses count towards a level",
      "Cancelled courses do not count",
      "Discounts apply to courses with the Skill Saver badge",
      "You keep a level once you reach it",
    ],
    frame: "Your Skill Saver level",
    signedOut: {
      title: "Sign in to see your level",
      text: `New to ReadTraining? Creating a free account puts you at Level 1, with up to ${L1.discount}% off Skill Saver courses.`,
      login: { label: "Log in", href: `${AUTH_ROUTES.login}?next=${SKILL_SAVER_PATH}` },
      signUp: SIGN_UP,
    },
    learning: { label: "See my learning", href: "/account/learning" },
    find: { label: "Find a Skill Saver course", href: CATALOGUE_HREF },
  },
  faq: {
    eyebrow: "Questions learners ask",
    title: "Skill Saver questions.",
    items: [
      { q: "How do I claim my discount?", a: "You don't need to do anything. When you book a course with the Skill Saver badge, the discount for your level is taken off automatically." },
      { q: "How many levels are there?", a: `Three. Level 1 when you sign in (up to ${L1.discount}% off), Level 2 when you complete ${L2.courses} courses in ${L2.years} year (${L2.discount}% off) and Level 3 when you complete ${L3.courses} courses in ${L3.years} years (${L3.discount}% off).` },
      { q: "Can I lose my level?", a: "No. Once you reach a level, you keep it for life." },
      { q: "What if I cancel a course?", a: "Cancelled courses don't count. A course counts towards your level once you have completed it." },
      { q: "Does it cost anything?", a: "No. Skill Saver is free to join, and ReadTraining pays for the discount, so the course provider's price stays the same." },
    ],
  },
  cta: {
    title: "Start saving on your next course.",
    text: `Your discount comes off automatically on every Skill Saver course. New here? A free account starts you at Level 1, with up to ${L1.discount}% off.`,
    primary: { label: "Find a course", href: CATALOGUE_HREF },
    secondary: YOUR_LEVEL,
  },
};
