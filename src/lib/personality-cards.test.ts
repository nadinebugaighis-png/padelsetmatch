import { describe, it, expect } from "vitest";
import { buildPersonalityCards } from "./personality-cards";

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
