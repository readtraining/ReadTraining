import { subjects } from "@/data/testPrepSubjects";
import { questionIndex } from "@/data/testPrepQuestionIndex";
import { mockTestCourses, tests as hubTests } from "@/data/testPrep";
import { courseSearch } from "@/data/courseTopics";
import { matchesPick, pickCourses } from "@/lib/catalogueData";
import { CATALOGUE_HREF } from "@/lib/routes";

// All reads for the test prep subject pages go through here (swap the bodies for API calls later).
// Every number shown on a subject (lead, test cards, hub card) is derived from one place. A test's question count and
// time limit come from its question bank (data/testPrepQuestionIndex.js); the pass mark from the subject's `exam`
// (data/testPrepSubjects.js) or the test's own value where that paper differs. Tests without a bank show "coming soon".

export const subjectHref = (slug) => `/test-prep/${slug}`;
export const testHref = (subjectSlug, testSlug) => `/mock-exams-test/${subjectSlug}/${testSlug}`;

// "45 minutes", "1 hour", "1 hour 50 minutes"
export function formatDuration(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h ? `${h} hour${h > 1 ? "s" : ""}` : "";
  const mins = m ? `${m} minute${m > 1 ? "s" : ""}` : "";
  return [hours, mins].filter(Boolean).join(" ");
}

// Questions needed to pass: the pass mark rounded up (80% of 30 is 24).
export const passCount = (questions, passMark) => Math.ceil((questions * passMark) / 100);

// Each test with its numbers resolved: its own values, else the subject's exam.
export function resolveTests(slug) {
  const s = subjects[slug];
  if (!s) return [];
  return s.tests.map((t) => {
    const bank = questionIndex[slug]?.[t.slug];
    return {
      ...t,
      questions: bank?.questions ?? t.questions ?? s.exam.questions ?? null,
      passMark: t.passMark ?? s.exam.passMark ?? null,
      minutes: bank?.minutes ?? t.minutes ?? s.exam.minutes ?? null,
      ready: Boolean(bank?.questions),
      href: testHref(slug, t.slug),
    };
  });
}

const mostCommon = (values) => {
  const counts = new Map();
  values.filter((v) => v != null).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

// The subject's usual paper (for the lead): the most common question count and time across its tests.
export function subjectExam(slug) {
  const s = subjects[slug];
  if (!s) return {};
  const list = resolveTests(slug);
  return {
    questions: mostCommon(list.map((t) => t.questions)) ?? s.exam.questions ?? null,
    passMark: s.exam.passMark ?? mostCommon(list.map((t) => t.passMark)),
    minutes: mostCommon(list.map((t) => t.minutes)) ?? s.exam.minutes ?? null,
  };
}

// The lead with its placeholders filled from the exam numbers.
export function subjectLead(slug) {
  const s = subjects[slug];
  if (!s) return "";
  const { questions, passMark, minutes } = subjectExam(slug);
  const values = {
    questions,
    passMark,
    minutes,
    passCount: questions && passMark ? passCount(questions, passMark) : undefined,
    duration: formatDuration(minutes),
  };
  return s.lead.replace(/\{(\w+)\}/g, (all, key) => (values[key] === undefined || values[key] === null ? all : String(values[key])));
}

// Short facts for cards: test count, questions, pass mark and time, from the same numbers the subject page shows.
export function subjectFacts(slug) {
  const list = resolveTests(slug);
  if (!list.length) return [];
  const same = (key) => (list.every((t) => t[key] === list[0][key]) ? list[0][key] : null);
  const q = same("questions");
  const p = same("passMark");
  const m = same("minutes");
  return [
    list.length > 1 ? `${list.length} mock tests` : null,
    q ? `${q} questions` : null,
    p ? `Pass mark ${p}%` : null,
    m ? formatDuration(m) : null,
  ].filter(Boolean);
}

export const hasSubjectPage = (slug) => Boolean(subjects[slug]);

// Hub entry + page content for one subject, or null for an unknown slug.
export function getSubject(slug) {
  const base = hubTests.find((t) => t.slug === slug);
  const content = subjects[slug];
  if (!base || !content) return null;
  return { ...base, ...content, lead: subjectLead(slug), tests: resolveTests(slug), facts: subjectFacts(slug) };
}

export const getSubjectSlugs = () => hubTests.filter((t) => subjects[t.slug]).map((t) => t.slug);

// The live courses this subject's mock test belongs to (data/testPrep.js mockTestCourses), from `courses` (catalogue courses,
// lib/catalogueServer.js loadCatalogue), most popular first.
export const getSubjectCourses = (slug, courses) => pickCourses(courses, mockTestCourses[slug]?.picks || [], 3);

// "Book now": the course search for the subject's courses, or every course when the subject has none.
export const bookHref = (slug) => (mockTestCourses[slug] ? courseSearch(mockTestCourses[slug].words) : CATALOGUE_HREF);

// A course's own mock test (the banner on its page), or null: the first test whose picks the course sits under.
export function mockTestFor(course) {
  const slug = Object.keys(mockTestCourses).find((s) => mockTestCourses[s].picks.some((p) => matchesPick(course, p)));
  return slug ? hubTests.find((t) => t.slug === slug) || null : null;
}

// "More Tests & Resources": the subject's own list, else other tests in the same category, else any others (up to 8).
export function moreSubjects(slug) {
  const s = subjects[slug];
  const base = hubTests.find((t) => t.slug === slug);
  if (!s || !base) return [];
  const own = (s.more || []).map((m) => hubTests.find((t) => t.slug === m)).filter(Boolean);
  const sameCategory = hubTests.filter((t) => t.slug !== slug && t.category === base.category && !own.includes(t));
  const others = hubTests.filter((t) => t.slug !== slug && !own.includes(t) && !sameCategory.includes(t));
  return [...own, ...sameCategory, ...others].filter((t) => subjects[t.slug]).slice(0, 8);
}
