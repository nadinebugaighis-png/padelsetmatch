import { describe, expect, it } from "vitest";
import {
  levelFromRating,
  levelRangeLabel,
  levelRangeRating,
  levelRangeWithRating,
  levelRating,
  playerLevel,
  ratingWord,
  withRating,
} from "./level-label";

const en = (e: string) => e;
const es = (_e: string, s: string) => s;

describe("levelRangeLabel", () => {
  it("shows the daily open games (lowest to advanced band) as All levels", () => {
    expect(levelRangeLabel("just starting", "advanced", en)).toBe("All levels");
    expect(levelRangeLabel("just starting", "advanced", es)).toBe("Todos los niveles");
  });
  it("keeps a narrower range readable in Playtomic wording", () => {
    expect(levelRangeLabel("intermediate", "advanced", en)).toBe("Intermediate High to Intermediate Advanced");
    expect(levelRangeLabel("just starting", "intermediate", es)).toBe("Iniciación a Intermedio alto");
  });
});

describe("Playtomic bands", () => {
  it("uses Playtomic's published band numbers", () => {
    expect(levelRating("just starting")).toBe("0–2.4");
    expect(levelRating("casual")).toBe("2.5–3.4");
    expect(levelRating("intermediate")).toBe("3.5–4.4");
    expect(levelRating("advanced")).toBe("4.5–5.4");
    expect(levelRating("competitive")).toBe("5.5+");
  });
  it("names each exact number with Playtomic's wording", () => {
    expect(ratingWord(0.5, en)).toBe("Initiation");
    expect(ratingWord(1.2, en)).toBe("Beginner");
    expect(ratingWord(2.0, en)).toBe("Initiation Intermediate");
    expect(ratingWord(3.4, en)).toBe("Intermediate");
    expect(ratingWord(3.5, en)).toBe("Intermediate High");
    expect(ratingWord(4.5, es)).toBe("Intermedio avanzado");
    expect(ratingWord(5.5, es)).toBe("Competición");
  });
  it("files an exact number into the right band for match rules", () => {
    expect(levelFromRating(2.4)).toBe("just starting");
    expect(levelFromRating(2.5)).toBe("casual");
    expect(levelFromRating(4.4)).toBe("intermediate");
    expect(levelFromRating(5.4)).toBe("advanced");
    expect(levelFromRating(5.5)).toBe("competitive");
  });
  it("shows only the player's chosen number, retaining a range only when unset", () => {
    expect(playerLevel("intermediate", 3.5, en)).toBe("3.5");
    expect(playerLevel("intermediate", 3.8, es)).toBe("3.8");
    expect(playerLevel("just starting", 0, en)).toBe("0.0");
    expect(playerLevel("intermediate", null, es)).toBe("3.5–4.4");
    expect(withRating("Intermedio", "casual")).toBe("Intermedio · 2.5–3.4");
  });
  it("covers a match's whole range and keeps All levels plain", () => {
    expect(levelRangeRating("intermediate", "advanced")).toBe("3.5–5.4");
    expect(levelRangeRating("advanced", "competitive")).toBe("4.5+");
    expect(levelRangeWithRating("just starting", "advanced", es)).toBe("Todos los niveles");
  });
});
