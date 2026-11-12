import { describe, expect, it } from "vitest";
import { offCourtScore, pairLabel } from "./pair-label";

describe("pairLabel", () => {
  it("strong on court, lighter socially is Court partners", () => {
    expect(pairLabel(88, 64)).toBe("court");
  });
  it("strong socially, lighter on court is Kindred spirits", () => {
    expect(pairLabel(66, 92)).toBe("kindred");
  });
  it("both scores high is The full set", () => {
    expect(pairLabel(85, 88)).toBe("full_set");
  });
  it("close, middling scores get no label", () => {
    expect(pairLabel(70, 72)).toBeNull();
  });
  it("no off-court score yet means no label", () => {
    expect(pairLabel(88, null)).toBeNull();
  });
  it("off-court score is hidden until the other player has answered 3 questions", () => {
    expect(offCourtScore(65, 0)).toBeNull();
    expect(offCourtScore(65, 2)).toBeNull();
    expect(offCourtScore(90, 3)).toBe(90);
  });
});
