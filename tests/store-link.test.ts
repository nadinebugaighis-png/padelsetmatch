import { describe, expect, it } from "vitest";
import { pickStore } from "../src/lib/store-link";

describe("download link store choice", () => {
  it("sends iPhones to the App Store", () => {
    expect(pickStore("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1")).toBe("ios");
  });
  it("sends iPads that report as a Mac to the App Store", () => {
    expect(pickStore("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", 5)).toBe("ios");
  });
  it("sends Android phones to Google Play", () => {
    expect(pickStore("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toBe("android");
  });
  it("shows the page on computers", () => {
    expect(pickStore("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", 0)).toBeNull();
    expect(pickStore("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36")).toBeNull();
  });
  it("never redirects the WhatsApp preview reader, so the banner shows", () => {
    expect(pickStore("WhatsApp/2.24.1 A")).toBeNull();
    expect(pickStore("WhatsApp/2.23.20.0 i")).toBeNull();
    expect(pickStore("facebookexternalhit/1.1")).toBeNull();
  });
});
