import { describe, expect, it, vi } from "vitest";
import { nativeMatchPath, resolveNativeMatchPath } from "../src/lib/native-match-links";

describe("native shared match links", () => {
  it("accepts only exact production match destinations", () => {
    expect(nativeMatchPath("https://padelsetmatch.com/m/abc-123?i=invite")).toBe("/m/abc-123?i=invite");
    expect(nativeMatchPath("https://padelsetmatch.com/app/events/abc-123")).toBe("/app/events/abc-123");
    expect(nativeMatchPath("https://padelsetmatch.com/app/grid")).toBeNull();
    expect(nativeMatchPath("https://evil.padelsetmatch.com/m/abc")).toBeNull();
    expect(nativeMatchPath("http://padelsetmatch.com/m/abc")).toBeNull();
    expect(nativeMatchPath("https://padelsetmatch.com:8443/m/abc")).toBeNull();
  });

  it("resolves trusted short links without following a browser redirect", async () => {
    const request = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://padelsetmatch.com/m/match-1" }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(resolveNativeMatchPath("https://padelsetmatch.com/s/YzsILylZ", request)).resolves.toBe("/m/match-1");
    expect(request).toHaveBeenCalledWith("/s/YzsILylZ", expect.objectContaining({
      headers: { Accept: "application/json" },
    }));
  });

  it("rejects a short link whose destination leaves the app", async () => {
    const request = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://example.com/m/match-1" }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(resolveNativeMatchPath("https://padelsetmatch.com/s/YzsILylZ", request)).resolves.toBeNull();
  });
});
