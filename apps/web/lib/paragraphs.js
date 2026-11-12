// Text typed into a box (a provider's about text or booking terms, an FAQ answer) as its paragraphs: split at blank lines, each
// as its lines (a single line break inside a paragraph is kept as one), so what was typed on several lines doesn't run together.
export const paragraphs = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split("\n").map((line) => line.trim()));
