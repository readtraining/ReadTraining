import { CATALOGUE_HREF, CHECKOUT_HREF } from "@/lib/routes";
import { TOPICS } from "@/data/courseTopics";
// The course basket (/basket). The flow and the rules follow the client's current site (hurak.com: Select bundle >
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
  changeDate: "Change date",
  dateChanged: "Date changed to {date}, {place}.",
  // the tick boxes: pay for the ticked courses, keep the rest in the basket (as Amazon's basket does)
  select: { all: "Select all", count: "{n} of {total} selected", none: "Select at least one course to continue", off: "Not in this booking. It stays in your basket.", include: "Include {title} in this booking" },


  // security licence courses need a first aid qualification: the learner confirms they have one or adds the course
  // asked after the date and package (components/courseDetail/PackageChooser.jsx), on the classroom courses whose SIA licence or
  // renewal needs Emergency First Aid at Work: Door Supervisor, Security Officer and their top-ups (not CCTV, which doesn't, nor
  // Close Protection, which needs a higher first aid qualification than this add-on)
  firstAid: {
    picks: [TOPICS.doorSupervisor, TOPICS.securityOfficer, TOPICS.doorTopUp, TOPICS.securityTopUp],
    badge: "Required for your SIA licence",
    title: "First aid qualification required",
    text: "To get your SIA licence you must hold an Emergency First Aid at Work qualification (or higher).",
    addText: "For {price}, you can add Emergency First Aid at Work and complete it as part of your course, with no extra training days. You also get a separate first aid certificate.",
    haveTitle: "Already have a first aid certificate?",
    haveRules: ["Bring the original certificate to your course", "It must have been taken in person (online courses aren't accepted)", "It must stay valid for at least 12 months after your course starts"],
    pick: "Choose one to continue",
    addButton: "Add first aid for {price}",
    have: { label: "I already have a valid first aid certificate", note: "Bring the original certificate. It must have been taken in person and stay valid for at least 12 months after your course.", short: "You have a valid first aid certificate (bring the original)" },
    // the client's own price: "Course + first aid" is £70 more than the course alone (data/courseGuides.js packages)
    add: { label: "Add Emergency First Aid at Work", note: "Completed as part of your course, with no extra training days. You also get a separate certificate.", price: 70, short: "Emergency First Aid at Work added" },
    change: "Change",
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
