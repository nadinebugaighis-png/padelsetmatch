import { describe, expect, it } from "vitest";
import { DOWNLOAD_URL, QR_TARGET_URL, pickStore, shareAppText } from "./store-link";

describe("QR codes", () => {
  it("encodes the smart download link, not the website home page", () => {
    expect(QR_TARGET_URL).toBe("https://padelsetmatch.com/download");
    expect(QR_TARGET_URL).toBe(DOWNLOAD_URL);
    expect(QR_TARGET_URL).not.toBe("https://padelsetmatch.com/");
  });
});

describe("pickStore", () => {
  it("sends iPhones to the App Store", () => {
    expect(
      pickStore("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"),
    ).toBe("ios");
  });

  it("sends Android phones to Google Play", () => {
    expect(pickStore("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36")).toBe("android");
  });

  it("sends touch iPads that report as Macs to the App Store", () => {
    expect(pickStore("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5)).toBe("ios");
  });

  it("keeps desktops and link-preview bots on the page", () => {
    expect(pickStore("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", 0)).toBeNull();
    expect(pickStore("WhatsApp/2.23.10.9 A")).toBeNull();
  });
});

describe("shareAppText", () => {
  it("writes the Spanish invite for Spanish players", () => {
    expect(shareAppText("es")).toContain("PadelSetMatch");
    expect(shareAppText("es")).toContain("pádel");
  });
});
