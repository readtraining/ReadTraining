// The menus' one arrow: the one that slides in on a desktop card's link (rt-nav-arrow) and the one after an "all …" link in a
// card's footer and in the phone menu (rt-nav-more__arrow). Drawn, in the text's colour.
export default function NavArrow({ className }) {
  return (
    <svg className={className} width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M1.5 6h12.5" />
      <path d="M9.5 1.5 14 6l-4.5 4.5" />
    </svg>
  );
}
