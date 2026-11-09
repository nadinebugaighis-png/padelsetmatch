import { afterEach, describe, expect, it, vi } from "vitest";
import { nativeShare } from "./native";

const opts = { title: "PadelSetMatch", text: "Join", url: "https://padelsetmatch.com/download" };

function setNavigator(nav: Record<string, unknown>) {
  vi.stubGlobal("navigator", nav);
}

afterEach(() => vi.unstubAllGlobals());

describe("nativeShare", () => {
  it("falls back to copying the link when the browser blocks sharing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      share: vi.fn().mockRejectedValue(Object.assign(new Error("blocked"), { name: "NotAllowedError" })),
      clipboard: { writeText },
    });
    await expect(nativeShare(opts)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("Join https://padelsetmatch.com/download");
  });

  it("stops when the player closes the share sheet", async () => {
    const writeText = vi.fn();
    setNavigator({
      share: vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" })),
      clipboard: { writeText },
    });
    await expect(nativeShare(opts)).resolves.toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports unavailable when neither sharing nor copying works", async () => {
    setNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await expect(nativeShare(opts)).resolves.toBe("unavailable");
  });
});
