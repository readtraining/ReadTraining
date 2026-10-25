import { CATALOGUE_HREF } from "@/lib/routes";
// The customer account (/account): dashboard, bookings (history, details, cancellation request), saved courses and profile.
// Structured as the large booking sites do it and as Baymard's account research recommends: a short menu of a few clear pages,
// the next booking first, and every booking task (details, receipt, change of date, cancellation) one step from the booking.
// Hurak's own account sits behind its log-in ("Access your courses, bookings, and dashboard"); the wording here is ours.
// The demo profile and bookings are dummy data until accounts exist (see lib/account.js); bookings made at checkout are real ones.

export const account = {
  title: "My account",
  // the client's account menu (hurak.com: My learning, Payment methods, User wallet, Purchase history, Account setting), plus our
  // dashboard and saved courses
  nav: [
    { key: "dashboard", label: "Dashboard", href: "/account", icon: "icon-bar-chart-2" },
    { key: "learning", label: "My learning", href: "/account/learning", icon: "icon-online-learning" },
    { key: "purchases", label: "Purchase history", href: "/account/purchases", icon: "icon-document" },
    { key: "payments", label: "Payment methods", href: "/account/payment-methods", icon: "icon-badge" },
    { key: "wallet", label: "Wallet", href: "/account/wallet", icon: "icon-basket" },
    { key: "saved", label: "Saved courses", href: "/account/saved", icon: "icon-bookmark" },
    { key: "settings", label: "Account settings", href: "/account/settings", icon: "icon-setting" },
  ],
  signOut: "Sign out",
  // Switch account (Hurak's): the identities on this login, the current one marked, and how to add the ones missing
  switchAccount: {
    title: "Switch account",
    current: "Current",
    student: { label: "Student account", sub: "My learning and bookings", href: "/account" },
    provider: { sub: "Provider account", href: "/provider" },
    business: { sub: "Business account", href: "/business" },
    becomeProvider: { label: "Become a provider", sub: "List and run your courses", href: "/provider/onboarding" },
    createBusiness: { label: "Create a business account", sub: "Buy and manage team training", href: "/business/create" },
  },
  noAccess: {
    back: "Go to my account",
    provider: {
      eyebrow: "Provider workspace",
      title: "This page is for training providers",
      heading: "You don't have a provider account yet",
      text: "Provider pages are only open to people who run a training provider on ReadTraining. Add a provider account to your login to list and run your courses.",
      cta: { label: "Become a provider", href: "/provider/onboarding" },
    },
    // someone whose provider application was not approved: the team's reason, and applying again reopens it
    providerRejected: {
      eyebrow: "Provider workspace",
      title: "Your provider application",
      heading: "Your application for {name} wasn't approved",
      reason: "Our team's reason:",
      text: "You can apply again with updated details, and our team will review it.",
      cta: { label: "Apply again", href: "/provider/onboarding" },
    },
    business: {
      eyebrow: "Business account",
      title: "This page is for business accounts",
      heading: "You don't have a business account yet",
      text: "Business pages are only open to members of a business account. Create one to buy training for your team and manage it in one place.",
      cta: { label: "Create a business account", href: "/business/create" },
    },
    unavailable: {
      eyebrow: "Something went wrong",
      title: "We couldn't open this page",
      heading: "We couldn't check your access",
      text: "This is usually brief. Please try again in a moment.",
      cta: null,
      retry: "Try again",
    },
  },

  dashboard: {
    greeting: "Hello, {name}",
    lead: "Your courses, bookings and certificates in one place.",
    next: { title: "Your next course", none: "You have no upcoming courses.", cta: { label: "Find a course", href: CATALOGUE_HREF } },
    // the page head's main button
    action: { label: "Find a course", href: CATALOGUE_HREF },
    // each number links to its page, with a short line saying what it means
    stats: {
      upcoming: { label: "Upcoming courses", hint: (next) => (next ? `Next on ${next}` : "Nothing booked yet") },
      completed: { label: "Completed courses", hint: "See them in My learning" },
      certificates: { label: "Certificates", hint: (renew) => (renew ? `${renew} to renew soon` : "All up to date") },
      saved: { label: "Saved courses", hint: (n) => (n ? "Ready to compare" : "Tap the heart on a course") },
    },
    // the courses after the next one (the next one has its own card above)
    upcoming: { title: "Also coming up", all: "View my learning" },
    certificates: { title: "Certificates and renewals", text: "Your training provider issues certificates after the course. Renew before the expiry date to stay qualified.", renew: "Renew", none: "Certificates from completed courses show here." },
    help: {
      title: "Need to change something?",
      items: [
        { label: "Change a course date", href: "/help-centre/changes-and-refunds/change-your-course-date" },
        { label: "Cancel a booking", href: "/help-centre/changes-and-refunds/cancel-a-booking" },
        { label: "Get your certificate", href: "/help-centre/booking-a-course/get-your-certificate" },
        { label: "Contact us", href: "/contact-us?topic=booking#contact-form" },
      ],
    },
  },

  // My learning: every course booked, as one card each
  learning: {
    title: "My learning",
    lead: "Your courses, upcoming and completed, with certificates and online learning.",
    tabs: { upcoming: "Upcoming", completed: "Completed" },
    start: "Start learning",
    view: "View booking",
    certificate: "Certificate {number}, valid until {date}",
    empty: {
      upcoming: { title: "No upcoming courses", text: "Courses you book show here until they finish." },
      completed: { title: "No completed courses yet", text: "Courses show here once you have finished them, with their certificates." },
    },
  },

  // Purchase history: every order, with its receipt
  purchases: {
    title: "Purchase history",
    lead: "Every order, what you paid and how, and any refund.",
    columns: ["Order", "Date", "Courses", "Paid", "Status"],
    view: "View",
    // Receipt opens the booking with the print window, where "Save as PDF" downloads it
    receipt: "Receipt",
    status: { paid: "Paid", refunded: "Refunded", requested: "Cancellation requested" },
    paidWith: { card: "Card", klarna: "Klarna", wallet: "Wallet" },
    empty: { title: "No purchases yet", text: "Orders you place show here with their receipts." },
  },

  payments: {
    title: "Payment methods",
    lead: "Cards saved for faster checkout. Card details are kept by our payment provider, never on our servers.",
    default: "Default",
    makeDefault: "Make default",
    remove: "Remove",
    add: "Add a card",
    expires: "Expires {date}",
    expired: "Expired {date}",
    form: { title: "Add a card", number: "Card number", expiry: "Expiry date", expiryHint: "As shown on the card, like 08 / 28.", name: "Name on card", makeDefault: "Use as my default card", submit: "Save card" },
    added: "Card ending {last4} saved.",
    removed: "Card ending {last4} removed.",
    none: { title: "No saved cards", text: "Save a card to pay faster at checkout." },
  },

  wallet: {
    title: "Wallet",
    lead: "Credit you can spend on any course. It is used automatically at checkout when you choose to.",
    balance: "Wallet balance",
    use: "Use it at checkout: tick \"Use my wallet balance\" before you pay.",
    history: "Transactions",
    columns: ["Date", "Details", "Amount", "Balance"],
    how: {
      title: "How wallet credit works",
      items: [
        "Refunds can go to your wallet instead of your card, so you can rebook straight away.",
        "Gift and goodwill credit from our team is added here.",
        "Wallet credit can pay for all or part of any booking.",
      ],
    },
    none: "No transactions yet.",
  },

  bookings: { view: "View booking" }, // the booking card's link (components/account/BookingRow)

  status: {
    confirmed: "Confirmed",
    completed: "Completed",
    requested: "Cancellation requested",
    cancelled: "Cancelled",
  },

  detail: {
    back: "Purchase history",
    booked: "Booked on {date}",
    paid: { card: "Paid by card", klarna: "Paid with Klarna", wallet: "Paid from your wallet" },
    courses: "Your courses",
    attending: "Attending",
    joining: "Joining instructions: the training provider emails each delegate before the course.",
    actions: { calendar: "Add to calendar", map: "Get directions", receipt: "Print receipt", change: "Request a date change", cancel: "Cancel booking" },
    requested: "We have your cancellation request {ref} and will reply within 2 working days. Refunds follow the training provider's policy.",
    cancelled: "This booking was cancelled on {date}.",
    refunded: "{amount} refunded to your original payment method.",
    help: { text: "Questions about this booking? Call us on", or: "or", message: "send us a message" },
    notFound: { title: "We could not find that booking", text: "Check the reference, or find it in your bookings.", cta: { label: "Go to purchase history", href: "/account/purchases" } },
  },

  cancel: {
    title: "Cancel booking",
    lead: "Tell us what you want to cancel. Nothing changes until the training provider confirms.",
    instead: { title: "Would another date work?", text: "You can move to another date free of charge up to 7 days before the course.", cta: "Request a date change instead" },
    which: "Which courses do you want to cancel?",
    reasons: {
      label: "Why are you cancelling?",
      options: ["I can no longer attend", "I booked the wrong course or date", "I found another course", "My employer is arranging training", "Something else"],
    },
    details: "Anything else we should know? (optional)",
    refund: {
      title: "Your refund",
      text: "Refunds follow the training provider's refund policy, shown at checkout when you booked. We will tell you the amount before anything is final, and refund it to your original payment method.",
      fee: "CITB tests, CSCS card applications and Personal Licence applications have a 50% cancellation fee, and are non-refundable once the test is booked or the application sent.",
    },
    confirm: "I understand the refund depends on the training provider's policy.",
    submit: "Send cancellation request",
    sending: "Sending",
    done: { title: "Cancellation requested", text: "Your request {ref} is with us. We will reply to {email} within 2 working days with the provider's decision and any refund due.", back: "Back to booking" },
    closed: { title: "This booking cannot be cancelled online", text: "It has already started, finished or been cancelled. Contact us if you need help with it." },
  },

  profile: {
    title: "Account settings",
    lead: "Your personal details, address, email and password.",
    loading: "Loading your account settings",
    save: "Save changes",
    saving: "Saving…",
    saved: "Your changes have been saved.",
    failed: { title: "We couldn't load your settings", text: "Check your connection, then try again." },
    basic: { title: "Basic information", lead: "Used for your account and on your bookings.", verified: "Verified" },
    photo: { title: "Profile photo", hint: "A square JPG, PNG or WebP works best.", add: "Add a photo", change: "Change photo", remove: "Remove photo", saved: "Your photo has been updated.", removed: "Your photo has been removed." },
    address: { title: "Address", lead: "Your billing address." },
    email: {
      title: "Email",
      lead: "The email address you log in with. To change it, enter the new address and your current password.",
      sent: "Check your inboxes: we've sent a link to {email} and to your current address. Your email changes when you've opened both.",
      pending: "Waiting for you to confirm {email}. Open the links we sent to both addresses.",
      oneMore: "Thanks. Now open the link we sent to the other address to finish changing to {email}.",
      changed: "Your email address is now {email}.",
    },
    password: {
      title: "Password",
      lead: "Choose a strong password you don't use anywhere else. Other devices are signed out when you change it.",
      hint: "At least 8 characters, with a letter and a number.",
      show: "Show passwords",
      save: "Change password",
      saved: "Your password has been changed. Other devices have been signed out.",
    },
    noPassword: "You log in with Google or Facebook, so there's no password here yet. To add one, use \"Forgot password\" on the log in page.",
    marketing: { title: "Emails from us", label: "Send me offers and news about new courses", note: "You can change this at any time. We always email you about your bookings." },
    delete: { title: "Close your account", text: "To close your account and delete your data, contact us. We keep booking records the law asks us to keep.", cta: { label: "Contact us", href: "/contact-us" } },
  },

  saved: {
    title: "Saved courses",
    lead: "Courses you saved with the heart. Choose a date to add one to your basket.",
    empty: { title: "No saved courses yet", text: "Tap the heart on any course to save it here.", cta: { label: "Browse courses", href: CATALOGUE_HREF } },
  },

  // ---- demo data (until accounts exist) ----
  demoCards: [
    { id: "c1", brand: "Visa", last4: "4242", exp: "08/28", name: "S Carter", default: true },
    { id: "c2", brand: "Mastercard", last4: "4444", exp: "03/27", name: "S Carter" },
  ],
  // wallet transactions, days ago (credit +, spend -)
  demoWallet: [
    { id: "w1", daysAgo: 88, label: "Welcome credit for your first booking", amount: 25 },
    { id: "w2", daysAgo: 40, label: "Goodwill credit from our team", amount: 15 },
  ],
  // dates are days from today, so the demo always has upcoming and past courses; `courseId` is a demo course (data/demoCourses.js)
  demoBookings: [
    { reference: "RT-2026-104512", bookedDaysAgo: 18, method: "card", status: "confirmed", lines: [{ courseId: 1, mode: "classroom", startIn: 12, days: 6, time: "09:30 to 17:00", venue: "Manchester Training Centre", city: "Manchester", postcode: "M1 1AE", provider: "ClearView Learning", unit: 193.02, delegates: ["You"] }] },
    { reference: "RT-2026-098731", bookedDaysAgo: 9, method: "klarna", status: "confirmed", lines: [{ courseId: 5, mode: "online", startIn: 33, days: 1, time: "10:00 to 16:00", venue: "", city: "", postcode: "", provider: "Pinnacle Compliance Training", unit: 63.2, delegates: ["You", "Jo Patel"] }] },
    { reference: "RT-2026-071204", bookedDaysAgo: 75, method: "card", status: "confirmed", lines: [{ courseId: 20, mode: "ondemand", startIn: -70, days: 1, time: "Start any time", venue: "", city: "", postcode: "", provider: "Beacon Training Services", unit: 19.99, delegates: ["You"], certificate: { number: "RT-2026-004815", expiresInDays: 1025 } }] },
    { reference: "RT-2023-530118", bookedDaysAgo: 1140, method: "card", status: "confirmed", lines: [{ courseId: 16, mode: "classroom", startIn: -1110, days: 1, time: "09:30 to 16:30", venue: "Manchester Training Centre", city: "Manchester", postcode: "M1 1AE", provider: "Northstar Training", unit: 29.99, delegates: ["You"], certificate: { number: "RT-2023-001992", expiresInDays: 40 } }] },
    { reference: "RT-2026-066420", bookedDaysAgo: 96, method: "card", status: "cancelled", cancelledDaysAgo: 88, refund: 295, lines: [{ courseId: 13, mode: "classroom", startIn: -60, days: 4, time: "09:00 to 17:00", venue: "Leeds Training Centre", city: "Leeds", postcode: "LS1 4AP", provider: "Pinnacle Compliance Training", unit: 295, delegates: ["You"] }] },
  ],
};
