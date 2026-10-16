import Link from "next/link";
import React from "react";

// The site's one empty state and one error state (brief §3, DESIGN-SYSTEM.md section 7). Every list, panel and page that reads
// data uses these instead of its own wording and layout.
// - EmptyState: a short title, an optional line and an optional action ({ label, href } or { label, onClick }; `secondary`
//   adds a second, outlined one where two ways out genuinely help, as "Remove last filter" next to "Clear all"), with an
//   optional icon. On its own it is a card; `inCard` drops the card for a section that is already inside one; `large` is for a
//   whole page or tab (no card, bigger title and button, more space; `headingLevel` makes the title a heading).
// - ErrorState: what happened, and "Try again" when the reader can retry (`onRetry`).

function Action({ action, primary = true, size = "sm" }) {
  const cls = `button -${size} ${primary ? "-purple-1 text-white" : "-outline-purple-1 text-purple-1"}`;
  return action.href ? <Link href={action.href} className={cls}>{action.label}</Link> : <button type="button" className={cls} onClick={action.onClick}>{action.label}</button>;
}

export function EmptyState({ title, text, action, secondary, icon, inCard = false, large = false, headingLevel, live = false }) {
  const Title = headingLevel ? `h${headingLevel}` : "p";
  return (
    <div className={`rt-state${inCard ? " -incard" : large ? " -large" : " rt-acc__card"}`} role={live ? "status" : undefined}>
      {icon && <span className="rt-state__icon" aria-hidden="true"><i className={icon}></i></span>}
      <Title className="rt-state__title">{title}</Title>
      {text && <p className="rt-state__text">{text}</p>}
      {(action || secondary) && (
        <div className="rt-state__actions">
          {secondary && <Action action={secondary} primary={false} size={large ? "md" : "sm"} />}
          {action && <Action action={action} size={large ? "md" : "sm"} />}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title = "We couldn't load this right now.", text = "Check your connection, then try again.", onRetry, inCard = false }) {
  return (
    <div className={`rt-state -error${inCard ? " -incard" : " rt-acc__card"}`} role="alert">
      <span className="rt-state__icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
      </span>
      <p className="rt-state__title">{title}</p>
      {text && <p className="rt-state__text">{text}</p>}
      {onRetry && <Action action={{ label: "Try again", onClick: onRetry }} />}
    </div>
  );
}
