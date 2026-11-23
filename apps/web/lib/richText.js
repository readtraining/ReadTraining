// Text typed into a box with the Bold and Bullet list buttons (a provider's biography): its paragraphs (split at blank lines,
// a single line break kept), lines starting "- " (or "• ") as a bulleted list, and **words** in bold. Nothing else is read as
// formatting, and it is drawn as React elements (components/forms/FormattedText.jsx), never as HTML, so a typed tag or link
// shows as plain text. Text typed before the buttons existed reads exactly as before.

const BULLET = /^[-•]\s+/;

// a line's words and bold runs: [{ text, bold }]
const inline = (line) =>
  line
    .split(/\*\*(.+?)\*\*/)
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((p) => p.text);

// [{ list: false, lines: [parts] } | { list: true, items: [parts] }]
export function textBlocks(text) {
  const blocks = [];
  for (const para of String(text || "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    for (const raw of para.split("\n")) {
      const line = raw.trim();
      if (!line || /^[-•]$/.test(line)) continue; // an empty line, or a bullet with nothing after it
      const bullet = BULLET.test(line);
      const last = blocks[blocks.length - 1];
      const words = inline(bullet ? line.replace(BULLET, "") : line);
      if (!words.length) continue;
      if (last && last.open && last.list === bullet) (bullet ? last.items : last.lines).push(words);
      else blocks.push(bullet ? { list: true, items: [words], open: true } : { list: false, lines: [words], open: true });
    }
    blocks.forEach((b) => { b.open = false; }); // a blank line ends the paragraph or list
  }
  return blocks.map(({ open, ...b }) => b);
}

// the same text without its marks (search engines' description, a one-line preview)
export const plainText = (text) =>
  textBlocks(text)
    .map((b) => (b.list ? b.items : b.lines).map((parts) => parts.map((p) => p.text).join("")).join(b.list ? "; " : " "))
    .join(" ");
