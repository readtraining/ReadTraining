// How a course can be booked with a date, and the choice shown first: the most popular mode (the cheapest as the fallback), and
// in a mode its cheapest session (the earliest wins a tie), so it matches the "From" price on cards and the hero. The course page,
// the catalogue card's date pop-up and the basket all start from these. Kept apart from lib/courses.js so browser components can
// use them without loading the catalogue.
export const bookableModes = (course) => ["classroom", "online", "ondemand"].filter((m) => course.sessions.some((s) => s.mode === m));
export const firstSession = (course, mode) => course.sessions.filter((s) => s.mode === mode).reduce((best, s) => (!best || s.price < best.price ? s : best), null);
export function defaultMode(course) {
  const dated = bookableModes(course);
  if (dated.includes(course.popularMode)) return course.popularMode;
  const cheapest = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  return [...dated].sort((a, b) => cheapest(a) - cheapest(b))[0];
}
