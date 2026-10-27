// Skill Saver, the learner loyalty programme: the levels and the rules for reaching them, shared by the learner page
// (/skill-saver) and the provider page (/provider-skill-saver) so both always show the same numbers. Rules from the client's
// current site (hurak.com/skill-saver): Level 1 on signing in; Level 2 for 3 completed courses in 1 year; Level 3 for
// 5 completed courses in 2 years; only completed courses count; a level once reached is kept for life.
export const SKILL_SAVER_LEVELS = [
  { level: 1, discount: 10, upTo: true, rule: "Sign in to your ReadTraining account", short: "Sign in" },
  { level: 2, discount: 15, courses: 3, years: 1, rule: "Complete 3 courses in 1 year", short: "3 courses in 1 year" },
  { level: 3, discount: 20, courses: 5, years: 2, rule: "Complete 5 courses in 2 years", short: "5 courses in 2 years" },
];

const DAY = 86400000;
const yearsBack = (date, years) => new Date(date.getTime() - years * 365 * DAY);
const inWindow = (dates, end, years) => dates.filter((d) => d <= end && d > yearsBack(end, years)).length;

// A learner's level from the end dates of the courses they completed. A level counts as reached if the rule was ever met
// (kept for life), so every completion date is tried as the end of the window. `next` is the progress towards the next
// level in the window ending today. Returns null for someone not signed in.
export function skillSaverStatus(completedDates, signedIn, now = new Date()) {
  if (!signedIn) return null;
  const dates = completedDates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()) && d <= now);
  const reached = SKILL_SAVER_LEVELS.filter((l) => !l.courses || dates.some((end) => inWindow(dates, end, l.years) >= l.courses));
  const current = reached[reached.length - 1];
  const nextLevel = SKILL_SAVER_LEVELS.find((l) => l.level === current.level + 1);
  const next = nextLevel ? { ...nextLevel, have: Math.min(inWindow(dates, now, nextLevel.years), nextLevel.courses) } : null;
  return { ...current, next, completed: dates.length };
}

