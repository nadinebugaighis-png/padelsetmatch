import { describe, it, expect } from "vitest";
import { CURATED_QUESTIONS } from "./daily-questions";
import { PUBLIC_CARD_IDS } from "./personality-cards";
import { buildPersonalityCards, buildComplements, disclosableAnswers } from "./personality-cards";

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

describe("private answers between strangers", () => {
  // A real non-public question from the curated bank.
  const priv = (() => {
    const q = CURATED_QUESTIONS.find((c) => !(PUBLIC_CARD_IDS as readonly string[]).includes(c.id))!;
    return { id: q.id, a: row(q.q.en, q.options[0].en), b: row(q.q.en, q.options[1].en) };
  })();
  it("a stranger who picked the same option sees nothing private", () => {
    expect(buildPersonalityCards([priv.a], [priv.a], false)).toEqual([]);
  });
  it("a connected player who picked the same option sees it as shared", () => {
    expect(buildPersonalityCards([priv.a], [priv.a], true)).toEqual([{ id: priv.id, option: 0, shared: true }]);
  });
  it("a connected player who picked differently sees nothing private", () => {
    expect(buildPersonalityCards([priv.a], [priv.b], true)).toEqual([]);
  });
  it("the AI summary only gets public answers for a stranger", () => {
    expect(disclosableAnswers([priv.a, deuce], [priv.a], false)).toEqual([deuce]);
  });
  it("the AI summary gets identical answers for a verified pair", () => {
    expect(disclosableAnswers([priv.a, deuce], [priv.a], true)).toEqual([priv.a, deuce]);
  });
  it("the AI summary never gets a differing private answer", () => {
    expect(disclosableAnswers([priv.a], [priv.b], true)).toEqual([]);
  });
});
