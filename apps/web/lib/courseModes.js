// How a course can be booked with a date, and the choice shown first: its primary learning option when its provider set one,
// else the most popular mode (the cheapest as the fallback), and in a mode its cheapest session (the earliest wins a tie), so it
// matches the "From" price on cards and the hero. The course page, the catalogue card's date pop-up and the basket all start from
// these. Kept apart from lib/courses.js so browser components can use them without loading the catalogue.
import { methodName } from "@/lib/taxonomy";

// A booking mode is one of the catalogue's delivery methods (or team training in-house); its name always comes from the
// catalogue list, so the course page, basket, provider pages and admin all say the same word.
export const MODE_METHOD = { classroom: "classroom", online: "live-online", ondemand: "self-paced" };
export const modeLabel = (mode) => (mode === "inhouse" ? "Team training" : methodName(MODE_METHOD[mode]));
// the course's primary learning option first (its provider's main way of teaching it), then the rest in the usual order
export const bookableModes = (course) => {
  const order = ["classroom", "online", "ondemand"].sort((a, b) => (b === course.primaryMode) - (a === course.primaryMode));
  return order.filter((m) => course.sessions.some((s) => s.mode === m));
};
export const firstSession = (course, mode) => course.sessions.filter((s) => s.mode === mode).reduce((best, s) => (!best || s.price < best.price ? s : best), null);
// The study method of the course's cheapest date: a search card says "From" that price, so its date pop-up opens there.
export const cheapestMode = (course) => course.sessions.reduce((best, s) => (!best || s.price < best.price ? s : best), null)?.mode;
export function defaultMode(course) {
  const dated = bookableModes(course);
  if (dated.includes(course.primaryMode)) return course.primaryMode;
  if (dated.includes(course.popularMode)) return course.popularMode;
  const cheapest = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  return [...dated].sort((a, b) => cheapest(a) - cheapest(b))[0];
}

// A provider course's learning options: `methods` are the ways it is offered and `method` the primary one, and
// `closedMethods` the ones whose new bookings the provider stopped (still offered, their booked dates still run, nothing of
// them on sale; never the primary). The ways in the order they are always shown, then helpers for a course from the API (an older
// record with only `method` still reads).
export const LEARNING_OPTIONS = ["classroom", "live-online", "self-paced"];
export const isDatedMethod = (m) => m === "classroom" || m === "live-online";
/** Whether the course's option `m` isn't taking new bookings. */
export const isClosedWay = (c, m) => Boolean(c?.closedMethods?.includes(m));
/** The course's learning options, its primary first; `open`: only the ones taking bookings. */
export const waysOf = (c, { open = false } = {}) => {
  const all = c?.methods?.length ? LEARNING_OPTIONS.filter((m) => c.methods.includes(m)) : c?.method ? [c.method] : [];
  const ways = c?.method && all.includes(c.method) ? [c.method, ...all.filter((m) => m !== c.method)] : all;
  return open ? ways.filter((m) => !isClosedWay(c, m)) : ways;
};
/** "Live online (not taking bookings)": an option's name, marked when its new bookings are stopped. */
export const wayName = (c, m) => `${methodName(m)}${isClosedWay(c, m) ? " (not taking bookings)" : ""}`;
/** "Classroom · Live online (not taking bookings)": the course's learning options by name, its primary first. */
export const waysLabel = (c) => waysOf(c).map((m) => wayName(c, m)).join(" · ");
