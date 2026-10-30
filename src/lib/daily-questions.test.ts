import { describe, it, expect } from "vitest";
import { dailyQuestionFor, questionForDay, unlockQuestions, CURATED_QUESTIONS } from "./daily-questions";

describe("daily padel question", () => {
  it("is the same all day and changes the next day", () => {
    const a = questionForDay(new Date(2026, 9, 30, 8));
    expect(questionForDay(new Date(2026, 9, 30, 23))).toBe(a);
    expect(questionForDay(new Date(2026, 9, 31, 8))).not.toBe(a);
  });
  it("skips already answered questions", () => {
    const d = new Date(2026, 9, 30);
    const today = questionForDay(d);
    expect(dailyQuestionFor(new Set([today.q.en]), d)).not.toBe(today);
    expect(dailyQuestionFor(new Set(CURATED_QUESTIONS.map((q) => q.q.en)), d)).toBeNull();
  });
  it("unlock offers unanswered questions only", () => {
    const qs = unlockQuestions(new Set(["Your ideal weekend match is…"]), 3);
    expect(qs).toHaveLength(3);
    expect(qs.map((q) => q.id)).not.toContain("weekend");
  });
});
