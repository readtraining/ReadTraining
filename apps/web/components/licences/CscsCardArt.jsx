import React from "react";

// A CSCS card drawn in code (no photos or logos): the card colour, a contactless mark, a photo placeholder, placeholder name
// lines and the card's level on the bottom band, in a credit-card ratio. `card` is a card from data/licences.js; without one
// it is the blank "your card" state. Decorative: the card's name is always given in text next to it.
export default function CscsCardArt({ card, size = "md", className = "" }) {
  const colour = card ? card.colour : "blank";
  return (
    <div className={`rt-cscs-art -${colour} -${size} ${className}`} aria-hidden="true">
      <div className="rt-cscs-art__top">
        <span className="rt-cscs-art__chip"></span>
        <span className="rt-cscs-art__brand">CSCS</span>
        <svg className="rt-cscs-art__nfc" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" /></svg>
      </div>
      <div className="rt-cscs-art__mid">
        <div className="rt-cscs-art__lines"><i></i><i></i><i></i></div>
        <span className="rt-cscs-art__photo"><svg viewBox="0 0 24 24" width="60%" height="60%" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg></span>
      </div>
      <div className="rt-cscs-art__band">{card ? card.band : "Your card"}</div>
    </div>
  );
}
