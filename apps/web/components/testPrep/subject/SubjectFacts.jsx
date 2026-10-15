import React from "react";

// The key facts strip on the hero's lower edge (as the course page's stats card sits on its hero): one cell per fact with the
// site's pale purple icon square, the value and its label under it. `facts` is [{ icon, value, label }]; cells without a value
// are left out. A plain list, so a screen reader reads each cell as "15, mock tests".
export default function SubjectFacts({ facts }) {
  const cells = facts.filter((f) => f.value);
  if (!cells.length) return null;
  return (
    <ul className="rt-tps__keyfacts" aria-label="Key facts">
      {cells.map((f) => (
        <li key={f.label} className="rt-tps__keyfact">
          <span className="rt-benefit__icon" aria-hidden="true"><i className={`${f.icon} text-16`}></i></span>
          <span className="rt-tps__keyfact-text">
            <strong>{f.value}</strong>
            <span className="rt-sr">, </span>
            <span>{f.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
