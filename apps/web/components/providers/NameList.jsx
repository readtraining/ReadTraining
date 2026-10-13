import React from "react";

// "Security, First Aid and Health & Safety" with each name kept on one line, so a line breaks between names and never inside one
// ("Teaching & Academics" never splits across two lines).
export default function NameList({ items }) {
  return items.map((name, i) => (
    <React.Fragment key={name}>
      {i > 0 && (i === items.length - 1 ? " and " : ", ")}
      <span className="rt-nowrap">{name}</span>
    </React.Fragment>
  ));
}
