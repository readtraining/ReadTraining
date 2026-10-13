import { topBar } from "@/data/home";
import { BASKET_HREF, CATALOGUE_HREF, CHECKOUT_HREF } from "@/lib/routes";

// The checkout (/checkout) and the booking confirmation (/checkout/confirmation). One page, as the client's current site
// (hurak.com) and the large booking sites do it: your details (individual or business), the billing address, the delegates for
// each place, then payment, beside the order summary. The menu is left out so nothing pulls people away mid-payment. Our own wording.

export const checkout = {
  title: "Checkout",
  back: { label: "Back to basket", href: BASKET_HREF },
  secure: "Secure checkout",
  help: { label: "Need help?", phone: topBar.phone },

  details: {
    title: "Your details",
    types: [
      { value: "individual", label: "I'm booking for myself or someone else", note: "For individuals paying for their own training." },
      { value: "business", label: "I'm booking for a business", note: "Add your company so the invoice and receipt show it." },
    ],
  },
  address: { title: "Billing address", country: "United Kingdom" },
  delegates: {
    title: "Who is attending",
    text: "The training provider sends joining instructions to each delegate before the course.",
    me: "This delegate is me",
  },
  payment: {
    title: "Payment",
    methods: [
      { value: "card", label: "Credit or debit card", note: "Visa, Mastercard and American Express." },
      { value: "klarna", label: "Pay in 3 with Klarna", note: "Three interest-free payments. You finish on Klarna after pressing Pay." },
    ],
    wallet: "Use my wallet balance ({amount})",
    walletAll: "Your wallet covers the whole order. Nothing else to pay.",
    walletPart: "{used} from your wallet. Pay the remaining {rest} below.",
    declined: "Your card was declined. Check the details, try another card or pay with Klarna.",
    failed: "We could not take your payment. Nothing has been charged. Please try again, or call us.",
  },
  terms: { text: "By paying you agree to our", links: [{ label: "Terms and Conditions", href: "/terms-and-conditions" }, { label: "Privacy Policy", href: "/privacy-policy" }], provider: "and the training provider's booking terms." },
  pay: "Pay",
  complete: "Complete booking", // when the wallet covers the whole order
  paying: "Paying",
  trust: ["No booking fee", "Approved providers only", "Move to another date free of charge up to 7 days before"],

  // nothing ready to pay for: arrived without a basket, or with something still to finish there
  empty: { title: "There is nothing to pay for yet", text: "Choose your courses and dates in your basket first.", cta: { label: "Go to your basket", href: BASKET_HREF } },
  unfinished: { title: "Finish your basket first", text: "Some of the courses you ticked still need a date or a choice. Your basket shows what is left.", cta: { label: "Back to basket", href: BASKET_HREF } },

  confirmation: {
    title: "Booking confirmed",
    reference: "Your booking reference",
    sent: "We have sent a confirmation to {email}.",
    next: {
      title: "What happens next",
      steps: [
        "The training provider emails each delegate their joining instructions before the course.",
        "Bring photo ID on the day, plus anything the joining instructions ask for.",
        "You can move to another date free of charge up to 7 days before the course.",
      ],
    },
    actions: [
      { label: "View in my account", href: "/account/bookings/{ref}", primary: true },
      { label: "Find more courses", href: CATALOGUE_HREF },
      { label: "Visit the Help Centre", href: "/help-centre" },
    ],
    // the same return page when the payment did not go through (a declined card, Klarna not approved, the bank's check failed)
    failed: {
      title: "Payment not completed",
      text: "Nothing has been charged and your booking has not been made. Your basket is saved, so you can try again or pay another way.",
      actions: [
        { label: "Try again", href: CHECKOUT_HREF, primary: true },
        { label: "Back to basket", href: BASKET_HREF },
        { label: "Contact us", href: "/contact-us" },
      ],
    },
    none: { title: "No recent booking to show", text: "Your confirmation email has the details of your booking.", cta: { label: "Find courses", href: CATALOGUE_HREF } },
  },
};
