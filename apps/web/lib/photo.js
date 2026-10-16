// A profile photo, made in the browser before upload: the centre square of the picture at 512×512, as WebP (JPEG where the
// browser can't write WebP). Re-drawing it drops everything else in the file, including a phone photo's location data.
const SIZE = 512;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_ORIGINAL = 15 * 1024 * 1024;

export async function squarePhoto(file) {
  if (!file || !PHOTO_ACCEPT.split(",").includes(file.type)) throw new Error("Choose a JPG, PNG or WebP photo.");
  if (file.size > MAX_ORIGINAL) throw new Error("Choose a photo smaller than 15 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("We couldn't read that photo. Choose another one.");
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  const toBlob = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.88);
  if (!blob) throw new Error("We couldn't prepare that photo. Choose another one.");
  return blob;
}
