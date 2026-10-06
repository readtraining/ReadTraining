"use client";

// Error boundary for the courses page. The message and button follow the agreed wording.
export default function Error({ reset }) {
  return (
    <section className="rt-cat" role="alert">
      <div className="container rt-cat__body" style={{ padding: "64px 0" }}>
        <div className="rt-cat__empty">
          <p className="rt-cat__empty-title">We couldn&apos;t load courses. Check your connection and try again.</p>
          <div className="rt-cat__empty-actions">
            <button type="button" className="button -sm -purple-1 text-white" onClick={() => reset()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
