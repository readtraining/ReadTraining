// A profile photo, made in the browser before upload: the centre square at 512 × 512 (lib/images.js, the rule every picture upload
// follows). Re-drawing it drops everything else in the file, including a phone photo's location data.
import { acceptFor, prepareImage } from "@/lib/images";

export const PHOTO_ACCEPT = acceptFor("photo");

export async function squarePhoto(file) {
  return (await prepareImage(file, "photo")).blob;
}
