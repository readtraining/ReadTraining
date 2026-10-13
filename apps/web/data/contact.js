import { help, topBar } from "@/data/home";
import { CATALOGUE_HREF } from "@/lib/routes";

// Contact us (/contact-us). Contact details come from data/home (top bar, help section), so every page shows the same ones.
// The routes follow the client's current contact page (hurak.com/contact-us: sales and help & support), the form follows the
// GOV.UK patterns (labels above fields, "(optional)", an error summary, a confirmation with a reference).

const tel = `tel:${topBar.phone.replace(/\s+/g, "")}`;

export const contact = {
  title: "Contact us | ReadTraining",
  description: "Get in touch with ReadTraining: call, email or send us a message about courses, bookings or training for your business.",
  hero: {
    eyebrow: "Contact us",
    title: ["Get in touch with ReadTraining"],
    lead: "Our UK team helps with choosing a course, managing a booking and arranging training for your business.",
  },
  // where to start, by what people need (each link lands on the right page, or on the form with its topic chosen)
  routes: {
    eyebrow: "How can we help?",
    title: "Looking for something specific?",
    text: "Tell us what you are looking for and we will point you to the quickest answer.",
    items: [
      {
        icon: "icon-search",
        title: "Find and book a course",
        text: "Compare courses, dates and prices, or ask us which course you need.",
        links: [
          { label: "Search courses", href: CATALOGUE_HREF },
          { label: "Ask about a course", href: "?topic=course#contact-form" },
        ],
      },
      {
        icon: "icon-message",
        title: "Help with a booking",
        text: "Questions about a course you have booked, your joining details or your certificate.",
        links: [
          { label: "Visit the help centre", href: help.href },
          { label: "Message us about a booking", href: "?topic=booking#contact-form" },
        ],
      },
      {
        icon: "icon-person-3",
        title: "Training for your business",
        text: "Group bookings, in-house training, quotes and business accounts.",
        links: [
          { label: "Training for business", href: "/for-business" },
          { label: "Ask for a quote", href: "?topic=business#contact-form" },
        ],
      },
    ],
    provider: { text: "Are you a training provider?", link: { label: "List your courses", href: "/for-providers" } },
  },
  // the ways to reach us, beside the form
  channels: {
    eyebrow: "Ways to reach us",
    title: "Talk to our UK team",
    text: "Call or email us, or send a message with the form.",
    items: [
      { icon: "icon-person-3", label: "Call us", value: topBar.phone, href: tel, meta: topBar.hours, note: "Calls to 03 numbers cost the same as calls to 01 and 02 numbers." },
      { icon: "icon-email", label: "Email us", value: topBar.email, href: `mailto:${topBar.email}`, meta: "We reply within one working day." },
    ],
  },
  form: {
    title: "Send us a message",
    topics: [
      { value: "course", label: "Choosing or booking a course" },
      { value: "booking", label: "A booking I have made" },
      { value: "business", label: "Training for my team or business" },
      { value: "provider", label: "Listing courses as a training provider" },
      { value: "other", label: "Something else" },
    ],
    privacy: { text: "We will use your details only to reply to your message. See our", link: { label: "Privacy Policy", href: "/privacy-policy" } },
    submit: "Send message",
    sent: { title: "Message sent", text: "We will reply to {email} within one working day.", urgent: `If it is urgent, call us on ${topBar.phone}.` },
  },
  faq: {
    eyebrow: "FAQs",
    title: "Before you get in touch",
    items: [
      { q: "How quickly will you reply?", a: "We reply to messages and emails within one working day. Our phone lines are open Monday to Friday, 9:00am to 5:30pm." },
      { q: "What should I include in my message?", a: "Your name and email address. For a booking, add your booking reference. For a course question, add the course name and dates if you have them." },
      { q: "How do I make a complaint?", a: "Please send us a message with your booking reference and the details, and choose the topic that fits best. We will look into it and reply within one working day." },
    ],
  },
};
