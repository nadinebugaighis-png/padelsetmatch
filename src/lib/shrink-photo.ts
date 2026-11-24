// Shrink a phone photo in the browser before it is uploaded, so uploads are
// quick and nobody later downloads a 15 MB original.
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function shrinkPhoto(
  file: File,
  opts: { maxSide?: number; minBytes?: number; name?: string } = {},
): Promise<File> {
  const { maxSide = 1800, minBytes = 2.5 * 1024 * 1024, name = "padel-photo.jpg" } = opts;
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo file.");

  const shouldCompress = file.size > minBytes || /heic|heif|png/i.test(file.type);
  if (!shouldCompress && file.size <= MAX_UPLOAD_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("This photo format could not be read. Please try a JPG photo."));
      img.src = objectUrl;
    });

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the photo. Please try another image.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("Could not prepare the photo. Please try another image.");
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Photo is too large. Please choose a smaller photo.");
    return new File([blob], name, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
