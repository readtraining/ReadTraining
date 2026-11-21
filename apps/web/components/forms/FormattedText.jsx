import React from "react";
import { textBlocks } from "@/lib/richText";

// Text typed with the Bold and Bullet list buttons (lib/richText.js), drawn as paragraphs, bulleted lists and bold words. Built
// from React elements only, so nothing typed can become HTML. `pClass` / `ulClass` style the paragraphs and lists where it is used.
export default function FormattedText({ text, pClass, ulClass }) {
  const words = (parts) => parts.map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : <React.Fragment key={i}>{p.text}</React.Fragment>));
  return textBlocks(text).map((b, i) =>
    b.list ? (
      <ul key={i} className={ulClass}>
        {b.items.map((parts, j) => <li key={j}>{words(parts)}</li>)}
      </ul>
    ) : (
      <p key={i} className={pClass}>
        {b.lines.map((parts, j) => <React.Fragment key={j}>{j > 0 && <br />}{words(parts)}</React.Fragment>)}
      </p>
    ),
  );
}
