// "Start Free Test": scroll to the mock exams list and move keyboard focus to its heading (no animation for reduced motion).
export const TESTS_ID = "mock-exams";

export function scrollToTests() {
  const heading = document.getElementById(TESTS_ID);
  if (!heading) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  heading.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  heading.focus({ preventScroll: true });
}
