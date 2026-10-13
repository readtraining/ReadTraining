import "server-only";
import { questionBank } from "@/data/testPrepQuestions";
import { bookHref, getSubject, passCount, subjectHref, testHref } from "@/lib/testPrep";

// Server-only reads for a mock test. The question bank holds the correct answers, so it never reaches the browser:
// pages get the paper without answers (getPaper) and an attempt is marked here (markAttempt, via a server action).
// Swap the bodies for API calls later (getTest / submitTest procedures); the return shapes stay the same.

export const resultHref = (subjectSlug, testSlug) => `${testHref(subjectSlug, testSlug)}/result`;

// The subject and test, with the links the test and result pages need, or null for an unknown pair.
export function getTest(subjectSlug, testSlug) {
  const subject = getSubject(subjectSlug);
  const index = subject ? subject.tests.findIndex((t) => t.slug === testSlug) : -1;
  if (index < 0) return null;
  const test = subject.tests[index];
  const next = subject.tests.slice(index + 1).find((t) => t.ready) || null;
  return {
    subject: { slug: subject.slug, title: subject.title },
    test: { slug: test.slug, title: test.title, subtitle: test.subtitle || "", questions: test.questions, passMark: test.passMark, minutes: test.minutes, ready: test.ready },
    links: {
      subject: subjectHref(subject.slug),
      test: testHref(subject.slug, test.slug),
      result: resultHref(subject.slug, test.slug),
      next: next ? testHref(subject.slug, next.slug) : null,
      nextTitle: next ? next.title : null,
      book: bookHref(subject.slug),
    },
  };
}

const bankFor = (subjectSlug, testSlug) => questionBank[subjectSlug]?.[testSlug] || null;

// The paper as the learner sees it: questions and options, no answers.
export function getPaper(subjectSlug, testSlug) {
  const bank = bankFor(subjectSlug, testSlug);
  if (!bank?.questions.length) return null;
  return bank.questions.map((q) => ({ id: q.id, q: q.q, options: q.options }));
}

// Mark an attempt. `answers` is { [questionId]: optionIndex }; anything else is ignored.
export function markAttempt(subjectSlug, testSlug, answers) {
  const hit = getTest(subjectSlug, testSlug);
  const bank = bankFor(subjectSlug, testSlug);
  if (!hit || !bank?.questions.length) return null;
  const given = answers && typeof answers === "object" ? answers : {};
  const review = bank.questions.map((q) => {
    const raw = given[q.id];
    const pick = Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    const status = pick === null ? "unanswered" : pick === q.answer ? "correct" : "incorrect";
    return { id: q.id, q: q.q, options: q.options, answer: q.answer, given: pick, status };
  });
  const total = review.length;
  const correct = review.filter((r) => r.status === "correct").length;
  const unanswered = review.filter((r) => r.status === "unanswered").length;
  const passMark = hit.test.passMark;
  const needed = passMark ? passCount(total, passMark) : null;
  return {
    total,
    correct,
    incorrect: total - correct - unanswered,
    unanswered,
    percent: Math.round((correct / total) * 100),
    passMark,
    passCount: needed,
    passed: needed !== null ? correct >= needed : null,
    review,
  };
}
