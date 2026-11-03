import Link from "next/link";

// The strip on the editors' Preview (/provider/courses/<id>/preview, /admin/catalogue/<id>/preview): this is the course page as it
// will look once live, booking is off here, and the way back to the editor. The page under it is the real course page.
export default function PreviewBar({ back, status }) {
  return (
    <div className="rt-preview" role="region" aria-label="Preview">
      <p className="rt-preview__text">
        <b>Preview.</b> {status} Booking is turned off here.
      </p>
      <Link href={back} className="rt-preview__back">Back to the editor</Link>
    </div>
  );
}
