import { describe, expect, it } from "vitest";
import { courtViewIndex } from "./court-view";

describe("courtViewIndex", () => {
  it("always gives the same player the same drawing", () => {
    const id = "3f9a1c2e-1111-4a2b-9c3d-abcdef012345";
    expect(courtViewIndex(id, 18)).toBe(courtViewIndex(id, 18));
  });

  it("stays within the 18 drawings", () => {
    for (let x = 0; x < 500; x++) {
      const idx = courtViewIndex(`player-${x}`, 18);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(18);
    }
  });

  it("spreads players across all 18 drawings", () => {
    const used = new Set<number>();
    for (let x = 0; x < 500; x++) used.add(courtViewIndex(crypto.randomUUID(), 18));
    expect(used.size).toBe(18);
  });
});
