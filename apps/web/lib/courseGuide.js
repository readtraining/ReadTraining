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

/** Text typed into a box as its blocks: paragraphs at blank lines, and lines starting "- " or "• " as a list, also straight under a
 * line of text ("You will practise:" then "- CPR" on the next line is a paragraph, then a list), as the editors' hint says. */
export function textBlocks(text) {
  const out = [];
  for (const para of String(text || "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    let run = null; // the paragraph or list being built from this block's lines
    for (const raw of para.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const bullet = /^[-•]\s+/.test(line);
      if (!run || Boolean(run.list) !== bullet) out.push((run = bullet ? { list: [] } : { text: "" }));
      if (bullet) run.list.push(line.replace(/^[-•]\s+/, ""));
      else run.text = run.text ? `${run.text} ${line}` : line;
    }
  }
  return out;
}
