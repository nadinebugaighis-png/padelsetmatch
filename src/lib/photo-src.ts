// Smaller, faster player photos. Falls back to the original URL for anything
// that isn't a signed player photo.
export type PhotoWidth = 240 | 480 | 800;

export function photoSrc(url: string | null | undefined, w: PhotoWidth): string | undefined {
  if (!url) return undefined;
  if (!url.includes("/storage/v1/object/sign/padel-photos/")) return url;
  return `/api/public/photo?w=${w}&u=${encodeURIComponent(url)}`;
}

const warmed = new Set<string>();
export function prefetchPhoto(url: string | null | undefined, w: PhotoWidth) {
  const src = photoSrc(url, w);
  if (!src || warmed.has(src) || typeof Image === "undefined") return;
  warmed.add(src);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
}
