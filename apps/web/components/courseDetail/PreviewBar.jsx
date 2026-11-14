import Link from "next/link";

// The strip on the editors' Preview (/provider/courses/<id>/preview, /admin/catalogue/<id>/preview): this is the course page as it
// will look once live, booking is off here, and the way back to the editor. The page under it is the real course page. `missing`:
// what a course not yet sent still needs (the API's list), so its empty parts make sense.
export default function PreviewBar({ back, status, missing = [] }) {
  return (
    <div className="rt-preview" role="region" aria-label="Preview">
      <p className="rt-preview__text">
        {missing.length ? (
          <><b>Draft preview: {missing.length} {missing.length === 1 ? "thing" : "things"} still to add</b> ({missing.join(", ")}). Those parts are empty here, and booking is turned off.</>
        ) : (
          <><b>Preview.</b> {status} Booking is turned off here.</>
        )}
      </p>
      <Link href={back} className="rt-preview__back">Back to the editor</Link>
    </div>
  );
}
