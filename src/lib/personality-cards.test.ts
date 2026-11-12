import { describe, it, expect } from "vitest";
import { buildPersonalityCards, buildComplements } from "./personality-cards";

const row = (question: string, answer: string) => ({ question, answer });
const deuce = row("40-40, match point. You…", "Go for the winner");
const afterBeer = row("After the match…", "Coffee or a beer");
const afterHome = row("After the match…", "Straight home");

describe("personality cards", () => {
  it("shows on-court answers to anyone", () => {
    expect(buildPersonalityCards([deuce], [])).toEqual([{ id: "deuce", option: 0, shared: false }]);
  });
  it("shows the after-match plan to anyone", () => {
    expect(buildPersonalityCards([afterBeer], [afterHome])).toEqual([{ id: "after", option: 1, shared: false }]);
    expect(buildPersonalityCards([afterBeer], [])).toEqual([{ id: "after", option: 1, shared: false }]);
  });
  it("hides private answers when the viewer answered differently", () => {
    const late = row("Running 10 minutes late, you…", "x");
    expect(buildPersonalityCards([late], [])).toEqual([]);
  });
  it("marks the after-match plan as shared when both picked the same", () => {
    expect(buildPersonalityCards([afterBeer], [afterBeer])).toEqual([{ id: "after", option: 1, shared: true }]);
  });
  it("shows at most 3 on-court cards", () => {
    const rows = [deuce, row("Your favourite side of the court?", "Either, I adapt"), row("Your signature move?", "The smash"), row("Your biggest weapon?", "Never missing")];
    expect(buildPersonalityCards(rows, []).length).toBe(3);
  });
});

describe("complements", () => {
  const left = row("Your favourite side of the court?", "Left – backhand");
  const right = row("Your favourite side of the court?", "Right – forehand");
  it("pairs a left-side player with a right-side player", () => {
    expect(buildComplements([left], [right]).map((c) => c.key)).toEqual(["side-lr"]);
  });
  it("does not treat identical answers as complementary", () => {
    expect(buildComplements([left], [left])).toEqual([]);
  });
  it("never uses private answers", () => {
    expect(buildComplements([afterBeer], [afterHome])).toEqual([]);
  });
  it("needs both players to have answered", () => {
    expect(buildComplements([left], [])).toEqual([]);
  });
});
