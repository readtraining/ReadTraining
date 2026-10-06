import React from "react";
import Link from "next/link";

// Always the same number of slots (7) once there are more than 7 pages, so the control never moves sideways:
// 1 2 3 4 5 ... 9   |   1 ... 4 5 6 ... 9   |   1 ... 5 6 7 8 9
function pageList(page, total) {
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (total <= 7) return range(1, total);
  if (page <= 4) return [...range(1, 5), "gap-end", total];
  if (page >= total - 3) return [1, "gap-start", ...range(total - 4, total)];
  return [1, "gap-start", page - 1, page, page + 1, "gap-end", total];
}

const chevron = {
  prev: <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.7 5.3a1 1 0 010 1.4L9.4 10l3.3 3.3a1 1 0 01-1.4 1.4l-4-4a1 1 0 010-1.4l4-4a1 1 0 011.4 0z" clipRule="evenodd" /></svg>,
  next: <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.3 14.7a1 1 0 010-1.4L10.6 10 7.3 6.7a1 1 0 011.4-1.4l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4 0z" clipRule="evenodd" /></svg>,
};

// Real links (crawlable, work in a new tab) whose plain clicks are intercepted: the page changes without a reload and
// scrolls to the top of the results. Previous and Next are always shown; at the ends they are disabled (not links).
export default function CataloguePagination({ page, totalPages, hrefFor, onNavigate }) {
  const go = (p) => (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNavigate(p);
  };
  const step = (dir, target, disabled) =>
    disabled ? (
      <span className="rt-pg__btn is-disabled" role="link" aria-disabled="true" aria-label={`${dir === "prev" ? "Previous" : "Next"} page`}>
        {chevron[dir]}
      </span>
    ) : (
      <Link href={hrefFor(target)} rel={dir} className="rt-pg__btn" aria-label={`${dir === "prev" ? "Previous" : "Next"} page`} onClick={go(target)}>
        {chevron[dir]}
      </Link>
    );

  return (
    <nav className="rt-pg" aria-label="Pagination">
      {step("prev", page - 1, page <= 1)}
      <span className="rt-pg__compact" aria-hidden="true">Page {page} of {totalPages}</span>
      <div className="rt-pg__list">
        {pageList(page, totalPages).map((p) =>
          typeof p === "string" ? (
            <span key={p} className="rt-pg__gap">…</span>
          ) : (
            <Link key={p} href={hrefFor(p)} className={`rt-pg__btn${p === page ? " is-current" : ""}`} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`} onClick={go(p)}>
              {p}
            </Link>
          ),
        )}
      </div>
      {step("next", page + 1, page >= totalPages)}
    </nav>
  );
}
