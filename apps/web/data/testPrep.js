// Test prep hub content: one list for the hub page and (later) the individual test pages.
// Titles and slugs follow the reference Hurak test prep hub; the brand name is ours. A card's description and facts come from
// the subject page data (data/testPrepSubjects.js, read through lib/testPrep.js), so the hub and the subject page agree.
// `live: true` (the default: every subject has a page) makes the card a link to /test-prep/<slug>; `live: false` on an
// entry shows it as "Coming soon" instead.
export const testPrepPage = {
  title: "ReadTraining Online Test Prep: Free Practice Tests & Academic Resources",
  description: "ReadTraining Test Prep offers test preparation, practice tests and academic resources, all free of cost.",
  hero: {
    title: ["Master Your", "Professional Test Prep"], // one line each, with a break between
    text: "Free premium resources, mock exams, regulatory question simulators, and study handbooks to guide you confidently toward passing your certification exams.",
    searchPlaceholder: "Search tests, e.g. CSCS or SIA",
    popularLabel: "Popular tests:",
    popular: ["CSCS", "CITB", "SIA", "SMSTS", "IOSH"],
  },
  gridEyebrow: "Free mock tests",
  gridTitle: "Explore Popular Tests on ReadTraining",
  resources: {
    eyebrow: "Free mock exams, handbooks and more",
    title: "Revise with our free Test Prep Resources",
    text: "ReadTraining helps tens of thousands of trade operatives, supervisors, and security personnel pass their official UK tests on the first try. Unlock success with premium, clean layouts and fully functional simulators.",
  },
  resourcesCta: { label: "Browse courses", href: "/courses" },
  steps: {
    eyebrow: "How it works",
    title: ["Practise, check,", "then book with confidence"], // one line each, with a break between
    text: "Each mock test follows the format of the real exam, so the day itself holds no surprises.",
    steps: [
      { title: "Choose your test", text: "Find the test for your card, licence or qualification by name or by subject.", icon: "icon-search" },
      { title: "Practise like the real exam", text: "Answer the same number of questions in the time allowed, against the real pass mark.", icon: "icon-wall-clock" },
      { title: "Check your score", text: "See how you did against the pass mark and revise the topics you missed.", icon: "icon-bar-chart" },
      { title: "Book your course", text: "When you are ready, book the matching course with an approved training provider.", icon: "icon-calendar" },
    ],
  },
  courses: {
    eyebrow: "Ready for the real thing?",
    title: "Book the course behind the test",
    text: "These courses each have a free mock test on this page, so you can practise before and after you book.",
    ids: [9, 1, 10, 11],
    more: { label: "Browse all courses", href: "/courses" },
  },
  faq: {
    eyebrow: "FAQs",
    title: "Questions about test prep",
    items: [
      { q: "Are the mock tests free?", a: "Yes. Every mock test on this page is free to use." },
      { q: "Are these the real exam questions?", a: "No. Mock tests are for practice. They follow the format of each exam, but the real exam uses its own questions." },
      { q: "How do I know how long a test is and what the pass mark is?", a: "Each test card lists the facts for that test, such as the number of questions, the time allowed and the pass mark." },
      { q: "Can I book the course after I practise?", a: "Yes. Tests such as the CSCS Green Card, SIA Licence, SMSTS and SSSTS mock tests match courses you can book on ReadTraining from approved training providers." },
      { q: "Which test should I start with?", a: "Choose the test for the card, licence or qualification you need. If you are not sure, search by name or pick a subject, or call our team on 0333 344 1293." },
    ],
  },
  // subject pages (/test-prep/<slug>) and the test pages (/mock-exams-test/<subject>/<test>)
  subject: {
    free: "Free",
    cardEyebrow: "Free mock test",
    startLabel: "Start Free Test",
    bookTitle: "Ready to book your course?",
    bookText: "Book your course now with one of our trusted providers and have the flexibility to choose between in-class, Zoom, or self-paced online learning options.",
    bookLabel: "Book now",
    moreTitle: "More mock tests",
    keyFacts: { test: "Mock test", tests: "Mock tests", questions: "Questions", passMark: "Pass mark", time: "Time", timePerTest: "Time per test", longest: "Longest test" },
    mockHeadingSuffix: "Mock Exams",
    takeLabel: "Take test",
    singleHeading: "Your mock test",
    // the reviews section at the end of a subject page (as on the reference, hurak.com) and its "Give a review" pop-up
    reviews: {
      eyebrow: "Reviews",
      title: "Mock exam reviews",
      emptyTitle: "There are no reviews yet",
      emptyText: "Taken this mock test? Tell other learners how it helped you prepare.",
      cta: "Give a review",
      formTitle: "Review this mock test",
      ratingLabel: "Your rating",
      ratingNames: ["Poor", "Fair", "Good", "Very good", "Excellent"],
      nameLabel: "Your name",
      namePlaceholder: "First name and initial, e.g. Sam K.",
      textLabel: "Your review",
      textPlaceholder: "What was useful? How did it compare with the real exam?",
      submit: "Submit review",
      sending: "Sending…",
      errors: { rating: "Choose a rating from 1 to 5 stars.", text: "Write at least 20 characters." },
      failed: "We could not send your review just now. Please try again.",
      thanksTitle: "Thank you for your review",
      thanksText: "We check every review before it appears on this page.",
      close: "Close",
    }, // the list's heading on a subject with one test, when its own heading only repeats the title
    status: { progress: "In progress", done: "Completed" }, // the reader's own progress on a test (this device)
    tocTitle: "Table of contents",
    coursesLink: { label: "Browse all courses", href: "/courses" },
    faqTitle: "Frequently asked questions",
  },
  comingSoon: {
    eyebrow: "Coming soon",
    title: "This test is coming soon",
    text: "We are building this mock test now. Until it is ready, read about the exam on the test page, or book the course that prepares you for it.",
    backLabel: "Back to the test page",
    bookLabel: "Book a course",
  },
  // the mock test itself (/mock-exams-test/<subject>/<test>)
  runner: {
    introTitle: "Before you start",
    readyText: "Ready when you are. The timer starts when you press Start test.",
    keyFacts: { questions: "Questions", passMark: "Pass mark", correct: "{n} correct to pass", time: "Time limit", noLimit: "No time limit" },
    rules: [
      "Answer every question. One answer is correct.",
      "Flag a question to come back to it before you finish.",
      "The timer starts when you press Start test. When it runs out, your answers are marked automatically.",
      "Your progress is saved on this device, so you can close the page and carry on later.",
    ],
    startLabel: "Start test",
    resumeLabel: "Resume test",
    restartLabel: "Start again",
    resumeNote: "You have a test in progress with {answered} of {total} questions answered and {time} left.",
    progress: "Question {n} of {total}",
    timeLeft: "Time left",
    flagLabel: "Flag for review",
    flaggedLabel: "Flagged",
    prevLabel: "Previous",
    nextLabel: "Next",
    finishLabel: "Submit & check result", // the last question's button, as on the reference (hurak.com)
    navTitle: "Questions",
    navOpenLabel: "Questions",
    navSummary: "{answered} of {total} answered",
    legend: { current: "Current", answered: "Answered", flagged: "Flagged", open: "Not answered" },
    keysHint: "Keys: 1 to 4 or A to D to answer, arrows to move, F to flag.",
    warnFive: "5 minutes left.",
    warnOne: "1 minute left.",
    warnLeft: "{time} left.", // on resuming with 5 minutes or less left
    finishTitle: "Finish the test?",
    finishAllDone: "You have answered every question.",
    finishSome: "{answered} of {total} answered. Unanswered questions are marked as wrong.",
    finishUnanswered: "Not answered",
    finishFlagged: "Flagged for review",
    keepGoingLabel: "Keep going",
    confirmLabel: "Finish and see my result",
    closeLabel: "Close",
  },
  // "Leave a comment" on a mock test page and the box under the test (as on the reference, hurak.com)
  comments: {
    cta: "Leave a comment",
    boxTitle: "Still looking for an answer?",
    boxText: "Ask about a question, report a mistake or tell us what would help. Our team reads every comment.",
    formTitle: "Leave a comment",
    intro: "Questions about this mock test, or spotted a mistake? Tell us below.",
    nameLabel: "Your name (optional)",
    emailLabel: "Email (optional, if you would like a reply)",
    textLabel: "Your comment",
    textPlaceholder: "Which question is it about, and what would you like to know?",
    submit: "Send comment",
    sending: "Sending…",
    errors: { text: "Write at least 10 characters." },
    failed: "We could not send your comment just now. Please try again.",
    thanksTitle: "Thank you for your comment",
    thanksText: "Our team will read it, and reply by email if you left one.",
    close: "Close",
  },
  // the result (/mock-exams-test/<subject>/<test>/result)
  result: {
    eyebrow: "Your result",
    passTitle: "Passed",
    failTitle: "Not passed this time",
    scoreText: "You scored {correct} out of {total} ({percent}%). The pass mark is {passMark}%, which is {passCount} correct answers.",
    passMarkKey: "Pass mark {passMark}%", // the caption under the score ring, beside the marker's key
    timeUpNote: "Time ran out, so the answers you had given were marked.",
    stats: { correct: "Correct", incorrect: "Incorrect", unanswered: "Not answered", time: "Time taken" },
    retakeLabel: "Retake test",
    nextLabel: "Next test",
    bookTitle: "Ready to book your course?",
    bookText: "Get trained and certified with an accredited ReadTraining provider.",
    bookLabel: "Book now",
    backLabel: "Back to all tests",
    reviewTitle: "Review your answers",
    filters: { all: "All", incorrect: "Incorrect", unanswered: "Not answered", flagged: "Flagged" },
    status: { correct: "Correct", incorrect: "Incorrect", unanswered: "Not answered" },
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    noneInFilter: "No questions here.",
    loading: "Marking your test…",
    errorText: "We could not mark your test just now. Please try again in a moment.",
    crumb: "Result",
    emptyTitle: "No result yet",
    emptyText: "Take the test and your score and answers will show here.",
    emptyLabel: "Start the test",
  },
  ctaLabel: "Practice now",
  soonLabel: "Coming soon",
};

export const testCategories = ["Construction", "Security", "Health and Safety", "Licensing", "Fire"];
// Icon-font glyph per category (the card's icon square).
export const testCategoryIcons = { Construction: "icon-tools", Security: "icon-person-2", "Health and Safety": "icon-badge", Licensing: "icon-document", Fire: "icon-notification" };

export const tests = [
  { slug: "cscs-mock-test-for-managers-and-professionals", title: "CSCS Mock Test for Managers and Professionals", category: "Construction" },
  { slug: "cscs-mock-test", title: "CSCS Mock Tests - Free", category: "Construction" },
  { slug: "citb-mock-test-50-questions", title: "CITB Mock Test", category: "Construction" },
  { slug: "cscs-green-card-mock-test", title: "CSCS Green Card Mock Test", category: "Construction", banner: "CSCS Green Card Course Mock Tests – 10+ free practice exams with over 1,000 questions for learners at ReadTraining" },
  { slug: "personal-licence-mock-exam", title: "Personal Licence Mock Exam", category: "Licensing" },
  { slug: "fire-marshal-test", title: "Fire Banksman (Marshal) Mock Exam 2025", category: "Fire" },
  { slug: "sia-mock-test", title: "SIA Licence Training Mock Exams 2026", category: "Security", banner: "Start free SIA Mock Tests with ReadTraining – 15+ practice tests and over 1000 questions available" },
  { slug: "smsts-mock-test", title: "SMSTS Mock Tests 2026", category: "Construction", banner: "Free SMSTS mock tests from ReadTraining offering over 300 questions and 10+ practice exams to prepare for the SMSTS course exam" },
  { slug: "sssts-mock-test", title: "SSSTS Mock Tests 2026", category: "Construction", banner: "Access over 10 free SSSTS mock tests and 300 practice exam questions to prepare for the CITB Site Supervision Safety Training Scheme assessment." },
  { slug: "free-cpcs-renewal-mock-test-questions-and-answers", title: "Free CPCS Renewal Mock test Questions and Answers", category: "Construction" },
  { slug: "level-1-health-and-safety-in-a-construction-environment-mock-test", title: "Level 1 Health and Safety in a Construction Environment Mock Test 2026", category: "Construction" },
  { slug: "sia-top-up-mock-tests", title: "SIA Top-Up Mock Tests for Door Supervisor & Security Guard", category: "Security", banner: "Free SIA Top-Up Refresher Mock Tests for Door Supervisors – 15+ practice tests and 1000+ questions" },
  { slug: "cpcs-360-excavator-mock-test", title: "CPCS 360 Excavator Mock Test", category: "Construction" },
  { slug: "iosh-managing-safely-exam-questions", title: "IOSH Managing Safely Exam Questions Mock Test", category: "Health and Safety" },
  { slug: "cscs-working-at-height-mock-test", title: "CSCS Working at Height", category: "Construction" },
  { slug: "cscs-plumbing-mock-test", title: "CSCS Plumbing Mock Test", category: "Construction" },
].map((t) => ({ live: true, ...t, href: `/test-prep/${t.slug}` }));

// Which course links to which test. Only courses that really have a mock test (checked on the reference site) are listed;
// every other course shows nothing. To add one, add its course id here with the test slug.
export const mockTestByCourse = {
  1: "sia-mock-test", // SIA Door Supervisor Training
  3: "sia-mock-test", // SIA CCTV Operator Training
  9: "cscs-green-card-mock-test", // CSCS Green Card Course
  10: "smsts-mock-test", // CITB SMSTS Course
  11: "sssts-mock-test", // CITB SSSTS Course
  21: "personal-licence-mock-exam", // Personal Licence (APLH)
  46: "sia-top-up-mock-tests", // Door Supervisor Refresher
};
export const findMockTest = (courseId) => tests.find((t) => t.slug === mockTestByCourse[courseId]) || null;
