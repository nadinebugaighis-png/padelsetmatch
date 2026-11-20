import { describe, expect, it } from "vitest";
import { defaultMatchDays, groupByDay, restoreMatchDays, serializeMatchDays, toggleMatchDay } from "./match-date-selection";

const keys = ["d0", "d1", "d2", "d3", "d4"];

describe("match date selection", () => {
  it("opens on today and tomorrow only", () => {
    expect([...defaultMatchDays(keys)]).toEqual(["d0", "d1"]);
  });

  it("picking a day while All dates is on shows just that day", () => {
    expect([...toggleMatchDay(new Set(keys), "d3", keys)]).toEqual(["d3"]);
  });

  it("groups matches under one heading per day", () => {
    const groups = groupByDay(["d0", "d0", "d1", "d3", "d3"], (k) => k);
    expect(groups.map((g) => [g.key, g.items.length])).toEqual([["d0", 2], ["d1", 1], ["d3", 2]]);
  });

  it("remembers a chosen day (e.g. Wednesday 25) when returning to the page", () => {
    const saved = serializeMatchDays(new Set(["d3"]), keys);
    expect([...(restoreMatchDays(saved, keys) ?? [])]).toEqual(["d3"]);
  });

  it("remembers All dates", () => {
    const saved = serializeMatchDays(new Set(keys), keys);
    expect(restoreMatchDays(saved, keys)?.size).toBe(keys.length);
  });

  it("falls back to the default once a saved day has passed", () => {
    expect(restoreMatchDays(JSON.stringify(["old"]), keys)).toBeNull();
  });
});
