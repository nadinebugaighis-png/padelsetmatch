import { describe, expect, it } from "vitest";
import { ageMatchesPreference } from "./age-bracket";

describe("ageMatchesPreference", () => {
  it("never hides a player who has not given an age", () => {
    expect(ageMatchesPreference({ age_min: 18, age_max: 70 }, { age: null })).toBe(true);
  });

  it("still hides a player whose bracket is outside the preferred range", () => {
    expect(ageMatchesPreference({ age_min: 18, age_max: 30 }, { age: null, age_bracket_lo: 46, age_bracket_hi: 55 })).toBe(false);
  });

  it("shows a 56+ player to someone whose range ends at 70", () => {
    expect(ageMatchesPreference({ age_min: 18, age_max: 70 }, { age: 78 })).toBe(true);
  });
});
