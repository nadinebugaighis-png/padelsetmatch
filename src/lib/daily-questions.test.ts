import { describe, it, expect } from "vitest";
import {
  dailyQuestionFor, questionForDay, questionForSlot, slotKey, shouldShowQuestion,
  unlockQuestions, CURATED_QUESTIONS, NEW_PLAYER_PAUSE_MS,
} from "./daily-questions";

describe("padel question card", () => {
  it("day question is the same all day and changes the next day", () => {
    const a = questionForDay(new Date(2026, 9, 30, 8));
    expect(questionForDay(new Date(2026, 9, 30, 23))).toBe(a);
    expect(questionForDay(new Date(2026, 9, 31, 8))).not.toBe(a);
  });
  it("morning and evening get different questions", () => {
    expect(slotKey(new Date(2026, 10, 7, 9))).toBe("2026-11-07-am");
    expect(slotKey(new Date(2026, 10, 7, 20))).toBe("2026-11-07-pm");
    expect(questionForSlot(new Date(2026, 10, 7, 9))).not.toBe(questionForSlot(new Date(2026, 10, 7, 20)));
  });
  it("skips already answered questions", () => {
    const d = new Date(2026, 9, 30, 9);
    const slotQ = questionForSlot(d);
    expect(dailyQuestionFor(new Set([slotQ.q.en]), d)).not.toBe(slotQ);
    expect(dailyQuestionFor(new Set(CURATED_QUESTIONS.map((q) => q.q.en)), d)).toBe(slotQ);
  });
  it("regular players get one question in the morning and one in the evening", () => {
    const morning = new Date(2026, 10, 7, 9);
    const evening = new Date(2026, 10, 7, 20);
    expect(shouldShowQuestion({ answeredCount: 5, lastSlot: null, lastAnsweredAt: null, now: morning })).toBe(true);
    expect(shouldShowQuestion({ answeredCount: 5, lastSlot: "2026-11-07-am", lastAnsweredAt: null, now: new Date(2026, 10, 7, 12) })).toBe(false);
    expect(shouldShowQuestion({ answeredCount: 5, lastSlot: "2026-11-07-am", lastAnsweredAt: null, now: evening })).toBe(true);
    expect(shouldShowQuestion({ answeredCount: 5, lastSlot: "2026-11-07-pm", lastAnsweredAt: null, now: new Date(2026, 10, 7, 23) })).toBe(false);
  });
  it("new players get a question on every visit until they have 3 answers", () => {
    const now = new Date(2026, 10, 7, 9);
    const justAnswered = now.getTime() - 60_000;
    const lastVisit = now.getTime() - NEW_PLAYER_PAUSE_MS;
    expect(shouldShowQuestion({ answeredCount: 1, lastSlot: "2026-11-07-am", lastAnsweredAt: null, now })).toBe(true);
    expect(shouldShowQuestion({ answeredCount: 1, lastSlot: "2026-11-07-am", lastAnsweredAt: justAnswered, now })).toBe(false);
    expect(shouldShowQuestion({ answeredCount: 2, lastSlot: "2026-11-07-am", lastAnsweredAt: lastVisit, now })).toBe(true);
  });
  it("bank has 38 questions: 15 padel, 11 personality, 12 lifestyle", () => {
    expect(CURATED_QUESTIONS).toHaveLength(38);
    const count = (c: string) => CURATED_QUESTIONS.filter((q) => q.category === c).length;
    expect([count("padel"), count("personality"), count("lifestyle")]).toEqual([15, 11, 12]);
    expect(new Set(CURATED_QUESTIONS.map((q) => q.q.en)).size).toBe(38);
    expect(CURATED_QUESTIONS.every((q) => q.options.length === 3)).toBe(true);
  });
  it("two weeks of morning/evening questions never repeat", () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 14; day++) {
      seen.add(questionForSlot(new Date(2026, 10, day, 9)).id);
      seen.add(questionForSlot(new Date(2026, 10, day, 20)).id);
    }
    expect(seen.size).toBe(28);
  });
  it("unlock offers unanswered questions only", () => {
    const qs = unlockQuestions(new Set(["Your ideal weekend match is…"]), 3);
    expect(qs).toHaveLength(3);
    expect(qs.map((q) => q.id)).not.toContain("weekend");
  });
  it("the three off-court depth questions come up tomorrow morning, tomorrow evening and Saturday morning", () => {
    expect(questionForSlot(new Date(2026, 10, 13, 9)).id).toBe("afternoon");
    expect(questionForSlot(new Date(2026, 10, 13, 20)).id).toBe("talkabout");
    expect(questionForSlot(new Date(2026, 10, 14, 9)).id).toBe("drawn");
  });
});
