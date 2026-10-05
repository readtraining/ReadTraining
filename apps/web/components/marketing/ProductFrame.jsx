// Browser-style window used for product mockups on the /for-business and /for-providers pages.
export default function ProductFrame({ title, children, className = "" }) {
  return (
    <div className={`fb-frame ${className}`}>
      <div className="fb-frame__bar">
        <span className="fb-frame__dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span className="fb-frame__title">{title}</span>
      </div>
      <div className="fb-frame__body">{children}</div>
    </div>
  );
}
