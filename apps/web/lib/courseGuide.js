import { courseGuides } from "@/data/courseGuides";

// A course page's guide: the extra sections ReadTraining writes for a shared course page (API course_guides, edited in the shared
// page editor's Course guide step; its shape and rules are apps/api/src/lib/courseGuide.mts). The page reads it in one shape,
// whatever its source: the page's guide from the database, or, until a page's guide is moved into the database (the API's
// guides:import), the guide written in data/courseGuides.js for its catalogue topic (SIA Door Supervisor). `page`: the API's
// course page (catalogue.course).
export function guideOf(page) {
  if (page.guide) return withKeys(page.guide);
  const old = courseGuides.find((g) => matchesTopic(page, g.pick));
  return old ? withKeys(fromCodeGuide(old)) : null;
}

const matchesTopic = (page, pick) => {
  const [subject, sub, topic] = pick.split("/");
  return (page.category || "") === subject && (!sub || page.subcategory === sub) && (!topic || page.topic === topic);
};

// a package's key, as a basket line keeps which one was chosen: its own, or its name in lower case (names are unique in a guide)
const keyOf = (name) => String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const withKeys = (g) => (g.packages ? { ...g, packages: { ...g.packages, items: g.packages.items.map((p) => ({ ...p, key: p.key || keyOf(p.name) })) } } : g);

/** A guide written in data/courseGuides.js, in the database's shape (the API's scripts/data/course-guides.json is made the same way). */
export function fromCodeGuide(g) {
  const out = { ...g };
  delete out.pick;
  if (g.compare) out.compare = { ...g.compare, rows: g.compare.rows.map(([label, ...cells]) => ({ label, cells: cells.map((c) => (c === true ? "Yes" : c === false ? "No" : String(c))) })) };
  if (g.exams) out.exams = { intro: (g.exams.intro || []).join("\n\n") || undefined, units: Object.entries(g.exams.questions || {}).map(([unit, value]) => ({ unit, value })) };
  if (g.packages) out.packages = { ...g.packages, items: g.packages.items.map((p) => ({ ...p, firstAid: Boolean(p.firstAid) })) };
  return out;
}

// an exam unit's name as it is matched to a guide's unit (case, spaces and punctuation aside)
export const unitKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** A line's words and links, in order: [words](/path) is a link in the site, [words](https://…) one to another site; anything
 *  else (another kind of address) stays as it was typed. */
export function inlineParts(text) {
  const out = [];
  const re = /\[([^\]\n]{1,200})\]\(((?:\/(?!\/)|https:\/\/)[^\s()]{1,300})\)/g;
  let at = 0;
  for (const m of String(text || "").matchAll(re)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m[1], href: m[2] });
    at = m.index + m[0].length;
  }
  if (at < String(text || "").length) out.push({ text: String(text).slice(at) });
  return out;
}

/** Text typed into a box as its blocks: paragraphs at blank lines; a block whose every line starts "- " or "• " is a list. */
export function textBlocks(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const ls = b.split("\n").map((l) => l.trim()).filter(Boolean);
      return ls.every((l) => /^[-•]\s+/.test(l)) ? { list: ls.map((l) => l.replace(/^[-•]\s+/, "")) } : { text: ls.join(" ") };
    });
}
