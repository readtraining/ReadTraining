// ReadTraining's own draft, kept for later. Not used while the client's current hurak.com text is in data/legal/terms.js.
// It is in the earlier shape ("In short" summaries, numbered clauses): convert it to sections of `blocks` before using it.
// Terms and Conditions (DRAFT: needs review by a solicitor before launch). Read through lib/legal.js.
//
// Shape: each section has an id (its anchor), a title, a one-line plain-English `summary` (the "In short" box, not binding)
// and `clauses`. A clause is a list of blocks; lib/legal.js numbers sections (1, 2...) and clauses (1.1, 1.2...).
// Blocks: a string is a paragraph; { type: "ul" | "ol", items }, { type: "table", rows } (first row = header),
// { type: "dl", items: [{ term, text }] }. Text may hold [label](href) links and **bold**.
//
// Written for ReadTraining's model: a marketplace where the training contract is between the learner and the provider, and
// ReadTraining runs the site, takes bookings and payments and holds the payment until the result or certificate is supplied.
// It follows what the site already says (data/home: payment protection and booking options; data/provider.js: providers'
// refund and rescheduling policies apply). Values in [brackets] are to be confirmed.

export const terms = {
  slug: "terms",
  href: "/terms-and-conditions",
  title: "Terms and Conditions",
  description: "The terms that apply when you use ReadTraining to find, book and pay for training courses, take free mock tests and leave reviews.",
  lead: "The rules for using ReadTraining: how booking works, what you pay, your right to cancel, and what we and the training providers are each responsible for.",
  version: "1.0",
  published: "2026-10-08",
  updated: "2026-10-08",
  effective: "2026-10-08",
  draft: true,
  sections: [
    {
      id: "about-these-terms",
      title: "About these terms",
      summary: "These terms apply whenever you use ReadTraining. Please read them before you book.",
      clauses: [
        ["These terms and conditions (the **terms**) apply when you use the ReadTraining website, create an account, book a course, request a quote, take a free mock test or leave a review or comment."],
        ["By using the website or making a booking you agree to these terms. If you do not agree, please do not use the website."],
        ["Each training provider may also have its own terms for the course it delivers, including its refund and rescheduling policy. We show these on the course page before you book, and they form part of your contract with that provider."],
        ["We only write these terms in English. Please keep a copy for your records: you can print this page at any time."],
      ],
    },
    {
      id: "definitions",
      title: "Definitions",
      summary: "The key words used in these terms and what they mean.",
      clauses: [
        [
          "In these terms:",
          {
            type: "dl",
            items: [
              { term: "We, us, our, ReadTraining", text: "The company named in [Who we are](#who-we-are), which runs the website." },
              { term: "You, your", text: "The person using the website or making a booking, and the business they book for, if any." },
              { term: "Provider", text: "The training business that delivers a course listed on ReadTraining." },
              { term: "Course", text: "Training listed on the website: classroom, live online, online self-paced or in-house." },
              { term: "Booking", text: "A place or places on a course that you have ordered and paid for, or agreed to pay for." },
              { term: "Booking option", text: "The level of booking you choose where offered (for example Basic, Plus or Pro), and what it includes." },
              { term: "Consumer", text: "An individual booking for themselves, not for their trade, business or profession." },
              { term: "Business customer", text: "Anyone booking for a business or organisation, including employers booking for staff." },
              { term: "Mock test", text: "A free practice test on our Test Prep pages." },
            ],
          },
        ],
      ],
    },
    {
      id: "who-we-are",
      title: "Who we are and our role",
      summary: "We run the marketplace. The provider runs the course, and your training contract is with them.",
      clauses: [
        ["ReadTraining is a trading name of [Company legal name] Ltd, registered in England and Wales under company number [Company number], with its registered office at [Registered office address]. Our VAT number is [VAT number]."],
        ["ReadTraining is an online marketplace. We list courses from independent providers, take your booking and payment, and support you before and after your course."],
        ["When you book a course, your contract for the training is with the provider named on the course page. The provider is responsible for delivering the course, its content, its trainers and its venue."],
        ["We are responsible for running the website, handling your booking and payment correctly, and the other services we provide to you under these terms."],
        ["You can contact us by email at [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk) or by phone on [0333 344 1293](tel:03333441293), Monday to Friday, 9:00am to 5:30pm."],
      ],
    },
    {
      id: "accounts",
      title: "Your account",
      summary: "Keep your details accurate and your password private. You must be 18 or over to book.",
      clauses: [
        ["You can browse without an account. To book or manage bookings you may need to create one."],
        ["You must be 18 or over to make a booking. A parent, guardian or employer can book for a learner under 18 where the course allows it."],
        ["Please give accurate details and keep them up to date, including the learner's name as it should appear on any certificate."],
        ["Keep your password private. You are responsible for activity on your account unless it happens because of something we did wrong."],
        ["We may suspend or close an account that breaks these terms, as explained in [Ending your use of the website](#ending-use)."],
      ],
    },
    {
      id: "courses-and-providers",
      title: "Courses and providers",
      summary: "Providers write their course details. We check providers before they list, but the course itself is theirs.",
      clauses: [
        ["Course descriptions, dates, venues, entry requirements and inclusions come from the provider. We check providers before they can publish on the marketplace and ask them to keep details accurate and up to date."],
        ["Please check the course page before you book, especially the entry requirements, what is included, the location and any identification you need to bring."],
        ["Reviews and ratings shown on a course page come from learners. See [Reviews and comments](#reviews-and-comments)."],
        ["Some courses lead to a licence, card or qualification issued by an awarding or licensing body. Passing the course does not guarantee that the body will issue it; that decision is theirs."],
      ],
    },
    {
      id: "bookings-and-prices",
      title: "Bookings, quotes and prices",
      summary: "Prices are in pounds and include VAT where it applies. Your booking is confirmed when we email you.",
      clauses: [
        ["Prices are shown in pounds sterling (GBP) and include VAT where VAT applies. The total you will pay, including the booking option you choose, is shown before you pay."],
        ["Adding a course to your basket does not reserve a place. Places are only held once your booking is confirmed."],
        ["Your booking is confirmed when we send you a booking confirmation by email. If a course is full or a date is no longer available after you pay, we will tell you and offer another date or a full refund."],
        ["If a price on the website is clearly wrong, we will contact you before confirming the booking, and you can choose to continue at the correct price or cancel for a full refund."],
        ["A quote request for a team or in-house course is not a booking. A quote sets out the price and details we can offer, and becomes a booking only when you accept it in writing and we confirm it."],
      ],
    },
    {
      id: "payment",
      title: "Payment",
      summary: "You pay us when you book, and we hold the payment until your result or certificate is supplied.",
      clauses: [
        ["You can pay by card, and on some courses by a buy now, pay later service. A buy now, pay later service is provided by a third party under its own terms."],
        ["We take payment when you book, on behalf of the provider. We hold your payment until the required result or certificate is supplied, and we handle refunds if issues arise, as set out in these terms."],
        ["Business customers with an approved credit account can pay by invoice under their account terms. See [Business and in-house bookings](#business-bookings)."],
      ],
    },
    {
      id: "right-to-cancel",
      title: "Your right to cancel (consumers)",
      summary: "If you are a consumer you usually have 14 days to change your mind, with some exceptions for courses that start sooner or online content you start using.",
      clauses: [
        ["If you are a consumer, you have the legal right to cancel a booking within 14 days of the day we confirm it, without giving a reason. This is your cooling-off period."],
        ["To cancel, tell us clearly within the 14 days, by email to [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk) or by phone. We will refund you within 14 days of receiving your cancellation, using the payment method you used."],
        ["**Courses that start within the 14 days.** If you ask for a course to start before the cooling-off period ends and then cancel, you will pay a fair amount for any training already delivered. If the course has been delivered in full, you can no longer cancel under this right."],
        ["**Online courses and other digital content.** For online self-paced courses, your right to cancel ends once you start accessing the content, but only if you agreed to immediate access and confirmed you understand you will lose the right to cancel. We ask for this at checkout."],
        ["Free mock tests cost nothing, so there is nothing to cancel."],
        ["These rights do not apply to business customers. They are in addition to your other legal rights."],
      ],
    },
    {
      id: "changes-and-refunds",
      title: "Changing dates, cancelling and refunds",
      summary: "After the 14 days, the provider's refund and rescheduling policy shown on the course page applies.",
      clauses: [
        ["After your cooling-off period ends, or if it does not apply, changes and cancellations follow the provider's refund and rescheduling policy shown on the course page and in your booking confirmation."],
        ["Some booking options include flexible date changes. Where your booking includes them, you can move to another available date of the same course free of charge up to [7] days before the course starts."],
        [
          "As a guide, this is how a cancellation is usually handled:",
          {
            type: "table",
            rows: [
              ["When you cancel", "What usually happens"],
              ["Within 14 days of booking (consumers)", "Full refund, less a fair amount for any training already delivered"],
              ["After 14 days, before the course starts", "The provider's refund policy applies; your booking option may allow a date change instead"],
              ["After the course starts, or if you do not attend", "Usually no refund, unless the provider's policy says otherwise"],
              ["The provider cancels or changes the course", "Your choice of another date or a full refund"],
            ],
          },
        ],
        ["Card and buy now, pay later transaction charges are not added to your refund when you cancel under a provider's policy, unless the law requires it. They are always refunded in full when you cancel within your cooling-off period or when the provider cancels."],
        ["Approved refunds are paid to the original payment method, normally within 14 days of approval."],
      ],
    },
    {
      id: "provider-changes",
      title: "If a provider cancels or changes a course",
      summary: "If the provider cancels or makes a big change, you can move to another date or get your money back.",
      clauses: [
        ["Providers sometimes need to cancel or reschedule a course, for example if too few people book or a trainer is unavailable. We will tell you as soon as we can."],
        ["If the provider cancels, or changes the date, venue or delivery method in a way that matters to you, you can choose another available date or a full refund of what you paid."],
        ["We are not responsible for travel, accommodation or other costs you arrange yourself, unless the cancellation was caused by something we did wrong. We recommend refundable travel where you can."],
      ],
    },
    {
      id: "business-bookings",
      title: "Business and in-house bookings",
      summary: "Bookings for a business are business contracts: the consumer cancellation rights do not apply.",
      clauses: [
        ["If you book for a business or organisation, you confirm you have authority to do so. The consumer rights in [Your right to cancel](#right-to-cancel) do not apply."],
        ["Business credit is available to eligible regular customers. The credit limit and payment terms are agreed individually and set out in your account terms."],
        ["You are responsible for giving each learner's correct details and for making sure they meet the entry requirements and attend."],
        ["For in-house courses delivered at your premises, you are responsible for providing a suitable, safe space and anything agreed in your quote."],
      ],
    },
    {
      id: "mock-tests",
      title: "Free mock tests",
      summary: "Mock tests are free practice. They are not the real exam and do not guarantee a pass.",
      clauses: [
        ["Our mock tests are free practice questions to help you prepare. They are not the official exam, and the questions are not the real exam questions."],
        ["A mock test result is a guide only. It does not guarantee that you will pass the real exam."],
        ["Your progress and results are saved on your device, so clearing your browser data removes them."],
        ["You may use the mock tests for your own preparation. Please do not copy, sell or republish the questions."],
      ],
    },
    {
      id: "certificates",
      title: "Certificates and results",
      summary: "Certificates come from the provider or awarding body, not from us.",
      clauses: [
        ["Certificates, results and qualifications are issued by the provider or the awarding body, not by ReadTraining. Timescales depend on them and are shown on the course page where known."],
        ["If your booking option includes a faster result, it applies to the steps the provider controls; the awarding body's own timescales still apply."],
        ["Please check your details on any certificate as soon as you receive it and tell the provider about any mistake."],
      ],
    },
    {
      id: "reviews-and-comments",
      title: "Reviews and comments",
      summary: "Reviews must be honest and about your own experience. We check them before they appear.",
      clauses: [
        ["You can leave reviews of courses and mock tests, and comments on mock tests. They must be honest, about your own experience, and not misleading."],
        ["We check every review before it appears. We publish positive and negative reviews alike, and we do not edit the meaning of a review."],
        ["We may decline or remove a review or comment that is false, offensive, unlawful, off-topic, includes personal information, or was paid for or offered an incentive without being labelled."],
        ["By posting, you let us show your review or comment on the website and in our marketing, with the first name you give."],
      ],
    },
    {
      id: "acceptable-use",
      title: "Using the website",
      summary: "Use the website fairly and lawfully, and do not try to break or copy it.",
      clauses: [
        [
          "When you use the website, you must not:",
          {
            type: "ul",
            items: [
              "break the law, or help anyone else to;",
              "try to get into parts of the website, accounts or systems you are not allowed to use;",
              "copy, scrape or republish course listings, prices, reviews or mock test questions in bulk;",
              "upload anything harmful, such as viruses, or anything offensive or misleading;",
              "pretend to be someone else, or book with someone else's payment details without permission.",
            ],
          },
        ],
        ["We try to keep the website available and secure, but we cannot promise it will always be available or free of errors."],
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      summary: "The website and its content belong to us or our providers.",
      clauses: [
        ["The website, its design and our own content belong to us or our licensors. Course content belongs to the provider or awarding body."],
        ["You may view and print pages for your own use. You must not use our name, logo or content for any other purpose without our written permission."],
      ],
    },
    {
      id: "liability",
      title: "Our responsibility to you",
      summary: "We are responsible for what we do. Nothing here takes away your legal rights.",
      clauses: [
        ["Nothing in these terms limits or excludes liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited or excluded by law. Nothing affects your legal rights as a consumer, including under the Consumer Rights Act 2015."],
        ["We provide our services with reasonable care and skill. If we fail to, we are responsible for loss you suffer that was a foreseeable result of our failure."],
        ["The provider is responsible for delivering the course. We are not responsible for the provider's acts or omissions, but we will help you raise a problem with them and handle any refund due through us."],
        ["If you are a consumer, we only supply the website for domestic and private use, and we are not responsible for loss of profit, business or opportunity."],
        ["If you are a business customer, our total liability for any booking is limited to the amount paid for that booking."],
      ],
    },
    {
      id: "privacy",
      title: "Your personal information",
      summary: "We use your information to handle your booking and as our Privacy Policy explains.",
      clauses: [
        ["We use your personal information to provide our services and to manage your bookings, and we share the details a provider needs with that provider. Our [Privacy Policy](/privacy-policy) explains how we use your information and your rights."],
        ["Our [Cookie Policy](/cookie-policy) explains how we use cookies and how to manage them."],
      ],
    },
    {
      id: "complaints",
      title: "Complaints",
      summary: "Tell us first. We will help, including with problems about a provider.",
      clauses: [
        ["If something goes wrong, please contact us at [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk) with your booking reference. We will acknowledge your complaint within [2] working days and aim to resolve it within [14] days."],
        ["If your complaint is about a course, we will pass it to the provider and help you reach an answer. Many providers also have a complaints procedure with their awarding body."],
        ["If we cannot resolve your complaint, you may be able to refer it to an alternative dispute resolution service. [ADR provider to be confirmed.] You can also go to court."],
      ],
    },
    {
      id: "ending-use",
      title: "Ending your use of the website",
      summary: "You can close your account at any time. We may close accounts that break these terms.",
      clauses: [
        ["You can stop using the website or ask us to close your account at any time. Closing your account does not cancel bookings already confirmed; see [Changing dates, cancelling and refunds](#changes-and-refunds)."],
        ["We may suspend or close your account if you seriously or repeatedly break these terms. We will tell you why, unless the law stops us."],
      ],
    },
    {
      id: "changes-to-terms",
      title: "Changes to these terms",
      summary: "We may update these terms. Your booking stays under the terms you agreed to.",
      clauses: [
        ["We may update these terms, for example when the law or our services change. The date at the top shows when they were last updated."],
        ["If we make an important change, we will tell registered users by email before it takes effect."],
        ["A booking is governed by the terms in force when you made it."],
      ],
    },
    {
      id: "law",
      title: "Law and courts",
      summary: "These terms are governed by English law. Consumers in Scotland and Northern Ireland can use their local courts.",
      clauses: [
        ["These terms are governed by the law of England and Wales, and the courts of England and Wales can hear any dispute."],
        ["If you are a consumer living in Scotland or Northern Ireland, you can also bring proceedings in your local courts, and the mandatory consumer law where you live still applies."],
        ["If a court finds part of these terms invalid, the rest stays in force."],
      ],
    },
  ],
};
