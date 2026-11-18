"use client";

import React, { useCallback, useRef } from "react";
import FilterScrollPill from "@/components/courses/FilterScrollPill";

// Every text box on the site. When its words are longer than the box, it scrolls with the site's own scroll pill
// (FilterScrollPill, as the sidebars, dropdowns and pop-ups) instead of the browser's bar. Takes every <textarea> prop.
export default function TextArea({ ref, className = "", ...props }) {
  const box = useRef(null);
  const setRef = useCallback((el) => {
    box.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]);
  return (
    <span className="rt-textarea">
      <textarea ref={setRef} className={`rt-pill-scroll${className ? ` ${className}` : ""}`} {...props} />
      <FilterScrollPill scrollRef={box} watch={props.value} />
    </span>
  );
}
