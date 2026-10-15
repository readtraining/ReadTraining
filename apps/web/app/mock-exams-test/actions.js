"use server";

import { markAttempt } from "@/lib/testPrepRunner";

// Marks a finished mock test on the server, so the correct answers only leave it inside the result.
export async function markTest(subjectSlug, testSlug, answers) {
  return markAttempt(String(subjectSlug), String(testSlug), answers);
}
