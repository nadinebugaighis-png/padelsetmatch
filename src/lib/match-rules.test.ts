import { describe, expect, it } from "vitest";
import { matchCapacity } from "./match-rules";

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
  it("a class without a student count defaults to 3 students", () => {
    expect(matchCapacity({ is_class: true, class_students: null })).toBe(4);
  });
});
