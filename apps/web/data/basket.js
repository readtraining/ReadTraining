// The course basket (/basket). The flow and the rules follow the client's current site (hurak.com: Select bundle >
// Review basket > Pay securely, a package per course, the first-aid rule for security courses, the delegates counter and the
// promo code). Our own wording and layout. Draft until confirmed: the package prices and terms, the first-aid add-on price and
// the demo promo code (there is no backend for any of them yet).

export const basket = {
  title: "Your basket",
  steps: ["Choose a date", "Review basket", "Pay securely"], // the basket is the second
  continueLink: { label: "Continue browsing", href: "/courses" },
  checkout: { label: "Proceed to payment", href: "/checkout" },
  instalments: "Pay in 3 interest-free instalments with Klarna",
  // what the customer can rely on, taken from the course page's booking card and FAQs
  trust: ["No booking fee", "Approved providers only", "Move to another date free of charge up to 7 days before"],
  empty: { title: "Your basket is empty", text: "Find a course, choose a date and add it to your basket.", cta: { label: "Find courses", href: "/courses" } },
  recommended: { eyebrow: "More to consider", title: "You might also like" },
  noDate: "No date chosen yet.",
  chooseDate: "Choose a date",
  changeDate: "Change date",
  dateChanged: "Date changed to {date}, {place}.",
  // the tick boxes: pay for the ticked courses, keep the rest in the basket (as Amazon's basket does)
  select: { all: "Select all", count: "{n} of {total} selected", none: "Select at least one course to continue", off: "Not in this booking. It stays in your basket.", include: "Include {title} in this booking" },

  // a package per classroom security course: the same course, with the terms the learner wants
  packages: {
    subjects: ["security"],
    title: "Choose your package",
    items: [
      { key: "saver", name: "Saver", price: 0, terms: [["Rescheduling", "£170 fee"], ["Exam resits", "£100 per resit"], ["Results", "7 to 10 working days"]] },
      { key: "flexi", name: "Flexi", price: 70, badge: "Most flexible", terms: [["Rescheduling", "Free up to 72 hours before"], ["Exam resits", "Unlimited until you pass"], ["Results", "Same day"]] },
    ],
  },

  // security licence courses need a first aid qualification: the learner confirms they have one or adds the course
  firstAid: {
    subjects: ["security"],
    title: "First aid qualification required",
    text: "To get your SIA licence you must hold an Emergency First Aid at Work qualification (or higher).",
    have: { label: "I already have a valid first aid certificate", note: "Bring the original certificate. It must have been taken in person and stay valid for at least 12 months after your course." },
    add: { label: "Add Emergency First Aid at Work", note: "Completed as part of your course, with no extra training days. You also get a separate certificate.", price: 89, wasPrice: 149 },
  },

  promo: {
    prompt: "Have a promo code?",
    apply: "Apply",
    invalid: "That code is not valid.",
    codes: { READ10: { percent: 10, label: "10% off" } }, // demo code until there is a backend
  },
};
