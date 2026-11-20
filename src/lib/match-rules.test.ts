import { describe, expect, it } from "vitest";
import { matchCapacity, matchDuration, matchEndsAt } from "./match-rules";

describe("matchCapacity", () => {
  it("a normal match has 4 places", () => {
    expect(matchCapacity({ is_class: false, class_students: 2 })).toBe(4);
    expect(matchCapacity(null)).toBe(4);
  });
  it("a class has the coach plus the chosen students", () => {
    expect(matchCapacity({ is_class: true, class_students: 1 })).toBe(2);
    expect(matchCapacity({ is_class: true, class_students: 2 })).toBe(3);
    expect(matchCapacity({ is_class: true, class_students: 3 })).toBe(4);
  });
  it("a class can take up to 4 students plus the coach", () => {
    expect(matchCapacity({ is_class: true, class_students: 4 })).toBe(5);
  });
  it("a class without a student count defaults to 3 students", () => {
    expect(matchCapacity({ is_class: true, class_students: null })).toBe(4);
  });
});

describe("match length", () => {
  it("a 60 minute game starting 10:00 ends 11:00", () => {
    expect(matchEndsAt("2026-11-21T10:00:00Z", 60).toISOString()).toBe("2026-11-21T11:00:00.000Z");
  });
  it("a 90 minute game starting 10:00 ends 11:30", () => {
    expect(matchEndsAt("2026-11-21T10:00:00Z", 90).toISOString()).toBe("2026-11-21T11:30:00.000Z");
  });
  it("games without a saved length last 90 minutes", () => {
    expect(matchDuration({ duration_minutes: null })).toBe(90);
    expect(matchDuration(null)).toBe(90);
  });
});
