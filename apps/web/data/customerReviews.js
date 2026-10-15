import { counters, founded, stories, testimonials } from "@/data/home";
import { CATALOGUE_HREF } from "@/lib/routes";

// Customer reviews (/customer-reviews). The reviews and the headline numbers come from data/home (the customers' own words, as
// on the home page), so nothing is retyped. The page shows them as a selection: the testimonials carry no star rating and no
// confirmed source, so none is shown. Connect the full set (e.g. a review platform's API) here later.

const count = (title) => counters.find((c) => c.title === title).number;

// the subject of each review, from the course it names (for the filter)
const SUBJECTS = [
  { label: "Security", match: /SIA|Door Supervisor|Security/i },
  { label: "Construction", match: /CSCS|CITB/i },
  { label: "Health and safety", match: /Fire|NEBOSH|First Aid|Health/i },
];
const subjectOf = (course) => (SUBJECTS.find((s) => s.match.test(course)) || { label: "Other" }).label;

export const customerReviews = {
  title: "Customer reviews | ReadTraining",
  description: `Read what learners say about courses booked through ReadTraining, rated ${count("Average rating")} from ${count("Verified reviews")} verified reviews.`,
  hero: {
    eyebrow: "Customer reviews",
    title: ["What our learners say"],
    lead: `Rated ${count("Average rating").replace(" / ", " out of ")} from ${count("Verified reviews")} verified reviews by learners and teams across the UK.`,
    primary: { label: "Find courses", href: CATALOGUE_HREF },
  },
  facts: [
    { icon: "icon-star", value: count("Average rating"), label: "Average rating" },
    { icon: "icon-message", value: count("Verified reviews"), label: "Verified reviews" },
    { icon: "icon-person-3", value: count("Customers"), label: "Customers" },
    { icon: "icon-wall-clock", value: `Est. ${founded}`, label: "Training people across the UK" },
  ],
  featured: {
    eyebrow: "In their words",
    title: "Real experiences from people who booked with us",
    text: "Learners and teams tell us about their course, their trainer and what came next.",
    video: stories.video,
  },
  list: {
    title: "A selection of what our customers say",
    allLabel: "All",
    reviews: testimonials.map((t) => {
      const [course, place] = t.position.split(" · ");
      return { id: t.id, name: t.author, course, place, subject: subjectOf(course), text: t.text };
    }),
  },
  how: {
    eyebrow: "How we collect reviews",
    title: "Honest reviews you can trust",
    text: "We ask customers about their course after they have taken it, and we publish what they tell us.",
    points: [
      { title: "From real customers", text: "Reviews come from people who booked their training through ReadTraining." },
      { title: "Good and bad", text: "We publish positive and negative reviews alike." },
      { title: "In their own words", text: "We do not edit what customers write, apart from removing personal details." },
      { title: "Checked before they appear", text: "We check every review before it appears, to keep out spam and offensive content." },
    ],
  },
  faq: {
    eyebrow: "FAQs",
    title: "Questions about reviews",
    items: [
      { q: "Are these reviews from real customers?", a: "Yes. They are written by people who booked a course through ReadTraining, in their own words." },
      { q: "Why do you show only some reviews here?", a: `This page shows a selection. Our ${count("Average rating")} rating comes from ${count("Verified reviews")} verified reviews, and each course page shows the reviews for that course.` },
      { q: "Do you remove negative reviews?", a: "No. We publish positive and negative reviews alike. We only remove a review that is spam, offensive or includes someone's personal details." },
      { q: "How can I leave a review?", a: "After your course, tell us how it went by sending us a message. We read every one." },
    ],
  },
  cta: {
    title: "Ready to find your course?",
    text: "Compare accredited courses, dates and prices from providers across the UK.",
    primary: { label: "Find courses", href: CATALOGUE_HREF },
    secondary: { label: "Leave a review", href: "/contact-us?topic=other#contact-form" },
  },
};
