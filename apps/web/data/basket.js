import { CATALOGUE_HREF, CHECKOUT_HREF } from "@/lib/routes";
import { TOPICS } from "@/data/courseTopics";
// The course basket (/basket). The flow and the rules follow the client's current site (Select bundle >
// Review basket > Pay securely, the package chosen with a date sold in packages, the first-aid rule for security courses, the
// delegates counter and the promo code). Our own wording and layout. Draft until confirmed: the first-aid add-on price and the
// demo promo code (there is no backend for either yet).

export const basket = {
  title: "Your basket",
  steps: ["Choose a date", "Review basket", "Pay securely"], // the basket is the second
  packageStep: "Choose your package", // the first step's name when a course in the booking comes in packages (lib/basket.js bookingSteps)
  continueLink: { label: "Continue browsing", href: CATALOGUE_HREF },
  checkout: { label: "Proceed to payment", href: CHECKOUT_HREF },
  // what the customer can rely on today (instalments and free date changes come with online payment, Milestone 4)
  trust: ["No booking fee", "Approved providers only"],
  empty: { title: "Your basket is empty", text: "Find a course, choose a date and add it to your basket.", cta: { label: "Find courses", href: CATALOGUE_HREF } },
  recommended: { eyebrow: "More to consider", title: "You might also like" },
  noDate: "No date chosen yet.",
  // a date sold in packages (a provider's price plan): the package chosen, and choosing or changing it
  package: { label: "Package", change: "Change package", choose: "Choose a package", none: "This date comes in packages. Choose one to continue." },
  chooseDate: "Choose a date",
  edit: "Edit", // a line's pencil button: a menu of what it can change (components/basket/BasketLine.jsx)
  remove: "Remove", // a line's bin button
  changeDate: "Change date",
  dateChanged: "Date changed to {date}, {place}.",
  // the tick boxes: pay for the ticked courses, keep the rest in the basket (as Amazon's basket does)
  select: { all: "Select all", count: "{n} of {total} selected", none: "Select at least one course to continue", off: "Not in this booking. It stays in your basket.", include: "Include {title} in this booking" },


  // security licence courses need a first aid qualification: the learner says whether they have one (no price is added here:
  // first aid is its own course, from whichever provider, or part of a provider's package that includes it). Asked after the date
  // and package (components/courseDetail/PackageChooser.jsx), on the classroom courses whose SIA licence or renewal needs
  // Emergency First Aid at Work: Door Supervisor, Security Officer and their refreshers (not CCTV, which doesn't, nor Close
  // Protection, which needs a higher first aid qualification than Emergency First Aid at Work)
  firstAid: {
    picks: [TOPICS.doorSupervisor, TOPICS.securityOfficer, TOPICS.doorRefresher, TOPICS.securityRefresher],
    badge: "Required for your SIA licence",
    title: "First aid qualification required",
    text: "To get your SIA licence you must hold an Emergency First Aid at Work qualification (or higher).",
    needText: "No certificate yet? Take Emergency First Aid at Work, a 1-day course, before this course starts.",
    findCourse: "Find Emergency First Aid at Work",
    haveTitle: "Already have a first aid certificate?",
    haveRules: ["Bring the original certificate to your course", "It must have been taken in person (online courses aren't accepted)", "It must stay valid for at least 12 months after your course starts"],
    pick: "Choose one to continue",
    have: { label: "I already have a valid first aid certificate", note: "Bring the original certificate. It must have been taken in person and stay valid for at least 12 months after your course.", short: "You have a valid first aid certificate (bring the original)" },
    need: { label: "I still need one", note: "Take Emergency First Aid at Work before this course starts.", short: "You still need a first aid certificate: take Emergency First Aid at Work before this course starts." },
    change: "Change first aid answer", // Edit menu: asks the question again
  },

  promo: {
    prompt: "Have a promo code?",
    apply: "Apply",
    invalid: "That code is not valid.",
    codes: { READ10: { percent: 10, label: "10% off" } }, // demo code until there is a backend
  },
  // Skill Saver (/skill-saver): the signed-in learner's level discount on Skill Saver courses, before any promo code
  skillSaver: {
    line: "Skill Saver Level {level} · {percent}% off",
    signIn: { link: "Log in", after: " to get your Skill Saver discount on courses with the badge.", href: "/login?next=/basket" },
  },
};
