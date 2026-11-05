import { describe, expect, it } from "vitest";
import { photoSrc, photoRetrySrc } from "@/lib/photo-src";
describe("photoSrc", () => {
  it("routes signed player photos through the resizer", () => {
    const u = "https://x.supabase.co/storage/v1/object/sign/padel-photos/a/b.jpeg?token=t";
    expect(photoSrc(u, 480)).toBe(`/api/public/photo?w=480&u=${encodeURIComponent(u)}`);
  });
  it("leaves other URLs alone", () => {
    expect(photoSrc("https://example.com/a.jpg", 480)).toBe("https://example.com/a.jpg");
    expect(photoSrc(null, 480)).toBeUndefined();
  });
  it("retries through the privacy-checking endpoint at most twice", () => {
    const src = photoSrc("https://x.supabase.co/storage/v1/object/sign/padel-photos/a.jpg?token=t", 480);
    if (!src) throw new Error("Missing photo source");
    expect(photoRetrySrc(src, 1)).toBe(`${src}&retry=1`);
    expect(photoRetrySrc(src, 2)).toBe(`${src}&retry=2`);
    expect(photoRetrySrc(src, 3)).toBeUndefined();
    expect(photoRetrySrc("https://example.com/photo.jpg", 1)).toBeUndefined();
  });
});
