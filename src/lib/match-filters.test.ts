import { describe, expect, it } from "vitest";
import { activeFilterCount, NO_FILTERS, passesFilters, restoreFilters } from "./match-filters";

const at = (h: number) => { const d = new Date(2026, 10, 22, h, 0); return d.toISOString(); };
const game = { starts_at: at(19), needs: 2, level_min: "intermediate", level_max: "advanced" };

describe("Play page filters", () => {
  it("places left hides full games", () => {
    expect(passesFilters({ ...game, needs: 0 }, { ...NO_FILTERS, spotsLeft: true })).toBe(false);
    expect(passesFilters(game, { ...NO_FILTERS, spotsLeft: true })).toBe(true);
  });

  it("evening is from 17:00, morning before 12:00", () => {
    expect(passesFilters(game, { ...NO_FILTERS, time: "evening" })).toBe(true);
    expect(passesFilters(game, { ...NO_FILTERS, time: "morning" })).toBe(false);
    expect(passesFilters({ ...game, starts_at: at(9) }, { ...NO_FILTERS, time: "morning" })).toBe(true);
  });

  it("a game with no hour yet fits any time of day", () => {
    expect(passesFilters({ ...game, time_tbd: true }, { ...NO_FILTERS, time: "morning" })).toBe(true);
  });

  it("my level keeps only games whose range includes my level", () => {
    expect(passesFilters(game, { ...NO_FILTERS, myLevel: true }, "intermediate")).toBe(true);
    expect(passesFilters(game, { ...NO_FILTERS, myLevel: true }, "casual")).toBe(false);
  });

  it("counts active filters and ignores bad saved values", () => {
    expect(activeFilterCount({ myLevel: true, time: "evening", spotsLeft: false })).toBe(2);
    expect(restoreFilters("{bad")).toEqual(NO_FILTERS);
    expect(restoreFilters('{"time":"night"}').time).toBe("all");
  });
});
