import { describe, expect, it } from "vitest";
import { photoSrc } from "./photo-src";

describe("photoSrc", () => {
  it("routes saved player photos through the small 240px version", () => {
    const url = "https://x.supabase.co/storage/v1/object/sign/padel-photos/u/photo-1.jpeg?token=t";
    expect(photoSrc(url, 240)).toBe(`/api/public/photo?w=240&u=${encodeURIComponent(url)}`);
  });
  it("leaves non-player pictures alone", () => {
    expect(photoSrc("https://lh3.googleusercontent.com/a/abc", 240)).toBe("https://lh3.googleusercontent.com/a/abc");
  });
});
