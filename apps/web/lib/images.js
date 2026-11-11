// Every picture upload on the site (a profile photo, a provider's logo, a course picture) goes through prepareImage: one rule for
// all of them, so a picture that works in one place works in the others.
// - Choose a JPG, PNG or WebP picture (a course picture may also be a GIF) of up to 15 MB.
// - A big picture is made smaller in the browser before it is uploaded (a phone photo of 9 MB is fine anywhere), and re-drawing it
//   drops everything else in the file, such as a phone photo's location. A GIF is kept as it is (re-drawing would stop it moving),
//   so it has to be under 2 MB already.
// - A picture smaller than its kind's minimum is refused, with its size: it can't be made bigger without going blurry.
// The stored file is checked again on the server (course pictures: apps/api/src/lib/media.mts; logos: profile.mts setLogo).

const MB = 1024 * 1024;
export const MAX_CHOSEN = 15 * MB; // what can be chosen
export const MAX_UPLOAD = 2 * MB; // what is stored (the course-media bucket's limit)

export const IMAGE_KINDS = {
  // the centre square, 512 × 512
  photo: { label: "photo", square: 512, min: { width: 1, height: 1 }, types: ["image/jpeg", "image/png", "image/webp"] },
  // the whole logo (transparency kept), at most 800 pixels on its longer side
  logo: { label: "logo", longest: 800, min: { width: 200, height: 200 }, types: ["image/png", "image/jpeg", "image/webp"] },
  // the whole picture, at most 2000 pixels on its longer side
  course: { label: "picture", longest: 2000, min: { width: 500, height: 300 }, types: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
};

const NAMES = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP", "image/gif": "GIF" };
const listTypes = (types) => {
  const n = types.map((t) => NAMES[t]);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} or ${n[n.length - 1]}` : n[0];
};
/** The file types a kind accepts, for <input accept>. */
export const acceptFor = (kind) => IMAGE_KINDS[kind].types.join(",");
/** The hint under an upload button: only what helps someone choose a file (the preview shows the rest). */
export const hintFor = (kind) => {
  const k = IMAGE_KINDS[kind];
  const size = k.min.width > 1 ? `At least ${k.min.width} × ${k.min.height} pixels. ` : "";
  const gif = k.types.includes("image/gif") ? " A GIF must be under 2 MB." : "";
  return `${size}${listTypes(k.types)}, up to 15 MB.${gif}`;
};

const fail = (message) => Object.assign(new Error(message), { friendly: true });

/** A picture ready to upload: { blob, type, width, height }. Throws an Error whose message says what to choose instead. */
export async function prepareImage(file, kind) {
  const k = IMAGE_KINDS[kind];
  if (!file || !k.types.includes(file.type)) throw fail(`Choose a ${listTypes(k.types)} ${k.label}.`);
  if (file.size > MAX_CHOSEN) throw fail(`Choose a ${k.label} smaller than 15 MB.`);
  const bitmap = await createImageBitmap(file).catch(() => {
    throw fail(`We couldn't read that ${k.label}. Choose another one.`);
  });
  const { width, height } = bitmap;
  if (width < k.min.width || height < k.min.height) {
    bitmap.close?.();
    throw fail(`This ${k.label} is ${width} × ${height} pixels. Choose one at least ${k.min.width} × ${k.min.height} pixels.`);
  }
  // a GIF is uploaded as it is, so it keeps moving
  if (file.type === "image/gif") {
    bitmap.close?.();
    if (file.size > MAX_UPLOAD) throw fail("This GIF is over 2 MB. Choose a smaller one, or a JPG, PNG or WebP picture (those are made smaller for you).");
    return { blob: file, type: file.type, width, height };
  }

  // the size to draw: a square crop for a photo; otherwise the whole picture, no bigger than `longest`, and never under the minimum
  let sx = 0, sy = 0, sw = width, sh = height, dw, dh;
  if (k.square) {
    const side = Math.min(width, height);
    sx = (width - side) / 2;
    sy = (height - side) / 2;
    sw = sh = side;
    dw = dh = Math.min(k.square, side);
  } else {
    let scale = Math.min(1, k.longest / Math.max(width, height));
    scale = Math.min(1, Math.max(scale, k.min.width / width, k.min.height / height));
    dw = Math.round(width * scale);
    dh = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
  bitmap.close?.();

  const toBlob = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  // WebP keeps a logo's transparency and is small; a browser that can't write it gets PNG for a logo, JPEG for the rest
  let blob = await toBlob("image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await toBlob(kind === "logo" ? "image/png" : "image/jpeg", 0.88);
  if (!blob) throw fail(`We couldn't prepare that ${k.label}. Choose another one.`);
  if (blob.size > MAX_UPLOAD) throw fail(`That ${k.label} is still over 2 MB once made smaller. Choose a simpler one.`);
  return { blob, type: blob.type, width: dw, height: dh };
}

/** Resolves once the browser has the picture at `url` (or after `wait` ms), so a picture just saved replaces its preview only once
 * it can show: no blank box in between. */
export function whenLoaded(url, wait = 15000) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    const t = setTimeout(() => resolve(false), wait);
    img.onload = () => {
      clearTimeout(t);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(t);
      resolve(false);
    };
    img.src = url;
  });
}
