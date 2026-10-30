import { describe, expect, it } from "vitest";
import { photoSrc } from "@/lib/photo-src";
describe("photoSrc", () => {
  it("routes signed player photos through the resizer", () => {
    const u = "https://x.supabase.co/storage/v1/object/sign/padel-photos/a/b.jpeg?token=t";
    expect(photoSrc(u, 480)).toBe(`/api/public/photo?w=480&u=${encodeURIComponent(u)}`);
  });
  it("leaves other URLs alone", () => {
    expect(photoSrc("https://example.com/a.jpg", 480)).toBe("https://example.com/a.jpg");
    expect(photoSrc(null, 480)).toBeUndefined();
  });
});
