// A legal section's blocks as plain text an admin can edit, and back. Blocks are what components/doc/DocBlocks.jsx renders: a
// paragraph (a string; [label](link) and **bold** are allowed), a bullet list ({ type: "ul", items }) or a table
// ({ type: "table", caption?, rows }, the first row being the headings).
//
// The text: blocks are separated by a blank line.
//   A paragraph is a line of text.
//   A bullet list is lines that start with "- ".
//   A table is lines that start with "|" (cells between bars; a "|" inside a cell is written "\|"), optionally after a line
//   "Table: caption".
// Pure functions, no imports: serialize(parse(text)) gives the same text back, and parse(serialize(blocks)) the same blocks.

const cell = (c) => c.replace(/\|/g, "\\|");
const uncell = (c) => c.replace(/\\\|/g, "|");

export function blocksToText(blocks) {
  return blocks
    .map((b) => {
      if (typeof b === "string") return b;
      if (b.type === "ul") return b.items.map((x) => `- ${x}`).join("\n");
      if (b.type === "table") return [...(b.caption ? [`Table: ${b.caption}`] : []), ...b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// "| a | b |" into ["a", "b"], keeping an escaped bar inside a cell
const splitRow = (line) => {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\" && inner[i + 1] === "|") {
      cur += "\\|";
      i++;
    } else if (inner[i] === "|") {
      cells.push(cur);
      cur = "";
    } else cur += inner[i];
  }
  cells.push(cur);
  return cells.map((c) => uncell(c.trim()));
};

// Text to blocks. Returns { blocks } or { error } with what is wrong and which block (1, 2, …) it is in.
export function textToBlocks(text) {
  const groups = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((g) => g.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((g) => g.length);
  const blocks = [];
  for (const [i, lines] of groups.entries()) {
    const at = `Block ${i + 1}`;
    const caption = /^Table:\s*/.exec(lines[0]) && lines.length > 1 && lines[1].startsWith("|") ? lines[0].replace(/^Table:\s*/, "") : null;
    const rest = caption !== null ? lines.slice(1) : lines;
    if (rest.every((l) => l.startsWith("|"))) {
      const rows = rest.map(splitRow);
      if (rows.length < 2) return { error: `${at}: a table needs a heading row and at least one more row.` };
      if (rows.some((r) => r.length !== rows[0].length)) return { error: `${at}: every row of the table needs the same number of cells.` };
      if (rows[0].length > 8) return { error: `${at}: a table can have up to 8 columns.` };
      blocks.push({ type: "table", ...(caption ? { caption } : {}), rows });
    } else if (rest.every((l) => /^-\s+/.test(l))) {
      blocks.push({ type: "ul", items: rest.map((l) => l.replace(/^-\s+/, "")) });
    } else if (rest.some((l) => l.startsWith("|") || /^-\s+/.test(l))) {
      return { error: `${at}: a paragraph, a bullet list and a table need a blank line between them.` };
    } else {
      blocks.push(rest.join(" "));
    }
  }
  return { blocks };
}
