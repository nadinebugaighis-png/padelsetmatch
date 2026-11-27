import { describe, expect, it } from "vitest";
import { LEVEL_GUIDE_BANDS, levelGuideRange } from "./level-guide";

describe("level guide ranges", () => {
  it("uses the exact Playtomic band boundaries shown on the level slider", () => {
    expect(LEVEL_GUIDE_BANDS.map((band) => band.min)).toEqual([0, 1, 1.5, 2.5, 3.5, 4.5, 5.5, 6]);
    expect(LEVEL_GUIDE_BANDS.map((band) => band.max)).toEqual([0.9, 1.4, 2.4, 3.4, 4.4, 5.4, 5.9, 7]);
  });

  it("covers every selectable rating from 0.0 to 7.0 without a gap", () => {
    expect(LEVEL_GUIDE_BANDS[0]?.min).toBe(0);
    expect(LEVEL_GUIDE_BANDS.at(-1)?.max).toBe(7);
    LEVEL_GUIDE_BANDS.slice(1).forEach((band, index) => {
      const previous = LEVEL_GUIDE_BANDS[index];
      expect(previous).toBeDefined();
      expect(band.min).toBeCloseTo((previous?.max ?? 0) + 0.1, 10);
    });
  });

  it("shows both ends of each range with one decimal", () => {
    expect(levelGuideRange(LEVEL_GUIDE_BANDS[0]!)).toBe("0.0–0.9");
    expect(levelGuideRange(LEVEL_GUIDE_BANDS[4]!)).toBe("3.5–4.4");
    expect(levelGuideRange(LEVEL_GUIDE_BANDS.at(-1)!)).toBe("6.0–7.0");
  });
});
