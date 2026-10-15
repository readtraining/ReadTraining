import React from "react";

// Loading placeholder: six cards with the same grid and heights as real ones (image | details | price + actions).
export default function CourseListSkeleton({ count = 6 }) {
  return (
    <section className="rt-cat" aria-busy="true" aria-label="Loading courses">
      <div className="container rt-cat__body rt-cat__body--skeleton">
        <div className="rt-res__list">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="rt-card rt-card--skeleton" aria-hidden="true">
              <div className="rt-card__media"><span className="rt-card__image rt-skel"></span></div>
              <div className="rt-card__body">
                <span className="rt-skel rt-skel--line rt-skel--eyebrow"></span>
                <span className="rt-skel rt-skel--line rt-skel--title"></span>
                <span className="rt-skel rt-skel--line rt-skel--text"></span>
                <span className="rt-skel rt-skel--line rt-skel--text2"></span>
                <span className="rt-skel rt-skel--line rt-skel--meta"></span>
              </div>
              <div className="rt-card__aside">
                <div className="rt-card__price">
                  <span className="rt-skel rt-skel--line rt-skel--from"></span>
                  <span className="rt-skel rt-skel--line rt-skel--price"></span>
                </div>
                <div className="rt-card__actions">
                  <span className="rt-skel rt-skel--btn"></span>
                  <span className="rt-skel rt-skel--btn"></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
