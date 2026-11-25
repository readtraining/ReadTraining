// A course page's guide: the extra sections ReadTraining writes for a shared course page (API course_guides, edited in the shared
// page editor's steps, CourseGuideEditor.jsx; its shape and rules are apps/api/src/lib/courseGuide.mts). `page`: the API's course
// page (catalogue.course): a shared page's own guide, or, for a provider course on a live shared page, that page's.
export const guideOf = (page) => page.guide || null;

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
