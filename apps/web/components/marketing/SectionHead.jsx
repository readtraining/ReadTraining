/* A closing section's head: the pill eyebrow, the centred title and its line (FaqSection, NotesSection). */
export function SectionHead({ eyebrow, title, text }) {
  return (
    <div className="row justify-center text-center">
      <div className="col-xl-7 col-lg-9">
        <div className="rt-section-head">
          {eyebrow && <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{eyebrow}</div>}
          <h2 className="sectionTitle__title mt-20 rt-faqsec__title">{title}</h2>
          {text && <p className="sectionTitle__text rt-faqsec__text">{text}</p>}
        </div>
      </div>
    </div>
  );
}
