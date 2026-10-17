// Provider Terms, written for ReadTraining in our own words, following the sections and meaning of the client's current
// provider terms (hurak.com/terms/provider-terms, last updated 12 December 2025). Training providers agree to them when they
// add a provider account (/provider/onboarding); the API records which version (organisations.terms_version, set from
// PROVIDER_TERMS_VERSION in apps/api/src/modules/organisations/organisations.router.mts — change `updated` and that together).
// The fees and payout day match the marketplace settings (data/admin.js feeDefaults). Values in [brackets] are to be confirmed.

export const providerTerms = {
  slug: "providerTerms",
  href: "/provider-terms",
  title: "Provider Terms",
  description: "The terms for training providers who list and sell courses on ReadTraining: listings, bookings, fees, payouts, refunds, disputes, liability and governing law.",
  lead: "The terms that apply when you list and sell training courses on ReadTraining as a provider.",
  version: "",
  published: "2026-10-16",
  updated: "2026-10-16",
  effective: "2026-10-16",
  draft: true,
  sections: [
    {
      id: "words-we-use",
      title: "Words we use",
      blocks: [
        "In these terms, \"ReadTraining\", \"we\" and \"us\" mean [Company legal name] Ltd, which runs the ReadTraining website. \"You\" and \"provider\" mean the organisation or instructor who delivers and develops a course and offers it on ReadTraining.",
        {
          type: "ul",
          items: [
            "**Provider account:** the account that lets you offer courses for sale on ReadTraining.",
            "**Course:** a training course, product or service you offer on ReadTraining.",
            "**Customer:** a person or business that buys a course from you through ReadTraining.",
            "**Course fee:** the price the customer pays for a course.",
            "**Commission:** the part of the course fee we keep for our services to you.",
            "**Course materials:** everything you supply or create for a course, including online learning and documents, however it is delivered.",
            "**Your terms:** the terms you set for customers who take your courses, including your cancellation and refund policy.",
            "**Order confirmation:** our email to a customer confirming their booking of your course.",
          ],
        },
      ],
    },
    {
      id: "using-readtraining",
      title: "How ReadTraining works",
      blocks: [
        "ReadTraining is an online marketplace where providers advertise their courses and customers find, book and pay for them. Customers pay through ReadTraining, but the course itself is bought from you: the contract for the course is between you and the customer, on your terms. We take bookings and payments on your behalf; we do not deliver courses.",
        "By listing courses, you agree to these terms, our [website terms](/terms-and-conditions) and [privacy policy](/privacy-policy). We may update these terms; if you keep using ReadTraining after a change, the updated terms apply. We will tell you about important changes in advance by email.",
        "You agree that you use ReadTraining to offer your courses, take bookings and receive payments through the platform; that you are responsible for the quality, content and delivery of your courses and for the health and safety of learners on them; and that you are satisfied about the identity of the customers who book with you.",
        "We may run promotions that offer your courses at a lower price. When we do, we fund the discount from our commission, not from your share.",
      ],
    },
    {
      id: "your-customers",
      title: "Your contract with customers",
      blocks: [
        "Your terms must comply with the law and be kept up to date on your provider profile. You agree to accept and deliver every booking made for your courses through ReadTraining.",
      ],
    },
    {
      id: "listings-and-content",
      title: "Your listings and content",
      blocks: [
        "Give complete and accurate information about yourself and your courses, and keep it up to date. Don't publish anything that is unlawful, misleading, defamatory or offensive, or that could harm ReadTraining's reputation. List only genuine courses of a proper standard.",
        "You are responsible for everything you upload and must own it or have permission to use it. We don't check content for copyright, and help we give you with setting up listings doesn't move that responsibility to us.",
        "Don't use the ReadTraining name or brand without our written permission, don't direct customers to book your courses somewhere else, and don't put your own contact details in standard course listings.",
        "You keep the rights in your course materials and give us permission to use your listings and content to run and promote the marketplace. We may review, edit or remove content that breaks these terms. All rights in the ReadTraining website and brand stay with us or our licensors.",
        "You must follow data protection law when you handle learners' personal data.",
        "We can't promise that the website will always be available or free of errors, or that you will make a particular number of sales. We may change, suspend or stop the website or any part of it.",
      ],
    },
    {
      id: "pricing-and-payment",
      title: "Pricing, payment and payouts",
      blocks: [
        "The price of a course on ReadTraining must be the same as, or lower than, its price on your own website or any other platform.",
        "For bookings made through ReadTraining, we collect the course fee, take off the transaction fee and our commission, and pay you the rest on the **28th of the following month** (the next working day if the 28th isn't one). We may hold back money to cover refunds or reductions after customer complaints, and we may set off anything you owe us against what we pay you.",
        "The transaction fee is **3%** for debit and credit card payments and **6%** for buy now, pay later payments. Our standard commission is set out in your provider account.",
        "**All payments go through ReadTraining.** When a booking started on ReadTraining, any later payment from that customer — for example to reschedule, resit, add mandatory training, upgrade or pay an admin fee — must also be taken through ReadTraining, not directly by you. If it isn't, we may charge the commission that would have been due, and repeated breaches may lead to your account being suspended.",
        "**Refunds:** if you agree to refund a customer, tell us within 3 working days so we can process it. We send refunds within 3 working days of hearing from you. Transaction fees can't be refunded.",
        "**Disputes and chargebacks:** if a customer disputes a payment, we hold your share and any dispute fee until it is settled. Upload your evidence in your provider account within 5 working days. If the dispute is won, your share is released (the dispute fee isn't refunded); if it is lost, nothing more is charged beyond what was already held.",
        "**Invoices:** you are the seller of the course, so you must invoice the customer for the full amount they paid, including VAT. If you are VAT registered, the invoice must meet VAT rules; if you aren't, upload a non-VAT invoice. Invoices must be uploaded for every order in your provider account before the payout for that order is released. We invoice you for our commission and the transaction fee.",
      ],
    },
    {
      id: "who-does-what",
      title: "Who does what",
      blocks: [
        "We list your courses and take customers' payments, but we are not the seller. You provide the course, and the customer buys it from you.",
      ],
    },
    {
      id: "liability",
      title: "Liability",
      blocks: [
        "You will cover our losses from claims about your courses, course materials or content — including claims about rights, suitability, accreditation changes, misdescription or refunds you didn't make.",
        "Our total liability to you is limited to the commission you paid us in the 12 months before the claim, and we are not liable for indirect or consequential losses. Nothing in these terms limits liability that can't be limited by law.",
      ],
    },
    {
      id: "events-beyond-control",
      title: "Events beyond our control",
      blocks: [
        "Neither of us is responsible for failing to do something because of events beyond our reasonable control, as long as we tell the other promptly.",
      ],
    },
    {
      id: "suspension-and-closure",
      title: "Suspending or closing your account",
      blocks: [
        "We may suspend or close your provider account if you break these terms, misuse content or behave in a threatening way towards our staff, or for repeated complaints or inaccurate information. Where we can, we will tell you why.",
      ],
    },
    {
      id: "notices",
      title: "Contacting each other",
      blocks: [
        "Send formal notices to us by email at [provider support email]. We send notices to the email address on your provider account.",
      ],
    },
    {
      id: "waiver",
      title: "Not enforcing a term",
      blocks: [
        "If we don't enforce part of these terms straight away, we can still enforce it later. A waiver only counts if we confirm it in writing.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing law",
      blocks: [
        "These terms are governed by the law of England and Wales, and the courts of England and Wales have exclusive jurisdiction.",
      ],
    },
  ],
};
