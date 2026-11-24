// Private store of ready-made small photos, one file per photo and size.
// Keys keep the original's owner folder first, so deleting an account's
// folder also clears its small copies.
export const THUMB_BUCKET = "photo-thumbs";
export const THUMB_WIDTHS = [240, 480, 800] as const;

export function thumbKey(photoPath: string, w: number): string {
  return `${photoPath}.w${w}`;
}

export function thumbKeys(photoPath: string): string[] {
  return THUMB_WIDTHS.map((w) => thumbKey(photoPath, w));
}
