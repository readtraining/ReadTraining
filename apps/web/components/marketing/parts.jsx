// Shared bits for the /for-business and /for-providers pages: inline SVG icons, chips, avatars and the product window frame.
import Link from "next/link";

export const initials = (name) => name.split(" ").map((x) => x[0]).join("");

export const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 2.5v9M5 8l4 4 4-4M3 15h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const tone = (s) => (/valid|complete|confirmed|assigned|active|published|ready|marketplace/i.test(s) ? "ok" : /due/i.test(s) ? "warn" : /progress/i.test(s) ? "info" : "muted");
export const Chip = ({ children }) => <span className={`fb-chip -${tone(children)}`}>{children}</span>;

export const Avatar = ({ name, ghost }) => (
  <span className={`fb-avatar${ghost ? " -ghost" : ""}`} aria-hidden="true">{ghost ? "+" : initials(name)}</span>
);

export const Ticks = ({ items, dark }) => (
  <ul className={`fb-ticks${dark ? " -dark" : ""}`}>
    {items.map((x) => <li key={x}><span className="fb-ticks__icon"><IconCheck /></span>{x}</li>)}
  </ul>
);

// same pill eyebrow used across the rest of the site
export const Eyebrow = ({ children, dark }) => (
  <div className={`rt-eyebrow rt-eyebrow--pill${dark ? " -onDark" : ""}`}><span className="rt-eyebrow__dot"></span>{children}</div>
);

export const CtaLink = ({ link, variant = "primary" }) => {
  const cls = { primary: "-purple-1 text-white", mint: "-green-1 text-dark-1", outline: "-outline-dark-1 text-dark-1" }[variant];
  return (
    <Link href={link.href} className={`button -md ${cls} fb-btn`}>
      {link.label}{variant !== "outline" && <IconArrow />}
    </Link>
  );
};

export const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.5" /><path d="m2.8 4.6 5.2 4 5.2-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// tick list where each item has a short title and one line of supporting text
export const Points = ({ items }) => (
  <ul className="fb-points">
    {items.map((x) => (
      <li key={x.title}><span className="fb-ticks__icon"><IconCheck /></span><div><b>{x.title}</b><span>{x.text}</span></div></li>
    ))}
  </ul>
);
