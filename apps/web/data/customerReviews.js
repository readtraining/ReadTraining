import { founded } from "@/data/home";
import { trustFigures } from "@/lib/siteContent";
import { reviewCourse } from "@/lib/siteReviews";
import { CATALOGUE_HREF } from "@/lib/routes";

// Customer reviews (/customer-reviews). The reviews are the published ones (admin › Customer reviews, lib/siteReviews.js), the
// headline numbers the site's editable content (lib/siteContent.js trust: the same as on the home page), so nothing is
// retyped; call customerReviews(reviews) after loadSiteContent() and loadTaxonomy(). The page shows a selection and says the
// overall rating counts every review; it makes no claim the site can't show. The reviews are sorted by the course they name, then the general ones, newest first within each (the API's
// order). With none published, the list is an honest empty state.

export const GENERAL = "General";

export const customerReviews = (reviews = []) => {
  const t = trustFigures();
  const list = reviews
    .map((r) => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, origin: r.origin, originUrl: r.originUrl, course: reviewCourse(r) }))
    .sort((a, b) => (a.course ? 0 : 1) - (b.course ? 0 : 1) || a.course.localeCompare(b.course));
  return {
    title: "Customer reviews | ReadTraining",
    description: `Read what learners say about their training with us${t.ratingSlash ? `, rated ${t.ratingSlash} from ${t.reviews} reviews` : ""}.`,
    hero: {
      eyebrow: "Customer reviews",
      title: ["What our learners say"],
      lead: t.ratingOutOf ? `Rated ${t.ratingOutOf} from ${t.reviews} reviews.` : "What learners say about the training they took with us.",
      primary: { label: "Find courses", href: CATALOGUE_HREF },
    },
    facts: [
      { icon: "icon-star", value: t.ratingSlash, label: "Average rating" },
      { icon: "icon-message", value: t.reviews, label: "Reviews" },
      { icon: "icon-person-3", value: t.customers, label: "Customers" },
      { icon: "icon-wall-clock", value: `Est. ${founded}`, label: "Training people across the UK" },
    ],
    list: {
      title: list.length ? "A selection of our reviews" : "Our reviews",
      // the headline rating comes from one site (its source); say so, since the list also shows reviews from other sites
      lead: !t.ratingOutOf ? "" : t.source ? `Our rating, ${t.ratingOutOf} from ${t.reviews} reviews, counts every review there.` : `Our overall rating, ${t.ratingOutOf} from ${t.reviews} reviews, counts every review.`,
      source: { label: t.source, href: t.sourceUrl },
      allLabel: "All",
      generalLabel: GENERAL,
      empty: { title: "No reviews to show yet", text: "Reviews will appear here once we publish them." },
      reviews: list,
    },
    how: {
      eyebrow: "About our reviews",
      title: "What you see here",
      text: "How the reviews on this page are chosen and shown.",
      points: [
        { title: "In their own words", text: "We show each review as it was written, with the stars the reviewer gave." },
        { title: "Where it was posted", text: "Our reviews were first posted on review sites such as Google and Trustpilot. Each one names the site it came from." },
        { title: "A selection", text: "This page shows a selection of our reviews. Our rating counts every review on the site it comes from." },
      ],
    },
    faq: {
      eyebrow: "FAQs",
      title: "Questions about reviews",
      items: [
        { q: "Where do these reviews come from?", a: "They are reviews of Read Training, copied here word for word from the review sites they were first posted on, such as Google and Trustpilot." },
        { q: "Do you show every review?", a: "No. This page shows a selection. Our rating of {ratingOutOf} counts all {reviews} reviews on the site it comes from, not only these." },
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
};
