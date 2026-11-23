import { describe, expect, it } from "vitest";
import { levelRangeLabel } from "./level-label";

const en = (e: string) => e;
const es = (_e: string, s: string) => s;

describe("levelRangeLabel", () => {
  it("shows the daily open games (beginner to advanced) as All levels", () => {
    expect(levelRangeLabel("just starting", "advanced", en)).toBe("All levels");
    expect(levelRangeLabel("just starting", "advanced", es)).toBe("Todos los niveles");
  });
  it("shows casual to competitive as All levels", () => {
    expect(levelRangeLabel("casual", "competitive", en)).toBe("All levels");
  });
  it("keeps a narrower range readable without a dash", () => {
    expect(levelRangeLabel("intermediate", "advanced", en)).toBe("Intermediate to Advanced");
    expect(levelRangeLabel("just starting", "intermediate", es)).toBe("Iniciación a Intermedio");
  });
  it("shows a single level as just that level", () => {
    expect(levelRangeLabel("intermediate", "intermediate", en)).toBe("Intermediate");
  });
});

import { levelRating, levelRangeRating, levelRangeWithRating, withRating } from "./level-label";

describe("padel rating numbers", () => {
  it("maps each level to the familiar 1.0 to 6.0 scale", () => {
    expect(levelRating("just starting")).toBe("1.5–2.5");
    expect(levelRating("casual")).toBe("2.5–3.5");
    expect(levelRating("intermediate")).toBe("3.5–4.5");
    expect(levelRating("advanced")).toBe("4.5–5.5");
    expect(levelRating("competitive")).toBe("5.5+");
  });
  it("shows a player's level word with its rating", () => {
    expect(withRating("Intermedio", "intermediate")).toBe("Intermedio · 3.5–4.5");
  });
  it("covers a match's whole range", () => {
    expect(levelRangeRating("intermediate", "advanced")).toBe("3.5–5.5");
    expect(levelRangeRating("advanced", "competitive")).toBe("4.5+");
    expect(levelRangeWithRating("intermediate", "advanced", en)).toBe("Intermediate to Advanced · 3.5–5.5");
  });
  it("keeps All levels without numbers", () => {
    expect(levelRangeWithRating("just starting", "advanced", es)).toBe("Todos los niveles");
  });
});
