import { Fragment } from "react";
import { Inline } from "@/components/doc/DocBlocks";
import FormattedText from "@/components/forms/FormattedText";
import LongBody from "@/components/courseDetail/LongBody";
import { paragraphs } from "@/lib/paragraphs";
import { SectionHead } from "./SectionHead";

/* Terms and policies as notes: text people read rather than questions they click, so nothing sits behind a tab or an accordion
   (terms such as a cancellation policy should be plain to see before booking). Each part is a small heading with its text. The
   same head as FaqSection (pill, centred title, line). `groups`: [{ title, items: [{ q, a, formatted }], long }]: each its own card
   with its title (a single group has none), one above the other at reading width (long legal text reads best in one column); a
   `long` group (a provider's own terms, which can run to pages) shows its first lines with Show more, as the course page's long
   sections do (LongBody). An item marked `formatted` (a provider's own terms) is drawn from the Bold and Bullet list marks only
   (FormattedText: bold words and bulleted lists, never links or HTML, so a provider can't put a link to another site on our
   pages); the rest (our own policies) may hold [label](link) and **bold**. */
export default function NotesSection({ eyebrow, title, text, groups, className = "layout-pt-lg layout-pb-lg", id, compact = false }) {
  const shown = groups.filter((g) => g.items.length);
  if (!shown.length) return null;
  return (
    <section className={`${className}${compact ? " rt-faq--compact" : ""}`} id={id}>
      <div className="container">
        <SectionHead eyebrow={eyebrow} title={title} text={text} />
        <div className="rt-notes mt-40">
          {shown.map((g) => {
            const items = g.items.map((it) => (
              <div key={it.q} className="rt-notes__item">
                <h4 className="rt-notes__h4">{it.q}</h4>
                {it.formatted ? (
                  <FormattedText text={it.a} ulClass="rt-notes__list" />
                ) : (
                  paragraphs(it.a).map((lines, j) => <p key={j}>{lines.map((line, k) => <Fragment key={k}>{k > 0 && <br />}<Inline text={line} /></Fragment>)}</p>)
                )}
              </div>
            ));
            return (
              <div key={g.title} className="rt-notes__card">
                {shown.length > 1 && <h3 className="rt-notes__h3">{g.title}</h3>}
                {g.long ? <LongBody><div className="rt-notes__items">{items}</div></LongBody> : <div className="rt-notes__items">{items}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
