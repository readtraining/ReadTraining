import React from "react";

// Loading placeholder: six cards with the same grid and heights as real ones (image | details | price + actions).
export default function CourseListSkeleton({ count = 6 }) {
  return (
    <section className="rt-cat" aria-busy="true" aria-label="Loading courses">
      <div className="container rt-cat__body" style={{ paddingTop: 48 }}>
        <div className="rt-res__list">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="rt-card rt-card--skeleton" aria-hidden="true">
              <div className="rt-card__media"><span className="rt-card__image rt-skel"></span></div>
              <div className="rt-card__body">
                <span className="rt-skel rt-skel--line" style={{ width: 90, height: 13 }}></span>
                <span className="rt-skel rt-skel--line" style={{ width: "64%", height: 20 }}></span>
                <span className="rt-skel rt-skel--line" style={{ width: "92%", height: 14 }}></span>
                <span className="rt-skel rt-skel--line" style={{ width: "74%", height: 14 }}></span>
                <span className="rt-skel rt-skel--line" style={{ width: "52%", height: 13, marginTop: "auto" }}></span>
              </div>
              <div className="rt-card__aside">
                <div className="rt-card__price">
                  <span className="rt-skel rt-skel--line" style={{ width: 36, height: 13 }}></span>
                  <span className="rt-skel rt-skel--line" style={{ width: 120, height: 24 }}></span>
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
