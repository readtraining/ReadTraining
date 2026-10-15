import React from "react";

// Icons on the course page come from the template icon font (vendors.css), the same glyphs as home. Decorative only.
export const Icon = ({ name, className = "" }) => <i className={`icon-${name} rt-cd__icon${className ? ` ${className}` : ""}`} aria-hidden="true"></i>;

// The tick in a pale purple circle, as on home's white option cards (.rt-tier__list).
export const Check = () => <i className="icon-check rt-cd__check" aria-hidden="true"></i>;
