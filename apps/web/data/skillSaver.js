import { SKILL_SAVER_LEVELS } from "@/lib/skillSaver";

// Provider Skill Saver (/provider-skill-saver). The programme's rules come from the client's current site: the learner levels
// and thresholds (hurak.com/provider-loyalty-page and /skill-saver), levels kept for life and cancelled courses not counting
// (/skill-saver FAQs), and the discount being funded by the marketplace reducing its commission (provider terms, section 2).
// The layout and wording are ours. Draft until confirmed: the expected averages and the learner behaviour figures (the client
// gives them without a source) and the opt-out answer (the client's FAQ asks it but publishes no answer).

const JOIN = { label: "Join Skill Saver", href: "/for-providers#become-provider" }; // the provider sign-up pop-up
// the levels' numbers come from lib/skillSaver.js, shared with the learner page (/skill-saver)
const [L1, L2, L3] = SKILL_SAVER_LEVELS;
const pct = (l) => `${l.discount}%`;

export const skillSaver = {
  title: "Provider Skill Saver | ReadTraining for training providers",
  description: "Skill Saver puts your courses in front of loyal ReadTraining learners. Discounts are applied automatically and funded from our commission, so your price stays the same.",
  hero: {
    eyebrow: "Provider Skill Saver",
    title: "Reach learners who keep coming back.",
    text: "Skill Saver is our loyalty programme for training providers. Your courses carry the Skill Saver badge, loyal learners get a discount for their level, and we fund it from our commission.",
    primary: JOIN,
    secondary: { label: "See the learner levels", href: "#rt-ss-levels" },
    points: ["Free to join", "Discount funded from our commission", "Applied automatically"],
    listing: {
      frame: "Course listing · Learner view",
      course: "Door Supervisor Course",
      meta: "Northstar Training · Classroom · London",
      badge: "Skill Saver",
      price: 240,
      level: 2,
      foot: { title: "Your payout", text: "Worked out on your full listed price" },
    },
  },
  steps: {
    eyebrow: "How it works",
    title: "Four steps. No extra admin.",
    text: "Join once and Skill Saver runs on its own. Learners see their discount at checkout and you are paid as normal.",
    steps: [
      { title: "Join the programme", text: "Sign up or log in, then join Skill Saver from your provider account.", icon: "icon-person-2" },
      { title: "Get the badge", text: "Your eligible courses carry the Skill Saver badge across the marketplace.", icon: "icon-star" },
      { title: "Learners save", text: "A learner's level discount is applied automatically when they book.", icon: "icon-basket" },
      { title: "You're paid as normal", text: "We fund the discount from our commission, so your price stays the same.", icon: "icon-check" },
    ],
  },
  levels: {
    eyebrow: "Learner levels",
    title: "Meet your Skill Savers.",
    text: "Learners move up a level as they complete courses on ReadTraining. The higher the level, the bigger their discount and the more loyal they are.",
    points: ["Only completed courses count towards a level", "Learners keep their level for life", "The discount is set by the level, not by you"],
    frame: "Skill Saver levels",
    items: [
      { level: 1, discount: pct(L1), upTo: true, who: "Every learner with a ReadTraining account", note: "The starting level. Learners join it as soon as they sign in.", stats: [] },
      {
        level: 2, discount: pct(L2), who: `Learners who have completed ${L2.courses} courses in ${L2.years} year`,
        stats: [{ label: "Less likely to cancel", value: 10 }, { label: "More likely to leave a review", value: 20 }],
      },
      {
        level: 3, discount: pct(L3), who: `Learners who have completed ${L3.courses} courses in ${L3.years} years`, note: "The most likely to book a Skill Saver course.",
        stats: [{ label: "Less likely to cancel", value: 25 }, { label: "More likely to leave a review", value: 40 }, { label: "More likely to share a good experience", value: 70 }],
      },
    ],
  },
  funding: {
    eyebrow: "Who pays the discount",
    title: "Your price stays. Your payout stays.",
    text: "When a Skill Saver learner books, ReadTraining funds their discount by reducing its own commission. You list your normal price and it counts in full.",
    points: [
      { title: "We fund it", text: "The discount comes out of our commission, not your course fee." },
      { title: "It's automatic", text: "Learners see their level price at checkout. There is nothing to set up per booking." },
      { title: "Paid as usual", text: "Your payout is worked out on your full listed price and paid on the 28th." },
    ],
    cta: JOIN,
    example: { label: "One booking, three learners", course: "Door Supervisor Course", price: 240, discounts: SKILL_SAVER_LEVELS.map((l) => l.discount), note: "Standard marketplace fee and transaction charges apply as on any booking." },
  },
  results: {
    eyebrow: "Results",
    title: "What partners can expect.",
    text: "On average, we expect Skill Saver partners to see:",
    items: [
      { value: "60%", label: "More search views" },
      { value: "40%", label: "More bookings" },
      { value: "35%", label: "More revenue" },
    ],
  },
  faq: {
    eyebrow: "Questions providers ask",
    title: "Skill Saver questions.",
    items: [
      { q: "How do I join Skill Saver?", a: "Select Join Skill Saver, then sign up or log in to your provider account. Once you have joined, your eligible courses carry the Skill Saver badge." },
      { q: "Who pays for the learner's discount?", a: "We do. ReadTraining funds Skill Saver discounts by reducing its own commission, so the price you list counts in full." },
      { q: "Can I choose the amount my course is discounted by?", a: `No. The discount is set by the learner's level: up to ${pct(L1)} at Level 1, ${pct(L2)} at Level 2 and ${pct(L3)} at Level 3. It is applied automatically at checkout.` },
      { q: "How does a learner reach a higher level?", a: `By completing courses: ${L2.courses} courses in ${L2.years} year for Level 2 and ${L3.courses} courses in ${L3.years} years for Level 3. Cancelled courses do not count, and learners keep a level once they reach it.` },
      { q: "Can I opt out if I change my mind?", a: "Yes. Contact us and we will take the Skill Saver badge off your courses." },
    ],
  },
  cta: {
    title: "Ready to reach loyal learners?",
    text: "Join Skill Saver and put your courses in front of learners who book again and again.",
    primary: JOIN,
    secondary: { label: "Talk to us", href: "/contact-us" },
  },
};
