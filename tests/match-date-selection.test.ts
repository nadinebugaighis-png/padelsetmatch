import { describe, expect, it } from "vitest";
import { toggleMatchDay } from "../src/lib/match-date-selection";

describe("match date selection", () => {
  const dates = ["2026-10-30", "2026-10-31", "2026-11-1"];
  it("switches from all dates to just the date tapped", () => {
    expect([...toggleMatchDay(new Set(dates), dates[1], dates)]).toEqual(["2026-10-31"]);
  });
  it("keeps individually chosen dates selectable together", () => {
    expect([...toggleMatchDay(new Set([dates[0]]), dates[1], dates)]).toEqual(dates.slice(0, 2));
  });
  it("never leaves the feed with no selected date", () => {
    expect([...toggleMatchDay(new Set([dates[0]]), dates[0], dates)]).toEqual([dates[0]]);
  });
});